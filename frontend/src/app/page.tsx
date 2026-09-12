"use client";

import Link from "next/link";

import AppNavbar from "@/components/AppNavbar";
import LiveTrainSearch from "@/components/LiveTrainSearch";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-slate-950">

      <AppNavbar role="Passenger" />

      <div className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 lg:pt-14">

        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Prediction engine online
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            RailETA
          </h1>

          <p className="mt-2 text-lg font-semibold text-[#0876c9]">
            Dynamic ETA Intelligence for Indian Railways
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            AI-powered real-time arrival prediction for passengers
            and railway operations.
          </p>
        </section>

        {/* Live search */}
        <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Live train ETA
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Track a running train
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live prediction
            </span>
          </div>

          <LiveTrainSearch />

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs leading-5 text-slate-500">
              RailETA combines live train movement, delay patterns,
              route context and machine-learning predictions to
              dynamically forecast station-level arrival times.
            </p>
          </div>
        </section>

        {/* Product surfaces */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">

          <Link
            href="/"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              ◉
            </div>

            <h3 className="mt-5 font-semibold text-slate-950">
              Passengers
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Predicted arrival, expected delay, journey timeline
              and live route information.
            </p>

            <p className="mt-6 text-sm font-medium text-sky-700">
              Open live train →
            </p>
          </Link>

          <Link
            href="/station-display"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              ▣
            </div>

            <h3 className="mt-5 font-semibold text-slate-950">
              Station staff
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Station-focused arrivals with predicted times,
              delay information and operational context.
            </p>

            <p className="mt-6 text-sm font-medium text-sky-700">
              Open station board →
            </p>
          </Link>

          <Link
            href="/control-room"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              ◎
            </div>

            <h3 className="mt-5 font-semibold text-slate-950">
              Control room
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Operational monitoring, delay intelligence and
              prediction reliability.
            </p>

            <p className="mt-6 text-sm font-medium text-sky-700">
              Open operations →
            </p>
          </Link>

        </section>

        {/* Secondary navigation */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/model-intelligence"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-sky-200"
          >
            <span>
              Model intelligence & error metrics
            </span>

            <span className="text-slate-400">
              →
            </span>
          </Link>

          <Link
            href="/control-room"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-sky-200"
          >
            <span>
              Operational monitoring
            </span>

            <span className="text-slate-400">
              →
            </span>
          </Link>
        </section>

        {/* Truthfulness note */}
        <div className="mt-7 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">
          Predictions are generated from available live journey
          observations and model outputs. Missing or unavailable
          information is not fabricated.
        </div>

      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6">
          <span>
            RailETA — Dynamic ETA prediction and decision support.
          </span>

          <span>
            SIH 2026 · Problem Statement 26028
          </span>
        </div>
      </footer>
    </main>
  );
}