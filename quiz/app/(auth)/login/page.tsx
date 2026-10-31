"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    try {
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true,
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      {/* Logo Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-block border border-emerald-500/20 px-4 py-1.5 rounded-full text-sm bg-emerald-500/10 text-emerald-300 font-medium">
          Welcome Back
        </div>
        <h1 className="text-3xl myfont md:text-4xl font-bold text-white">
          Sign in to Quiz Battle
        </h1>
        <p className="text-zinc-400 max-w-sm mx-auto myfont2">
          Join thousands of quiz enthusiasts and start your journey today
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Error: {error}</p>
          </div>
        )}

        <div className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-xl p-8 shadow-xl shadow-black/20">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-zinc-900 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              By signing in, you agree to our{" "}
              <a href="#" className="text-emerald-500 hover:text-emerald-400">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-emerald-500 hover:text-emerald-400">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
