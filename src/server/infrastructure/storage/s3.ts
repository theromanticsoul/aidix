import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/server/config/env/server";
import type {
  ObjectStorage,
  PutObjectInput,
  StoredObject,
} from "@/server/core/storage";

function createClient(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: serverEnv.S3_REGION,
    forcePathStyle: serverEnv.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: serverEnv.S3_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.S3_SECRET_ACCESS_KEY,
    },
  });
}

const client = createClient(serverEnv.S3_ENDPOINT);
const signingClient = createClient(
  serverEnv.S3_PUBLIC_ENDPOINT ?? serverEnv.S3_ENDPOINT,
);

export class S3ObjectStorage implements ObjectStorage {
  async put(input: PutObjectInput): Promise<StoredObject> {
    await client.send(
      new PutObjectCommand({
        Bucket: serverEnv.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return {
      key: input.key,
      bytes: input.body.byteLength,
      contentType: input.contentType,
    };
  }

  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(
      signingClient,
      new GetObjectCommand({ Bucket: serverEnv.S3_BUCKET, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await client.send(
      new DeleteObjectCommand({ Bucket: serverEnv.S3_BUCKET, Key: key }),
    );
  }
}
