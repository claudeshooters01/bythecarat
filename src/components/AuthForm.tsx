"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";

/** Sign in and sign up share a form; only the fields and copy differ. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  // Only ever an in-app path, so a crafted ?next= cannot bounce a signed-in
  // shopper to another origin.
  const raw = params.get("next") ?? "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const body = JSON.stringify(
      mode === "signup"
        ? {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          },
    );

    try {
      await api(`/api/v1/auth/${mode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        body,
      });
      router.push(next);
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <Field label="Full name" name="name" autoComplete="name" required />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={mode === "signup" ? 8 : undefined}
        required
      />

      {mode === "signup" && (
        <p className="text-xs text-ink-400">At least 8 characters.</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-royal-600 px-6 py-3 text-sm font-semibold text-on-accent hover:bg-royal-700 disabled:opacity-50"
      >
        {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      <p className="pt-2 text-center text-sm text-ink-600">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-royal-600 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-royal-600 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: { label: string; name: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-900">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink-900 focus:border-royal-500 focus:outline-none"
      />
    </label>
  );
}
