import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200 ${className}`}
      {...props}
    />
  );
}
