import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { normalizeImage } from "@/server/core/assets/image-validation";

describe("image normalization", () => {
  test("normalizes supported image bytes to jpeg and strips metadata", async () => {
    const source = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const result = await normalizeImage(source, "image/png");
    expect(result.mime).toBe("image/jpeg");
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.checksum).toHaveLength(64);
  });

  test("rejects unsupported declared mime types", async () => {
    await expect(
      normalizeImage(new Uint8Array([1]), "image/gif"),
    ).rejects.toThrow("IMAGE_TYPE_INVALID");
  });
});
