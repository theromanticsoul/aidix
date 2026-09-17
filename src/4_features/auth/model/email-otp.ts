import * as v from "valibot";

export const emailOtpSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
});

export type EmailOtpInput = v.InferInput<typeof emailOtpSchema>;
