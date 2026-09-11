"use client";

import {
    FormEvent,
    useState,
} from "react";

import {
    railEtaApi,
} from "@/lib/api/raileta-api";

import {
    RailETAApiError,
} from "@/lib/api/api-client";

import type {
    PredepartureForecastRequest,
    PredepartureForecastResponse,
} from "@/lib/api/api-types";


function getTodayLocalDate() {
    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


const initialPayload: PredepartureForecastRequest = {
    train_number: "12722",
    journey_date: getTodayLocalDate(),
};


export default function PredepartureForecast() {
    const [
        payload,
        setPayload,
    ] = useState<
        PredepartureForecastRequest
    >(initialPayload);


    const [
        result,
        setResult,
    ] = useState<
        PredepartureForecastResponse | null
    >(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    const [
        requestId,
        setRequestId,
    ] = useState<string | null>(null);

    function riskBadgeClass(
        risk: string,
    ) {
        if (risk === "LOW") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (risk === "MODERATE") {
            return "border-yellow-200 bg-yellow-50 text-yellow-700";
        }

        if (
            risk === "HIGH"
            || risk === "SEVERE"
        ) {
            return "border-red-200 bg-red-50 text-red-700";
        }

        return "border-gray-200 bg-gray-50 text-gray-700";
    }


    function confidenceBadgeClass(
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
    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setRequestId(null);
            setResult(null);

            const response =
                await railEtaApi
                    .getPredepartureForecast(
                        payload,
                    );

            setResult(response);

        } catch (err) {
            if (
                err instanceof RailETAApiError
            ) {
                setError(err.message);
                setRequestId(
                    err.requestId,
                );
                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to generate pre-departure forecast.",
            );

        } finally {
            setLoading(false);
        }
    }


    function updateTrainNumber(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,
            train_number: value,
        }));
    }




    function updateJourneyDate(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,
            journey_date: value,
        }));
    }


    function formatDelay(
        minutes: number,
    ) {
        const rounded =
            Math.round(minutes);

        if (rounded <= 0) {
            return "On time";
        }

        if (rounded < 60) {
            return `${rounded} min late`;
        }

        const hours =
            Math.floor(rounded / 60);

        const remaining =
            rounded % 60;

        if (remaining === 0) {
            return `${hours} hr late`;
        }

        return `${hours} hr ${remaining} min late`;
    }

    function confidenceLabel(
        confidence: string,
    ) {
        if (confidence === "HIGH") {
            return "Strong Estimate";
        }

        if (confidence === "MEDIUM") {
            return "Moderate Estimate";
        }

        return "Early Estimate";
    }
    function confidenceText(
        confidence: string,
    ) {
        if (confidence === "HIGH") {
            return "Strong estimate based on the available journey information.";
        }

        if (confidence === "MEDIUM") {
            return "Useful estimate, but the actual delay may vary.";
        }

        return "Early estimate only. Live journey data will improve this after departure.";
    }


    function riskText(
        risk: string,
    ) {
        if (risk === "LOW") {
            return "Low delay risk";
        }

        if (risk === "MODERATE") {
            return "Moderate delay risk";
        }

        if (
            risk === "HIGH"
            || risk === "SEVERE"
        ) {
            return "High delay risk";
        }

        return `${risk} delay risk`;
    }

    const visibleLimitations =
        result?.limitations
            ?.map(
                (item) => item.trim(),
            )
            .filter(
                (item) =>
                    item
                    && !item
                        .toLowerCase()
                        .includes("kaggle"),
            )
        ?? [];


    return (
        <section className="space-y-6">

            <div>
                <h2 className="text-2xl font-bold">
                    Pre-departure Delay Forecast
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Estimate destination delay before
                    live station observations are available.
                </p>
            </div>


            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="pre-train-number"
                            className="mb-1 block font-medium"
                        >
                            Train Number
                        </label>

                        <input
                            id="pre-train-number"
                            value={payload.train_number}
                            onChange={(event) =>
                                updateTrainNumber(
                                    event.target.value,
                                )
                            }
                            required
                            inputMode="numeric"
                            placeholder="e.g. 12722"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        <p className="mt-1 text-xs text-gray-500">
                            Enter the train number for the journey.
                        </p>
                    </div>


                    <div>
                        <label
                            htmlFor="pre-journey-date"
                            className="mb-1 block font-medium"
                        >
                            Journey Date
                        </label>

                        <input
                            id="pre-journey-date"
                            type="date"
                            value={payload.journey_date}
                            onChange={(event) =>
                                updateJourneyDate(
                                    event.target.value,
                                )
                            }
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        <p className="mt-1 text-xs text-gray-500">
                            Select the date the train starts its journey.
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {loading
                        ? "Checking Forecast..."
                        : "Check Delay Forecast"}
                </button>

                {loading && (
                    <p className="text-xs text-gray-500">
                        Loading the train schedule and preparing
                        the early delay forecast...
                    </p>
                )}
                {loading && (
                    <p className="text-xs text-gray-500">
                        Evaluating route, schedule and operational conditions...
                    </p>
                )}
            </form>

            {error && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    {error
                        .toLowerCase()
                        .includes("currently running") ? (
                        <>
                            <p className="text-lg font-bold text-gray-900">
                                This train is already running
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-700">
                                Before Departure forecasting is only
                                available before the train starts its
                                journey. Live ETA predictions are now
                                available in the Running Train section.
                            </p>

                            <a
                                href="/"
                                className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                            >
                                View Running Train Forecast →
                            </a>
                        </>
                    ) : error
                        .toLowerCase()
                        .includes("already completed") ? (
                        <>
                            <p className="text-lg font-bold text-gray-900">
                                This journey is already completed
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-700">
                                Before Departure forecasting is only
                                available before the selected journey
                                begins. Choose a future journey date
                                for this train.
                            </p>
                        </>
                    ) : error
                        .toLowerCase()
                        .includes("cancel") ? (
                        <>
                            <p className="text-lg font-bold text-gray-900">
                                This journey is cancelled
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-700">
                                A pre-departure delay forecast is not
                                available for a cancelled journey.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-gray-900">
                                Unable to generate forecast
                            </p>

                            <p className="mt-2 text-sm text-gray-700">
                                {error}
                            </p>
                        </>
                    )}

                    {requestId && (
                        <p className="mt-4 text-xs text-gray-500">
                            Request ID: {requestId}
                        </p>
                    )}
                </div>
            )}

            {result && (
                <div className="space-y-5">

                    {/* Forecast Hero */}
                    <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        Before Departure Forecast
                                    </span>

                                    <span className="text-xs text-gray-500">
                                        {result.journey.train_name
                                            ?? `Train ${result.journey.train_number}`}
                                    </span>
                                </div>

                                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                                    Expected delay at destination
                                </p>

                                <p className="mt-2 text-5xl font-black text-gray-900 sm:text-6xl">
                                    {formatDelay(
                                        result.forecast
                                            .predicted_destination_delay_min,
                                    )}
                                </p>

                                <p className="mt-3 max-w-xl text-sm text-gray-600">
                                    Estimated destination delay before
                                    live station observations become
                                    available.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Delay Risk
                                    </p>

                                    <span
                                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskBadgeClass(
                                            result.forecast.risk_level,
                                        )}`}
                                    >
                                        {riskText(
                                            result.forecast.risk_level,
                                        )}
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Confidence
                                    </p>

                                    <span
                                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${confidenceBadgeClass(
                                            result.forecast.confidence,
                                        )}`}
                                    >
                                        {confidenceLabel(
                                            result.forecast.confidence,
                                        )}
                                    </span>

                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                        {confidenceText(
                                            result.forecast.confidence,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">
                                    Train
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                    {result.journey.train_name
                                        ?? result.journey.train_number}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {result.journey.train_number}
                                </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">
                                    Route Distance
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                    {Math.round(
                                        result.journey.distance_km,
                                    )} km
                                </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">
                                    Scheduled Journey
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                    {result.journey.scheduled_travel_hours.toFixed(
                                        1,
                                    )} hr
                                </p>
                            </div>
                        </div>

                        {/* Expected Range */}
                        <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Expected Delay Range
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {formatDelay(
                                    result.forecast.lower_delay_min,
                                )}
                                {" to "}
                                {formatDelay(
                                    result.forecast.upper_delay_min,
                                )}
                            </p>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                                This range shows the uncertainty before departure.
                                Once the train starts running, RailETA switches to
                                live journey models and the estimate becomes more
                                specific.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-blue-50 p-5">
                        <h3 className="font-semibold text-gray-900">
                            Why can this estimate change?
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-700">
                            This forecast is generated before the train
                            starts, so live station delays are not available
                            yet. Once the journey begins, RailETA switches
                            to live journey models and updates the ETA using
                            actual running observations.
                        </p>
                        <a
                            href="/model-intelligence"
                            className="inline-flex text-sm font-semibold text-blue-700 hover:underline"
                        >
                            View technical model details →
                        </a>
                    </div>



                    {/* Limitations */}
                    {visibleLimitations.length > 0 && (
                        <details className="rounded-2xl border border-yellow-200 bg-yellow-50">
                            <summary className="cursor-pointer px-4 py-3 font-semibold text-yellow-900">
                                Forecast limitations
                            </summary>

                            <div className="border-t border-yellow-200 px-4 py-3">
                                <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
                                    {visibleLimitations.map(
                                        (limitation) => (
                                            <li key={limitation}>
                                                {limitation}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        </details>
                    )}



                </div>
            )}

        </section>
    );
}