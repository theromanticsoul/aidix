import * as v from "valibot";

export const emailOtpSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
});

export type EmailOtpInput = v.InferInput<typeof emailOtpSchema>;

export const otpSchema = v.object({
  otp: v.pipe(v.string(), v.trim(), v.minLength(4), v.maxLength(12)),
});

export type OtpInput = v.InferInput<typeof otpSchema>;
