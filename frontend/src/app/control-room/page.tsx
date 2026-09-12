"use client";


import {
    useEffect,
    useMemo,
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
    const sortedMonitoredTrains =
        useMemo(() => {
            return [...monitoredTrains].sort(
                (a, b) => {
                    function priority(
                        item: MonitoredTrain,
                    ) {
                        const result = item.result;

                        if (!result) {
                            return 0;
                        }

                        const next =
                            result.predictions?.[0]
                            ?? null;

                        const delay =
                            next?.forecast
                                .predicted_delay_min
                            ?? result.journey
                                .current_delay_min
                            ?? null;

                        const hasAlerts =
                            (result.alerts?.length ?? 0) > 0;

                        if (
                            hasAlerts
                            || (
                                delay != null
                                && delay >= 30
                            )
                        ) {
                            return 2;
                        }

                        return 1;
                    }

                    return (
                        priority(b)
                        - priority(a)
                    );
                },
            );
        }, [monitoredTrains]);

    return (
        <main className="min-h-screen bg-[#f7f9fb] text-slate-950">

            <AppNavbar role="Control room" />

            <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

                {/* Page header */}
                <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                            Control room
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            Operations dashboard
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Monitor selected trains using live ETA predictions,
                            disruption alerts and delay risk.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={refreshAll}
                        disabled={
                            refreshAllLoading ||
                            monitoredTrains.length === 0
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0876c9] px-5 text-sm font-semibold text-white transition hover:bg-[#0667af] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {refreshAllLoading
                            ? "Refreshing..."
                            : "Refresh all trains"}
                    </button>
                </section>

                {/* Operations KPIs */}
                <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Monitored trains
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-3">
                            <p className="text-3xl font-bold text-slate-950">
                                {summary.total}
                            </p>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                Fleet
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Running
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-3">
                            <p className="text-3xl font-bold text-slate-950">
                                {summary.running}
                            </p>

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Service alerts
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-3">
                            <p
                                className={[
                                    "text-3xl font-bold",
                                    summary.disruptions > 0
                                        ? "text-rose-700"
                                        : "text-slate-950",
                                ].join(" ")}
                            >
                                {summary.disruptions}
                            </p>

                            <span
                                className={[
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                    summary.disruptions > 0
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700",
                                ].join(" ")}
                            >
                                {summary.disruptions > 0
                                    ? "Attention"
                                    : "Clear"}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Delay ≥ 30 min
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-3">
                            <p
                                className={[
                                    "text-3xl font-bold",
                                    summary.highDelay > 0
                                        ? "text-amber-700"
                                        : "text-slate-950",
                                ].join(" ")}
                            >
                                {summary.highDelay}
                            </p>

                            <span
                                className={[
                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                    summary.highDelay > 0
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                ].join(" ")}
                            >
                                High delay
                            </span>
                        </div>
                    </div>

                </section>


                {/* Monitor controls */}
                <section className="relative mt-6 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                Fleet monitoring
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-950">
                                Add train to monitor
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Search by train name or number and add a journey to the live operations board.
                            </p>
                        </div>

                        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                            {monitoredTrains.length} monitored
                        </span>
                    </div>

                    <div className="grid gap-4 p-5 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">

                        {/* Journey date */}
                        <div>
                            <label
                                htmlFor="control-journey-date"
                                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                            >
                                Journey date
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
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />

                            <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                                Date represents the journey start date.
                            </p>
                        </div>

                        {/* Train search */}
                        <div className="relative">
                            <label
                                htmlFor="control-train-search"
                                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                            >
                                Train name or number
                            </label>

                            <div className="relative">
                                <input
                                    id="control-train-search"
                                    value={searchQuery}
                                    onChange={(event) =>
                                        searchTrains(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Search train name or number"
                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 pr-28 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                />

                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                    {searchLoading ? (
                                        <span className="text-[11px] font-medium text-sky-700">
                                            Searching...
                                        </span>
                                    ) : searchQuery.trim().length >= 2 ? (
                                        <span className="text-[11px] text-slate-400">
                                            Select below
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                    {searchResults.map(
                                        (train) => {
                                            const alreadyMonitored =
                                                monitoredTrains.some(
                                                    (item) =>
                                                        item.trainNumber ===
                                                        train.train_number,
                                                );

                                            return (
                                                <button
                                                    key={train.train_number}
                                                    type="button"
                                                    onClick={() =>
                                                        addTrain(train)
                                                    }
                                                    className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate font-semibold text-slate-950">
                                                                {train.train_name}
                                                            </p>

                                                            {alreadyMonitored && (
                                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                                    Monitored
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {train.train_number}
                                                        </p>
                                                    </div>

                                                    <div className="shrink-0 text-right">
                                                        <p className="text-xs font-medium text-slate-500">
                                                            {train.source_code ?? "—"}
                                                            {" → "}
                                                            {train.destination_code ?? "—"}
                                                        </p>

                                                        <p className="mt-1 text-[10px] text-slate-400">
                                                            {alreadyMonitored
                                                                ? "Already on board"
                                                                : "Add to monitor"}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Live forecast API
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="text-[11px] text-slate-500">
                            Duplicate trains are ignored
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="text-[11px] text-slate-500">
                            Refresh individually or all at once
                        </span>
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
                    <section className="mt-6 space-y-4">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                    Live operations board
                                </p>

                                <h2 className="mt-1 text-lg font-bold text-slate-950">
                                    Monitored journeys
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Current location, next ETA, delay risk and service alerts.
                                </p>
                            </div>

                            <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600">
                                {monitoredTrains.length} trains
                            </span>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            {sortedMonitoredTrains.map(
                                (item) => {
                                    const result = item.result;

                                    const nextPrediction =
                                        result?.predictions?.[0] ?? null;

                                    const scheduled =
                                        result?.journey.state_source ===
                                        "SCHEDULED_NOT_STARTED";

                                    const completed =
                                        result !== null &&
                                        result !== undefined &&
                                        (
                                            result.journey.upcoming_stations === 0 ||
                                            result.journey.state_source ===
                                            "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
                                        );

                                    const delay =
                                        nextPrediction?.forecast.predicted_delay_min
                                        ?? result?.journey.current_delay_min
                                        ?? null;

                                    const needsAttention =
                                        (result?.alerts?.length ?? 0) > 0
                                        || (
                                            delay != null
                                            && delay >= 30
                                        );

                                    const attentionReason =
                                        (result?.alerts?.length ?? 0) > 0
                                            ? "Service alert"
                                            : delay != null && delay >= 30
                                                ? "Delay ≥ 30 min"
                                                : null;

                                    const confidence =
                                        nextPrediction?.forecast.confidence
                                        ?? null;

                                    const positionSource =
                                        result?.route?.current_position
                                            ?.position_source
                                        ?? null;

                                    return (
                                        <article
                                            key={item.trainNumber}
                                            className={[
                                                "overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                                                needsAttention
                                                    ? "border-amber-300 ring-1 ring-amber-100"
                                                    : "border-slate-200",
                                            ].join(" ")}
                                        >

                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <h3 className="truncate text-lg font-bold text-slate-950">
                                                            {item.trainName}
                                                        </h3>

                                                        {result && (
                                                            <span
                                                                className={[
                                                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                                                                    completed
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : scheduled
                                                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                            : "border-sky-200 bg-sky-50 text-sky-700",
                                                                ].join(" ")}
                                                            >
                                                                {completed
                                                                    ? "Completed"
                                                                    : scheduled
                                                                        ? "Scheduled"
                                                                        : "Running"}
                                                            </span>
                                                        )}

                                                        {needsAttention && (
                                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                                                Needs attention
                                                                {attentionReason && (
                                                                    <>
                                                                        {" · "}
                                                                        {attentionReason}
                                                                    </>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                        <span>{item.trainNumber}</span>

                                                        <span className="text-slate-300">
                                                            •
                                                        </span>

                                                        <span>
                                                            Journey:{" "}
                                                            {item.journeyDate === getTodayLocalDate()
                                                                ? "Today"
                                                                : item.journeyDate}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeTrain(
                                                            item.trainNumber,
                                                        )
                                                    }
                                                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            {/* Loading */}
                                            {item.loading && (
                                                <div className="px-5 py-6">
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                                                        Loading live forecast...
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error */}
                                            {item.error &&
                                                !item.loading && (
                                                    <div className="p-5">
                                                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                                                            <p className="font-semibold text-rose-800">
                                                                Unable to load train
                                                            </p>

                                                            <p className="mt-1 text-sm leading-6 text-rose-700">
                                                                {item.error}
                                                            </p>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    refreshTrain(
                                                                        item.trainNumber,
                                                                        item.journeyDate,
                                                                    )
                                                                }
                                                                className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-800"
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Loaded state */}
                                            {result &&
                                                !item.loading && (
                                                    <div>

                                                        {/* Alerts */}
                                                        {result.alerts?.length > 0 && (
                                                            <div className="space-y-2 border-b border-slate-100 px-5 py-4">
                                                                {result.alerts.map(
                                                                    (
                                                                        alert,
                                                                        index,
                                                                    ) => {
                                                                        const critical =
                                                                            alert.severity ===
                                                                            "CRITICAL";

                                                                        return (
                                                                            <div
                                                                                key={`${alert.type}-${index}`}
                                                                                className={[
                                                                                    "rounded-xl border px-3 py-2.5",
                                                                                    critical
                                                                                        ? "border-rose-200 bg-rose-50"
                                                                                        : "border-amber-200 bg-amber-50",
                                                                                ].join(" ")}
                                                                            >
                                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                    <p
                                                                                        className={[
                                                                                            "text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                                                            critical
                                                                                                ? "text-rose-700"
                                                                                                : "text-amber-700",
                                                                                        ].join(" ")}
                                                                                    >
                                                                                        {alert.title}
                                                                                    </p>

                                                                                    <span
                                                                                        className={[
                                                                                            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                                                                                            critical
                                                                                                ? "bg-rose-600 text-white"
                                                                                                : "bg-amber-500 text-white",
                                                                                        ].join(" ")}
                                                                                    >
                                                                                        {alert.severity}
                                                                                    </span>
                                                                                </div>

                                                                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                                                                    {alert.message}
                                                                                </p>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Operational metrics */}
                                                        <div className="grid gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
                                                            <div className="bg-white p-4">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    Current
                                                                </p>

                                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                    {result.journey.current_station_name
                                                                        ?? result.journey.current_station_code
                                                                        ?? "Unavailable"}
                                                                </p>
                                                            </div>

                                                            <div className="bg-white p-4">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    Next
                                                                </p>

                                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                    {scheduled
                                                                        ? "Not started"
                                                                        : completed
                                                                            ? "Journey complete"
                                                                            : nextPrediction?.station.name
                                                                            ?? nextPrediction?.station.code
                                                                            ?? "Unavailable"}
                                                                </p>
                                                            </div>

                                                            <div className="bg-white p-4">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    ETA
                                                                </p>

                                                                <p className="mt-1 text-sm font-semibold text-sky-700">
                                                                    {nextPrediction?.forecast.eta
                                                                        ? formatTime(
                                                                            nextPrediction
                                                                                .forecast.eta,
                                                                        )
                                                                        : "--"}
                                                                </p>
                                                            </div>

                                                            <div className="bg-white p-4">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    Delay
                                                                </p>

                                                                <span
                                                                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${delayClass(
                                                                        delay,
                                                                    )}`}
                                                                >
                                                                    {delayLabel(delay)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Footer metadata/actions */}
                                                        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                                                            <div className="flex flex-wrap gap-2">
                                                                <span
                                                                    className={[
                                                                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                                                        confidence === "HIGH"
                                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                            : confidence === "MEDIUM"
                                                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                                : "border-slate-200 bg-slate-50 text-slate-600",
                                                                    ].join(" ")}
                                                                >
                                                                    {confidence
                                                                        ? `${confidence} confidence`
                                                                        : "Confidence unavailable"}
                                                                </span>

                                                                {positionSource && (
                                                                    <span
                                                                        className={[
                                                                            "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                                                            positionSource === "REAL_PROVIDER_GPS"
                                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                                : positionSource === "CURRENT_STATION"
                                                                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                                                                                    : positionSource === "ESTIMATED_BETWEEN_STATIONS"
                                                                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                                                        ].join(" ")}
                                                                    >
                                                                        {positionSource ===
                                                                            "REAL_PROVIDER_GPS"
                                                                            ? "Live GPS"
                                                                            : positionSource ===
                                                                                "CURRENT_STATION"
                                                                                ? "Station position"
                                                                                : positionSource ===
                                                                                    "ESTIMATED_BETWEEN_STATIONS"
                                                                                    ? "Estimated position"
                                                                                    : "Position source"}
                                                                    </span>
                                                                )}

                                                                {result.backend
                                                                    ?.provider_payload_cache && (
                                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                                            Cache:{" "}
                                                                            {
                                                                                result.backend
                                                                                    .provider_payload_cache
                                                                            }
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
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}