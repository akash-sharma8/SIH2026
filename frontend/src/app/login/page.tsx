"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn(
        "credentials",
        {
          email,
          password,
          redirect: false,
        }
      );

      if (result?.error) {
        setError(
          "Invalid email or password."
        );
        return;
      }

      window.location.assign(
        "/station-display"
      );

      setError(
        "Your account does not have a valid role."
      );
    } catch {
      setError(
        "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-cyan-400">
              RailETA Secure Access
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Staff Login
            </h1>

            <p className="mt-3 text-sm text-slate-400">
              Sign in to access station staff or control room tools.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-slate-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-400"
                placeholder="staff@raileta.local"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-400"
                placeholder="Enter password"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Demo accounts
              </p>

              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("station@raileta.local");
                    setPassword("Station@123");
                    setError("");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-4 text-left transition hover:border-cyan-400/40 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Station Staff
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        station@raileta.local
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Password: Station@123
                      </p>
                    </div>

                    <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                      Use demo
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("control@raileta.local");
                    setPassword("Control@123");
                    setError("");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-4 text-left transition hover:border-cyan-400/40 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Control Room
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        control@raileta.local
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Password: Control@123
                      </p>
                    </div>

                    <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                      Use demo
                    </span>
                  </div>
                </button>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                These accounts are provided only for demonstrating
                role-based access in RailETA.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}