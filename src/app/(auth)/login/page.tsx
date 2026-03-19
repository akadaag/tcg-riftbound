"use client";

import { useState, useTransition } from "react";
import { signIn, signUp } from "./actions";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const action = mode === "login" ? signIn : signUp;
      const result = await action(formData);

      if (result && "error" in result && result.error) {
        setError(result.error);
      }
      if (result && "success" in result && result.success) {
        setSuccess(result.success);
      }
      // signIn redirects on success, so we only reach here on error or signup success
    });
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Riftbound Shop</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          {mode === "login"
            ? "Welcome back, shopkeeper."
            : "Create your shop account."}
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="flex flex-col gap-4">
        {/* Display Name — signup only */}
        {mode === "signup" && (
          <div>
            <label
              htmlFor="displayName"
              className="text-foreground-secondary mb-1.5 block text-sm font-medium"
            >
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="username"
              placeholder="Shopkeeper"
              className="border-card-border bg-card-background text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:ring-accent-primary/25 w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus:ring-2"
            />
          </div>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="text-foreground-secondary mb-1.5 block text-sm font-medium"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="border-card-border bg-card-background text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:ring-accent-primary/25 w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus:ring-2"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="text-foreground-secondary mb-1.5 block text-sm font-medium"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            placeholder={
              mode === "login" ? "Your password" : "Min. 6 characters"
            }
            className="border-card-border bg-card-background text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:ring-accent-primary/25 w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus:ring-2"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-success/10 text-success rounded-lg px-3 py-2 text-sm">
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent-primary hover:bg-accent-primary-hover disabled:bg-accent-primary/50 mt-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed"
        >
          {isPending
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      {/* Toggle mode */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setSuccess(null);
          }}
          className="text-accent-primary hover:text-accent-primary-hover min-h-[44px] px-2 py-2 text-sm transition-colors"
        >
          {mode === "login"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
