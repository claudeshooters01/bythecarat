import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-20">
      <h1 className="font-display text-4xl text-ink-900">Create an account</h1>
      <p className="mt-2 text-sm text-ink-600">
        Track orders, save pieces, and keep your certificates in one place.
      </p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
