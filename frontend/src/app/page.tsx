"use client";
import Link from "next/link";
import { useState } from "react";
import LiveTrainSearch from "@/components/LiveTrainSearch";
import PredepartureForecast from "@/components/PredepartureForecast";
import dynamic from "next/dynamic";

const RouteMap = dynamic(
  () => import("@/components/RouteMap"),
  {
    ssr: false,
  }
);


type ForecastMode =
  | "live"
  | "predeparture";


export default function Home() {
  const [mode, setMode] =
    useState<ForecastMode>("live");



  return (
    <main className="min-h-screen bg-gray-50 px-3 py-4 text-gray-900 sm:px-4 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-8">

        <header className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                SIH 26028
              </p>

              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                RailETA
              </h1>

              <p className="mt-2 max-w-2xl text-gray-600">
                Dynamic and leakage-safe ETA
                forecasting for coaching trains.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border bg-gray-50 px-4 py-2 text-sm font-medium">
                AI Forecasting System
              </div>

              <Link
                href="/model-intelligence"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Model Intelligence
              </Link>

              <Link
                href="/station-display"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Station Display
              </Link>

              <Link
                href="/control-room"
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Control Room
              </Link>
            </div>
          </div>
        </header>


        <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() =>
                setMode("live")
              }
              className={
                mode === "live"
                  ? "rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white sm:px-4 sm:py-3 sm:text-base"
                  : "rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:px-4 sm:py-3 sm:text-base"
              }
            >
              Running Train
            </button>

            <button
              type="button"
              onClick={() =>
                setMode("predeparture")
              }
              className={
                mode === "predeparture"
                  ? "rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
                  : "rounded-xl px-4 py-3 font-medium text-gray-600 hover:bg-gray-100"
              }
            >
              Before Departure
            </button>

          </div>
        </section>


        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          {mode === "live" ? (
            <LiveTrainSearch />
          ) : (
            <PredepartureForecast />
          )}
        </section>


        <footer className="pb-4 text-center text-xs text-gray-500">
          RailETA • Dynamic ETA Forecasting • SIH 26028
        </footer>

      </div>
    </main>
  );
}