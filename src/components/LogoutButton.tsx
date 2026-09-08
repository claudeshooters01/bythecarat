"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signOut() {
    setPending(true);
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="text-ink-600 hover:text-ink-900 disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
