"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(
        "Could not create your account. Please check your details and try again."
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. Check your email to confirm your account."
    );

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Sign up to start creating and managing your forms.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border px-4 py-3 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border px-4 py-3 outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="text-sm text-gray-600">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}