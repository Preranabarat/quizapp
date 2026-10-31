// src/components/auth/SignOutButton.tsx
"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
    >
      Sign Out
    </button>
  );
}