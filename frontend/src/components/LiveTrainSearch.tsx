"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    TrainAlertBanner,
} from "@/components/TrainAlertBanner";

import EtaPredictionTrend, {
    type EtaHistoryPoint,
} from "@/components/EtaPredictionTrend";

import { JourneyTimeline } from "@/components/JourneyTimeline";
import {
    railEtaApi,
} from "@/lib/api/raileta-api";

import {
    RailETAApiError,
} from "@/lib/api/api-client";

import type {
    LiveForecastResponse,
    TrainSearchResult,
} from "@/lib/api/api-types";

import dynamic from "next/dynamic";
type LiveTrainSearchProps = {
    onRefreshSecondsChange?: (
        seconds: number | null,
    ) => void;
};

function formatDateTime(
    value: string | null | undefined,
) {
    if (!value) {
        return "Unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unavailable";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        },
    );
}


const RouteMap = dynamic(
    () => import(
        "@/components/RouteMap"
    ),
    {
        ssr: false,
    },
);

export default function LiveTrainSearch({
    onRefreshSecondsChange,
}: LiveTrainSearchProps) {

    const [
        retryable,
        setRetryable,
    ] = useState(false);

    const [
        showDemoOption,
        setShowDemoOption,
    ] = useState(false);

    const [
        showModelInsights,
        setShowModelInsights,
    ] = useState(false);


    const [
        etaHistory,
        setEtaHistory,
    ] = useState<EtaHistoryPoint[]>([]);


    const [
        refreshSeconds,
        setRefreshSeconds,
    ] = useState(60);

    const [
        demoLoading,
        setDemoLoading,
    ] = useState(false);

    const [
        searchQuery,
        setSearchQuery,
    ] = useState("");

    const [
        showAllStationProgress,
        setShowAllStationProgress,
    ] = useState(false);


    const [
        trainSearchResults,
        setTrainSearchResults,
    ] = useState<TrainSearchResult[]>([]);

    const [
        trainSearchLoading,
        setTrainSearchLoading,
    ] = useState(false);

    const [
        showDetailedPredictions,
        setShowDetailedPredictions,
    ] = useState(false);


    const [
        trainNumber,
        setTrainNumber,
    ] = useState("");

    const [
        journeyDate,
        setJourneyDate,
    ] = useState("");

    const [
        result,
        setResult,
    ] = useState<
        LiveForecastResponse | null
    >(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    const [
        requestId,
        setRequestId,
    ] = useState<string | null>(
        null,
    );

    const [
        errorCode,
        setErrorCode,
    ] = useState<string | null>(null);


    const [
        errorDetails,
        setErrorDetails,
    ] = useState<{
        train_number?: string;
        journey_date?: string;
        requested_day?: string;
        run_days?: string[];
    } | null>(null);



    function delayBadgeClass(
        status: string,
    ) {
        if (status === "ON_TIME") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (status === "EARLY") {
            return "border-blue-200 bg-blue-50 text-blue-700";
        }

        return "border-red-200 bg-red-50 text-red-700";
    }
    useEffect(() => {
        const query =
            searchQuery.trim();

        if (query.length < 2) {
            setTrainSearchResults([]);
            return;
        }

        const timer = window.setTimeout(
            async () => {
                try {
                    setTrainSearchLoading(true);

                    const response =
                        await railEtaApi.searchTrains(
                            query,
                            8,
                        );

                    setTrainSearchResults(
                        response.results,
                    );
                } catch {
                    setTrainSearchResults([]);
                } finally {
                    setTrainSearchLoading(false);
                }
            },
            300,
        );

        return () => {
            window.clearTimeout(timer);
        };
    }, [searchQuery]);

    useEffect(() => {
        if (!trainNumber.trim()) {
            setEtaHistory([]);
            return;
        }

        const storageKey =
            `raileta-eta-history:${trainNumber.trim()}:${journeyDate}`;

        try {
            const saved =
                window.sessionStorage.getItem(
                    storageKey,
                );

            if (!saved) {
                setEtaHistory([]);
                return;
            }

            const parsed = JSON.parse(
                saved,
            ) as EtaHistoryPoint[];

            setEtaHistory(
                Array.isArray(parsed)
                    ? parsed
                    : [],
            );
        } catch {
            setEtaHistory([]);
        }
    }, [
        trainNumber,
        journeyDate,
    ]);



    function recordEtaSnapshot(
        response: LiveForecastResponse,
    ) {
        const prediction =
            response.predictions.find(
                (item) =>
                    item.station
                        .stations_ahead === 1,
            )
            ?? response.predictions[0]
            ?? null;

        if (!prediction?.forecast.eta) {
            return;
        }

        const point: EtaHistoryPoint = {
            observedAt:
                new Date().toISOString(),

            predictedEta:
                prediction.forecast.eta,
        };

        const storageKey =
            `raileta-eta-history:${response.journey.train_number}:${journeyDate}`;

        setEtaHistory((current) => {
            const next = [
                ...current,
                point,
            ].slice(-12);

            window.sessionStorage.setItem(
                storageKey,
                JSON.stringify(next),
            );

            return next;
        });
    }

    function confidenceClass(
        confidence: string,
    ) {
        if (confidence === "HIGH") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (confidence === "MEDIUM") {
            return "border-yellow-200 bg-yellow-50 text-yellow-700";
        }

        return "border-gray-200 bg-gray-50 text-gray-700";
    }

    function weatherRiskClass(
        risk: string,
    ) {
        if (risk === "SEVERE") {
            return "border-red-300 bg-red-100 text-red-800";
        }

        if (risk === "HIGH") {
            return "border-orange-300 bg-orange-50 text-orange-800";
        }

        if (risk === "MODERATE") {
            return "border-yellow-300 bg-yellow-50 text-yellow-800";
        }

        if (risk === "LOW") {
            return "border-green-300 bg-green-50 text-green-800";
        }

        return "border-gray-300 bg-gray-50 text-gray-700";
    }


    function stationRowClass(
        isNext: boolean,
        isLast: boolean,
    ) {
        if (isNext) {
            return "border-l-4 border-l-blue-600 bg-blue-50/50";
        }

        if (isLast) {
            return "border-l-4 border-l-gray-900 bg-gray-50";
        }

        return "border-l-4 border-l-transparent bg-white";
    }

    async function runVerifiedDemo() {
        try {
            setDemoLoading(true);
            setError(null);
            setRequestId(null);

            const response =
                await railEtaApi.getDemo();

            setResult(response);
            recordEtaSnapshot(response);
            setShowDemoOption(false);

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Verified demo could not be loaded.",
            );

        } finally {
            setDemoLoading(false);
        }
    }

    function formatRunDay(day: string) {
        const normalized = day.trim().toLowerCase();

        const dayMap: Record<string, string> = {
            mon: "Monday",
            tue: "Tuesday",
            wed: "Wednesday",
            thu: "Thursday",
            fri: "Friday",
            sat: "Saturday",
            sun: "Sunday",
        };

        return dayMap[normalized] ?? day;
    }

    function formatJourneyDate(
        value: string | null | undefined,
    ) {
        if (!value) {
            return null;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
            },
        );
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            setErrorDetails(null);
            setRequestId(null);
            setResult(null);
            setRetryable(false);
            setShowDemoOption(false);

            const response =
                await railEtaApi.getLiveForecast({
                    train_number:
                        trainNumber.trim(),

                    journey_date:
                        journeyDate || null,
                });

            setResult(response);
            recordEtaSnapshot(response);

        } catch (err) {
            if (err instanceof RailETAApiError) {
                setError(err.message);
                setRequestId(err.requestId);

                const body = err.body;

                if (
                    body
                    && typeof body === "object"
                    && "error" in body
                ) {
                    const applicationError =
                        body as {
                            error: {
                                code: string;
                                retryable: boolean;
                                details?: {
                                    train_number?: string;
                                    journey_date?: string;
                                    requested_day?: string;
                                    run_days?: string[];
                                } | null;
                            };
                        };

                    setRetryable(
                        applicationError.error.retryable,
                    );

                    setErrorCode(
                        applicationError.error.code,
                    );

                    setErrorDetails(
                        applicationError.error.details ?? null,
                    );

                    if (
                        applicationError.error.code
                        === "PROVIDER_UNAVAILABLE"
                        || applicationError.error.code
                        === "PROVIDER_TIMEOUT"
                        || applicationError.error.code
                        === "PROVIDER_RATE_LIMITED"
                    ) {
                        setShowDemoOption(true);
                    }
                }

                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to fetch live forecast.",
            );

        } finally {
            setLoading(false);
        }
    }


    const nextPrediction =
        result?.predictions.find(
            (prediction) =>
                prediction.station.stations_ahead === 1
        )
        ?? result?.predictions[0]
        ?? null;

    const isCompletedJourney =
        result !== null
        && (
            result.journey.upcoming_stations === 0
            || result.journey.state_source
            === "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
        );

    const isWaitingForObservations =
        result !== null
        && result.journey.state_source
        === "INSUFFICIENT_VERIFIED_OBSERVATIONS";

    const isScheduledNotStarted =
        result?.journey.state_source
        === "SCHEDULED_NOT_STARTED";

    const hasPredictions =
        result !== null
        && result.predictions.length > 0;

    useEffect(() => {
        if (
            !result
            || isCompletedJourney
            || isWaitingForObservations
            || !trainNumber.trim()
        ) {
            onRefreshSecondsChange?.(null);
            return;
        }

        onRefreshSecondsChange?.(
            refreshSeconds,
        );
    }, [
        refreshSeconds,
        result,
        isCompletedJourney,
        isWaitingForObservations,
        trainNumber,
        onRefreshSecondsChange,
    ]);

    const finalPrediction =
        result?.predictions[
        result.predictions.length - 1
        ] ?? null;

    const timelineStations =
        result?.journey.timeline?.stations ?? [];

    const fallbackSource =
        timelineStations[0] ?? null;

    const fallbackDestination =
        timelineStations.length > 0
            ? timelineStations[timelineStations.length - 1]
            : null;
    const highestWeatherRisk =
        result?.eta_weather_corridor.reduce(
            (highest, item) => {
                const rank: Record<
                    string,
                    number
                > = {
                    UNKNOWN: 0,
                    LOW: 1,
                    MODERATE: 2,
                    HIGH: 3,
                    SEVERE: 4,
                };

                const currentRisk =
                    item.weather?.risk_level
                    ?? "UNKNOWN";

                const highestRisk =
                    highest.weather?.risk_level
                    ?? "UNKNOWN";

                return (
                    rank[currentRisk]
                    > rank[highestRisk]
                )
                    ? item
                    : highest;
            },
            result.eta_weather_corridor[0]
            ?? null,
        ) ?? null;


    const livePositionSource =
        result?.route?.current_position
            ?.position_source
        ?? null;

    const hasLiveResult = result !== null;
    useEffect(() => {
        if (
            !result
            || isCompletedJourney
            || isWaitingForObservations
            || !trainNumber.trim()
        ) {
            setRefreshSeconds(60);
            return;
        }

        setRefreshSeconds(60);

        const intervalId =
            window.setInterval(
                async () => {
                    try {
                        const response =
                            await railEtaApi.getLiveForecast({
                                train_number:
                                    trainNumber.trim(),
                                journey_date:
                                    journeyDate || null,
                            });

                        setResult(response);
                        recordEtaSnapshot(
                            response,
                        );
                    } catch {
                        // Keep the last successful forecast visible.
                    } finally {
                        setRefreshSeconds(60);
                    }
                },
                60_000,
            );

        return () => {
            window.clearInterval(
                intervalId,
            );
        };
    }, [
        trainNumber,
        journeyDate,
        isCompletedJourney,
        isWaitingForObservations,
        hasLiveResult,
    ]);

    useEffect(() => {
        if (
            !result
            || isCompletedJourney
            || isWaitingForObservations
            || !trainNumber.trim()
        ) {
            return;
        }

        const countdownId =
            window.setInterval(() => {
                setRefreshSeconds(
                    (current) =>
                        current > 0
                            ? current - 1
                            : 0,
                );
            }, 1000);

        return () => {
            window.clearInterval(
                countdownId,
            );
        };
    }, [
        trainNumber,
        journeyDate,
        isCompletedJourney,
        isWaitingForObservations,
        hasLiveResult,
    ]);
    return (
        <section className="space-y-6">

            <div>
                <h2 className="text-2xl font-bold">
                    Live Train ETA
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Search by train name or number to generate
                    leakage-safe live ETA predictions.
                </p>
            </div>


            <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.8fr)_auto] lg:items-end">

                    {/* Train search */}
                    <div className="relative">
                        <label
                            htmlFor="train-search"
                            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                        >
                            Train Name or Number
                        </label>

                        <input
                            id="train-search"
                            value={searchQuery}
                            onChange={(event) => {
                                const value =
                                    event.target.value;

                                setSearchQuery(value);

                                if (
                                    /^\d+$/.test(
                                        value.trim(),
                                    )
                                ) {
                                    setTrainNumber(
                                        value.trim(),
                                    );
                                } else {
                                    setTrainNumber("");
                                }
                            }}
                            placeholder="12722 or Dakshin SF Express"
                            autoComplete="off"
                            required
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        />

                        {trainSearchLoading && (
                            <p className="mt-1.5 text-xs text-slate-500">
                                Searching trains...
                            </p>
                        )}

                        {trainSearchResults.length > 0 && (
                            <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                {trainSearchResults.map(
                                    (train) => (
                                        <button
                                            key={
                                                train.train_number
                                            }
                                            type="button"
                                            onClick={() => {
                                                setTrainNumber(
                                                    train.train_number,
                                                );

                                                setSearchQuery(
                                                    `${train.train_number} — ${train.train_name}`,
                                                );

                                                setTrainSearchResults(
                                                    [],
                                                );
                                            }}
                                            className="flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-950">
                                                    {train.train_number}
                                                </span>

                                                <span className="font-medium text-slate-800">
                                                    {train.train_name}
                                                </span>

                                                {train.train_type && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                        {train.train_type}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {train.source_name
                                                    ?? train.source_code
                                                    ?? "Unknown"}
                                                {" → "}
                                                {train.destination_name
                                                    ?? train.destination_code
                                                    ?? "Unknown"}
                                            </p>
                                        </button>
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    {/* Journey date */}
                    <div>
                        <label
                            htmlFor="journey-date"
                            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                        >
                            Journey Date
                        </label>

                        <input
                            id="journey-date"
                            type="date"
                            value={journeyDate}
                            onChange={(event) =>
                                setJourneyDate(
                                    event.target.value,
                                )
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={
                            loading
                            || !trainNumber.trim()
                        }
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0876c9] px-5 text-sm font-semibold text-white transition hover:bg-[#0667af] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                    >
                        {loading
                            ? "Fetching Live ETA..."
                            : "Predict Live ETA"}

                        {!loading && (
                            <span aria-hidden="true">
                                →
                            </span>
                        )}
                    </button>
                </div>

                {/* Secondary row */}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-2 text-xs text-sky-700">
                        <span className="text-sm">
                            ⌕
                        </span>

                        <span className="font-medium">
                            Search by train name or number
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Live data
                        </span>



                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Prediction engine online
                        </span>
                    </div>
                </div>

                {loading && (
                    <p className="mt-3 text-xs text-slate-500">
                        Fetching live train state and generating leakage-safe ETA predictions...
                    </p>
                )}
            </form>
            {error && (
                errorCode === "TRAIN_NOT_SCHEDULED" ? (
                    <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-white p-5 shadow-sm sm:p-6">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-600" />

                        <div className="relative flex items-start justify-between gap-4">
                            <div className="flex flex-1 gap-4">
                                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <rect x="6" y="4" width="12" height="12" rx="2" />
                                        <path d="M8 18h8" />
                                        <path d="M9 20h1" />
                                        <path d="M14 20h1" />
                                        <path d="M9 8h6" />
                                    </svg>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900">
                                        Train doesn&apos;t run on{" "}
                                        {formatJourneyDate(
                                            errorDetails?.journey_date,
                                        ) ?? "the selected date"}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Train{" "}
                                        <span className="font-semibold text-slate-900">
                                            {errorDetails?.train_number ?? trainNumber}
                                        </span>{" "}
                                        does not operate on the selected journey date.
                                    </p>

                                    {errorDetails?.run_days &&
                                        errorDetails.run_days.length > 0 && (
                                            <div className="mt-4 rounded-2xl border border-blue-100 bg-white/80 p-4">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    This train normally runs on:
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {errorDetails.run_days.map((day) => (
                                                        <span
                                                            key={day}
                                                            className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                                                        >
                                                            {formatRunDay(day)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    <p className="mt-4 text-sm text-slate-600">
                                        Please choose another journey date.
                                    </p>

                                    {requestId && (
                                        <p className="mt-3 text-xs text-slate-400">
                                            Request ID: {requestId}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="hidden shrink-0 sm:block">
                                <svg
                                    viewBox="0 0 120 120"
                                    className="h-24 w-24 text-blue-200"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <rect x="38" y="20" width="44" height="50" rx="10" />
                                    <path d="M48 38h24" />
                                    <circle cx="50" cy="77" r="3" fill="currentColor" />
                                    <circle cx="70" cy="77" r="3" fill="currentColor" />
                                    <path d="M60 70v18" />
                                    <path d="M42 96l18-18 18 18" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                        {error.toLowerCase().includes("rate limit") ||
                            error.toLowerCase().includes("quota") ? (
                            <>
                                <p className="text-lg font-semibold text-red-900">
                                    Live train data is temporarily unavailable
                                </p>

                                <p className="mt-2 text-sm leading-6 text-red-800">
                                    We&apos;re receiving too many live-data requests right now.
                                    Please wait a moment and try again.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-semibold text-red-900">
                                    Unable to generate forecast
                                </p>

                                <p className="mt-1 text-sm text-red-800">
                                    {error}
                                </p>
                            </>
                        )}

                        {requestId && (
                            <p className="mt-2 text-xs text-gray-500">
                                Request ID: {requestId}
                            </p>
                        )}
                    </div>
                )
            )}


            {result && (
                <>
                    <TrainAlertBanner
                        alerts={result.alerts ?? []}
                        journeyCompleted={
                            isCompletedJourney
                        }
                    />

                    <div className="space-y-4">
                        {/* Passenger ETA Hero */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                                                {result.journey.train_name ?? "Train"}
                                            </h3>

                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {result.journey.train_number}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-slate-500">
                                            {result.journey.source?.station_name
                                                ?? result.journey.source?.station_code
                                                ?? fallbackSource?.station_name
                                                ?? fallbackSource?.station_code
                                                ?? "Origin"}
                                            {" → "}
                                            {result.journey.destination?.station_name
                                                ?? result.journey.destination?.station_code
                                                ?? fallbackDestination?.station_name
                                                ?? fallbackDestination?.station_code
                                                ?? "Destination"}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span
                                                className={[
                                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                                                    isCompletedJourney
                                                        ? "border-slate-200 bg-slate-100 text-slate-700"
                                                        : isScheduledNotStarted
                                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                                                ].join(" ")}
                                            >
                                                <span
                                                    className={[
                                                        "h-1.5 w-1.5 rounded-full",
                                                        isCompletedJourney
                                                            ? "bg-slate-500"
                                                            : isScheduledNotStarted
                                                                ? "bg-amber-500"
                                                                : "bg-emerald-500",
                                                    ].join(" ")}
                                                />

                                                {isCompletedJourney
                                                    ? "Completed"
                                                    : isScheduledNotStarted
                                                        ? "Scheduled"
                                                        : "Running"}
                                            </span>

                                            {!isScheduledNotStarted &&
                                                result.journey.current_delay_min != null && (
                                                    <span
                                                        className={[
                                                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                            result.journey.current_delay_min > 0
                                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                                                : result.journey.current_delay_min < 0
                                                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
                                                        ].join(" ")}
                                                    >
                                                        {result.journey.current_delay_min > 0
                                                            ? `+${Math.round(result.journey.current_delay_min)} min late`
                                                            : result.journey.current_delay_min < 0
                                                                ? `${Math.abs(
                                                                    Math.round(result.journey.current_delay_min),
                                                                )} min early`
                                                                : "On time"}
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    {!isScheduledNotStarted &&
                                        !isCompletedJourney && (
                                            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Live journey
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Scheduled Journey */}
                            {isScheduledNotStarted ? (
                                <div className="grid gap-3 md:grid-cols-3">

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Starts from
                                        </p>

                                        <p className="mt-2 text-lg font-bold text-slate-950">
                                            {result.journey.source?.station_name
                                                ?? result.journey.source?.station_code
                                                ?? "Unavailable"}
                                        </p>

                                        {result.journey.source?.station_code && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {result.journey.source.station_code}
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Scheduled departure
                                        </p>

                                        <p className="mt-2 text-lg font-bold text-slate-950">
                                            {formatDateTime(
                                                result.journey.source?.scheduled_departure,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Stations ahead
                                        </p>

                                        <p className="mt-2 text-2xl font-bold text-slate-950">
                                            {result.journey.upcoming_stations}
                                        </p>
                                    </div>

                                </div>
                            ) : isCompletedJourney ? (
                                <div className="grid gap-3 md:grid-cols-3">

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Final station
                                        </p>

                                        <p className="mt-2 text-lg font-bold text-slate-950">
                                            {result.journey.current_station_name
                                                ?? result.journey.current_station_code
                                                ?? "Unavailable"}
                                        </p>

                                        {result.journey.current_station_code && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {result.journey.current_station_code}
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Final delay
                                        </p>

                                        <p
                                            className={[
                                                "mt-2 text-lg font-bold",
                                                result.journey.current_delay_min != null &&
                                                    result.journey.current_delay_min > 0
                                                    ? "text-rose-700"
                                                    : "text-emerald-700",
                                            ].join(" ")}
                                        >
                                            {result.journey.current_delay_min == null
                                                ? "Unavailable"
                                                : result.journey.current_delay_min < 0
                                                    ? `${Math.abs(
                                                        result.journey.current_delay_min,
                                                    )} min early`
                                                    : result.journey.current_delay_min === 0
                                                        ? "On time"
                                                        : `${result.journey.current_delay_min} min late`}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            Stations completed
                                        </p>

                                        <p className="mt-2 text-2xl font-bold text-slate-950">
                                            {result.journey.timeline?.stations.length
                                                ?? result.journey.observed_stations}
                                        </p>
                                    </div>

                                </div>
                            ) : (
                                /* Running Journey */
                                <div className="grid gap-4 xl:grid-cols-[0.85fr_1.35fr_1fr]">

                                    {/* Current journey state */}
                                   <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Current journey
                                            </p>

                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Live
                                            </span>
                                        </div>

                                        <div className="mt-4">
                                            <p className="text-xs font-medium text-slate-500">
                                                Current station
                                            </p>

                                            <h4 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                                                {result.journey.current_station_name
                                                    ?? result.journey.current_station_code
                                                    ?? "Unavailable"}
                                            </h4>

                                            {result.journey.current_station_code && (
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {result.journey.current_station_code}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 border-t border-slate-200 pt-3">
                                            <p className="text-xs text-slate-500">
                                                Current delay
                                            </p>

                                            <p
                                                className={[
                                                    "mt-1 text-lg font-bold",
                                                    result.journey.current_delay_min == null
                                                        ? "text-slate-700"
                                                        : result.journey.current_delay_min > 0
                                                            ? "text-rose-700"
                                                            : result.journey.current_delay_min < 0
                                                                ? "text-sky-700"
                                                                : "text-emerald-700",
                                                ].join(" ")}
                                            >
                                                {result.journey.current_delay_min == null
                                                    ? "Unavailable"
                                                    : result.journey.current_delay_min < 0
                                                        ? `${Math.abs(
                                                            result.journey.current_delay_min,
                                                        )} min early`
                                                        : result.journey.current_delay_min === 0
                                                            ? "On time"
                                                            : `+${result.journey.current_delay_min} min late`}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                                    Stations observed
                                                </p>

                                                <p className="mt-1 text-lg font-bold text-slate-900">
                                                    {result.journey.observed_stations}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                                    Stations ahead
                                                </p>

                                                <p className="mt-1 text-lg font-bold text-slate-900">
                                                    {result.journey.upcoming_stations}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main ETA prediction */}
                                    <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white p-5 sm:p-6">

                                        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-100/60 blur-3xl" />

                                        <div className="relative">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                        Next station
                                                    </p>

                                                    <h4 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                                                        {nextPrediction
                                                            ? (
                                                                nextPrediction.station.name
                                                                ?? nextPrediction.station.code
                                                            )
                                                            : isWaitingForObservations
                                                                ? "Waiting for live data"
                                                                : "Unavailable"}
                                                    </h4>

                                                    {nextPrediction?.station.code && (
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {nextPrediction.station.code}
                                                        </p>
                                                    )}
                                                </div>

                                                {nextPrediction && (
                                                    <span
                                                        className={confidenceClass(
                                                            nextPrediction.forecast.confidence,
                                                        )}
                                                    >
                                                        {nextPrediction.forecast.confidence}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-6">
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                    Predicted arrival
                                                </p>

                                                <p className="mt-1 text-4xl font-bold tracking-tight text-[#0876c9] sm:text-5xl">
                                                    {nextPrediction?.forecast.eta
                                                        ? new Date(
                                                            nextPrediction.forecast.eta,
                                                        ).toLocaleTimeString(
                                                            "en-IN",
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            },
                                                        )
                                                        : "--"}
                                                </p>
                                            </div>

                                            {nextPrediction && (


                                                <div className="mt-6 grid gap-3 sm:grid-cols-3">

                                                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                            Expected delay
                                                        </p>

                                                        <p
                                                            className={[
                                                                "mt-1.5 text-lg font-bold",
                                                                nextPrediction.forecast.predicted_delay_min > 0
                                                                    ? "text-rose-700"
                                                                    : nextPrediction.forecast.predicted_delay_min < 0
                                                                        ? "text-sky-700"
                                                                        : "text-emerald-700",
                                                            ].join(" ")}
                                                        >
                                                            {nextPrediction.forecast.predicted_delay_min > 0
                                                                ? `+${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                                : nextPrediction.forecast.predicted_delay_min < 0
                                                                    ? `${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                                    : "On time"}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                            Confidence
                                                        </p>

                                                        <p className="mt-1.5 text-lg font-bold capitalize text-slate-900">
                                                            {nextPrediction.forecast.confidence}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                            Position source
                                                        </p>

                                                        <p className="mt-1.5 text-sm font-bold text-slate-900">
                                                            {livePositionSource === "REAL_PROVIDER_GPS"
                                                                ? "Live GPS"
                                                                : livePositionSource === "CURRENT_STATION"
                                                                    ? "Station position"
                                                                    : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                                        ? "Estimated position"
                                                                        : "Unavailable"}
                                                        </p>
                                                    </div>

                                                </div>
                                            )}

                                            {!nextPrediction &&
                                                isWaitingForObservations && (
                                                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <p className="text-sm font-semibold text-amber-900">
                                                            Waiting for verified live observations
                                                        </p>

                                                        <p className="mt-1 text-xs leading-5 text-amber-700">
                                                            RailETA will generate the next-station prediction
                                                            when sufficient live journey information becomes
                                                            available.
                                                        </p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>

                                    {nextPrediction && (
                                        <EtaPredictionTrend
                                            points={etaHistory}
                                        />
                                    )}
                                </div>
                            )}


                            {/* Passenger-friendly ETA explanation */}
                            {nextPrediction &&
                                result.diagnostics
                                    ?.prediction_explanation
                                    ?.explanation_available && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                    Prediction explanation
                                                </p>

                                                <h3 className="mt-1 text-lg font-bold text-slate-950">
                                                    Why this ETA?
                                                </h3>

                                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                                    Main model factors associated with the current
                                                    arrival forecast.
                                                </p>
                                            </div>

                                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                Model explanation available
                                            </span>
                                        </div>

                                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                                            {result.diagnostics
                                                .prediction_explanation
                                                .factors
                                                .slice(0, 4)
                                                .map((factor) => {
                                                    const contribution =
                                                        factor.contribution ?? 0;

                                                    const absoluteContribution =
                                                        Math.abs(contribution);

                                                    const directionLabel =
                                                        factor.direction === "INCREASES_DELAY"
                                                            ? "Pushes ETA later"
                                                            : factor.direction === "REDUCES_DELAY"
                                                                ? "Pushes ETA earlier"
                                                                : "Influences ETA";

                                                    return (
                                                        <div
                                                            key={`${factor.feature}-${factor.rank ?? 0}`}
                                                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                                                        >
                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="font-semibold text-slate-900">
                                                                            {factor.display_name
                                                                                ?? factor.feature}
                                                                        </p>

                                                                        <span
                                                                            className={[
                                                                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                                                factor.direction === "INCREASES_DELAY"
                                                                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                                                                    : factor.direction === "REDUCES_DELAY"
                                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                                        : "border-slate-200 bg-white text-slate-600",
                                                                            ].join(" ")}
                                                                        >
                                                                            {directionLabel}
                                                                        </span>
                                                                    </div>

                                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                        {factor.direction === "INCREASES_DELAY"
                                                                            ? "Associated with a later predicted arrival."
                                                                            : factor.direction === "REDUCES_DELAY"
                                                                                ? "Associated with an earlier predicted arrival."
                                                                                : "Used as part of the current ETA prediction."}
                                                                    </p>
                                                                </div>

                                                                {factor.contribution != null && (
                                                                    <div className="shrink-0 text-left sm:text-right">
                                                                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                                                            Model contribution
                                                                        </p>

                                                                        <p
                                                                            className={[
                                                                                "mt-1 text-base font-bold",
                                                                                contribution > 0
                                                                                    ? "text-rose-700"
                                                                                    : contribution < 0
                                                                                        ? "text-emerald-700"
                                                                                        : "text-slate-700",
                                                                            ].join(" ")}
                                                                        >
                                                                            {contribution > 0
                                                                                ? "+"
                                                                                : contribution < 0
                                                                                    ? "−"
                                                                                    : ""}
                                                                            {absoluteContribution.toFixed(1)} min
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {factor.contribution != null && (
                                                                <div className="mt-3">
                                                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                                        <div
                                                                            className={[
                                                                                "h-full rounded-full",
                                                                                contribution > 0
                                                                                    ? "bg-rose-500"
                                                                                    : contribution < 0
                                                                                        ? "bg-emerald-500"
                                                                                        : "bg-slate-400",
                                                                            ].join(" ")}
                                                                            style={{
                                                                                width: `${Math.min(
                                                                                    100,
                                                                                    Math.max(
                                                                                        8,
                                                                                        absoluteContribution * 5,
                                                                                    ),
                                                                                )}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {result.diagnostics
                                            .prediction_explanation
                                            .interpretation && (
                                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                        Interpretation
                                                    </p>

                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {
                                                            result.diagnostics
                                                                .prediction_explanation
                                                                .interpretation
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5">
                                            <span className="mt-0.5 text-sky-600">
                                                ⓘ
                                            </span>

                                            <p className="text-xs leading-5 text-sky-800">
                                                These factors describe model associations with the
                                                prediction. They should not be interpreted as direct
                                                causal effects.
                                            </p>
                                        </div>

                                    </div>
                                )}
                        </div>

                        {/* Journey Timeline */}
                        {result.journey.timeline && (
                            <JourneyTimeline
                                timeline={
                                    result.journey.timeline
                                }
                            />
                        )}

                        {/* Scheduled timetable */}
                        {isScheduledNotStarted
                            && result.journey.schedule
                            && result.journey.schedule.length
                            > 0 && (
                                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            Scheduled Timetable
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Planned station sequence
                                            for this journey.
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                                    <th className="px-3 py-3">
                                                        Station
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Arrival
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Departure
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Platform
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Distance
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {result.journey
                                                    .schedule.map(
                                                        (
                                                            station,
                                                            index,
                                                        ) => (
                                                            <tr
                                                                key={`${station.station_code}-${index}`}
                                                                className="border-b last:border-b-0"
                                                            >
                                                                <td className="px-3 py-3">
                                                                    <div className="font-semibold text-gray-900">
                                                                        {station.station_name
                                                                            ?? station.station_code
                                                                            ?? "Unknown"}
                                                                    </div>

                                                                    {station.station_code && (
                                                                        <div className="text-xs text-gray-500">
                                                                            {
                                                                                station.station_code
                                                                            }
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-3 py-3 text-gray-700">
                                                                    {station.scheduled_arrival
                                                                        ? new Date(
                                                                            station.scheduled_arrival,
                                                                        ).toLocaleTimeString(
                                                                            [],
                                                                            {
                                                                                hour:
                                                                                    "2-digit",
                                                                                minute:
                                                                                    "2-digit",
                                                                            },
                                                                        )
                                                                        : "—"}
                                                                </td>

                                                                <td className="px-3 py-3 text-gray-700">
                                                                    {station.scheduled_departure
                                                                        ? new Date(
                                                                            station.scheduled_departure,
                                                                        ).toLocaleTimeString(
                                                                            [],
                                                                            {
                                                                                hour:
                                                                                    "2-digit",
                                                                                minute:
                                                                                    "2-digit",
                                                                            },
                                                                        )
                                                                        : "—"}
                                                                </td>

                                                                <td className="px-3 py-3 text-gray-700">
                                                                    {station.platform
                                                                        ?? "—"}
                                                                </td>

                                                                <td className="px-3 py-3 text-gray-700">
                                                                    {station.distance_from_source_km
                                                                        != null
                                                                        ? `${station.distance_from_source_km} km`
                                                                        : "—"}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        {/* Completed state */}
                        {isCompletedJourney && (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                <p className="font-semibold text-green-900">
                                    Journey Completed
                                </p>

                                <p className="mt-1 text-sm text-green-800">
                                    {result.message
                                        ?? "This train has completed the current journey. No further ETA predictions are required."}
                                </p>

                                {result.journey
                                    .observed_stations > 0 && (
                                        <p className="mt-2 text-xs text-green-700">
                                            Observed stations:{" "}
                                            {
                                                result.journey
                                                    .observed_stations
                                            }
                                        </p>
                                    )}
                            </div>
                        )}

                        {/* Waiting state */}
                        {isWaitingForObservations && (
                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                <p className="font-semibold text-yellow-900">
                                    Waiting for Verified Live
                                    Observations
                                </p>

                                <p className="mt-1 text-sm text-yellow-800">
                                    {result.message
                                        ?? "Live journey data is available, but there are not yet enough verified observations for a safe ETA prediction."}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-yellow-800">
                                    <span>
                                        Observed stations:{" "}
                                        <strong>
                                            {
                                                result.journey
                                                    .observed_stations
                                            }
                                        </strong>
                                    </span>

                                    <span>
                                        Upcoming stations:{" "}
                                        <strong>
                                            {
                                                result.journey
                                                    .upcoming_stations
                                            }
                                        </strong>
                                    </span>
                                </div>

                                <p className="mt-3 text-xs text-yellow-700">
                                    RailETA will not fabricate an
                                    ETA until sufficient
                                    leakage-safe observations are
                                    available.
                                </p>
                            </div>
                        )}

                        {hasLiveResult
                            && !isCompletedJourney
                            && !isWaitingForObservations
                            && !isScheduledNotStarted && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="h-2 w-2 rounded-full bg-green-500" />

                                    <span>
                                        Auto-refreshing every 60
                                        seconds
                                    </span>
                                </div>
                            )}
                    </div>
                </>
            )}


            {result && (
                <div className="grid gap-5 xl:grid-cols-[1.65fr_0.85fr]">

                    {/* Route map */}
                    {!isScheduledNotStarted &&
                        result.route && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                            Route intelligence
                                        </p>

                                        <h3 className="mt-1 text-lg font-bold text-slate-950">
                                            {isCompletedJourney
                                                ? "Journey Route Map"
                                                : "Live Route Map"}
                                        </h3>

                                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                                            {isCompletedJourney
                                                ? "Completed route and station progression for this journey."
                                                : "Current train position, route progress and upcoming stations."}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={[
                                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                isCompletedJourney
                                                    ? "border-slate-200 bg-slate-100 text-slate-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
                                            ].join(" ")}
                                        >
                                            <span
                                                className={[
                                                    "h-1.5 w-1.5 rounded-full",
                                                    isCompletedJourney
                                                        ? "bg-slate-500"
                                                        : "bg-emerald-500",
                                                ].join(" ")}
                                            />

                                            {isCompletedJourney
                                                ? "Completed"
                                                : "Live journey"}
                                        </span>

                                        {!isCompletedJourney && (
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                {livePositionSource === "REAL_PROVIDER_GPS"
                                                    ? "Live GPS"
                                                    : livePositionSource === "CURRENT_STATION"
                                                        ? "Station position"
                                                        : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                            ? "Estimated position"
                                                            : "Position unavailable"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 sm:p-4">
                                    <RouteMap
                                        key={`${result.journey.train_number}-${result.route.current_position?.latitude ?? "na"}-${result.route.current_position?.longitude ?? "na"}`}
                                        route={result.route}
                                        etaWeather={
                                            result.eta_weather_corridor
                                        }
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
                                    <span>
                                        <strong className="font-semibold text-slate-700">
                                            Route status:
                                        </strong>{" "}
                                        {isCompletedJourney
                                            ? "Completed"
                                            : "Running"}
                                    </span>

                                    {!isCompletedJourney && (
                                        <span>
                                            <strong className="font-semibold text-slate-700">
                                                Position:
                                            </strong>{" "}
                                            {livePositionSource === "REAL_PROVIDER_GPS"
                                                ? "Provider GPS"
                                                : livePositionSource === "CURRENT_STATION"
                                                    ? "Current station"
                                                    : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                        ? "Estimated between stations"
                                                        : "Unavailable"}
                                        </span>
                                    )}

                                    {result.backend && (
                                        <span>
                                            <strong className="font-semibold text-slate-700">
                                                Live cache:
                                            </strong>{" "}
                                            {result.backend.provider_payload_cache}
                                        </span>
                                    )}
                                </div>
                            </section>
                        )}

                    {/* Conditions ahead */}
                    {!isScheduledNotStarted &&
                        !isCompletedJourney &&
                        result.eta_weather_corridor.length > 0 && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                <div className="border-b border-slate-100 px-5 py-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        Journey context
                                    </p>

                                    <h3 className="mt-1 text-lg font-bold text-slate-950">
                                        Conditions ahead
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Weather near predicted station arrival times.
                                    </p>
                                </div>

                                <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
                                    {result.eta_weather_corridor.map(
                                        (item) => {
                                            const weather =
                                                item.weather;

                                            return (
                                                <div
                                                    key={item.station_code}
                                                    className="px-5 py-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-slate-900">
                                                                {item.station_name
                                                                    ?? item.station_code}
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                {item.station_code}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${weatherRiskClass(
                                                                weather?.risk_level
                                                                ?? "UNKNOWN",
                                                            )}`}
                                                        >
                                                            {weather?.risk_level
                                                                ?? "UNKNOWN"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                Condition
                                                            </p>

                                                            <p className="mt-1 font-medium text-slate-700">
                                                                {weather?.condition
                                                                    ?? "Unavailable"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                Temperature
                                                            </p>

                                                            <p className="mt-1 font-medium text-slate-700">
                                                                {weather?.temperature_c
                                                                    != null
                                                                    ? `${weather.temperature_c}°C`
                                                                    : "N/A"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                Rain probability
                                                            </p>

                                                            <p className="mt-1 font-medium text-slate-700">
                                                                {weather?.precipitation_probability_pct
                                                                    != null
                                                                    ? `${weather.precipitation_probability_pct}%`
                                                                    : "N/A"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                Arrival ETA
                                                            </p>

                                                            <p className="mt-1 font-semibold text-sky-700">
                                                                {new Date(
                                                                    item.predicted_eta,
                                                                ).toLocaleTimeString(
                                                                    "en-IN",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: true,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>

                                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                                    <p className="text-[11px] leading-5 text-slate-500">
                                        Weather is treated as contextual information.
                                        Specific delay minutes are not attributed to weather
                                        unless supported by the prediction model.
                                    </p>
                                </div>

                            </section>
                        )}
                </div>
            )}
            {result && result.predictions.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                Upcoming predictions
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                {showAllStationProgress
                                    ? "All upcoming stations"
                                    : "Next 5 stations"}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Station-level ETA predictions for the remaining journey.
                            </p>
                        </div>

                        {result.predictions.length > 5 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAllStationProgress(
                                        (current) => !current,
                                    )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                {showAllStationProgress
                                    ? "Show next 5"
                                    : `View all ${result.predictions.length}`}
                            </button>
                        )}
                    </div>

                    {/* Desktop header */}
                    <div className="hidden grid-cols-[minmax(0,1.6fr)_130px_100px_120px_120px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid md:px-6">
                        <span>Station</span>
                        <span>Predicted ETA</span>
                        <span>Delay</span>
                        <span>Confidence</span>
                        <span>Weather risk</span>
                    </div>

                    <div>
                        {(
                            showAllStationProgress
                                ? result.predictions
                                : result.predictions.slice(0, 5)
                        ).map((prediction, index) => {
                            const weatherEntry =
                                result.eta_weather_corridor.find(
                                    (item) =>
                                        item.station_code ===
                                        prediction.station.code,
                                );

                            const weather =
                                weatherEntry?.weather;

                            const isNext =
                                prediction.station.stations_ahead === 1;

                            const isLast =
                                prediction.station.stations_ahead ===
                                result.predictions.length;

                            return (
                                <div
                                    key={`${prediction.station.code}-${prediction.station.stations_ahead}-${index}`}
                                    className={[
                                        "grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_130px_100px_120px_120px] md:items-center md:px-6",
                                        isNext
                                            ? "bg-sky-50/70"
                                            : isLast
                                                ? "bg-slate-50"
                                                : "bg-white",
                                    ].join(" ")}
                                >

                                    {/* Station */}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div
                                                className={[
                                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                                                    isNext
                                                        ? "bg-sky-600 text-white"
                                                        : isLast
                                                            ? "bg-slate-800 text-white"
                                                            : "border border-slate-200 bg-white text-slate-600",
                                                ].join(" ")}
                                            >
                                                {isNext
                                                    ? "→"
                                                    : isLast
                                                        ? "◆"
                                                        : prediction.station.stations_ahead}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate font-semibold text-slate-950">
                                                        {prediction.station.name
                                                            ?? prediction.station.code}
                                                    </p>

                                                    {isNext && (
                                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                                                            Next
                                                        </span>
                                                    )}

                                                    {isLast && (
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                                            Destination
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

                                    {/* Predicted ETA */}
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                            Predicted ETA
                                        </p>

                                        <p
                                            className={[
                                                "mt-1 text-sm font-semibold md:mt-0",
                                                isNext
                                                    ? "text-sky-700"
                                                    : "text-slate-800",
                                            ].join(" ")}
                                        >
                                            {prediction.forecast.eta
                                                ? new Date(
                                                    prediction.forecast.eta,
                                                ).toLocaleTimeString(
                                                    "en-IN",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    },
                                                )
                                                : "Unavailable"}
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
                                            {prediction.forecast.predicted_delay_min > 0
                                                ? `+${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                : prediction.forecast.predicted_delay_min < 0
                                                    ? `${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                    : "On time"}
                                        </span>
                                    </div>

                                    {/* Confidence */}
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                            Confidence
                                        </p>

                                        <span
                                            className={[
                                                "mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize md:mt-0",
                                                confidenceClass(
                                                    prediction.forecast.confidence,
                                                ),
                                            ].join(" ")}
                                        >
                                            {prediction.forecast.confidence}
                                        </span>
                                    </div>

                                    {/* Weather */}
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 md:hidden">
                                            Weather risk
                                        </p>

                                        <span
                                            className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold md:mt-0 ${weatherRiskClass(
                                                weather?.risk_level
                                                ?? "UNKNOWN",
                                            )}`}
                                        >
                                            {weather?.risk_level
                                                ?? "UNKNOWN"}
                                        </span>

                                        {weather?.condition && (
                                            <p className="mt-1 text-[10px] text-slate-400">
                                                {weather.condition}
                                            </p>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] leading-5 text-slate-500 sm:px-6">
                        Predicted arrival times are generated from the latest verified journey observations and model outputs.
                    </div>

                </section>
            )}

            {result && result.predictions.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                Model intelligence
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                Prediction diagnostics
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Model explanation, evaluation metrics and serving details
                                for the current ETA prediction.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowModelInsights(
                                    (current) => !current,
                                )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            {showModelInsights
                                ? "Hide advanced details"
                                : "Show advanced details"}
                        </button>
                    </div>

                    {/* Compact summary */}
                    <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Explanation
                            </p>

                            <p
                                className={[
                                    "mt-1.5 text-sm font-bold",
                                    result.diagnostics?.prediction_explanation
                                        ?.explanation_available
                                        ? "text-emerald-700"
                                        : "text-slate-700",
                                ].join(" ")}
                            >
                                {result.diagnostics?.prediction_explanation
                                    ?.explanation_available
                                    ? "Available"
                                    : "Unavailable"}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Observed stations
                            </p>

                            <p className="mt-1.5 text-lg font-bold text-slate-950">
                                {result.journey.observed_stations}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Upcoming stations
                            </p>

                            <p className="mt-1.5 text-lg font-bold text-slate-950">
                                {result.journey.upcoming_stations}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Evaluation
                            </p>

                            <p
                                className={[
                                    "mt-1.5 text-sm font-bold",
                                    result.diagnostics?.evaluation
                                        ? "text-emerald-700"
                                        : "text-slate-700",
                                ].join(" ")}
                            >
                                {result.diagnostics?.evaluation
                                    ? "Metrics available"
                                    : "Unavailable"}
                            </p>
                        </div>
                    </div>

                    {showModelInsights && (
                        <div className="grid gap-4 p-5 xl:grid-cols-2 sm:p-6">

                            {/* Explainability */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        Prediction explainability
                                    </p>

                                    <h4 className="mt-1 font-bold text-slate-950">
                                        Model factors
                                    </h4>
                                </div>

                                {result.diagnostics
                                    ?.prediction_explanation
                                    ?.explanation_available ? (
                                    <div className="mt-4 space-y-3">

                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                            <p className="text-xs text-slate-500">
                                                Explanation method
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {
                                                    result.diagnostics
                                                        .prediction_explanation
                                                        .method
                                                }
                                            </p>
                                        </div>

                                        {result.diagnostics
                                            .prediction_explanation
                                            .factors
                                            .slice(0, 5)
                                            .map((factor) => (
                                                <div
                                                    key={`${factor.feature}-${factor.rank ?? 0}`}
                                                    className="rounded-xl border border-slate-200 bg-white p-3.5"
                                                >
                                                    <div className="flex items-start justify-between gap-3">

                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900">
                                                                {factor.display_name
                                                                    ?? factor.feature}
                                                            </p>

                                                            <p className="mt-0.5 break-all text-[10px] text-slate-400">
                                                                {factor.feature}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={[
                                                                "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold",
                                                                factor.direction === "INCREASES_DELAY"
                                                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                                                    : factor.direction === "REDUCES_DELAY"
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                                            ].join(" ")}
                                                        >
                                                            {factor.direction === "INCREASES_DELAY"
                                                                ? "Pushes ETA later"
                                                                : factor.direction === "REDUCES_DELAY"
                                                                    ? "Pulls ETA earlier"
                                                                    : "Influences ETA"}
                                                        </span>
                                                    </div>

                                                    {factor.contribution != null && (
                                                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                                            <span className="text-xs text-slate-500">
                                                                Model contribution
                                                            </span>

                                                            <span
                                                                className={[
                                                                    "text-sm font-bold",
                                                                    factor.contribution > 0
                                                                        ? "text-rose-700"
                                                                        : factor.contribution < 0
                                                                            ? "text-emerald-700"
                                                                            : "text-slate-700",
                                                                ].join(" ")}
                                                            >
                                                                {factor.contribution > 0
                                                                    ? "+"
                                                                    : ""}
                                                                {factor.contribution.toFixed(2)} min
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                        {result.diagnostics
                                            .prediction_explanation
                                            .interpretation && (
                                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                                                        Interpretation
                                                    </p>

                                                    <p className="mt-1.5 text-xs leading-5 text-sky-900">
                                                        {
                                                            result.diagnostics
                                                                .prediction_explanation
                                                                .interpretation
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                        <p className="text-[11px] leading-5 text-slate-500">
                                            Attribution values describe model associations,
                                            not guaranteed causal effects.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                                        <p className="font-semibold text-slate-900">
                                            Explainability unavailable
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            Attribution could not be safely reconstructed for
                                            the served model output.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Evaluation */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        Model evaluation
                                    </p>

                                    <h4 className="mt-1 font-bold text-slate-950">
                                        Error metrics
                                    </h4>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        These are prediction errors in minutes, not an
                                        accuracy percentage. Lower values indicate better
                                        performance.
                                    </p>
                                </div>

                                {result.diagnostics?.evaluation ? (
                                    <div className="mt-4 grid grid-cols-2 gap-3">

                                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                MAE
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {result.diagnostics.evaluation.mae_minutes != null
                                                    ? `${result.diagnostics.evaluation.mae_minutes.toFixed(2)} min`
                                                    : "N/A"}
                                            </p>

                                            <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                                Average absolute prediction error.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                RMSE
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {result.diagnostics.evaluation.rmse_minutes != null
                                                    ? `${result.diagnostics.evaluation.rmse_minutes.toFixed(2)} min`
                                                    : "N/A"}
                                            </p>

                                            <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                                Gives more weight to larger errors.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Median error
                                            </p>

                                            <p className="mt-1.5 text-lg font-bold text-slate-950">
                                                {result.diagnostics.evaluation
                                                    .median_absolute_error_minutes != null
                                                    ? `${result.diagnostics.evaluation.median_absolute_error_minutes.toFixed(2)} min`
                                                    : "N/A"}
                                            </p>

                                            <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                                Typical absolute prediction error.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                P90 error
                                            </p>

                                            <p className="mt-1.5 text-lg font-bold text-slate-950">
                                                {result.diagnostics.evaluation
                                                    .p90_absolute_error_minutes != null
                                                    ? `${result.diagnostics.evaluation.p90_absolute_error_minutes.toFixed(2)} min`
                                                    : "N/A"}
                                            </p>

                                            <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                                90% of evaluated errors were below this value.
                                            </p>
                                        </div>

                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                                        <p className="font-semibold text-slate-900">
                                            Evaluation metrics unavailable
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            Evaluation metrics are unavailable for the model
                                            serving this prediction.
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                </section>
            )}

            {result && result.predictions.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                Technical predictions
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                Detailed ETA predictions
                            </h3>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                Prediction intervals, confidence, model routing and
                                provider comparison for technical review.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowDetailedPredictions(
                                    (current) => !current,
                                )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            {showDetailedPredictions
                                ? "Hide technical details"
                                : `Show ${result.predictions.length} technical predictions`}
                        </button>
                    </div>

                    {!showDetailedPredictions && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] leading-5 text-slate-500 sm:px-6">
                            Detailed model metadata is hidden by default to keep the
                            passenger experience focused on the most useful ETA information.
                        </div>
                    )}

                    {showDetailedPredictions && (
                        <div className="border-t border-slate-100">

                            {/* Desktop headings */}
                            <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_100px_125px_minmax(180px,1fr)] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid lg:px-6">
                                <span>Station</span>
                                <span>ETA</span>
                                <span>Delay</span>
                                <span>Confidence</span>
                                <span>Prediction interval</span>
                            </div>

                            <div>
                                {result.predictions.map(
                                    (prediction, index) => {
                                        const isNext =
                                            prediction.station.stations_ahead === 1;

                                        const isDestination =
                                            index ===
                                            result.predictions.length - 1;

                                        return (
                                            <article
                                                key={`${prediction.station.code}-${prediction.station.stations_ahead}`}
                                                className={[
                                                    "border-b border-slate-100 px-5 py-4 last:border-b-0 sm:px-6",
                                                    isNext
                                                        ? "bg-sky-50/60"
                                                        : "bg-white",
                                                ].join(" ")}
                                            >

                                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_110px_100px_125px_minmax(180px,1fr)] lg:items-center">

                                                    {/* Station */}
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-slate-950">
                                                                {prediction.station.name
                                                                    ?? prediction.station.code}
                                                            </p>

                                                            {isNext && (
                                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                                                                    Next
                                                                </span>
                                                            )}

                                                            {isDestination && (
                                                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                                                    Destination
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="mt-1 text-xs text-slate-400">
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

                                                    {/* ETA */}
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 lg:hidden">
                                                            Predicted ETA
                                                        </p>

                                                        <p
                                                            className={[
                                                                "mt-1 text-sm font-semibold lg:mt-0",
                                                                isNext
                                                                    ? "text-sky-700"
                                                                    : "text-slate-800",
                                                            ].join(" ")}
                                                        >
                                                            {prediction.forecast.eta
                                                                ? new Date(
                                                                    prediction.forecast.eta,
                                                                ).toLocaleTimeString(
                                                                    "en-IN",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: true,
                                                                    },
                                                                )
                                                                : "Unavailable"}
                                                        </p>
                                                    </div>

                                                    {/* Delay */}
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 lg:hidden">
                                                            Delay
                                                        </p>

                                                        <span
                                                            className={[
                                                                "mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold lg:mt-0",
                                                                prediction.forecast
                                                                    .predicted_delay_min > 0
                                                                    ? "bg-rose-50 text-rose-700"
                                                                    : prediction.forecast
                                                                        .predicted_delay_min < 0
                                                                        ? "bg-sky-50 text-sky-700"
                                                                        : "bg-emerald-50 text-emerald-700",
                                                            ].join(" ")}
                                                        >
                                                            {prediction.forecast
                                                                .predicted_delay_min > 0
                                                                ? `+${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                                : prediction.forecast
                                                                    .predicted_delay_min < 0
                                                                    ? `${prediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                                    : "On time"}
                                                        </span>
                                                    </div>

                                                    {/* Confidence */}
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 lg:hidden">
                                                            Confidence
                                                        </p>

                                                        <span
                                                            className={[
                                                                "mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold lg:mt-0",
                                                                confidenceClass(
                                                                    prediction.forecast.confidence,
                                                                ),
                                                            ].join(" ")}
                                                        >
                                                            {prediction.forecast.confidence}
                                                        </span>
                                                    </div>

                                                    {/* Interval */}
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 lg:hidden">
                                                            Prediction interval
                                                        </p>

                                                        <p className="mt-1 text-sm font-medium text-slate-700 lg:mt-0">
                                                            {prediction.forecast.lower_eta
                                                                ? new Date(
                                                                    prediction.forecast.lower_eta,
                                                                ).toLocaleTimeString(
                                                                    "en-IN",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: true,
                                                                    },
                                                                )
                                                                : "N/A"}

                                                            {" – "}

                                                            {prediction.forecast.upper_eta
                                                                ? new Date(
                                                                    prediction.forecast.upper_eta,
                                                                ).toLocaleTimeString(
                                                                    "en-IN",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: true,
                                                                    },
                                                                )
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Technical metadata */}
                                                <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70">
                                                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                                                        Model and calculation details
                                                    </summary>

                                                    <div className="grid gap-4 border-t border-slate-200 bg-white px-4 py-4 md:grid-cols-2">

                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                Forecast method
                                                            </p>

                                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                {prediction.model.prediction_engine ===
                                                                    "MODEL_2_NEXT_STATION"
                                                                    ? "Next-station specialist"
                                                                    : prediction.model.prediction_engine ===
                                                                        "MODEL_3_MULTI_HORIZON"
                                                                        ? "Multi-station forecast"
                                                                        : "Hybrid ETA forecast"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Engine:{" "}
                                                                {
                                                                    prediction.model
                                                                        .prediction_engine
                                                                }
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                Prediction logic
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                                {prediction.station.stations_ahead === 1
                                                                    ? "Uses the latest observed train movement and recent delay pattern for the immediate next station."
                                                                    : "Uses the current delay trend and guarded delay propagation for stations further ahead."}
                                                            </p>
                                                        </div>

                                                        {prediction.explanation && (
                                                            <div className="md:col-span-2">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    Technical note
                                                                </p>

                                                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                                                    {prediction.explanation}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {prediction.comparison_only
                                                            .provider_eta && (
                                                                <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
                                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                                        External provider reference
                                                                    </p>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                                                                        <p className="text-sm font-semibold text-slate-900">
                                                                            {new Date(
                                                                                prediction.comparison_only
                                                                                    .provider_eta,
                                                                            ).toLocaleTimeString(
                                                                                "en-IN",
                                                                                {
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit",
                                                                                    hour12: true,
                                                                                },
                                                                            )}
                                                                        </p>

                                                                        {prediction.comparison_only
                                                                            .provider_delay_min !=
                                                                            null && (
                                                                                <span className="text-xs text-slate-500">
                                                                                    Provider delay:{" "}
                                                                                    <strong className="font-semibold text-slate-700">
                                                                                        {
                                                                                            prediction
                                                                                                .comparison_only
                                                                                                .provider_delay_min
                                                                                        }{" "}
                                                                                        min
                                                                                    </strong>
                                                                                </span>
                                                                            )}
                                                                    </div>

                                                                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                                                        Reference only — this value is not used
                                                                        as the RailETA model prediction.
                                                                    </p>
                                                                </div>
                                                            )}
                                                    </div>
                                                </details>
                                            </article>
                                        );
                                    },
                                )}
                            </div>

                        </div>
                    )}

                </section>
            )}
        </section>


    );
}
