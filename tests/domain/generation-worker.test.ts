import { describe, expect, test } from "bun:test";
import type { ImageProvider } from "@/server/core/generation";
import {
  type GenerationWorkerRepository,
  reconcileNextGenerationVariant,
  submitNextGenerationVariant,
} from "@/server/core/generation";
import type { ObjectStorage, StoredObject } from "@/server/core/storage";

class FakeStorage implements ObjectStorage {
  readonly writes: StoredObject[] = [];

  async put(input: { key: string; body: Uint8Array; contentType: string }) {
    const result = {
      key: input.key,
      bytes: input.body.byteLength,
      contentType: input.contentType,
    };
    this.writes.push(result);
    return result;
  }

  async getSignedReadUrl(key: string) {
    return `https://storage.test/${key}`;
  }

  async delete() {}
}

class FakeRepository implements GenerationWorkerRepository {
  pending = {
    variantId: "variant-1",
    generationId: "generation-1",
    sourceStorageKey: "source.jpg",
    prompt: "Keep the room perspective",
    callbackUrl: "https://app.test/api/generations/callback",
  };
  running = {
    variantId: "variant-1",
    generationId: "generation-1",
    providerTaskId: "task-1",
  };
  submitted = false;
  completed = false;
  failure: {
    variantId: string;
    generationId: string;
    retryable: boolean;
    errorCode: string;
  } | null = null;

  async claimPending() {
    if (this.submitted) return null;
    return this.pending;
  }
  async markSubmitted() {
    this.submitted = true;
  }
  async claimRunning() {
    if (!this.submitted || this.completed) return null;
    return this.running;
  }
  async completeVariant() {
    this.completed = true;
  }
  async failVariant(input: {
    variantId: string;
    generationId: string;
    errorCode: string;
    retryable: boolean;
  }) {
    this.failure = input;
  }
}

class FakeProvider implements ImageProvider {
  async submitEdit() {
    return {
      providerTaskId: "task-1",
      provider: "kie" as const,
      model: "test",
    };
  }
  async getTask() {
    return {
      providerTaskId: "task-1",
      state: "FAILED" as const,
      resultUrls: [],
      errorCode: "PROVIDER_FAILED",
    };
  }
}

describe("generation worker", () => {
  test("submits a claimed variant once", async () => {
    const repository = new FakeRepository();
    expect(
      await submitNextGenerationVariant(
        repository,
        new FakeProvider(),
        new FakeStorage(),
      ),
    ).toBe(true);
    expect(repository.submitted).toBe(true);
  });

  test("settles failed provider tasks as terminal failures", async () => {
    const repository = new FakeRepository();
    repository.submitted = true;
    expect(
      await reconcileNextGenerationVariant(
        repository,
        new FakeProvider(),
        new FakeStorage(),
      ),
    ).toBe(true);
    expect(repository.failure).toEqual({
      variantId: "variant-1",
      generationId: "generation-1",
      retryable: false,
      errorCode: "PROVIDER_FAILED",
    });
  });
});
