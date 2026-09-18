import { normalizeImage } from "@/server/core/assets";
import type { ObjectStorage } from "@/server/core/storage";
import type { ImageProvider } from "./provider";

export type PendingGenerationVariant = {
  variantId: string;
  generationId: string;
  sourceStorageKey: string;
  prompt: string;
  callbackUrl: string;
};

export type RunningGenerationVariant = {
  variantId: string;
  generationId: string;
  providerTaskId: string;
};

export interface GenerationWorkerRepository {
  claimPending(): Promise<PendingGenerationVariant | null>;
  markSubmitted(input: {
    variantId: string;
    providerTaskId: string;
    provider: "kie";
    model: string;
  }): Promise<void>;
  claimRunning(): Promise<RunningGenerationVariant | null>;
  completeVariant(input: {
    variantId: string;
    generationId: string;
    output: {
      storageKey: string;
      mime: string;
      width: number;
      height: number;
      bytes: number;
      checksum: string;
    };
  }): Promise<void>;
  failVariant(input: {
    variantId: string;
    generationId: string;
    errorCode: string;
    retryable: boolean;
  }): Promise<void>;
}

export async function submitNextGenerationVariant(
  repository: GenerationWorkerRepository,
  provider: ImageProvider,
  storage: ObjectStorage,
): Promise<boolean> {
  const variant = await repository.claimPending();
  if (!variant) return false;

  try {
    const sourceUrl = await storage.getSignedReadUrl(
      variant.sourceStorageKey,
      300,
    );
    const task = await provider.submitEdit({
      sourceUrl,
      referenceUrls: [],
      prompt: variant.prompt,
      callbackUrl: variant.callbackUrl,
    });
    await repository.markSubmitted({
      variantId: variant.variantId,
      providerTaskId: task.providerTaskId,
      provider: task.provider,
      model: task.model,
    });
  } catch (error) {
    await repository.failVariant({
      variantId: variant.variantId,
      generationId: variant.generationId,
      errorCode: error instanceof Error ? error.message : "KIE_SUBMIT_FAILED",
      retryable: true,
    });
  }
  return true;
}

export async function reconcileNextGenerationVariant(
  repository: GenerationWorkerRepository,
  provider: ImageProvider,
  storage: ObjectStorage,
): Promise<boolean> {
  const variant = await repository.claimRunning();
  if (!variant) return false;

  const task = await provider.getTask(variant.providerTaskId);
  if (task.state === "QUEUED" || task.state === "RUNNING") return true;
  if (task.state === "FAILED" || task.resultUrls.length === 0) {
    await repository.failVariant({
      variantId: variant.variantId,
      generationId: variant.generationId,
      errorCode: task.errorCode ?? "KIE_RESULT_FAILED",
      retryable: false,
    });
    return true;
  }

  const response = await fetch(task.resultUrls[0]);
  if (!response.ok) {
    await repository.failVariant({
      variantId: variant.variantId,
      generationId: variant.generationId,
      errorCode: `KIE_RESULT_HTTP_${response.status}`,
      retryable: true,
    });
    return true;
  }

  const normalized = await normalizeImage(
    new Uint8Array(await response.arrayBuffer()),
    response.headers.get("content-type") ?? undefined,
  );
  const storageKey = `generations/${variant.generationId}/variants/${variant.variantId}.jpg`;
  await storage.put({
    key: storageKey,
    body: normalized.body,
    contentType: normalized.mime,
  });
  await repository.completeVariant({
    variantId: variant.variantId,
    generationId: variant.generationId,
    output: {
      storageKey,
      mime: normalized.mime,
      width: normalized.width,
      height: normalized.height,
      bytes: normalized.body.byteLength,
      checksum: normalized.checksum,
    },
  });
  return true;
}
