"use client";

import { Field, Form, useForm } from "@formisch/react";
import { useState } from "react";
import {
  type EmailOtpInput,
  emailOtpSchema,
  type OtpInput,
  otpSchema,
} from "@/4_features/auth";
import { authClient } from "@/6_shared/auth/client";
import { Button, Input } from "@/6_shared/ui";

export function EmailOtpLogin() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const emailForm = useForm({
    schema: emailOtpSchema,
    initialInput: { email: "" },
  });
  const codeForm = useForm({ schema: otpSchema, initialInput: { otp: "" } });

  const requestCode = async (input: EmailOtpInput) => {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: input.email,
      type: "sign-in",
    });
    if (result.error)
      throw new Error("Не удалось отправить код. Попробуйте ещё раз.");
    setEmail(input.email);
    setCodeSent(true);
  };

  const verifyCode = async (input: OtpInput) => {
    const result = await authClient.signIn.emailOtp({ email, otp: input.otp });
    if (result.error)
      throw new Error("Код неверный или истёк. Запросите новый код.");
    window.location.assign("/app");
  };

  if (codeSent) {
    return (
      <div className="flex max-w-md flex-col gap-6">
        <div>
          <p className="text-sm text-slate-500">Код отправлен на</p>
          <p className="mt-1 font-medium">{email}</p>
        </div>
        <Form
          of={codeForm}
          onSubmit={verifyCode}
          className="flex flex-col gap-4"
        >
          <Field of={codeForm} path={["otp"]}>
            {(field) => (
              <label
                className="flex flex-col gap-2 text-sm font-medium"
                htmlFor="otp-code"
              >
                Одноразовый код
                <Input
                  {...field.props}
                  id="otp-code"
                  value={field.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  aria-invalid={field.errors ? true : undefined}
                />
                {field.errors?.[0] && (
                  <span className="font-normal text-red-600">
                    {field.errors[0]}
                  </span>
                )}
              </label>
            )}
          </Field>
          <Button type="submit" disabled={codeForm.isSubmitting}>
            {codeForm.isSubmitting ? "Проверяем..." : "Войти"}
          </Button>
        </Form>
        <div className="flex gap-4 text-sm">
          <button
            className="text-slate-600 underline"
            type="button"
            onClick={() => setCodeSent(false)}
          >
            Изменить email
          </button>
          <button
            className="text-slate-600 underline"
            type="button"
            onClick={() => void requestCode({ email })}
          >
            Отправить код ещё раз
          </button>
        </div>
        {codeForm.errors?.[0] && (
          <p className="text-sm text-red-600" role="alert">
            {codeForm.errors[0]}
          </p>
        )}
      </div>
    );
  }

  return (
    <Form
      of={emailForm}
      onSubmit={requestCode}
      className="flex max-w-md flex-col gap-6"
    >
      <Field of={emailForm} path={["email"]}>
        {(field) => (
          <label
            className="flex flex-col gap-2 text-sm font-medium"
            htmlFor="login-email"
          >
            Email
            <Input
              {...field.props}
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={field.input}
              aria-invalid={field.errors ? true : undefined}
            />
            {field.errors?.[0] && (
              <span className="font-normal text-red-600">
                {field.errors[0]}
              </span>
            )}
          </label>
        )}
      </Field>
      <Button type="submit" disabled={emailForm.isSubmitting}>
        {emailForm.isSubmitting ? "Отправляем..." : "Получить код"}
      </Button>
      <p className="text-sm leading-6 text-slate-500">
        Пароль не нужен. Мы отправим одноразовый код на email.
      </p>
      {emailForm.errors?.[0] && (
        <p className="text-sm text-red-600" role="alert">
          {emailForm.errors[0]}
        </p>
      )}
    </Form>
  );
}
