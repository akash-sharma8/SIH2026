"use client";

import { useMemo, useState } from "react";

import type {
  JourneyTimeline as JourneyTimelineData,
  JourneyTimelineStation,
} from "@/lib/api/api-types";


interface JourneyTimelineProps {
  timeline: JourneyTimelineData | null | undefined;
}


function formatTime(
  value: string | null,
) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  );
}


function formatDelay(
  delay: number | null,
) {
  if (delay === null) {
    return null;
  }

  if (Math.abs(delay) < 1) {
    return "On time";
  }

  if (delay > 0) {
    return `+${Math.round(delay)} min`;
  }

  return `${Math.round(delay)} min`;
}


function stationDot(
  station: JourneyTimelineStation,
) {
  if (station.status === "PASSED") {
    return "✓";
  }

  if (station.status === "CURRENT") {
    return "●";
  }

  if (station.status === "NEXT") {
    return "●";
  }

  return "○";
}


export function JourneyTimeline({
  timeline,
}: JourneyTimelineProps) {
  const [showAll, setShowAll] =
    useState(false);

  const stations = (
    timeline?.stations ?? []
  );

  const visibleStations = useMemo(
    () => {
      if (
        showAll
        || stations.length <= 8
      ) {
        return stations;
      }

      const currentIndex =
        stations.findIndex(
          (station) =>
            station.status ===
            "CURRENT",
        );

      const nextIndex =
        stations.findIndex(
          (station) =>
            station.status ===
            "NEXT",
        );

      const anchorIndex =
        currentIndex >= 0
          ? currentIndex
          : nextIndex >= 0
            ? nextIndex
            : 0;

      const start = Math.max(
        0,
        anchorIndex - 2,
      );

      return stations.slice(
        start,
        start + 8,
      );
    },
    [
      stations,
      showAll,
    ],
  );

  if (!timeline || stations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Journey Timeline
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {stations.length} stations in this journey
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {timeline.state.replaceAll(
            "_",
            " ",
          )}
        </span>
      </div>

      <div>
        {visibleStations.map(
          (station, index) => {
            const delay =
              formatDelay(
                station.delay_min,
              );

            const actualAvailable =
              Boolean(
                station.actual_arrival
                || station.actual_departure,
              );

            const predictionAvailable =
              Boolean(
                station.predicted_arrival,
              );

            return (
              <div
                key={`${station.station_code ?? "station"}-${index}`}
                className="relative grid grid-cols-[32px_1fr] gap-3"
              >
                {index <
                  visibleStations.length -
                    1 && (
                  <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-200" />
                )}

                <div
                  className={[
                    "relative z-10 mt-1 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                    station.status ===
                    "PASSED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : station.status ===
                          "CURRENT"
                        ? "border-blue-300 bg-blue-600 text-white"
                        : station.status ===
                            "NEXT"
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-400",
                  ].join(" ")}
                >
                  {stationDot(
                    station,
                  )}
                </div>

                <div className="border-b border-slate-100 pb-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">
                          {station.station_name ??
                            station.station_code ??
                            "Unknown station"}
                        </p>

                        {station.station_code && (
                          <span className="text-xs text-slate-400">
                            {station.station_code}
                          </span>
                        )}

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {station.status}
                        </span>
                      </div>

                      {station.distance_from_source_km !==
                        null && (
                        <p className="mt-1 text-xs text-slate-400">
                          {Math.round(
                            station.distance_from_source_km,
                          )}{" "}
                          km from source
                        </p>
                      )}
                    </div>

                    {delay && (
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          station.delay_min !==
                            null &&
                          station.delay_min >
                            0
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {delay}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">
                        Scheduled Arrival
                      </p>
                      <p className="mt-0.5 font-medium text-slate-700">
                        {formatTime(
                          station.scheduled_arrival,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Scheduled Departure
                      </p>
                      <p className="mt-0.5 font-medium text-slate-700">
                        {formatTime(
                          station.scheduled_departure,
                        )}
                      </p>
                    </div>

                    {actualAvailable && (
                      <>
                        <div>
                          <p className="text-xs text-slate-400">
                            Actual Arrival
                          </p>
                          <p className="mt-0.5 font-medium text-slate-950">
                            {formatTime(
                              station.actual_arrival,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Actual Departure
                          </p>
                          <p className="mt-0.5 font-medium text-slate-950">
                            {formatTime(
                              station.actual_departure,
                            )}
                          </p>
                        </div>
                      </>
                    )}

                    {predictionAvailable && (
                      <div>
                        <p className="text-xs text-blue-500">
                          RailETA Prediction
                        </p>
                        <p className="mt-0.5 font-semibold text-blue-700">
                          {formatTime(
                            station.predicted_arrival,
                          )}
                        </p>
                      </div>
                    )}

                    {station.platform && (
                      <div>
                        <p className="text-xs text-slate-400">
                          Platform
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {station.platform}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>

      {stations.length > 8 && (
        <button
          type="button"
          onClick={() =>
            setShowAll(
              (current) =>
                !current,
            )
          }
          className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {showAll
            ? "Show relevant stations"
            : `View all ${stations.length} stations`}
        </button>
      )}
    </section>
  );
}