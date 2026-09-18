import * as v from "valibot";
import { serverEnv } from "@/server/config/env/server";
import type {
  ImageEditRequest,
  ImageProvider,
  ImageProviderTask,
} from "@/server/core/generation";

const createTaskResponse = v.object({
  code: v.number(),
  data: v.object({ taskId: v.string() }),
});

const taskResponse = v.object({
  code: v.number(),
  data: v.unknown(),
});

export class KieProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

function apiUrl(path: string): string {
  return new URL(path, `${serverEnv.KIE_API_BASE_URL}/`).toString();
}

async function httpRequest(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Authorization: `Bearer ${serverEnv.KIE_API_KEY}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new KieProviderError("KIE_NETWORK_ERROR", true);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new KieProviderError(
      `KIE_HTTP_${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  }
  return body;
}

function taskState(value: unknown): ImageProviderTask["state"] {
  if (value === "success" || value === "succeeded" || value === "completed")
    return "SUCCEEDED";
  if (value === "fail" || value === "failed" || value === "error")
    return "FAILED";
  if (value === "running" || value === "processing") return "RUNNING";
  return "QUEUED";
}

function resultUrls(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const candidates = [record.resultUrls, record.result_urls, record.images];
  for (const candidate of candidates) {
    if (Array.isArray(candidate))
      return candidate.filter((url): url is string => typeof url === "string");
  }
  if (typeof record.resultJson === "string") {
    try {
      return resultUrls(JSON.parse(record.resultJson));
    } catch {
      return [];
    }
  }
  return [];
}

export class KieImageProvider implements ImageProvider {
  constructor(
    private readonly options: {
      model?: string;
      resolution?: string;
    } = {},
  ) {}

  async submitEdit(input: ImageEditRequest) {
    const model = this.options.model ?? serverEnv.KIE_IMAGE_MODEL;
    const response = v.parse(
      createTaskResponse,
      await httpRequest("/api/v1/jobs/createTask", {
        method: "POST",
        body: JSON.stringify({
          model,
          callBackUrl: input.callbackUrl,
          input: {
            prompt: input.prompt,
            input_urls: [
              input.sourceUrl,
              ...input.referenceUrls.map((reference) => reference.url),
            ],
            aspect_ratio: "auto",
            resolution:
              input.options?.resolution ?? this.options.resolution ?? "1K",
            background: "opaque",
          },
        }),
      }),
    );
    if (response.code !== 200)
      throw new KieProviderError("KIE_TASK_REJECTED", false);
    return {
      providerTaskId: response.data.taskId,
      provider: "kie" as const,
      model,
    };
  }

  async getTask(providerTaskId: string): Promise<ImageProviderTask> {
    const response = v.parse(
      taskResponse,
      await httpRequest(
        `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(providerTaskId)}`,
        {
          method: "GET",
        },
      ),
    );
    const data = response.data as Record<string, unknown>;
    return {
      providerTaskId,
      state: taskState(data.state ?? data.status),
      resultUrls: resultUrls(data),
      errorCode: typeof data.failMsg === "string" ? data.failMsg : undefined,
    };
  }
}
