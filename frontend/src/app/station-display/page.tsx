"use client";

import {
    useEffect,
    useState,
} from "react";
import AppNavbar from "@/components/AppNavbar";
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
        <main className="min-h-screen bg-[#f7f9fb] text-slate-950">

            <AppNavbar role="Station staff" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Page header */}
                <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                            Station staff
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            Station arrivals
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Live predicted arrival board with delay, confidence
                            and platform context for station operations.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Live display
                        </span>

                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
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
                </section>

                {/* Search controls */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">

                        {/* Date */}
                        <div>
                            <label
                                htmlFor="station-journey-date"
                                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
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
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />
                        </div>

                        {/* Train search */}
                        <div className="relative">
                            <label
                                htmlFor="station-train-search"
                                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                            >
                                Train Name or Number
                            </label>

                            <input
                                id="station-train-search"
                                value={query}
                                onChange={(event) =>
                                    handleSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Search train name or number"
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />

                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
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
                                                className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                                            >
                                                <div>
                                                    <p className="font-semibold text-slate-950">
                                                        {train.train_name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {train.train_number}
                                                    </p>
                                                </div>

                                                <p className="shrink-0 text-xs text-slate-400">
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

                        {/* Load */}
                        <button
                            type="button"
                            onClick={loadTrain}
                            disabled={
                                loading
                                || !trainNumber
                            }
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0876c9] px-6 text-sm font-semibold text-white transition hover:bg-[#0667af] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? "Loading..."
                                : "Load train"}
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Live arrival intelligence
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                            Journey date: {journeyDate}
                        </span>

                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                            Station operations
                        </span>
                    </div>
                </section>

                {error && (
                    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        {error}
                    </div>
                )}

                {!result && !loading && (
                    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <p className="text-xl font-semibold">
                            Select a train to start
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            Live ETA, delay,
                            confidence and disruption
                            information will appear
                            here.
                        </p>
                    </div>
                )}

                {result && (
                    <div className="mt-8 space-y-6">

                        {/* Train summary */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">

                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        Train
                                    </p>

                                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                                            {result.journey.train_name ?? "Train"}
                                        </h2>

                                        <span className="text-lg font-semibold text-sky-700">
                                            {result.journey.train_number}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Journey date:{" "}
                                        <span className="font-medium text-slate-700">
                                            {journeyDate === getTodayLocalDate()
                                                ? "Today"
                                                : journeyDate}
                                        </span>
                                    </p>
                                </div>

                                <span
                                    className={[
                                        "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                                        isCompleted
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : isScheduled
                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                : "border-sky-200 bg-sky-50 text-sky-700",
                                    ].join(" ")}
                                >
                                    <span
                                        className={[
                                            "h-1.5 w-1.5 rounded-full",
                                            isCompleted
                                                ? "bg-emerald-500"
                                                : isScheduled
                                                    ? "bg-amber-500"
                                                    : "bg-sky-500",
                                        ].join(" ")}
                                    />

                                    {isCompleted
                                        ? "Completed"
                                        : isScheduled
                                            ? "Scheduled"
                                            : "Running"}
                                </span>
                            </div>

                            {/* Freshness strip */}
                            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Live data active
                                    </span>

                                    <span>
                                        Cache:{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {result.backend?.provider_payload_cache ?? "Unavailable"}
                                        </strong>
                                    </span>
                                </div>

                                <span>
                                    Display time:{" "}
                                    <strong className="font-semibold text-slate-700">
                                        {currentTime.toLocaleTimeString(
                                            "en-IN",
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                                hour12: true,
                                            },
                                        )}
                                    </strong>
                                </span>
                            </div>
                        </section>

                        {/* Main arrival intelligence */}
                        <section className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">

                            {/* ETA hero */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        Arrival intelligence
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {isCompleted
                                            ? "Final journey state"
                                            : isScheduled
                                                ? "Scheduled origin departure"
                                                : "Predicted next-station arrival"}
                                    </p>
                                </div>

                                <div className="px-5 py-6 sm:px-6 sm:py-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        {isCompleted
                                            ? "Final Station"
                                            : isScheduled
                                                ? "Starts From"
                                                : "Next Arrival"}
                                    </p>

                                    <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                        {isCompleted
                                            ? result.journey.current_station_name
                                            ?? result.journey.current_station_code
                                            ?? "Unavailable"
                                            : isScheduled
                                                ? result.journey.source?.station_name
                                                ?? result.journey.source?.station_code
                                                ?? "Unavailable"
                                                : nextPrediction?.station.name
                                                ?? nextPrediction?.station.code
                                                ?? "Unavailable"}
                                    </h3>

                                    {!isCompleted &&
                                        !isScheduled &&
                                        nextPrediction && (
                                            <p className="mt-1 text-sm font-medium text-slate-500">
                                                {nextPrediction.station.code}
                                            </p>
                                        )}

                                    <div className="mt-7">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            {isScheduled
                                                ? "Scheduled Departure"
                                                : isCompleted
                                                    ? "Journey Status"
                                                    : "Expected Arrival"}
                                        </p>

                                        <p
                                            className={[
                                                "mt-2 font-bold tracking-tight",
                                                isCompleted
                                                    ? "text-3xl text-emerald-700"
                                                    : "text-5xl text-slate-950 sm:text-6xl",
                                            ].join(" ")}
                                        >
                                            {isCompleted
                                                ? "Completed"
                                                : isScheduled
                                                    ? formatTime(
                                                        result.journey.source
                                                            ?.scheduled_departure,
                                                    )
                                                    : nextPrediction?.forecast.eta
                                                        ? formatTime(
                                                            nextPrediction.forecast.eta,
                                                        )
                                                        : "--"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Operational KPI cards */}
                            <div className="grid gap-3 sm:grid-cols-2">

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Delay
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-slate-950">
                                        {isScheduled
                                            ? "N/A"
                                            : nextPrediction
                                                ? `${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                : result.journey.current_delay_min != null
                                                    ? `${result.journey.current_delay_min} min`
                                                    : "Unavailable"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Confidence
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-slate-950">
                                        {nextPrediction?.forecast.confidence ?? "N/A"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Current position
                                    </p>

                                    <p className="mt-2 text-base font-bold text-slate-950">
                                        {result.journey.current_station_name
                                            ?? result.journey.current_station_code
                                            ?? "Unavailable"}
                                    </p>

                                    <span
                                        className={[
                                            "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                            livePositionSource === "REAL_PROVIDER_GPS"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : livePositionSource === "CURRENT_STATION"
                                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                                                    : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                        ].join(" ")}
                                    >
                                        {livePositionSource === "REAL_PROVIDER_GPS"
                                            ? "Live GPS"
                                            : livePositionSource === "CURRENT_STATION"
                                                ? "Station position"
                                                : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                    ? "Estimated position"
                                                    : "Source unavailable"}
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Platform
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-slate-950">
                                        {result.journey.timeline?.stations.find(
                                            (station) =>
                                                station.station_code ===
                                                nextPrediction?.station.code,
                                        )?.platform ?? "N/A"}
                                    </p>
                                </div>

                            </div>
                        </section>

                        {/* Upcoming station arrivals */}
                        {!isCompleted
                            && !isScheduled
                            && result.predictions.length > 0 && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                Upcoming arrivals
                                            </p>

                                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                                All upcoming stations
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Predicted arrivals for all remaining stations on this journey.
                                            </p>
                                        </div>

                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                                            RailETA predictions
                                        </span>
                                    </div>

                                    {/* Desktop header */}
                                    <div className="hidden grid-cols-[minmax(0,1.6fr)_120px_130px_120px_100px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid md:px-6">
                                        <span>Station</span>
                                        <span>ETA</span>
                                        <span>Delay</span>
                                        <span>Confidence</span>
                                        <span>Platform</span>
                                    </div>

                                    <div>
                                        {result.predictions
                                            .map((prediction, index) => {
                                                const platform =
                                                    result.journey.timeline?.stations.find(
                                                        (station) =>
                                                            station.station_code ===
                                                            prediction.station.code,
                                                    )?.platform ?? "N/A";

                                                return (
                                                    <div
                                                        key={`${prediction.station.code}-${prediction.station.stations_ahead}`}
                                                        className={[
                                                            "grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_120px_130px_120px_100px] md:items-center md:px-6",
                                                            index === 0
                                                                ? "bg-sky-50/60"
                                                                : "bg-white",
                                                        ].join(" ")}
                                                    >

                                                        {/* Station */}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={[
                                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                                                        index === 0
                                                                            ? "bg-sky-600 text-white"
                                                                            : "border border-slate-200 bg-white text-slate-600",
                                                                    ].join(" ")}
                                                                >
                                                                    {index + 1}
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="truncate font-semibold text-slate-950">
                                                                            {prediction.station.name
                                                                                ?? prediction.station.code}
                                                                        </p>

                                                                        {index === 0 && (
                                                                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                                                                                Next
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                                        {prediction.station.code}
                                                                        {" • "}
                                                                        {prediction.station.stations_ahead}{" "}
                                                                        station
                                                                        {prediction.station.stations_ahead === 1
                                                                            ? ""
                                                                            : "s"}{" "}
                                                                        ahead
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ETA */}
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                                                ETA
                                                            </p>

                                                            <p
                                                                className={[
                                                                    "mt-1 text-sm font-semibold md:mt-0",
                                                                    index === 0
                                                                        ? "text-sky-700"
                                                                        : "text-slate-800",
                                                                ].join(" ")}
                                                            >
                                                                {prediction.forecast.eta
                                                                    ? formatTime(
                                                                        prediction.forecast.eta,
                                                                    )
                                                                    : "--"}
                                                            </p>
                                                        </div>

                                                        {/* Delay */}
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                                                Delay
                                                            </p>

                                                            <span
                                                                className={[
                                                                    "mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold md:mt-0",
                                                                    prediction.forecast.predicted_delay_min > 0
                                                                        ? "bg-rose-50 text-rose-700"
                                                                        : prediction.forecast.predicted_delay_min < 0
                                                                            ? "bg-sky-50 text-sky-700"
                                                                            : "bg-emerald-50 text-emerald-700",
                                                                ].join(" ")}
                                                            >
                                                                {prediction.forecast.predicted_delay_min < 0
                                                                    ? `${Math.abs(
                                                                        prediction.forecast.predicted_delay_min,
                                                                    ).toFixed(1)} min early`
                                                                    : prediction.forecast.predicted_delay_min === 0
                                                                        ? "On time"
                                                                        : `+${prediction.forecast.predicted_delay_min.toFixed(1)} min`}
                                                            </span>
                                                        </div>

                                                        {/* Confidence */}
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                                                Confidence
                                                            </p>

                                                            <span
                                                                className={[
                                                                    "mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold md:mt-0",
                                                                    prediction.forecast.confidence === "HIGH"
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : prediction.forecast.confidence === "MEDIUM"
                                                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                            : "border-rose-200 bg-rose-50 text-rose-700",
                                                                ].join(" ")}
                                                            >
                                                                {prediction.forecast.confidence}
                                                            </span>
                                                        </div>

                                                        {/* Platform */}
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                                                Platform
                                                            </p>

                                                            <p className="mt-1 text-sm font-semibold text-slate-800 md:mt-0">
                                                                {platform}
                                                            </p>
                                                        </div>

                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
                                        Predictions update from the latest verified live journey state.
                                    </div>
                                </section>
                            )}

                        {/* Disruption alerts */}
                        {result.alerts &&
                            result.alerts.length > 0 && (
                                <section className="space-y-3">

                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                Service disruptions
                                            </p>

                                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                                Operational alerts
                                            </h3>
                                        </div>

                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
                                            {result.alerts.length} active
                                        </span>
                                    </div>

                                    {result.alerts.map(
                                        (alert, index) => {
                                            const critical =
                                                alert.severity === "CRITICAL";

                                            return (
                                                <article
                                                    key={`${alert.type}-${index}`}
                                                    className={[
                                                        "overflow-hidden rounded-2xl border bg-white shadow-sm",
                                                        critical
                                                            ? "border-rose-200"
                                                            : "border-amber-200",
                                                    ].join(" ")}
                                                >

                                                    <div
                                                        className={[
                                                            "flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6",
                                                            critical
                                                                ? "border-rose-100 bg-rose-50/70"
                                                                : "border-amber-100 bg-amber-50/70",
                                                        ].join(" ")}
                                                    >
                                                        <div>
                                                            <p
                                                                className={[
                                                                    "text-[11px] font-semibold uppercase tracking-[0.14em]",
                                                                    critical
                                                                        ? "text-rose-700"
                                                                        : "text-amber-700",
                                                                ].join(" ")}
                                                            >
                                                                Service alert
                                                            </p>

                                                            <h4 className="mt-1 text-lg font-bold text-slate-950">
                                                                {alert.title}
                                                            </h4>

                                                            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                                                                {alert.message}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={[
                                                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                                                    critical
                                                                        ? "border-rose-200 bg-white text-rose-700"
                                                                        : "border-amber-200 bg-white text-amber-700",
                                                                ].join(" ")}
                                                            >
                                                                {alert.type.replaceAll(
                                                                    "_",
                                                                    " ",
                                                                )}
                                                            </span>

                                                            <span
                                                                className={[
                                                                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                                                                    critical
                                                                        ? "bg-rose-600 text-white"
                                                                        : "bg-amber-500 text-white",
                                                                ].join(" ")}
                                                            >
                                                                {critical
                                                                    ? "Critical"
                                                                    : alert.severity}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 px-5 py-4 sm:px-6">

                                                        {(alert.from_station ||
                                                            alert.to_station) && (
                                                                <div>
                                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                                        Affected section
                                                                    </p>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                        {alert.from_station && (
                                                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                                    From
                                                                                </p>

                                                                                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                                                                    {alert.from_station.name
                                                                                        ?? alert.from_station.code
                                                                                        ?? "Unavailable"}
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {alert.from_station &&
                                                                            alert.to_station && (
                                                                                <span className="text-lg text-slate-400">
                                                                                    →
                                                                                </span>
                                                                            )}

                                                                        {alert.to_station && (
                                                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                                    To
                                                                                </p>

                                                                                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                                                                    {alert.to_station.name
                                                                                        ?? alert.to_station.code
                                                                                        ?? "Unavailable"}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {alert.affected_stations
                                                            ?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                                        Affected stations
                                                                    </p>

                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {alert.affected_stations.map(
                                                                            (
                                                                                station,
                                                                                stationIndex,
                                                                            ) => (
                                                                                <span
                                                                                    key={`${station.code ?? station.name}-${stationIndex}`}
                                                                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
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
                                                </article>
                                            );
                                        },
                                    )}
                                </section>
                            )}
                    </div>
                )}
            </div>
        </main>
    );
}