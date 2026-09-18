import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-700"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${styles} ${className}`}
      {...props}
    />
  );
}
