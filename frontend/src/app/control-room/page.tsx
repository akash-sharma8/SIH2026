"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    railEtaApi,
} from "@/lib/api/raileta-api";

import type {
    LiveForecastResponse,
    TrainSearchResult,
} from "@/lib/api/api-types";


interface MonitoredTrain {
    trainNumber: string;
    journeyDate: string;
    trainName: string;
    result: LiveForecastResponse | null;
    loading: boolean;
    error: string | null;
}


function formatTime(
    value: string | null | undefined,
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

function getTodayLocalDate() {
    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1,
        ).padStart(2, "0");

    const day =
        String(
            now.getDate(),
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function delayLabel(
    delay: number | null | undefined,
) {
    if (delay == null) {
        return "Unavailable";
    }

    if (delay < 0) {
        return `${Math.abs(delay).toFixed(1)} min early`;
    }

    if (delay === 0) {
        return "On time";
    }

    return `${delay.toFixed(1)} min late`;
}


function delayClass(
    delay: number | null | undefined,
) {
    if (delay == null) {
        return "bg-slate-100 text-slate-600";
    }

    if (delay <= 5) {
        return "bg-green-100 text-green-700";
    }

    if (delay <= 20) {
        return "bg-yellow-100 text-yellow-700";
    }

    if (delay <= 45) {
        return "bg-orange-100 text-orange-700";
    }

    return "bg-red-100 text-red-700";
}


function confidenceClass(
    confidence: string | null | undefined,
) {
    if (confidence === "HIGH") {
        return "bg-green-100 text-green-700";
    }

    if (confidence === "MEDIUM") {
        return "bg-yellow-100 text-yellow-700";
    }

    return "bg-slate-100 text-slate-600";
}


export default function ControlRoomPage() {
    const [
        searchQuery,
        setSearchQuery,
    ] = useState("");

    const [
        journeyDate,
        setJourneyDate,
    ] = useState(
        getTodayLocalDate(),
    );

    const [
        searchResults,
        setSearchResults,
    ] = useState<TrainSearchResult[]>([]);

    const [
        searchLoading,
        setSearchLoading,
    ] = useState(false);

    const [
        monitoredTrains,
        setMonitoredTrains,
    ] = useState<MonitoredTrain[]>([]);

    const [
        refreshAllLoading,
        setRefreshAllLoading,
    ] = useState(false);


    function searchTrains(
        value: string,
    ) {
        setSearchQuery(value);

        if (value.trim().length < 2) {
            setSearchResults([]);
            setSearchLoading(false);
        }
    }

    useEffect(() => {
        const query =
            searchQuery.trim();

        if (query.length < 2) {
            return;
        }

        let ignore = false;

        const timer =
            window.setTimeout(
                async () => {
                    try {
                        setSearchLoading(true);

                        const response =
                            await railEtaApi
                                .searchTrains(
                                    query,
                                    8,
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
                    } finally {
                        if (!ignore) {
                            setSearchLoading(false);
                        }
                    }
                },
                350,
            );

        return () => {
            ignore = true;
            window.clearTimeout(timer);
        };
    }, [searchQuery]);


    async function addTrain(
        train: TrainSearchResult,
    ) {
        const exists =
            monitoredTrains.some(
                (item) =>
                    item.trainNumber
                    === train.train_number,
            );

        if (exists) {
            setSearchResults([]);
            setSearchQuery("");
            return;
        }

        const placeholder: MonitoredTrain = {
            trainNumber:
                train.train_number,
            trainName:
                train.train_name,
            journeyDate,
            result: null,
            loading: true,
            error: null,
        };

        setMonitoredTrains(
            (current) => [
                ...current,
                placeholder,
            ],
        );

        setSearchResults([]);
        setSearchQuery("");

        try {
            const result =
                await railEtaApi.getLiveForecast({
                    train_number:
                        train.train_number,
                    journey_date:
                        journeyDate,
                });

            setMonitoredTrains(
                (current) =>
                    current.map((item) =>
                        item.trainNumber
                            === train.train_number
                            ? {
                                ...item,
                                result,
                                loading: false,
                                error: null,
                            }
                            : item,
                    ),
            );
        } catch (error) {
            setMonitoredTrains(
                (current) =>
                    current.map((item) =>
                        item.trainNumber
                            === train.train_number
                            ? {
                                ...item,
                                loading: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Unable to load train.",
                            }
                            : item,
                    ),
            );
        }
    }


    function removeTrain(
        trainNumber: string,
    ) {
        setMonitoredTrains(
            (current) =>
                current.filter(
                    (item) =>
                        item.trainNumber
                        !== trainNumber,
                ),
        );
    }


    async function refreshTrain(
        trainNumber: string,
        journeyDate: string,
    ) {
        setMonitoredTrains(
            (current) =>
                current.map((item) =>
                    item.trainNumber
                        === trainNumber
                        ? {
                            ...item,
                            loading: true,
                            error: null,
                        }
                        : item,
                ),
        );

        try {
            const result =
                await railEtaApi.getLiveForecast({
                    train_number:
                        trainNumber,
                    journey_date:
                        journeyDate,
                });

            setMonitoredTrains(
                (current) =>
                    current.map((item) =>
                        item.trainNumber
                            === trainNumber
                            ? {
                                ...item,
                                result,
                                loading: false,
                                error: null,
                            }
                            : item,
                    ),
            );
        } catch (error) {
            setMonitoredTrains(
                (current) =>
                    current.map((item) =>
                        item.trainNumber
                            === trainNumber
                            ? {
                                ...item,
                                loading: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Refresh failed.",
                            }
                            : item,
                    ),
            );
        }
    }


    async function refreshAll() {
        if (
            monitoredTrains.length === 0
        ) {
            return;
        }

        setRefreshAllLoading(true);

        setMonitoredTrains(
            (current) =>
                current.map((item) => ({
                    ...item,
                    loading: true,
                    error: null,
                })),
        );

        const trainNumbers =
            monitoredTrains.map(
                (item) =>
                    item.trainNumber,
            );

        const responses =
            await Promise.allSettled(
                monitoredTrains.map(
                    (item) =>
                        railEtaApi.getLiveForecast({
                            train_number:
                                item.trainNumber,
                            journey_date:
                                item.journeyDate,
                        }),
                ),
            );
        setMonitoredTrains(
            (current) =>
                current.map((item) => {
                    const index =
                        trainNumbers.indexOf(
                            item.trainNumber,
                        );

                    const response =
                        responses[index];

                    if (
                        response?.status
                        === "fulfilled"
                    ) {
                        return {
                            ...item,
                            result:
                                response.value,
                            loading: false,
                            error: null,
                        };
                    }

                    return {
                        ...item,
                        loading: false,
                        error:
                            response?.status
                                === "rejected"
                                && response.reason
                                instanceof Error
                                ? response.reason
                                    .message
                                : "Refresh failed.",
                    };
                }),
        );

        setRefreshAllLoading(false);
    }


    const summary = useMemo(() => {
        let running = 0;
        let disruptions = 0;
        let highDelay = 0;

        monitoredTrains.forEach(
            (item) => {
                const result =
                    item.result;

                if (!result) {
                    return;
                }

                const scheduled =
                    result.journey
                        .state_source
                    === "SCHEDULED_NOT_STARTED";

                const completed =
                    result.journey
                        .upcoming_stations === 0
                    || result.journey
                        .state_source
                    ===
                    "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS";

                if (
                    !scheduled
                    && !completed
                ) {
                    running += 1;
                }

                if (
                    result.alerts?.length
                ) {
                    disruptions += 1;
                }

                const next =
                    result.predictions?.[0];

                const delay =
                    next?.forecast
                        .predicted_delay_min
                    ?? result.journey
                        .current_delay_min;

                if (
                    delay != null
                    && delay >= 30
                ) {
                    highDelay += 1;
                }
            },
        );

        return {
            total:
                monitoredTrains.length,
            running,
            disruptions,
            highDelay,
        };
    }, [monitoredTrains]);


    return (
        <main className="min-h-screen bg-slate-100 text-slate-900">
            <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

                {/* Header */}
                <header className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
                                RailETA Operations
                            </p>

                            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                                Control Room
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                Monitor selected trains
                                using live RailETA
                                forecasts, disruptions,
                                delay risk and next
                                station predictions.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/"
                                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
                            >
                                Passenger View
                            </Link>

                            <Link
                                href="/station-display"
                                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
                            >
                                Station Display
                            </Link>

                            <button
                                type="button"
                                onClick={
                                    refreshAll
                                }
                                disabled={
                                    refreshAllLoading
                                    || monitoredTrains
                                        .length === 0
                                }
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40"
                            >
                                {refreshAllLoading
                                    ? "Refreshing..."
                                    : "Refresh All"}
                            </button>
                        </div>
                    </div>
                </header>


                {/* Summary */}
                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Monitored
                        </p>

                        <p className="mt-2 text-3xl font-black">
                            {summary.total}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Running
                        </p>

                        <p className="mt-2 text-3xl font-black">
                            {summary.running}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Service Alerts
                        </p>

                        <p className="mt-2 text-3xl font-black text-red-600">
                            {
                                summary.disruptions
                            }
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Delay ≥ 30 min
                        </p>

                        <p className="mt-2 text-3xl font-black text-orange-600">
                            {summary.highDelay}
                        </p>
                    </div>
                </section>


                {/* Search */}
                <section className="relative mt-6 rounded-3xl border bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-bold">
                            Add Train to Monitor
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Search using train name or
                            number. Data is loaded from
                            the existing live forecast
                            API.
                        </p>
                    </div>

                    <div className="relative mt-4 max-w-2xl">
                        <div className="mt-4 max-w-xs">
                            <label
                                htmlFor="control-journey-date"
                                className="mb-1 block text-sm font-semibold text-slate-700"
                            >
                                Journey Date
                            </label>

                            <input
                                id="control-journey-date"
                                type="date"
                                value={journeyDate}
                                onChange={(event) =>
                                    setJourneyDate(
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />

                            <p className="mt-1 text-xs text-slate-500">
                                Defaults to today. Change it only
                                when monitoring another journey.
                            </p>
                        </div>
                        <input
                            value={
                                searchQuery
                            }
                            onChange={(
                                event,
                            ) =>
                                searchTrains(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="e.g. Dakshin Express or 12722"
                            className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        {searchLoading && (
                            <p className="mt-2 text-xs text-slate-500">
                                Searching...
                            </p>
                        )}

                        {searchResults.length
                            > 0 && (
                                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border bg-white shadow-xl">
                                    {searchResults.map(
                                        (train) => (
                                            <button
                                                key={
                                                    train.train_number
                                                }
                                                type="button"
                                                onClick={() =>
                                                    addTrain(
                                                        train,
                                                    )
                                                }
                                                className="flex w-full items-start justify-between gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                                            >
                                                <div>
                                                    <p className="font-bold">
                                                        {
                                                            train.train_name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
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
                </section>


                {/* Empty state */}
                {monitoredTrains.length === 0 && (
                    <section className="mt-6 rounded-3xl border border-dashed bg-white p-10 text-center">
                        <h2 className="text-xl font-bold">
                            No trains monitored
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Add trains above to build
                            your live operations board.
                        </p>
                    </section>
                )}


                {/* Monitored trains */}
                {monitoredTrains.length > 0 && (
                    <section className="mt-6 grid gap-5 xl:grid-cols-2">
                        {monitoredTrains.map(
                            (item) => {
                                const result =
                                    item.result;

                                const nextPrediction =
                                    result
                                        ?.predictions
                                    ?.[0]
                                    ?? null;

                                const scheduled =
                                    result?.journey
                                        .state_source
                                    ===
                                    "SCHEDULED_NOT_STARTED";

                                const completed =
                                    result !== null
                                    && result
                                    !== undefined
                                    && (
                                        result.journey
                                            .upcoming_stations
                                        === 0
                                        || result
                                            .journey
                                            .state_source
                                        ===
                                        "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
                                    );

                                const delay =
                                    nextPrediction
                                        ?.forecast
                                        .predicted_delay_min
                                    ?? result
                                        ?.journey
                                        .current_delay_min
                                    ?? null;

                                const confidence =
                                    nextPrediction
                                        ?.forecast
                                        .confidence
                                    ?? null;

                                return (
                                    <article
                                        key={
                                            item.trainNumber
                                        }
                                        className="overflow-hidden rounded-3xl border bg-white shadow-sm"
                                    >
                                        {/* Card header */}
                                        <div className="border-b p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div>
                                                        <h3 className="text-lg font-black">
                                                            {item.trainName}
                                                        </h3>

                                                        <p className="text-sm text-slate-500">
                                                            {item.trainNumber}
                                                        </p>

                                                        {/* YAHAN ADD KARO */}
                                                        <p className="mt-1 text-xs font-medium text-slate-500">
                                                            Journey:{" "}
                                                            {item.journeyDate
                                                                === getTodayLocalDate()
                                                                ? "Today"
                                                                : item.journeyDate}
                                                        </p>
                                                    </div>

                                                    {result && (
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            {completed
                                                                ? "Completed journey"
                                                                : scheduled
                                                                    ? "Scheduled journey"
                                                                    : "Live running journey"}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeTrain(
                                                            item.trainNumber,
                                                        )
                                                    }
                                                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        {item.loading && (
                                            <div className="p-6">
                                                <p className="text-sm text-slate-500">
                                                    Loading live
                                                    forecast...
                                                </p>
                                            </div>
                                        )}

                                        {item.error
                                            && !item.loading && (
                                                <div className="p-5">
                                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                                        <p className="font-semibold text-red-800">
                                                            Unable to
                                                            load train
                                                        </p>

                                                        <p className="mt-1 text-sm text-red-700">
                                                            {
                                                                item.error
                                                            }
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                refreshTrain(
                                                                    item.trainNumber,
                                                                    item.journeyDate,
                                                                )
                                                            }
                                                            className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white"
                                                        >
                                                            Retry
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        {result
                                            && !item.loading && (
                                                <div className="space-y-5 p-5">

                                                    {/* Alerts */}
                                                    {result.alerts
                                                        ?.length > 0 && (
                                                            <div className="space-y-2">
                                                                {result.alerts.map(
                                                                    (
                                                                        alert,
                                                                        index,
                                                                    ) => (
                                                                        <div
                                                                            key={`${alert.type}-${index}`}
                                                                            className={`rounded-xl border p-3 ${alert.severity
                                                                                === "CRITICAL"
                                                                                ? "border-red-200 bg-red-50 text-red-800"
                                                                                : "border-yellow-200 bg-yellow-50 text-yellow-800"
                                                                                }`}
                                                                        >
                                                                            <p className="text-xs font-bold uppercase tracking-wide">
                                                                                {
                                                                                    alert.title
                                                                                }
                                                                            </p>

                                                                            <p className="mt-1 text-sm">
                                                                                {
                                                                                    alert.message
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* Main status */}
                                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                        <div className="rounded-xl bg-slate-50 p-3">
                                                            <p className="text-xs uppercase text-slate-500">
                                                                Current
                                                            </p>

                                                            <p className="mt-1 font-bold">
                                                                {result
                                                                    .journey
                                                                    .current_station_name
                                                                    ?? result
                                                                        .journey
                                                                        .current_station_code
                                                                    ?? "Unavailable"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3">
                                                            <p className="text-xs uppercase text-slate-500">
                                                                Next
                                                            </p>

                                                            <p className="mt-1 font-bold">
                                                                {scheduled
                                                                    ? "Not started"
                                                                    : completed
                                                                        ? "Journey complete"
                                                                        : nextPrediction
                                                                            ?.station
                                                                            .name
                                                                        ?? nextPrediction
                                                                            ?.station
                                                                            .code
                                                                        ?? "Unavailable"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-3">
                                                            <p className="text-xs uppercase text-slate-500">
                                                                ETA
                                                            </p>

                                                            <p className="mt-1 font-bold">
                                                                {nextPrediction
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

                                                        <div className="rounded-xl bg-slate-50 p-3">
                                                            <p className="text-xs uppercase text-slate-500">
                                                                Delay
                                                            </p>

                                                            <span
                                                                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${delayClass(
                                                                    delay,
                                                                )}`}
                                                            >
                                                                {
                                                                    delayLabel(
                                                                        delay,
                                                                    )
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Confidence + source */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceClass(
                                                                    confidence,
                                                                )}`}
                                                            >
                                                                {confidence
                                                                    ? `${confidence} confidence`
                                                                    : "Confidence unavailable"}
                                                            </span>

                                                            {result.route
                                                                ?.current_position
                                                                ?.position_source && (
                                                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                                                        {result.route
                                                                            .current_position
                                                                            .position_source
                                                                            === "REAL_PROVIDER_GPS"
                                                                            ? "Live GPS"
                                                                            : result.route
                                                                                .current_position
                                                                                .position_source
                                                                                === "CURRENT_STATION"
                                                                                ? "Station position"
                                                                                : result.route
                                                                                    .current_position
                                                                                    .position_source
                                                                                    === "ESTIMATED_BETWEEN_STATIONS"
                                                                                    ? "Estimated position"
                                                                                    : "Position source available"}
                                                                    </span>
                                                                )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                refreshTrain(
                                                                    item.trainNumber,
                                                                    item.journeyDate,
                                                                )
                                                            }
                                                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
                                                        >
                                                            Refresh
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                    </article>
                                );
                            },
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}