"use client";

import { useMemo, useState } from "react";

import type {
  JourneyTimeline as JourneyTimelineData,
  JourneyTimelineStation,
} from "@/lib/api/api-types";


interface JourneyTimelineProps {
  timeline: JourneyTimelineData | null | undefined;

  predictions?: Array<{
    station: {
      code: string;
      name?: string | null;
      stations_ahead: number;
    };

    forecast: {
      eta: string | null;
      predicted_delay_min: number;
      confidence: string;
    };
  }>;

  etaWeatherCorridor?: Array<{
    station_code: string;
    weather?: {
      risk_level?: string | null;
      condition?: string | null;
    } | null;
  }>;
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


function primaryTime(
  station: JourneyTimelineStation,
) {
  if (
    station.status === "PASSED"
    || station.status === "CURRENT"
  ) {
    return (
      station.actual_arrival
      ?? station.actual_departure
      ?? station.scheduled_arrival
      ?? station.scheduled_departure
    );
  }

  if (
    station.status === "NEXT"
    && station.predicted_arrival
  ) {
    return station.predicted_arrival;
  }

  return (
    station.predicted_arrival
    ?? station.scheduled_arrival
    ?? station.scheduled_departure
  );
}


function weatherRiskClass(
  risk: string | null | undefined,
) {
  switch (risk) {
    case "LOW":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "HIGH":
      return "border-rose-200 bg-rose-50 text-rose-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function timeLabel(
  station: JourneyTimelineStation,
) {
  if (
    station.status === "PASSED"
    && (
      station.actual_arrival
      || station.actual_departure
    )
  ) {
    return "Actual";
  }

  if (
    station.predicted_arrival
    && (
      station.status === "NEXT"
      || station.status === "UPCOMING"
    )
  ) {
    return "Predicted";
  }

  return "Scheduled";
}


function statusDot(
  status: JourneyTimelineStation["status"],
) {
  if (status === "PASSED") {
    return "✓";
  }

  if (status === "CURRENT") {
    return "●";
  }

  if (status === "NEXT") {
    return "●";
  }

  return "○";
}


export function JourneyTimeline({
  timeline,
  predictions = [],
  etaWeatherCorridor = [],
}: JourneyTimelineProps) {
  const [showAll, setShowAll] =
    useState(false);

  const stations =
    timeline?.stations ?? [];

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
            station.status === "CURRENT",
        );

      const nextIndex =
        stations.findIndex(
          (station) =>
            station.status === "NEXT",
        );

      const anchorIndex =
        currentIndex >= 0
          ? currentIndex
          : nextIndex >= 0
            ? nextIndex
            : timeline?.state === "COMPLETED"
              ? stations.length - 1
              : 0;

      const start = Math.max(
        0,
        Math.min(
          anchorIndex - 3,
          stations.length - 8,
        ),
      );

      return stations.slice(
        start,
        start + 8,
      );
    },
    [
      stations,
      showAll,
      timeline?.state,
    ],
  );

  if (
    !timeline
    || stations.length === 0
  ) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Journey progress
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Journey timeline
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {stations.length} scheduled stops
          </p>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {timeline.state.replaceAll(
            "_",
            " ",
          )}
        </span>
      </div>

      {/* Column headings */}
      <div className="hidden grid-cols-[40px_minmax(0,1.3fr)_115px_115px_100px_110px_110px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:grid sm:px-6">
        <span />
        <span>Station</span>
        <span>Scheduled</span>
        <span>ETA</span>
        <span>Delay</span>
        <span>Confidence</span>
        <span>Weather Risk</span>
      </div>

      {/* Stations */}
      <div>
        {visibleStations.map(
          (station, index) => {
            const delay =
              formatDelay(
                station.delay_min,
              );

            const prediction =
              predictions.find(
                (item) =>
                  item.station.code ===
                  station.station_code,
              );

            const weatherEntry =
              etaWeatherCorridor.find(
                (item) =>
                  item.station_code ===
                  station.station_code,
              );

            const weather =
              weatherEntry?.weather;

            const scheduledTime =
              station.scheduled_arrival
              ?? station.scheduled_departure;

            const isCurrent =
              station.status === "CURRENT";

            const isNext =
              station.status === "NEXT";

            const isPassed =
              station.status === "PASSED";

            return (
              <div
                key={`${station.station_code ?? "station"}-${index}`}
                className={[
                  "relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[40px_minmax(0,1.3fr)_115px_115px_100px_110px_110px] sm:items-center sm:px-6",
                  isCurrent
                    ? "bg-sky-50/80"
                    : isNext
                      ? "bg-amber-50/60"
                      : "bg-white",
                ].join(" ")}
              >

                {/* Timeline line */}
                {index <
                  visibleStations.length - 1 && (
                    <div className="absolute bottom-0 left-[35px] top-[42px] w-px bg-slate-200 sm:left-[45px]" />
                  )}

                {/* Dot */}
                <div className="relative z-10 flex items-start justify-center pt-0.5">
                  <div
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                      isPassed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isCurrent
                          ? "border-sky-600 bg-sky-600 text-white"
                          : isNext
                            ? "border-amber-300 bg-amber-100 text-amber-700"
                            : "border-slate-200 bg-white text-slate-400",
                    ].join(" ")}
                  >
                    {statusDot(
                      station.status,
                    )}
                  </div>
                </div>

                {/* Station */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-950">
                      {station.station_name
                        ?? station.station_code
                        ?? "Unknown station"}
                    </p>

                    {station.station_code && (
                      <span className="text-xs text-slate-400">
                        {station.station_code}
                      </span>
                    )}

                    {(isCurrent || isNext) && (
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          isCurrent
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700",
                        ].join(" ")}
                      >
                        {isCurrent
                          ? "Current"
                          : "Next"}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    {station.distance_from_source_km !==
                      null && (
                        <span>
                          {Math.round(
                            station.distance_from_source_km,
                          )}{" "}
                          km
                        </span>
                      )}

                    <span className="sm:hidden">
                      {timeLabel(station)}:{" "}
                      <strong className="font-semibold text-slate-700">
                        {formatTime(
                          primaryTime(
                            station,
                          ),
                        )}
                      </strong>
                    </span>
                  </div>

                  {/* Mobile prediction details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Scheduled
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {formatTime(scheduledTime)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        ETA
                      </p>

                      <p className="mt-1 text-xs font-semibold text-sky-700">
                        {prediction?.forecast.eta
                          ? formatTime(
                            prediction.forecast.eta,
                          )
                          : "--"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Delay
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {prediction
                          ? prediction.forecast.predicted_delay_min > 0
                            ? `+${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                            : prediction.forecast.predicted_delay_min < 0
                              ? `${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                              : "On time"
                          : "--"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Confidence
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {prediction?.forecast.confidence
                          ?? "--"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Weather Risk
                      </p>

                      {weather?.risk_level ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${weatherRiskClass(
                              weather.risk_level,
                            )}`}
                          >
                            {weather.risk_level}
                          </span>

                          {weather.condition && (
                            <span className="text-[10px] text-slate-500">
                              {weather.condition}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">
                          --
                        </p>
                      )}
                    </div>

                  </div>
                </div>

                {/* Scheduled */}
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700">
                    {formatTime(scheduledTime)}
                  </p>
                </div>

                {/* ETA */}
                <div className="hidden sm:block">
                  <p
                    className={[
                      "text-sm font-semibold",
                      isNext
                        ? "text-sky-700"
                        : "text-slate-800",
                    ].join(" ")}
                  >
                    {prediction?.forecast.eta
                      ? formatTime(
                        prediction.forecast.eta,
                      )
                      : "--"}
                  </p>
                </div>

                {/* Delay */}
                <div className="hidden sm:block">
                  {prediction ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {prediction.forecast.predicted_delay_min > 0
                        ? `+${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                        : prediction.forecast.predicted_delay_min < 0
                          ? `${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                          : "On time"}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      --
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div className="hidden sm:block">
                  {prediction ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                      {prediction.forecast.confidence}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      --
                    </span>
                  )}
                </div>

                {/* Weather risk */}
                <div className="hidden sm:block">
                  {weather?.risk_level ? (
                    <>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${weatherRiskClass(
                          weather.risk_level,
                        )}`}
                      >
                        {weather.risk_level}
                      </span>
                      {weather.condition && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {weather.condition}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">
                      --
                    </span>
                  )}
                </div>

              </div>
            );
          },
        )}
      </div>

      {/* Show all */}
      {stations.length > 8 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() =>
              setShowAll(
                (current) =>
                  !current,
              )
            }
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            {showAll
              ? "Show relevant stations"
              : `View all ${stations.length} stops`}
          </button>
        </div>
      )}

    </section>
  );
}