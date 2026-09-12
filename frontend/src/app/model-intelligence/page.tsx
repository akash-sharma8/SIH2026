"use client";


import AppNavbar from "@/components/AppNavbar";
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


interface ModelSnapshot {
    id: string;
    name: string;
    role: string;
    engine: string;
    mae: number;
    rmse: number;
    median: number;
    p90: number;
    samples: number;
}


const MODEL_SNAPSHOTS: ModelSnapshot[] = [
    {
        id: "M1",
        name: "Pre-departure Delay Model",
        role:
            "Forecasts expected destination delay before verified live station observations are available.",
        engine:
            "LightGBM",
        mae: 32.5049,
        rmse: 47.9077,
        median: 18.339,
        p90: 85.8495,
        samples: 214247,
    },

    {
        id: "M2",
        name: "Next Station ETA Model",
        role:
            "Specialist model for the immediate next-station ETA during a running journey.",
        engine:
            "CatBoost",
        mae: 8.4984,
        rmse: 12.4985,
        median: 5.9467,
        p90: 18.2939,
        samples: 117,
    },

    {
        id: "M3",
        name: "Multi-horizon ETA Model",
        role:
            "Guarded residual model for stations further ahead in a running journey.",
        engine:
            "CatBoost",
        mae: 16.7823,
        rmse: 23.2671,
        median: 12.1928,
        p90: 38.7809,
        samples: 1362,
    },
];


function engineLabel(
    engine: string | null | undefined,
) {
    if (
        engine ===
        "MODEL_2_NEXT_STATION"
    ) {
        return "Model 2 · Next Station";
    }

    if (
        engine ===
        "MODEL_3_MULTI_HORIZON"
    ) {
        return "Model 3 · Multi-horizon";
    }

    if (engine) {
        return engine.replaceAll(
            "_",
            " ",
        );
    }

    return "Unavailable";
}


