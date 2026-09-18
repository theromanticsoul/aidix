import Link from "next/link";
import { EmailOtpLogin } from "@/4_features/auth/ui/email-otp-login";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Link className="text-xl font-semibold" href="/">
        AIDIX
      </Link>
      <section className="mx-auto mt-24 max-w-md">
        <p className="text-sm text-slate-500">Вход без пароля</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Войдите в AIDIX
        </h1>
        <p className="mt-4 text-slate-600">
          После первого подтверждённого входа вам будут доступны 3 бесплатные
          генерации.
        </p>
        <div className="mt-10">
          <EmailOtpLogin />
        </div>
      </section>
    </main>
  );
}
