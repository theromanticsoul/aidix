import { randomUUID } from "node:crypto";
import type { ObjectStorage } from "@/server/core/storage";
import type { AssetRecord, AssetRepository } from "./asset";
import { normalizeImage } from "./image-validation";

export async function uploadProjectImage(
  storage: ObjectStorage,
  assets: AssetRepository,
  input: {
    userId: string;
    projectId: string;
    body: Uint8Array;
    declaredMime?: string;
  },
): Promise<AssetRecord> {
  const image = await normalizeImage(input.body, input.declaredMime);
  const storageKey = `users/${input.userId}/projects/${input.projectId}/assets/${randomUUID()}.jpg`;
  await storage.put({
    key: storageKey,
    body: image.body,
    contentType: image.mime,
  });

  try {
    return await assets.create({
      userId: input.userId,
      projectId: input.projectId,
      kind: "SOURCE_NORMALIZED",
      storageKey,
      mime: image.mime,
      width: image.width,
      height: image.height,
      bytes: image.body.byteLength,
      checksum: image.checksum,
    });
  } catch (error) {
    await storage.delete(storageKey);
    throw error;
  }
}
