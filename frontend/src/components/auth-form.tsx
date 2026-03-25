"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/session";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isSignUp) {
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      router.push("/workspace");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_42%,_#fff9ea_100%)] px-4 py-6 text-[#032147] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top,_rgba(32,157,215,0.18),_transparent_38%),linear-gradient(145deg,_rgba(255,255,255,0.94),_rgba(255,248,230,0.9))] p-8 shadow-[0_30px_90px_rgba(3,33,71,0.12)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-[#209dd7]">
            MicroPrelegal
          </p>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-[#032147]">
            Legal drafting that stays organized for each user.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#4b607e]">
            Sign in to continue drafting, revisit prior agreements, and export a current working
            draft. Every generated document remains a draft that requires legal review.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Saved drafts
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                Reopen the same drafting session with its prior chat history and preview.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Guided drafting
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                Stay inside the supported catalog and refine the agreement turn by turn.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Review ready
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                Export a working draft for legal review once the core terms are in place.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#d8e6f2] bg-white p-8 shadow-[0_30px_90px_rgba(3,33,71,0.14)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#753991]">
            {isSignUp ? "Create account" : "Sign in"}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#032147]">
            {isSignUp ? "Start a saved drafting workspace" : "Continue your saved drafting work"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#66758f]">
            {isSignUp
              ? "Create a temporary account for this running server session."
              : "Use the account you created in this running server session."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {isSignUp ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#032147]">Name</span>
                <input
                  className="rounded-[1.25rem] border border-[#c8d9e8] bg-[#fdfefe] px-4 py-3 text-sm text-[#032147] outline-none transition focus:border-[#209dd7] focus:ring-4 focus:ring-[#209dd7]/15"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Avery Stone"
                  required
                  value={name}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#032147]">Email</span>
              <input
                className="rounded-[1.25rem] border border-[#c8d9e8] bg-[#fdfefe] px-4 py-3 text-sm text-[#032147] outline-none transition focus:border-[#209dd7] focus:ring-4 focus:ring-[#209dd7]/15"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="avery@northstarlabs.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#032147]">Password</span>
              <input
                className="rounded-[1.25rem] border border-[#c8d9e8] bg-[#fdfefe] px-4 py-3 text-sm text-[#032147] outline-none transition focus:border-[#209dd7] focus:ring-4 focus:ring-[#209dd7]/15"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="w-full rounded-full bg-[#753991] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#62307a] disabled:cursor-not-allowed disabled:bg-[#9f7bb4]"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm leading-6 text-[#66758f]">
            {isSignUp ? "Already have an account?" : "Need to create an account?"}{" "}
            <Link
              className="font-semibold text-[#753991] transition hover:text-[#62307a]"
              href={isSignUp ? "/login" : "/signup"}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
