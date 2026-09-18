import { createHash } from "node:crypto";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type NormalizedImage = {
  body: Uint8Array;
  width: number;
  height: number;
  mime: "image/jpeg";
  checksum: string;
};

export async function normalizeImage(
  input: Uint8Array,
  declaredMime?: string,
): Promise<NormalizedImage> {
  if (input.byteLength === 0 || input.byteLength > MAX_IMAGE_BYTES)
    throw new Error("IMAGE_SIZE_INVALID");
  if (declaredMime && !SUPPORTED_MIME_TYPES.has(declaredMime))
    throw new Error("IMAGE_TYPE_INVALID");

  try {
    const normalized = await sharp(input)
      .rotate()
      .toColorspace("srgb")
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    return {
      body: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      mime: "image/jpeg",
      checksum: createHash("sha256").update(normalized.data).digest("hex"),
    };
  } catch {
    throw new Error("IMAGE_INVALID");
  }
}
