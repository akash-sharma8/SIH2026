"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    railEtaApi,
} from "@/lib/api/raileta-api";
import type {
    LiveForecastResponse,
    TrainSearchResult,
} from "@/lib/api/api-types";

function formatTime(value?: string | null) {
    if (!value) {
        return "--";
    }

    return new Date(value).toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        },
    );
}

function getTodayLocalDate() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
        now.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function StationDisplayPage() {
    const [query, setQuery] = useState("");
    const [trainNumber, setTrainNumber] =
        useState("");
    const [searchResults, setSearchResults] =
        useState<TrainSearchResult[]>([]);
    const [result, setResult] =
        useState<LiveForecastResponse | null>(
            null,
        );

    const [
        journeyDate,
        setJourneyDate,
    ] = useState(
        getTodayLocalDate(),
    );
    const [loading, setLoading] =
        useState(false);
    const [error, setError] =
        useState<string | null>(null);

    const [
        currentTime,
        setCurrentTime,
    ] = useState(new Date());

    useEffect(() => {
        const trimmed =
            query.trim();

        if (trimmed.length < 2) {
            return;
        }

        let ignore = false;

        const timer =
            window.setTimeout(
                async () => {
                    try {
                        const response =
                            await railEtaApi
                                .searchTrains(
                                    trimmed,
                                    6,
                                );

                        if (!ignore) {
                            setSearchResults(
                                response.results
                                ?? [],
                            );
                        }
                    } catch {
                        if (!ignore) {
                            setSearchResults([]);
                        }
                    }
                },
                350,
            );

        return () => {
            ignore = true;
            window.clearTimeout(timer);
        };
    }, [query]);

    useEffect(() => {
        const interval =
            window.setInterval(() => {
                setCurrentTime(new Date());
            }, 1000);

        return () =>
            window.clearInterval(interval);
    }, []);

    function handleSearch(
        value: string,
    ) {
        setQuery(value);

        if (value.trim().length < 2) {
            setSearchResults([]);
        }
    }

    function selectTrain(
        train: TrainSearchResult,
    ) {
        setTrainNumber(
            train.train_number,
        );

        setQuery(
            `${train.train_number} — ${train.train_name}`,
        );

        setSearchResults([]);
    }

    async function loadTrain() {
        if (!trainNumber.trim()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response =
                await railEtaApi.getLiveForecast({
                    train_number:
                        trainNumber.trim(),
                    journey_date:
                        journeyDate,
                });

            setResult(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load train data.",
            );
        } finally {
            setLoading(false);
        }
    }

    const nextPrediction =
        result?.predictions?.[0] ?? null;

    const livePositionSource =
        result?.route?.current_position
            ?.position_source
        ?? null;

    const isCompleted =
        result !== null
        && (
            result.journey.upcoming_stations === 0
            || result.journey.state_source
            === "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
        );

    const isScheduled =
        result?.journey.state_source
        === "SCHEDULED_NOT_STARTED";

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">
                            RailETA
                        </p>

                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                            Station Display
                        </h1>

                        <p className="mt-2 text-sm text-slate-400">
                            Live arrival intelligence
                            for station boards and
                            operations screens.
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                        <a
                            href="/"
                            className="inline-flex w-fit rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            Passenger View
                        </a>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-400" />
                                Live Display
                            </span>

                            <span>
                                {currentTime.toLocaleTimeString(
                                    "en-IN",
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        hour12: true,
                                    },
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 max-w-xs">
                        <label
                            htmlFor="station-journey-date"
                            className="mb-1 block text-sm font-semibold text-slate-300"
                        >
                            Journey Date
                        </label>

                        <input
                            id="station-journey-date"
                            type="date"
                            value={journeyDate}
                            onChange={(event) => {
                                setJourneyDate(
                                    event.target.value,
                                );

                                setResult(null);
                            }}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                            Defaults to today.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <input
                                value={query}
                                onChange={(event) =>
                                    handleSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Search train name or number"
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                            />

                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                                    {searchResults.map(
                                        (train) => (
                                            <button
                                                key={
                                                    train.train_number
                                                }
                                                type="button"
                                                onClick={() =>
                                                    selectTrain(
                                                        train,
                                                    )
                                                }
                                                className="flex w-full items-start justify-between border-b border-white/10 px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
                                            >
                                                <div>
                                                    <p className="font-semibold">
                                                        {
                                                            train.train_name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {
                                                            train.train_number
                                                        }
                                                    </p>
                                                </div>

                                                <p className="text-xs text-slate-500">
                                                    {train.source_code
                                                        ?? ""}
                                                    {" → "}
                                                    {train.destination_code
                                                        ?? ""}
                                                </p>
                                            </button>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={loadTrain}
                            disabled={
                                loading
                                || !trainNumber
                            }
                            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                        >
                            {loading
                                ? "Loading..."
                                : "Show Train"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                {!result && !loading && (
                    <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-12 text-center">
                        <p className="text-xl font-semibold">
                            Select a train to start
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            Live ETA, delay,
                            confidence and disruption
                            information will appear
                            here.
                        </p>
                    </div>
                )}

                {result && (
                    <div className="mt-8 space-y-6">

                        {/* Train identity */}
                        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                                        Train
                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
                                        {result.journey
                                            .train_name
                                            ?? "Train"}
                                    </h2>

                                    <p className="mt-3 text-xl font-semibold text-blue-400">
                                        {
                                            result.journey
                                                .train_number
                                        }
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-400">
                                        Journey:{" "}
                                        {journeyDate === getTodayLocalDate()
                                            ? "Today"
                                            : journeyDate}
                                    </p>
                                </div>

                                <div
                                    className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${isCompleted
                                        ? "bg-green-500/20 text-green-300"
                                        : isScheduled
                                            ? "bg-yellow-500/20 text-yellow-300"
                                            : "bg-blue-500/20 text-blue-300"
                                        }`}
                                >
                                    {isCompleted
                                        ? "COMPLETED"
                                        : isScheduled
                                            ? "SCHEDULED"
                                            : "RUNNING"}
                                </div>
                            </div>
                        </div>

                        {/* Data freshness strip */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="flex items-center gap-2 text-slate-300">
                                    <span className="h-2 w-2 rounded-full bg-green-400" />
                                    Live data active
                                </span>

                                <span className="text-slate-400">
                                    Cache:{" "}
                                    <span className="font-semibold text-slate-200">
                                        {result.backend
                                            ?.provider_payload_cache
                                            ?? "Unavailable"}
                                    </span>
                                </span>
                            </div>

                            <div className="text-slate-400">
                                Display time:{" "}
                                <span className="font-semibold text-slate-200">
                                    {currentTime.toLocaleTimeString(
                                        "en-IN",
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                            hour12: true,
                                        },
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Main station board */}
                        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">

                            <div className="rounded-3xl bg-white p-6 text-slate-950 sm:p-8">
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                                    {isCompleted
                                        ? "Final Station"
                                        : isScheduled
                                            ? "Starts From"
                                            : "Next Arrival"}
                                </p>

                                <p className="mt-3 text-4xl font-black sm:text-6xl">
                                    {isCompleted
                                        ? result.journey
                                            .current_station_name
                                        ?? result.journey
                                            .current_station_code
                                        ?? "Unavailable"
                                        : isScheduled
                                            ? result.journey
                                                .source
                                                ?.station_name
                                            ?? result.journey
                                                .source
                                                ?.station_code
                                            ?? "Unavailable"
                                            : nextPrediction
                                                ?.station
                                                .name
                                            ?? nextPrediction
                                                ?.station
                                                .code
                                            ?? "Unavailable"}
                                </p>

                                {!isCompleted
                                    && !isScheduled
                                    && nextPrediction && (
                                        <p className="mt-2 text-lg text-slate-500">
                                            {
                                                nextPrediction
                                                    .station
                                                    .code
                                            }
                                        </p>
                                    )}

                                <div className="mt-8">
                                    <p className="text-sm font-semibold uppercase text-slate-500">
                                        {isScheduled
                                            ? "Scheduled Departure"
                                            : "Expected Arrival"}
                                    </p>

                                    <p className="mt-2 text-5xl font-black sm:text-7xl">
                                        {isScheduled
                                            ? formatTime(
                                                result.journey
                                                    .source
                                                    ?.scheduled_departure,
                                            )
                                            : nextPrediction
                                                ?.forecast
                                                .eta
                                                ? formatTime(
                                                    nextPrediction
                                                        .forecast
                                                        .eta,
                                                )
                                                : "--"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">

                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Delay
                                    </p>

                                    <p className="mt-2 text-3xl font-bold">
                                        {isScheduled
                                            ? "N/A"
                                            : nextPrediction
                                                ? `${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                : result.journey.current_delay_min != null
                                                    ? `${result.journey.current_delay_min} min`
                                                    : "Unavailable"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Confidence
                                    </p>

                                    <p className="mt-2 text-3xl font-bold">
                                        {nextPrediction
                                            ?.forecast
                                            .confidence
                                            ?? "N/A"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Current Position
                                    </p>

                                    <p className="mt-2 text-xl font-bold">
                                        {result.journey
                                            .current_station_name
                                            ?? result.journey
                                                .current_station_code
                                            ?? "Unavailable"}
                                    </p>

                                    <div className="mt-3">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${livePositionSource
                                                === "REAL_PROVIDER_GPS"
                                                ? "bg-green-500/20 text-green-300"
                                                : livePositionSource
                                                    === "CURRENT_STATION"
                                                    ? "bg-blue-500/20 text-blue-300"
                                                    : livePositionSource
                                                        === "ESTIMATED_BETWEEN_STATIONS"
                                                        ? "bg-yellow-500/20 text-yellow-300"
                                                        : "bg-white/10 text-slate-400"
                                                }`}
                                        >
                                            {livePositionSource
                                                === "REAL_PROVIDER_GPS"
                                                ? "Live GPS"
                                                : livePositionSource
                                                    === "CURRENT_STATION"
                                                    ? "Station Position"
                                                    : livePositionSource
                                                        === "ESTIMATED_BETWEEN_STATIONS"
                                                        ? "Estimated Position"
                                                        : "Position Source Unavailable"}
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Platform
                                    </p>

                                    <p className="mt-2 text-3xl font-bold">
                                        {result.journey
                                            .timeline
                                            ?.stations
                                            .find(
                                                (
                                                    station,
                                                ) =>
                                                    station.station_code
                                                    === nextPrediction
                                                        ?.station
                                                        .code,
                                            )
                                            ?.platform
                                            ?? "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Next 3 station arrivals */}
                        {!isCompleted
                            && !isScheduled
                            && result.predictions.length > 0 && (
                                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
                                                Upcoming
                                            </p>

                                            <h3 className="mt-2 text-2xl font-bold">
                                                Next 3 Stations
                                            </h3>
                                        </div>

                                        <p className="text-xs text-slate-500">
                                            RailETA predictions
                                        </p>
                                    </div>

                                    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                                        {result.predictions
                                            .slice(0, 3)
                                            .map((prediction, index) => (
                                                <div
                                                    key={`${prediction.station.code}-${prediction.station.stations_ahead}`}
                                                    className="grid gap-4 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[auto_1.5fr_1fr_1fr] sm:items-center"
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 font-bold text-blue-300">
                                                        {index + 1}
                                                    </div>

                                                    <div>
                                                        <p className="text-lg font-bold">
                                                            {prediction.station.name
                                                                ?? prediction.station.code}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {prediction.station.code}
                                                            {" • "}
                                                            {prediction.station.stations_ahead}
                                                            {" station"}
                                                            {prediction.station.stations_ahead === 1
                                                                ? ""
                                                                : "s"}
                                                            {" ahead"}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                            Expected Arrival
                                                        </p>

                                                        <p className="mt-1 text-xl font-bold">
                                                            {prediction.forecast.eta
                                                                ? formatTime(
                                                                    prediction.forecast.eta,
                                                                )
                                                                : "--"}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                            Delay
                                                        </p>

                                                        <p className="mt-1 text-xl font-bold">
                                                            {prediction.forecast.predicted_delay_min < 0
                                                                ? `${Math.abs(
                                                                    prediction.forecast.predicted_delay_min,
                                                                ).toFixed(1)} min early`
                                                                : prediction.forecast.predicted_delay_min === 0
                                                                    ? "On time"
                                                                    : `${prediction.forecast.predicted_delay_min.toFixed(1)} min late`}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {prediction.forecast.confidence}
                                                            {" confidence"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                        {/* Disruption alerts */}
                        {result.alerts
                            && result.alerts.length > 0 && (
                                <div className="space-y-3">
                                    {result.alerts.map(
                                        (alert, index) => {
                                            const critical =
                                                alert.severity
                                                === "CRITICAL";

                                            return (
                                                <div
                                                    key={`${alert.type}-${index}`}
                                                    className={`rounded-3xl border p-5 sm:p-6 ${critical
                                                        ? "border-red-500/40 bg-red-500/10"
                                                        : "border-yellow-500/40 bg-yellow-500/10"
                                                        }`}
                                                >
                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                        <div>
                                                            <p
                                                                className={`text-xs font-bold uppercase tracking-[0.25em] ${critical
                                                                    ? "text-red-300"
                                                                    : "text-yellow-300"
                                                                    }`}
                                                            >
                                                                Service Alert
                                                            </p>

                                                            <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                                                                {alert.title}
                                                            </h3>

                                                            <p className="mt-3 max-w-4xl text-base leading-7 text-slate-200 sm:text-lg">
                                                                {alert.message}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${critical
                                                                ? "bg-red-500/20 text-red-200"
                                                                : "bg-yellow-500/20 text-yellow-200"
                                                                }`}
                                                        >
                                                            {alert.type.replaceAll(
                                                                "_",
                                                                " ",
                                                            )}
                                                        </span>
                                                    </div>

                                                    {(alert.from_station
                                                        || alert.to_station) && (
                                                            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                                                                {alert.from_station && (
                                                                    <div className="rounded-xl bg-black/20 px-4 py-3">
                                                                        <p className="text-xs uppercase tracking-wider text-slate-400">
                                                                            From
                                                                        </p>

                                                                        <p className="mt-1 font-bold">
                                                                            {alert.from_station
                                                                                .name
                                                                                ?? alert.from_station
                                                                                    .code
                                                                                ?? "Unavailable"}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {alert.from_station
                                                                    && alert.to_station && (
                                                                        <span className="text-xl text-slate-500">
                                                                            →
                                                                        </span>
                                                                    )}

                                                                {alert.to_station && (
                                                                    <div className="rounded-xl bg-black/20 px-4 py-3">
                                                                        <p className="text-xs uppercase tracking-wider text-slate-400">
                                                                            To
                                                                        </p>

                                                                        <p className="mt-1 font-bold">
                                                                            {alert.to_station
                                                                                .name
                                                                                ?? alert.to_station
                                                                                    .code
                                                                                ?? "Unavailable"}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    {alert.affected_stations
                                                        ?.length > 0 && (
                                                            <div className="mt-5">
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                    Affected Stations
                                                                </p>

                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {alert.affected_stations.map(
                                                                        (
                                                                            station,
                                                                            stationIndex,
                                                                        ) => (
                                                                            <span
                                                                                key={`${station.code ?? station.name}-${stationIndex}`}
                                                                                className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
                                                                            >
                                                                                {station.name
                                                                                    ?? station.code
                                                                                    ?? "Unknown"}
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                    </div>
                )}
            </div>
        </main>
    );
}