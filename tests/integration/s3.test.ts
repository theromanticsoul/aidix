import { describe, expect, test } from "bun:test";

const enabled =
  Bun.env.INTEGRATION_TESTS === "true" &&
  Boolean(
    Bun.env.S3_ENDPOINT &&
      Bun.env.S3_REGION &&
      Bun.env.S3_BUCKET &&
      Bun.env.S3_ACCESS_KEY_ID &&
      Bun.env.S3_SECRET_ACCESS_KEY,
  );

describe.if(enabled)("external S3-compatible storage", () => {
  test("round-trips a private object", async () => {
    const [
      { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client },
      { getSignedUrl },
    ] = await Promise.all([
      import("@aws-sdk/client-s3"),
      import("@aws-sdk/s3-request-presigner"),
    ]);
    const client = new S3Client({
      endpoint: Bun.env.S3_ENDPOINT,
      region: Bun.env.S3_REGION,
      forcePathStyle: Bun.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: Bun.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY as string,
      },
    });
    const key = `integration-tests/${crypto.randomUUID()}.txt`;
    const body = new TextEncoder().encode("aidix");
    await client.send(
      new PutObjectCommand({
        Bucket: Bun.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: "text/plain",
      }),
    );
    const signedUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: Bun.env.S3_BUCKET, Key: key }),
      { expiresIn: 60 },
    );
    expect(signedUrl).toContain(key);
    await client.send(
      new DeleteObjectCommand({ Bucket: Bun.env.S3_BUCKET, Key: key }),
    );
  });
});
