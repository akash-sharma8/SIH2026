"use client";

import Link from "next/link";
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
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                {/* Header */}
                <header className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
                                RailETA Intelligence
                            </p>

                            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                                Model Intelligence
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                Model routing,
                                evaluation metrics and
                                explainability for the
                                RailETA forecasting
                                pipeline.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/"
                                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                            >
                                Passenger View
                            </Link>

                            <Link
                                href="/station-display"
                                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                            >
                                Station Display
                            </Link>

                            <Link
                                href="/control-room"
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                            >
                                Control Room
                            </Link>
                        </div>
                    </div>
                </header>


                {/* Architecture */}
                <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                            How RailETA Works
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            The right model is used at
                            each stage of the journey
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            RailETA does not use one model
                            for every situation. It selects
                            a different model depending on
                            whether the train has not started,
                            is approaching the next station,
                            or is predicting stations further
                            ahead.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border bg-slate-50 p-5">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                BEFORE TRAIN STARTS
                            </span>

                            <p className="mt-4 text-xl font-black">
                                Model 1
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Estimates the expected delay
                                before the train starts running.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-5">
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                RUNNING · NEXT
                            </span>

                            <p className="mt-4 text-xl font-black">
                                Model 2
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Predicts arrival at the very
                                next station using current
                                journey information.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-5">
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                                RUNNING · LATER
                            </span>

                            <p className="mt-4 text-xl font-black">
                                Model 3
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Predicts arrival for stations
                                further ahead on the route.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Request Flow
                        </p>

                        <p className="mt-3 font-mono text-sm leading-7 text-slate-200">
                            Journey State
                            {" → "}
                            Forecast Horizon
                            {" → "}
                            Model Router
                            {" → "}
                            Served Prediction
                        </p>
                    </div>
                </section>


                {/* Evaluation */}
                <section className="mt-6">
                    <div>
                        <h2 className="text-2xl font-black">
                            How reliable are the models?
                        </h2>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                            RailETA evaluates each model using
                            prediction error in minutes.
                            Lower error means the model's estimate
                            was closer to the actual arrival or delay.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-5 lg:grid-cols-3">
                        {MODEL_SNAPSHOTS.map(
                            (model) => (
                                <article
                                    key={model.id}
                                    className="rounded-3xl border bg-white p-5 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                                                {
                                                    model.id
                                                }
                                            </p>

                                            <h3 className="mt-2 text-xl font-black">
                                                {
                                                    model.name
                                                }
                                            </h3>
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            {
                                                model.engine
                                            }
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                        {model.role}
                                    </p>
                                    {model.id === "M2" && (
                                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl bg-blue-50 p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                    Typical error
                                                </p>

                                                <p className="mt-1 text-2xl font-black text-slate-900">
                                                    {model.mae.toFixed(1)} min
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-blue-50 p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                    Most predictions within
                                                </p>

                                                <p className="mt-1 text-2xl font-black text-slate-900">
                                                    {model.p90.toFixed(1)} min
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-blue-50 p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                    Tested on
                                                </p>

                                                <p className="mt-1 text-2xl font-black text-slate-900">
                                                    {model.samples.toLocaleString()}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    examples
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <details className="mt-5 rounded-xl border bg-white">
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                                            Advanced technical metrics
                                        </summary>

                                        <div className="grid grid-cols-2 gap-3 border-t p-4">
                                            <div className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-xs text-slate-500">
                                                    MAE
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {model.mae.toFixed(2)} min
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-xs text-slate-500">
                                                    RMSE
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {model.rmse.toFixed(2)} min
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-xs text-slate-500">
                                                    Median error
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {model.median.toFixed(2)} min
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-xs text-slate-500">
                                                    P90 error
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {model.p90.toFixed(2)} min
                                                </p>
                                            </div>
                                        </div>
                                    </details>
                                    <p className="mt-4 text-xs text-slate-500">
                                        Evaluation samples:{" "}
                                        <span className="font-semibold text-slate-700">
                                            {model.samples.toLocaleString(
                                                "en-IN",
                                            )}
                                        </span>
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                </section>


                {/* Live served-model inspector */}
                <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                            See RailETA in Action
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Check which model is being used
                        </h2>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                            Search for a train to see which RailETA model is serving the
                            current forecast and what it predicts for the next station.
                        </p>
                    </div>

                    <div className="relative mt-5 max-w-2xl">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <input
                                    value={query}
                                    onChange={(
                                        event,
                                    ) =>
                                        searchTrain(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Train name or number"
                                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                                {searchResults.length
                                    > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border bg-white shadow-xl">
                                            {searchResults.map(
                                                (
                                                    train,
                                                ) => (
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
                                                        className="flex w-full items-start justify-between gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                                                    >
                                                        <div>
                                                            <p className="font-semibold">
                                                                {
                                                                    train.train_name
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {
                                                                    train.train_number
                                                                }
                                                            </p>
                                                        </div>
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                            </div>

                            <button
                                type="button"
                                onClick={
                                    inspectForecast
                                }
                                disabled={
                                    loading
                                    || !trainNumber
                                }
                                className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-40"
                            >
                                {loading
                                    ? "Inspecting..."
                                    : "Inspect"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border bg-slate-50 p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Train
                                        </p>

                                        <p className="mt-1 text-xl font-black">
                                            {result.journey
                                                .train_name
                                                ?? "Train"}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {
                                                result.journey
                                                    .train_number
                                            }
                                        </p>
                                    </div>

                                    {nextPrediction && (
                                        <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
Model currently in use
                                            </p>

                                            <p className="mt-1 font-black text-blue-700">
                                                {engineLabel(
                                                    nextPrediction
                                                        .model
                                                        .prediction_engine,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {nextPrediction ? (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border bg-white p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Next Station
                                        </p>

                                        <p className="mt-2 text-xl font-black">
                                            {nextPrediction
                                                .station
                                                .name
                                                ?? nextPrediction
                                                    .station
                                                    .code}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-white p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Expected delay
                                        </p>

                                        <p className="mt-2 text-xl font-black">
                                            {
                                                nextPrediction
                                                    .forecast
                                                    .predicted_delay_min
                                            }
                                            {" min"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-white p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Confidence
                                        </p>

                                        <p className="mt-2 text-xl font-black">
                                            {
                                                nextPrediction
                                                    .forecast
                                                    .confidence
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed bg-slate-50 p-5">
                                    <p className="font-semibold">
                                        No running prediction
                                        is being served for
                                        this journey state.
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        The journey may be
                                        scheduled, completed,
                                        or waiting for
                                        sufficient verified
                                        observations.
                                    </p>
                                </div>
                            )}

                            {result.diagnostics
                                ?.prediction_explanation
                                ?.explanation_available && (
                                    <div className="rounded-2xl border bg-white p-5">
                                        <h3 className="font-black">
                                            Current Prediction
                                            Explanation
                                        </h3>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Associations shown
                                            here are model
                                            attributions, not
                                            proof of causality.
                                        </p>

                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            {result.diagnostics
                                                .prediction_explanation
                                                .factors
                                                .slice(0, 3)
                                                .map(
                                                    (
                                                        factor,
                                                    ) => (
                                                        <div
                                                            key={`${factor.feature}-${factor.rank ?? 0}`}
                                                            className="rounded-xl bg-slate-50 p-4"
                                                        >
                                                            <p className="font-bold">
                                                                {factor.display_name
                                                                    ?? factor.feature}
                                                            </p>

                                                            <p className="mt-2 text-sm text-slate-600">
                                                                {factor.direction
                                                                    === "INCREASES_DELAY"
                                                                    ? "Associated with a later ETA."
                                                                    : factor.direction
                                                                        === "REDUCES_DELAY"
                                                                        ? "Associated with an earlier ETA."
                                                                        : "Influences the current forecast."}
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}