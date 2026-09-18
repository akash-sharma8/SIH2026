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
    updatedAt: string | null;
    acknowledged: boolean;
    operatorNote: string;
}
type StoredMonitoredTrain = {
    trainNumber: string;
    trainName: string;
    journeyDate: string;
    acknowledged: boolean;
    operatorNote: string;
};


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
    const MONITORED_TRAINS_STORAGE_KEY =
        "raileta-control-room-monitored-trains";
    const [
        searchResults,
        setSearchResults,
    ] = useState<TrainSearchResult[]>([]);

    const [autoRefreshEnabled, setAutoRefreshEnabled] =
        useState(false);
    type BoardFilter =
        | "ALL"
        | "ATTENTION"
        | "RUNNING"
        | "SCHEDULED"
        | "COMPLETED";

    const [boardFilter, setBoardFilter] =
        useState<BoardFilter>("ALL");

    const [boardSearch, setBoardSearch] =
        useState("");
    const [secondsUntilRefresh, setSecondsUntilRefresh] =
        useState(90);
    const [
        searchLoading,
        setSearchLoading,
    ] = useState(false);

    const [selectedTrainNumber, setSelectedTrainNumber] =
        useState<string | null>(null);

    const [autoRefreshRunning, setAutoRefreshRunning] =
        useState(false);

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
        try {
            const raw =
                window.localStorage.getItem(
                    MONITORED_TRAINS_STORAGE_KEY,
                );

            if (!raw) {
                return;
            }

            const stored =
                JSON.parse(raw) as StoredMonitoredTrain[];

            const restored: MonitoredTrain[] =
                stored.map((item) => ({
                    trainNumber: item.trainNumber,
                    trainName: item.trainName,
                    journeyDate: item.journeyDate,
                    result: null,
                    loading: false,
                    error: null,
                    updatedAt: null,
                    acknowledged: item.acknowledged ?? false,
                    operatorNote: item.operatorNote ?? "",
                }));

            setMonitoredTrains(restored);
        } catch {
            window.localStorage.removeItem(
                MONITORED_TRAINS_STORAGE_KEY,
            );
        }
    }, []);

    useEffect(() => {
        const stored: StoredMonitoredTrain[] =
            monitoredTrains.map((item) => ({
                trainNumber: item.trainNumber,
                trainName: item.trainName,
                journeyDate: item.journeyDate,
                acknowledged: item.acknowledged,
                operatorNote: item.operatorNote ?? "",
            }));

        window.localStorage.setItem(
            MONITORED_TRAINS_STORAGE_KEY,
            JSON.stringify(stored),
        );
    }, [monitoredTrains]);

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
            updatedAt: null,
            acknowledged: false,
            operatorNote: ""
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
                                updatedAt: new Date().toISOString(),
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
                            updatedAt: new Date().toISOString(),
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
                    updatedAt: new Date().toISOString(),
                })),
        );

        const trainNumbers =
            monitoredTrains.map(
                (item) =>
                    item.trainNumber,
            );
        const responses: PromiseSettledResult<LiveForecastResponse>[] = [];

        for (const item of monitoredTrains) {
            try {
                const value =
                    await railEtaApi.getLiveForecast({
                        train_number:
                            item.trainNumber,
                        journey_date:
                            item.journeyDate,
                    });

                responses.push({
                    status: "fulfilled",
                    value,
                });
            } catch (reason) {
                responses.push({
                    status: "rejected",
                    reason,
                });
            }

            await new Promise((resolve) =>
                window.setTimeout(resolve, 650),
            );
        }
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

    async function refreshLoadedTrains() {
        if (autoRefreshRunning) {
            return;
        }

        const loadedTrains =
            monitoredTrains.filter(
                (item) => item.result !== null,
            );

        if (loadedTrains.length === 0) {
            return;
        }

        setAutoRefreshRunning(true);

        try {
            for (const train of loadedTrains) {
                try {
                    const result =
                        await railEtaApi.getLiveForecast({
                            train_number:
                                train.trainNumber,
                            journey_date:
                                train.journeyDate,
                        });

                    setMonitoredTrains(
                        (current) =>
                            current.map((item) =>
                                item.trainNumber ===
                                    train.trainNumber
                                    ? {
                                        ...item,
                                        result,
                                        error: null,
                                        updatedAt:
                                            new Date().toISOString(),
                                    }
                                    : item,
                            ),
                    );
                } catch (error) {
                    setMonitoredTrains(
                        (current) =>
                            current.map((item) =>
                                item.trainNumber ===
                                    train.trainNumber
                                    ? {
                                        ...item,
                                        error:
                                            error instanceof Error
                                                ? error.message
                                                : "Auto refresh failed.",
                                    }
                                    : item,
                            ),
                    );
                }

                await new Promise((resolve) =>
                    window.setTimeout(resolve, 650),
                );
            }
        } finally {
            setAutoRefreshRunning(false);
        }
    }
    useEffect(() => {
        if (!autoRefreshEnabled) {
            setSecondsUntilRefresh(90);
            return;
        }

        const timer = window.setInterval(() => {
            setSecondsUntilRefresh((current) => {
                if (current <= 1) {
                    void refreshLoadedTrains();

                    return 90;
                }

                return current - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [autoRefreshEnabled, monitoredTrains]);

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

    const filteredMonitoredTrains =
        useMemo(() => {
            return sortedMonitoredTrains.filter((item) => {
                const query =
                    boardSearch.trim().toLowerCase();

                const matchesSearch =
                    query.length === 0 ||
                    item.trainNumber
                        .toLowerCase()
                        .includes(query) ||
                    item.trainName
                        .toLowerCase()
                        .includes(query);

                if (!matchesSearch) {
                    return false;
                }

                const result = item.result;

                if (boardFilter === "ALL") {
                    return true;
                }

                if (!result) {
                    return false;
                }

                const scheduled =
                    result.journey.state_source ===
                    "SCHEDULED_NOT_STARTED";

                const completed =
                    result.journey.upcoming_stations === 0
                    || result.journey.state_source ===
                    "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS";

                const next =
                    result.predictions?.[0] ?? null;

                const delay =
                    next?.forecast.predicted_delay_min
                    ?? result.journey.current_delay_min
                    ?? null;

                const attention =
                    (result.alerts?.length ?? 0) > 0
                    || (delay != null && delay >= 30);

                if (boardFilter === "ATTENTION") {
                    return attention;
                }

                if (boardFilter === "RUNNING") {
                    return !scheduled && !completed;
                }

                if (boardFilter === "SCHEDULED") {
                    return scheduled;
                }

                if (boardFilter === "COMPLETED") {
                    return completed;
                }

                return true;
            });
        }, [sortedMonitoredTrains, boardFilter, boardSearch]);

    const filterCounts = useMemo(() => {
        const counts = {
            ALL: monitoredTrains.length,
            ATTENTION: 0,
            RUNNING: 0,
            SCHEDULED: 0,
            COMPLETED: 0,
        };

        monitoredTrains.forEach((item) => {
            const result = item.result;

            if (!result) {
                return;
            }

            const scheduled =
                result.journey.state_source ===
                "SCHEDULED_NOT_STARTED";

            const completed =
                result.journey.upcoming_stations === 0
                || result.journey.state_source ===
                "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS";

            const next =
                result.predictions?.[0] ?? null;

            const delay =
                next?.forecast.predicted_delay_min
                ?? result.journey.current_delay_min
                ?? null;

            const attention =
                (result.alerts?.length ?? 0) > 0
                || (delay != null && delay >= 30);

            if (attention) {
                counts.ATTENTION += 1;
            }

            if (scheduled) {
                counts.SCHEDULED += 1;
            } else if (completed) {
                counts.COMPLETED += 1;
            } else {
                counts.RUNNING += 1;
            }
        });

        return counts;
    }, [monitoredTrains]);

    const selectedTrain =
        monitoredTrains.find(
            (item) =>
                item.trainNumber === selectedTrainNumber,
        ) ?? null;

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

                    <button
                        type="button"
                        onClick={() =>
                            setAutoRefreshEnabled((current) => !current)
                        }
                        className={[
                            "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition",
                            autoRefreshEnabled
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                    >
                        {autoRefreshEnabled
                            ? autoRefreshRunning
                                ? "Auto refreshing..."
                                : `Auto refresh · ${secondsUntilRefresh}s`
                            : "Auto refresh off"}
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

                        <div className="relative max-w-md">
                            <input
                                type="text"
                                value={boardSearch}
                                onChange={(event) =>
                                    setBoardSearch(event.target.value)
                                }
                                placeholder="Filter monitored trains..."
                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />

                            {boardSearch && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setBoardSearch("")
                                    }
                                    className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ["ALL", "All"],
                                    ["ATTENTION", "Attention"],
                                    ["RUNNING", "Running"],
                                    ["SCHEDULED", "Scheduled"],
                                    ["COMPLETED", "Completed"],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setBoardFilter(value)
                                    }
                                    className={[
                                        "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                                        boardFilter === value
                                            ? "border-sky-600 bg-sky-600 text-white"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    {label} {filterCounts[value]}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            {filteredMonitoredTrains.length === 0 && (
                                <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                                    <p className="font-semibold text-slate-800">
                                        No trains in this filter
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Try another operational status.
                                    </p>
                                </div>
                            )}
                            {filteredMonitoredTrains.map(
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

                                    const acknowledged =
                                        item.acknowledged;

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
                                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <h3 className="truncate text-base font-bold text-slate-950 sm:text-lg">
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
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setMonitoredTrains((current) =>
                                                                        current.map((train) =>
                                                                            train.trainNumber === item.trainNumber
                                                                                ? {
                                                                                    ...train,
                                                                                    acknowledged:
                                                                                        !train.acknowledged,
                                                                                }
                                                                                : train,
                                                                        ),
                                                                    )
                                                                }
                                                                className={[
                                                                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                                                                    acknowledged
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                                                ].join(" ")}
                                                            >
                                                                {acknowledged
                                                                    ? "Acknowledged"
                                                                    : "Acknowledge"}
                                                            </button>
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
                                                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:px-3 sm:py-1.5 sm:text-xs"
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


                                            {!item.loading &&
                                                !item.error &&
                                                !result && (
                                                    <div className="px-5 py-6">
                                                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                                            <p className="font-semibold text-slate-800">
                                                                Saved monitor
                                                            </p>

                                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                                This train was restored from your saved
                                                                control-room board. Refresh it to load
                                                                the latest live ETA and operational data.
                                                            </p>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    refreshTrain(
                                                                        item.trainNumber,
                                                                        item.journeyDate,
                                                                    )
                                                                }
                                                                className="mt-3 rounded-lg bg-[#0876c9] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0667af]"
                                                            >
                                                                Load live data
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
                                                        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 bg-slate-50/60 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">

                                                            <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                                                                    Current
                                                                </p>

                                                                <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">
                                                                    {result.journey.current_station_name
                                                                        ?? result.journey.current_station_code
                                                                        ?? "Unavailable"}
                                                                </p>
                                                            </div>

                                                            <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                                                                    Next
                                                                </p>

                                                                <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">
                                                                    {scheduled
                                                                        ? "Not started"
                                                                        : completed
                                                                            ? "Journey complete"
                                                                            : nextPrediction?.station.name
                                                                            ?? nextPrediction?.station.code
                                                                            ?? "Unavailable"}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                                                                    ETA
                                                                </p>

                                                                <p className="mt-1 text-sm font-bold text-sky-700">
                                                                    {nextPrediction?.forecast.eta
                                                                        ? formatTime(
                                                                            nextPrediction.forecast.eta,
                                                                        )
                                                                        : "--"}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                                                                    Delay
                                                                </p>

                                                                <span
                                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${delayClass(
                                                                        delay,
                                                                    )}`}
                                                                >
                                                                    {delayLabel(delay)}
                                                                </span>
                                                            </div>

                                                        </div>

                                                        {/* Footer metadata/actions */}
                                                        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">

                                                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                                                                    {item.updatedAt && (
                                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                                            Updated: {formatTime(item.updatedAt)}
                                                                        </span>
                                                                    )}
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

                                                            <div className="flex w-full gap-2 sm:w-auto">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedTrainNumber(
                                                                            item.trainNumber,
                                                                        )
                                                                    }
                                                                    className="h-9 flex-1 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 sm:flex-none"
                                                                >
                                                                    View details
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        refreshTrain(
                                                                            item.trainNumber,
                                                                            item.journeyDate,
                                                                        )
                                                                    }
                                                                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                                                                >
                                                                    Refresh
                                                                </button>
                                                            </div>
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
            {selectedTrain && (
                <div className="fixed inset-0 z-[1100]">
                    <button
                        type="button"
                        aria-label="Close train details"
                        onClick={() =>
                            setSelectedTrainNumber(null)
                        }
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
                    />

                    <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        Operational details
                                    </p>

                                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                                        {selectedTrain.trainName}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Train {selectedTrain.trainNumber}
                                        {" • "}
                                        {selectedTrain.journeyDate}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedTrainNumber(null)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="p-5">
                            {!selectedTrain.result ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                    <p className="font-semibold text-slate-800">
                                        Live data not loaded
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Load this monitored train to view
                                        its operational details.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Current station
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {selectedTrain.result.journey
                                                    .current_station_name
                                                    ?? selectedTrain.result.journey
                                                        .current_station_code
                                                    ?? "Unavailable"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Current delay
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {delayLabel(
                                                    selectedTrain.result.journey
                                                        .current_delay_min,
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            Next prediction
                                        </p>

                                        <p className="mt-2 text-base font-bold text-slate-950">
                                            {selectedTrain.result
                                                .predictions?.[0]?.station.name
                                                ?? selectedTrain.result
                                                    .predictions?.[0]?.station.code
                                                ?? "Unavailable"}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            ETA:{" "}
                                            {selectedTrain.result
                                                .predictions?.[0]?.forecast.eta
                                                ? formatTime(
                                                    selectedTrain.result
                                                        .predictions[0]
                                                        .forecast.eta,
                                                )
                                                : "--"}
                                        </p>
                                    </div>

                                    {/* Route position */}
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Route position
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Current operational position context
                                                </p>
                                            </div>

                                            {selectedTrain.result.route?.current_position
                                                ?.position_source && (
                                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                        {
                                                            selectedTrain.result.route
                                                                .current_position
                                                                .position_source ===
                                                                "REAL_PROVIDER_GPS"
                                                                ? "Live GPS"
                                                                : selectedTrain.result.route
                                                                    .current_position
                                                                    .position_source ===
                                                                    "CURRENT_STATION"
                                                                    ? "At station"
                                                                    : selectedTrain.result.route
                                                                        .current_position
                                                                        .position_source ===
                                                                        "ESTIMATED_BETWEEN_STATIONS"
                                                                        ? "Estimated"
                                                                        : "Position source"
                                                        }
                                                    </span>
                                                )}
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Current
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                    {selectedTrain.result.journey
                                                        .current_station_name
                                                        ?? selectedTrain.result.journey
                                                            .current_station_code
                                                        ?? "Unavailable"}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Next
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                    {selectedTrain.result
                                                        .predictions?.[0]?.station.name
                                                        ?? selectedTrain.result
                                                            .predictions?.[0]?.station.code
                                                        ?? "Unavailable"}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Remaining
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                    {selectedTrain.result.journey
                                                        .upcoming_stations ?? 0} stations
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operator attention */}
                                    {(() => {
                                        const nextPrediction =
                                            selectedTrain.result.predictions?.[0] ?? null;

                                        const delay =
                                            nextPrediction?.forecast.predicted_delay_min
                                            ?? selectedTrain.result.journey.current_delay_min
                                            ?? null;

                                        const hasAlerts =
                                            (selectedTrain.result.alerts?.length ?? 0) > 0;

                                        const requiresAttention =
                                            hasAlerts || (delay != null && delay >= 30);

                                        if (!requiresAttention) {
                                            return (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                                        Operator status
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-emerald-900">
                                                        No immediate attention required
                                                    </p>

                                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                                        No service alert or high-delay condition is
                                                        currently reported for this monitored journey.
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                                            Operator attention
                                                        </p>

                                                        <p className="mt-1 text-sm font-bold text-amber-950">
                                                            Attention required
                                                        </p>
                                                    </div>

                                                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                                                        Review
                                                    </span>
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    {delay != null && delay >= 30 && (
                                                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                                                            <p className="text-xs font-semibold text-slate-900">
                                                                High predicted delay
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-600">
                                                                Current operational delay:{" "}
                                                                {delayLabel(delay)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {hasAlerts && (
                                                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                                                            <p className="text-xs font-semibold text-slate-900">
                                                                Service alert present
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-600">
                                                                {
                                                                    selectedTrain.result.alerts
                                                                        ?.length ?? 0
                                                                } active alert
                                                                {
                                                                    (selectedTrain.result.alerts
                                                                        ?.length ?? 0) === 1
                                                                        ? ""
                                                                        : "s"
                                                                } require review.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* OPERATOR NOTES HERE */}
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            Operator notes
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Add a local note for this monitored journey.
                                        </p>

                                        <textarea
                                            value={selectedTrain.operatorNote}
                                            onChange={(event) => {
                                                const value = event.target.value;

                                                setMonitoredTrains((current) =>
                                                    current.map((item) =>
                                                        item.trainNumber ===
                                                            selectedTrain.trainNumber
                                                            ? {
                                                                ...item,
                                                                operatorNote: value,
                                                            }
                                                            : item,
                                                    ),
                                                );
                                            }}
                                            placeholder="Add operator note..."
                                            rows={3}
                                            className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <p className="text-[10px] text-slate-400">
                                            Saved locally in this browser.
                                        </p>

                                        {selectedTrain.operatorNote.trim() && (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                                                Saved locally
                                            </span>
                                        )}
                                    </div>

                                    {/* Alerts */}
                                    {selectedTrain.result.alerts?.length > 0 && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                                Service alerts
                                            </p>

                                            <div className="mt-3 space-y-2">
                                                {selectedTrain.result.alerts.map(
                                                    (alert, index) => (
                                                        <div
                                                            key={`${alert.type}-${index}`}
                                                            className="rounded-lg border border-amber-200 bg-white p-3"
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {alert.title}
                                                                </p>

                                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                    {alert.severity}
                                                                </span>
                                                            </div>

                                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                                {alert.message}
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Prediction horizon */}
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Prediction horizon
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Upcoming station ETA forecasts
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                {selectedTrain.result.predictions?.length ?? 0} stations
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {selectedTrain.result.predictions?.length ? (
                                                selectedTrain.result.predictions.map(
                                                    (prediction, index) => (
                                                        <div
                                                            key={`${prediction.station.code}-${index}`}
                                                            className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                                    {prediction.station.name
                                                                        ?? prediction.station.code}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-slate-500">
                                                                    {prediction.station.code}
                                                                </p>
                                                            </div>

                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-sky-700">
                                                                    {prediction.forecast.eta
                                                                        ? formatTime(
                                                                            prediction.forecast.eta,
                                                                        )
                                                                        : "--"}
                                                                </p>

                                                                <p className="mt-0.5 text-[10px] text-slate-500">
                                                                    {delayLabel(
                                                                        prediction.forecast
                                                                            .predicted_delay_min,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <p className="text-sm text-slate-500">
                                                    No upcoming ETA predictions available.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Route timeline */}
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Route timeline
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Scheduled and live journey progression
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                {selectedTrain.result.journey.timeline?.stations?.length ?? 0} stations
                                            </span>
                                        </div>

                                        {(() => {
                                            const result = selectedTrain.result;

                                            if (!result) {
                                                return null;
                                            }

                                            const timelineStations =
                                                result.journey.timeline?.stations ?? [];

                                            const currentStationIndex =
                                                timelineStations.findIndex(
                                                    (station) =>
                                                        station.station_code ===
                                                        result.journey.current_station_code,
                                                );

                                            const stationProgress =
                                                currentStationIndex >= 0 &&
                                                    timelineStations.length > 1
                                                    ? Math.round(
                                                        (currentStationIndex /
                                                            (timelineStations.length - 1)) *
                                                        100,
                                                    )
                                                    : null;

                                            return (
                                                <>
                                                    {stationProgress != null && (
                                                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                                    Station progress
                                                                </p>

                                                                <p className="text-xs font-semibold text-slate-700">
                                                                    {currentStationIndex + 1}
                                                                    {" / "}
                                                                    {timelineStations.length}
                                                                </p>
                                                            </div>

                                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                                                <div
                                                                    className="h-full rounded-full bg-sky-600 transition-all"
                                                                    style={{
                                                                        width: `${stationProgress}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            <p className="mt-2 text-[10px] leading-4 text-slate-500">
                                                                Progress is based on route-station sequence,
                                                                not physical distance travelled.
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="mt-4 space-y-3">
                                                        {timelineStations.length ? (
                                                            timelineStations.map(
                                                                (station, index) => {
                                                                    const isCurrent =
                                                                        station.station_code ===
                                                                        result.journey.current_station_code;

                                                                    const currentIndex =
                                                                        timelineStations.findIndex(
                                                                            (item) =>
                                                                                item.station_code ===
                                                                                result.journey.current_station_code,
                                                                        );

                                                                    const isPast =
                                                                        currentIndex >= 0 &&
                                                                        index < currentIndex;

                                                                    const isUpcoming =
                                                                        currentIndex >= 0 &&
                                                                        index > currentIndex;

                                                                    const prediction =
                                                                        result.predictions?.find(
                                                                            (item) =>
                                                                                item.station.code ===
                                                                                station.station_code,
                                                                        ) ?? null;

                                                                    return (
                                                                        <div
                                                                            key={`${station.station_code}-${index}`}
                                                                            className={[
                                                                                "relative rounded-xl border p-3",
                                                                                isCurrent
                                                                                    ? "border-sky-300 bg-sky-50"
                                                                                    : isPast
                                                                                        ? "border-slate-200 bg-slate-50 opacity-70"
                                                                                        : "border-slate-200 bg-white",
                                                                            ].join(" ")}
                                                                        >
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <div className="min-w-0">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                                                            {station.station_name
                                                                                                ?? station.station_code}
                                                                                        </p>

                                                                                        {isPast && (
                                                                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                                                                                                Passed
                                                                                            </span>
                                                                                        )}

                                                                                        {isCurrent && (
                                                                                            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                                                                                                Current
                                                                                            </span>
                                                                                        )}

                                                                                        {isUpcoming && (
                                                                                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-700">
                                                                                                Upcoming
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                                                        {station.station_code}
                                                                                    </p>
                                                                                </div>

                                                                                <div className="shrink-0 text-right">
                                                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                                        Scheduled
                                                                                    </p>

                                                                                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                                                                        {station.scheduled_arrival
                                                                                            ? formatTime(
                                                                                                station.scheduled_arrival,
                                                                                            )
                                                                                            : "--"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            {prediction && (
                                                                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                                                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                                                                                        ETA:{" "}
                                                                                        {prediction.forecast.eta
                                                                                            ? formatTime(
                                                                                                prediction.forecast.eta,
                                                                                            )
                                                                                            : "--"}
                                                                                    </span>

                                                                                    <span
                                                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${delayClass(
                                                                                            prediction.forecast
                                                                                                .predicted_delay_min,
                                                                                        )}`}
                                                                                    >
                                                                                        {delayLabel(
                                                                                            prediction.forecast
                                                                                                .predicted_delay_min,
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                },
                                                            )
                                                        ) : (
                                                            <p className="text-sm text-slate-500">
                                                                Route timeline unavailable.
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>


                                    {/* Forecast metadata */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            Forecast metadata
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedTrain.result.predictions?.[0]
                                                ?.forecast.confidence && (
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${confidenceClass(
                                                            selectedTrain.result.predictions[0]
                                                                .forecast.confidence,
                                                        )}`}
                                                    >
                                                        {
                                                            selectedTrain.result.predictions[0]
                                                                .forecast.confidence
                                                        }{" "}
                                                        confidence
                                                    </span>
                                                )}

                                            {selectedTrain.result.backend
                                                ?.provider_payload_cache && (
                                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                        Cache:{" "}
                                                        {
                                                            selectedTrain.result.backend
                                                                .provider_payload_cache
                                                        }
                                                    </span>
                                                )}

                                            {selectedTrain.updatedAt && (
                                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                                    Updated:{" "}
                                                    {formatTime(selectedTrain.updatedAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </main>
    );
}