export default function ModelIntelligencePage() {
    const [
        query,
        setQuery,
    ] = useState("");

    const [
        trainNumber,
        setTrainNumber,
    ] = useState("");

    const [
        searchResults,
        setSearchResults,
    ] = useState<TrainSearchResult[]>([]);

    const [
        result,
        setResult,
    ] = useState<LiveForecastResponse | null>(
        null,
    );

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


    function searchTrain(
        value: string,
    ) {
        setQuery(value);

        if (value.trim().length < 2) {
            setSearchResults([]);
        }
    }

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


    async function inspectForecast() {
        if (!trainNumber.trim()) {
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response =
                await railEtaApi
                    .getLiveForecast({
                        train_number:
                            trainNumber.trim(),
                    });

            setResult(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to inspect forecast.",
            );
        } finally {
            setLoading(false);
        }
    }


    const nextPrediction =
        result?.predictions?.[0]
        ?? null;


    return (
        <main className="min-h-screen bg-[#f7f9fb] text-slate-950">

            <AppNavbar role="Model intelligence" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Page header */}
                <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                            Model intelligence
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            RailETA prediction models
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Evaluation, routing and explainability for the models
                            serving running-train ETA predictions.
                        </p>
                    </div>

                    <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Production runtime: Model 2 + Model 3
                    </span>
                </section>

                {/* Runtime architecture */}
                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                            Model routing
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            Different forecast horizons use different models
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Running journeys are routed by forecast horizon so the
                            immediate next-station prediction and later-station predictions
                            can use models specialized for those tasks.
                        </p>
                    </div>

                    <div className="grid gap-4 p-5 lg:grid-cols-2 sm:p-6">

                        {/* Model 2 */}
                        <article className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                                        Running · next station
                                    </span>

                                    <h3 className="mt-4 text-xl font-bold text-slate-950">
                                        Model 2
                                    </h3>

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                        Next Station ETA Model
                                    </p>
                                </div>

                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                    CatBoost
                                </span>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                Specialist model for the immediate next-station ETA
                                during a verified running journey.
                            </p>

                            <div className="mt-5 rounded-xl border border-sky-100 bg-white p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Router condition
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    RUNNING → next station
                                </p>
                            </div>
                        </article>

                        {/* Model 3 */}
                        <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                                        Running · later stations
                                    </span>

                                    <h3 className="mt-4 text-xl font-bold text-slate-950">
                                        Model 3
                                    </h3>

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                        Multi-horizon ETA Model
                                    </p>
                                </div>

                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                    CatBoost
                                </span>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                Guarded residual model for stations further ahead
                                in the same running journey.
                            </p>

                            <div className="mt-5 rounded-xl border border-violet-100 bg-white p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Router condition
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    RUNNING → later stations
                                </p>
                            </div>
                        </article>
                    </div>

                    {/* Request flow */}
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Request flow
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                Journey state
                            </span>

                            <span className="text-slate-400">→</span>

                            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                Forecast horizon
                            </span>

                            <span className="text-slate-400">→</span>

                            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                Model router
                            </span>

                            <span className="text-slate-400">→</span>

                            <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700">
                                Served prediction
                            </span>
                        </div>
                    </div>
                </section>

                {/* Future enhancement */}
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Future enhancement
                            </p>

                            <h3 className="mt-1 font-bold text-slate-950">
                                Model 1 · Pre-departure delay
                            </h3>

                            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                                A LightGBM pre-departure model exists experimentally,
                                but it is not part of the current passenger product flow.
                                The current system focuses on running-train ETA prediction.
                            </p>
                        </div>

                        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase text-slate-600">
                            Experimental
                        </span>
                    </div>
                </section>


                {/* Evaluation */}
                <section className="mt-6 space-y-4">

                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                            Model evaluation
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            Production model performance
                        </h2>

                        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
                            Model 2 and Model 3 serve different forecast horizons and were
                            evaluated on different sample sets, so their metrics should not
                            be interpreted as a direct head-to-head comparison.
                        </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {MODEL_SNAPSHOTS
                            .filter((model) => model.id === "M2" || model.id === "M3")
                            .map((model) => (
                                <article
                                    key={model.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                                {model.id}
                                            </p>

                                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                                {model.name}
                                            </h3>

                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                {model.role}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                                                {model.engine}
                                            </span>

                                            <span className="text-[10px] font-medium text-slate-400">
                                                n = {model.samples.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                MAE
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {model.mae.toFixed(2)}
                                                <span className="ml-1 text-xs font-medium text-slate-400">
                                                    min
                                                </span>
                                            </p>
                                        </div>

                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                RMSE
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {model.rmse.toFixed(2)}
                                                <span className="ml-1 text-xs font-medium text-slate-400">
                                                    min
                                                </span>
                                            </p>
                                        </div>

                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                Median error
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {model.median.toFixed(2)}
                                                <span className="ml-1 text-xs font-medium text-slate-400">
                                                    min
                                                </span>
                                            </p>
                                        </div>

                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                P90
                                            </p>

                                            <p className="mt-1.5 text-xl font-bold text-slate-950">
                                                {model.p90.toFixed(2)}
                                                <span className="ml-1 text-xs font-medium text-slate-400">
                                                    min
                                                </span>
                                            </p>
                                        </div>
                                    </div>

              
                                </article>
                            ))}
                    </div>

                    {/* Experimental Model 1 */}
                    {MODEL_SNAPSHOTS
                        .filter((model) => model.id === "M1")
                        .map((model) => (
                            <article
                                key={model.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                {model.id}
                                            </p>

                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold uppercase text-slate-600">
                                                Experimental
                                            </span>
                                        </div>

                                        <h3 className="mt-2 text-lg font-bold text-slate-950">
                                            {model.name}
                                        </h3>

                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                            {model.role}
                                        </p>
                                    </div>

                                    <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                                        {model.engine}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                            MAE
                                        </p>
                                        <p className="mt-1 font-bold text-slate-900">
                                            {model.mae.toFixed(2)} min
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                            RMSE
                                        </p>
                                        <p className="mt-1 font-bold text-slate-900">
                                            {model.rmse.toFixed(2)} min
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                            Median
                                        </p>
                                        <p className="mt-1 font-bold text-slate-900">
                                            {model.median.toFixed(2)} min
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                            P90 error
                                        </p>
                                        <p className="mt-1 font-bold text-slate-900">
                                            {model.p90.toFixed(2)} min
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                            Samples
                                        </p>
                                        <p className="mt-1 font-bold text-slate-900">
                                            {model.samples.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                </div>

                                <p className="mt-4 text-[11px] leading-5 text-slate-500">
                                    This model is retained for future pre-departure experimentation
                                    and is not part of the current passenger runtime flow.
                                </p>
                            </article>
                        ))}
                </section>


                {/* Live served-model inspector */}
                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                            Live model inspector
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            See which model is serving a live forecast
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Search for a train to inspect the currently served prediction,
                            forecast horizon and confidence.
                        </p>
                    </div>

                    <div className="p-5 sm:p-6">

                        {/* Search */}
                        <div className="relative max-w-3xl">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">

                                <div className="relative">
                                    <label
                                        htmlFor="model-inspector-search"
                                        className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                    >
                                        Train name or number
                                    </label>

                                    <input
                                        id="model-inspector-search"
                                        value={query}
                                        onChange={(event) =>
                                            searchTrain(
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
                                                        key={train.train_number}
                                                        type="button"
                                                        onClick={() =>
                                                            selectTrain(train)
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

                                                        <p className="text-[10px] font-medium text-slate-400">
                                                            Select
                                                        </p>
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={inspectForecast}
                                    disabled={
                                        loading ||
                                        !trainNumber
                                    }
                                    className="mt-auto inline-flex h-11 items-center justify-center rounded-xl bg-[#0876c9] px-5 text-sm font-semibold text-white transition hover:bg-[#0667af] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {loading
                                        ? "Inspecting..."
                                        : "Inspect forecast"}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                                {error}
                            </div>
                        )}

                        {/* Result */}
                        {result && (
                            <div className="mt-6 space-y-4">

                                {/* Train + model */}
                                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            Train
                                        </p>

                                        <h3 className="mt-1 text-lg font-bold text-slate-950">
                                            {result.journey.train_name ?? "Train"}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {result.journey.train_number}
                                        </p>
                                    </div>

                                    {nextPrediction && (
                                        <div className="rounded-xl border border-sky-200 bg-white px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                Model currently in use
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-sky-700">
                                                {engineLabel(
                                                    nextPrediction.model.prediction_engine,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {nextPrediction ? (
                                    <div className="grid gap-3 md:grid-cols-3">

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                Next station
                                            </p>

                                            <p className="mt-2 text-lg font-bold text-slate-950">
                                                {nextPrediction.station.name
                                                    ?? nextPrediction.station.code}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {nextPrediction.station.code}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                Expected delay
                                            </p>

                                            <p className="mt-2 text-lg font-bold text-slate-950">
                                                {nextPrediction.forecast.predicted_delay_min > 0
                                                    ? `+${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                    : nextPrediction.forecast.predicted_delay_min < 0
                                                        ? `${nextPrediction.forecast.predicted_delay_min.toFixed(1)} min`
                                                        : "On time"}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                Confidence
                                            </p>

                                            <span
                                                className={[
                                                    "mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                                    nextPrediction.forecast.confidence === "HIGH"
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : nextPrediction.forecast.confidence === "MEDIUM"
                                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                                            : "border-slate-200 bg-slate-50 text-slate-600",
                                                ].join(" ")}
                                            >
                                                {nextPrediction.forecast.confidence}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                        <p className="font-semibold text-slate-900">
                                            No running prediction is currently being served
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            This journey state does not currently expose a running-train
                                            prediction for inspection.
                                        </p>
                                    </div>
                                )}

                                {/* Truthfulness note */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] leading-5 text-slate-500">
                                        The inspector shows the model actually returned by the live
                                        forecast response. It does not infer or fabricate a model route.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}