"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";

/** Sign in and sign up share a form; only the fields and copy differ. */
const OAUTH_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "That sign-in attempt timed out. Please try again.",
  google_state: "That sign-in link was not valid. Please try again.",
  google_unavailable: "Google sign-in is not available right now.",
  google_failed: "We could not complete Google sign-in. Please try again.",
};

export function AuthForm({
  mode,
  googleEnabled = false,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  // Only ever an in-app path, so a crafted ?next= cannot bounce a signed-in
  // shopper to another origin.
  const raw = params.get("next") ?? "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  // A failed Google round-trip lands back here with ?error=…; surfacing it
  // matters, because the alternative is a redirect that silently did nothing.
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""];

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
    <div className="space-y-5">
      {!error && oauthError && (
        <p role="alert" className="text-sm text-danger">
          {oauthError}
        </p>
      )}

      {googleEnabled && (
        <>
          <a
            href={`/api/v1/auth/google?next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-card px-6 py-3 text-sm font-medium text-ink-900 transition hover:border-royal-200"
          >
            <svg viewBox="0 0 18 18" className="h-4.5 w-4.5" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </a>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs uppercase tracking-widest text-ink-400">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

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
    </div>
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
