"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

import LiveTrainSearch from "@/components/LiveTrainSearch";

const RouteMap = dynamic(
  () => import("@/components/RouteMap"),
  {
    ssr: false,
  },
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                    SIH 26028
                  </span>

                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    Live ETA Forecasting
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  RailETA
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
                  AI-powered dynamic ETA forecasting for running
                  coaching trains using live journey observations,
                  route context and machine learning.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/model-intelligence"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Model Intelligence
                </Link>

                <Link
                  href="/station-display"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Station Display
                </Link>

                <Link
                  href="/control-room"
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Control Room
                </Link>
              </div>

            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-7 lg:px-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600 sm:text-sm">
              <span>
                <strong className="font-semibold text-gray-900">
                  Live Journey
                </strong>{" "}
                predictions
              </span>

              <span>
                Station-level ETA
              </span>

              <span>
                Delay risk monitoring
              </span>

              <span>
                Operational insights
              </span>
            </div>
          </div>
        </header>

        {/* Main Passenger Forecast */}
        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="mb-6 border-b border-gray-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Passenger ETA
                </p>

                <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                  Track a Running Train
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Search a train by name or number to view its
                  live journey and predicted arrival times.
                </p>
              </div>

              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                Live Prediction
              </span>
            </div>
          </div>

          <LiveTrainSearch />
        </section>

        <footer className="mt-8 pb-4 text-center text-xs text-gray-500">
          RailETA • Dynamic ETA Forecasting • SIH 26028
        </footer>

      </div>
    </main>
  );
}