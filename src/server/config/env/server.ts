import { createEnv } from "@t3-oss/env-nextjs";
import * as v from "valibot";

const requiredUrl = v.pipe(v.string(), v.url());
const requiredText = v.pipe(v.string(), v.minLength(1));
const port = v.pipe(
  v.string(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
);
const booleanText = v.pipe(
  v.picklist(["true", "false"]),
  v.transform((value) => value === "true"),
);

export const serverEnv = createEnv({
  server: {
    DATABASE_URL: requiredUrl,
    BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
    BETTER_AUTH_URL: requiredUrl,
    APP_URL: requiredUrl,
    SMTP_HOST: requiredText,
    SMTP_PORT: port,
    SMTP_SECURE: booleanText,
    SMTP_USER: requiredText,
    SMTP_PASSWORD: requiredText,
    SMTP_FROM_EMAIL: v.pipe(v.string(), v.email()),
    SMTP_FROM_NAME: requiredText,
    S3_ENDPOINT: requiredUrl,
    S3_REGION: requiredText,
    S3_BUCKET: requiredText,
    S3_ACCESS_KEY_ID: requiredText,
    S3_SECRET_ACCESS_KEY: requiredText,
    S3_FORCE_PATH_STYLE: booleanText,
    KIE_API_BASE_URL: requiredUrl,
    KIE_API_KEY: requiredText,
    KIE_IMAGE_MODEL: requiredText,
    ROBOKASSA_MERCHANT_LOGIN: requiredText,
    ROBOKASSA_PASSWORD_1: requiredText,
    ROBOKASSA_PASSWORD_2: requiredText,
    ROBOKASSA_HASH_ALGORITHM: requiredText,
    ROBOKASSA_IS_TEST: booleanText,
  },
  runtimeEnv: process.env as Record<
    string,
    string | number | boolean | undefined
  >,
  emptyStringAsUndefined: true,
});
