"use client";

import {
    useEffect,
    useRef,
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



type RecentStationTrain = {
    trainNumber: string;
    trainName: string;
    journeyDate: string;
    currentStation: string | null;
    nextStation: string | null;
    predictedEta: string | null;
    delayMin: number | null;
    confidence: string | null;
    searchedAt: string;
};

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
        recentTrains,
        setRecentTrains,
    ] = useState<RecentStationTrain[]>(
        [],
    );
    const resultSectionRef =
        useRef<HTMLDivElement | null>(null);
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

            const prediction =
                response.predictions?.[0]
                ?? null;

            const recentEntry:
                RecentStationTrain = {
                trainNumber:
                    response.journey.train_number,

                trainName:
                    response.journey.train_name
                    ?? "Train",

                journeyDate,

                currentStation:
                    response.journey
                        .current_station_name
                    ?? response.journey
                        .current_station_code
                    ?? null,

                nextStation:
                    prediction?.station.name
                    ?? prediction?.station.code
                    ?? null,

                predictedEta:
                    prediction?.forecast.eta
                    ?? null,

                delayMin:
                    prediction?.forecast
                        .predicted_delay_min
                    ?? response.journey
                        .current_delay_min
                    ?? null,

                confidence:
                    prediction?.forecast
                        .confidence
                    ?? null,

                searchedAt:
                    new Date().toISOString(),
            };

            setRecentTrains((current) => {
                const withoutDuplicate =
                    current.filter(
                        (item) =>
                            !(
                                item.trainNumber
                                === recentEntry.trainNumber
                                && item.journeyDate
                                === recentEntry.journeyDate
                            ),
                    );

                const next = [
                    recentEntry,
                    ...withoutDuplicate,
                ].slice(0, 5);

                window.localStorage.setItem(
                    "raileta-station-recent-trains",
                    JSON.stringify(next),
                );

                return next;
            });
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

    async function openRecentTrain(
        train: RecentStationTrain,
    ) {
        setTrainNumber(train.trainNumber);
        setJourneyDate(train.journeyDate);
        setQuery(
            `${train.trainNumber} — ${train.trainName}`,
        );

        setLoading(true);
        setError(null);

        try {
            const response =
                await railEtaApi.getLiveForecast({
                    train_number: train.trainNumber,
                    journey_date: train.journeyDate,
                });

            setResult(response);
            window.setTimeout(() => {
                resultSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 100);
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

    const timelineStations =
        result?.journey.timeline?.stations
        ?? [];

    return (
        <main className="min-h-screen bg-[#f7f9fb] text-slate-950">

            <AppNavbar role="Station board" />

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

                {recentTrains.length > 0 && (
                    <section className="mt-6">
                        <div className="mb-3 flex items-end justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                    Recent journeys
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    Recently searched trains
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Select a train to open its complete journey and station timeline.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            {recentTrains.map((train) => (
                                <button
                                    key={`${train.trainNumber}-${train.journeyDate}`}
                                    type="button"
                                    onClick={() => openRecentTrain(train)}
                                    className={[
                                        "group rounded-2xl border bg-white p-5 text-left shadow-sm transition",
                                        train.trainNumber === result?.journey.train_number
                                            && train.journeyDate === journeyDate
                                            ? "border-sky-400 ring-2 ring-sky-100"
                                            : "border-slate-200 hover:border-sky-300 hover:shadow-md",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-950">
                                                    {train.trainName}
                                                </h3>

                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                    {train.trainNumber}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-slate-500">
                                                Current:{" "}
                                                <strong className="text-slate-700">
                                                    {train.currentStation ?? "Unavailable"}
                                                </strong>
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Next:{" "}
                                                <strong className="text-slate-700">
                                                    {train.nextStation ?? "Completed"}
                                                </strong>
                                            </p>
                                        </div>

                                        <span className="shrink-0 text-sm font-semibold text-sky-700">
                                            View journey →
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                ETA
                                            </p>

                                            <p className="mt-1 font-bold text-slate-900">
                                                {formatTime(train.predictedEta)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                Delay
                                            </p>

                                            <p className="mt-1 font-bold text-rose-700">
                                                {train.delayMin != null
                                                    ? `${train.delayMin > 0 ? "+" : ""}${train.delayMin.toFixed(1)} min`
                                                    : "--"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                Confidence
                                            </p>

                                            <p className="mt-1 font-bold capitalize text-slate-900">
                                                {train.confidence ?? "--"}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

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
                    <div
                        ref={resultSectionRef}
                        className="mt-8 space-y-6 scroll-mt-20"
                    >

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



                        {result.journey.timeline &&
                            result.journey.timeline.stations.length > 0 && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                            Station timetable
                                        </p>

                                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                                            Scheduled station board
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Scheduled stops and platform information.
                                        </p>
                                    </div>

                                    <div className="hidden grid-cols-[minmax(0,1fr)_150px_100px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:grid sm:px-6">
                                        <span>Station</span>
                                        <span>Scheduled Time</span>
                                        <span className="text-right">
                                            Platform
                                        </span>
                                    </div>

                                    <div>
                                        {result.journey.timeline.stations.map(
                                            (station, index) => {
                                                const scheduledTime =
                                                    station.scheduled_arrival
                                                    ?? station.scheduled_departure;

                                                return (
                                                    <div
                                                        key={`${station.station_code ?? "station"}-${index}`}
                                                        className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_150px_100px] sm:items-center sm:px-6"
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-slate-950">
                                                                {station.station_name
                                                                    ?? station.station_code
                                                                    ?? "Unknown station"}
                                                            </p>

                                                            {station.station_code && (
                                                                <p className="mt-0.5 text-xs text-slate-400">
                                                                    {station.station_code}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                                                Scheduled Time
                                                            </p>

                                                            <p className="mt-1 font-semibold text-slate-800 sm:mt-0">
                                                                {formatTime(
                                                                    scheduledTime,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="sm:text-right">
                                                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                                                Platform
                                                            </p>
                                                            <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                                                                {station.platform
                                                                    ?? "--"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>

                                </section>
                            )}


                        {timelineStations.length > 0 && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        Complete journey
                                    </p>

                                    <h3 className="mt-1 text-lg font-bold text-slate-950">
                                        All scheduled stations
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Full route timeline showing passed, current, next and upcoming stations.
                                    </p>
                                </div>

                                <div className="max-h-[620px] overflow-y-auto">
                                    {timelineStations.map(
                                        (station, index) => (
                                            <div
                                                key={`${station.station_code}-${index}`}
                                                className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_120px_110px_90px] sm:px-6"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={[
                                                            "h-2.5 w-2.5 shrink-0 rounded-full",
                                                            station.status === "PASSED"
                                                                ? "bg-emerald-500"
                                                                : station.status === "CURRENT"
                                                                    ? "bg-sky-500"
                                                                    : station.status === "NEXT"
                                                                        ? "bg-amber-500"
                                                                        : "bg-slate-300",
                                                        ].join(" ")}
                                                    />

                                                    <div>
                                                        <p className="font-semibold text-slate-950">
                                                            {station.station_name
                                                                ?? station.station_code}
                                                        </p>

                                                        <p className="text-xs text-slate-400">
                                                            {station.station_code}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                        Arrival
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                                        {formatTime(
                                                            station.actual_arrival
                                                            ?? station.predicted_arrival
                                                            ?? station.scheduled_arrival,
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                        Delay
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                                        {station.delay_min != null
                                                            ? `${station.delay_min > 0 ? "+" : ""}${station.delay_min} min`
                                                            : "--"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                        Platform
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                                        {station.platform ?? "--"}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
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
