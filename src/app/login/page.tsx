import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/oauth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-20">
      <h1 className="font-display text-4xl text-ink-900">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-600">
        Your bag and wishlist are waiting where you left them.
      </p>
      <div className="mt-8">
        {/* AuthForm reads ?next= via useSearchParams, which needs a boundary. */}
        <Suspense fallback={null}>
          <AuthForm mode="login" googleEnabled={googleEnabled()} />
        </Suspense>
      </div>
    </div>
  );
}
