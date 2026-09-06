"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";


import {
    railEtaApi,
} from "@/lib/api/raileta-api";

import {
    RailETAApiError,
} from "@/lib/api/api-client";

import type {
    LiveForecastResponse,
} from "@/lib/api/api-types";

import dynamic from "next/dynamic";

const RouteMap = dynamic(
    () => import(
        "@/components/RouteMap"
    ),
    {
        ssr: false,
    },
);

export default function LiveTrainSearch() {

    const [
        retryable,
        setRetryable,
    ] = useState(false);

    const [
        showDemoOption,
        setShowDemoOption,
    ] = useState(false);

    const [
        demoLoading,
        setDemoLoading,
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


    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setLoading(true);
            setError(null);
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
                            };
                        };

                    setRetryable(
                        applicationError.error.retryable,
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

    const finalPrediction =
        result?.predictions[
        result.predictions.length - 1
        ] ?? null;


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
            return;
        }

        const intervalId = window.setInterval(async () => {
            try {
                const response =
                    await railEtaApi.getLiveForecast({
                        train_number: trainNumber.trim(),
                        journey_date: journeyDate || null,
                    });

                setResult(response);
            } catch {
                // Keep the last successful forecast visible.
            }
        }, 60_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [
        trainNumber,
        journeyDate,
        isCompletedJourney,
        isWaitingForObservations,
        result !== null,
        hasLiveResult,
    ]);

    return (
        <section className="space-y-6">

            <div>
                <h2 className="text-2xl font-bold">
                    Live Train ETA
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Enter a train number to generate
                    leakage-safe live ETA predictions.
                </p>
            </div>


            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
            >
                <div>
                    <label
                        htmlFor="train-number"
                        className="mb-1 block font-medium"
                    >
                        Train Number
                    </label>

                    <input
                        id="train-number"
                        value={trainNumber}
                        onChange={(event) =>
                            setTrainNumber(
                                event.target.value,
                            )
                        }
                        placeholder="12615"
                        inputMode="numeric"
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>


                <div>
                    <label
                        htmlFor="journey-date"
                        className="mb-1 block font-medium"
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
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                        Optional
                    </p>
                </div>


                <button
                    type="submit"
                    disabled={
                        loading
                        || !trainNumber.trim()
                    }
                    className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {loading
                        ? "Fetching Live ETA..."
                        : "Predict Live ETA"}
                </button>
                {loading && (
                    <p className="text-xs text-gray-500">
                        Fetching live train state and generating leakage-safe ETA predictions...
                    </p>
                )}
            </form>


            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                    <p className="font-semibold text-red-900">
                        Unable to generate forecast
                    </p>

                    <p className="mt-1 text-sm text-red-800">
                        {error}
                    </p>

                    {requestId && (
                        <p className="mt-2 text-xs text-gray-500">
                            Request ID: {requestId}
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">

                        {retryable && (
                            <button
                                type="button"
                                onClick={() => {
                                    const form =
                                        document.querySelector(
                                            "form",
                                        );

                                    if (
                                        form instanceof
                                        HTMLFormElement
                                    ) {
                                        form.requestSubmit();
                                    }
                                }}
                                disabled={loading}
                                className="rounded-xl border border-red-300 bg-white px-4 py-2 font-medium text-red-900 transition hover:bg-red-100"
                            >
                                Retry
                            </button>

                        )}

                        {showDemoOption && (
                            <button
                                type="button"
                                onClick={runVerifiedDemo}
                                disabled={demoLoading}
                                className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
                            >
                                {demoLoading
                                    ? "Loading Demo..."
                                    : "Run Verified Demo"}
                            </button>
                        )}

                    </div>
                </div>
            )}


            {result && (
                // Result container
                <div className="space-y-4 rounded-xl border p-4 sm:p-5">

                    <div>
                        <h3 className="text-xl font-bold">
                            {result.journey.train_name
                                ?? "Train"}
                        </h3>

                        <p>
                            Train{" "}
                            {result.journey.train_number}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                        <div className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Current Station
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-900">
                                {isScheduledNotStarted
                                    ? "Not applicable"
                                    : result.journey.current_delay_min == null
                                        ? "Unavailable"
                                        : result.journey.current_delay_min < 0
                                            ? `${Math.abs(result.journey.current_delay_min)} min early`
                                            : result.journey.current_delay_min === 0
                                                ? "On time"
                                                : `${result.journey.current_delay_min} min late`}
                            </p>

                            {result.journey.current_station_code && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {result.journey.current_station_code}
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Current Delay
                            </p>

                            <p className="mt-2 text-xl font-bold text-gray-900">
                                {result.journey.current_delay_min == null
                                    ? "Unavailable"
                                    : result.journey.current_delay_min < 0
                                        ? `${Math.abs(result.journey.current_delay_min)} min early`
                                        : result.journey.current_delay_min === 0
                                            ? "On time"
                                            : `${result.journey.current_delay_min} min late`}
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Upcoming Stations
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {result.journey.upcoming_stations}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                Ahead in current journey
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Next Station
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-900">
                                {nextPrediction
                                    ? (
                                        nextPrediction.station.name
                                        ?? nextPrediction.station.code
                                    )
                                    : isScheduledNotStarted
                                        ? (
                                            result.journey.source?.station_name
                                            ?? result.journey.source?.station_code
                                            ?? "Scheduled"
                                        )
                                        : isCompletedJourney
                                            ? "Journey Completed"
                                            : isWaitingForObservations
                                                ? "Waiting for Live Data"
                                                : "Unavailable"}
                            </p>

                            {nextPrediction && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {nextPrediction.station.code}
                                </p>
                            )}
                        </div>

                    </div>
                    {isScheduledNotStarted
                        && result.journey.schedule
                        && result.journey.schedule.length > 0 && (
                            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Scheduled Timetable
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Planned station sequence for this journey.
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
                                            {result.journey.schedule.map(
                                                (station, index) => (
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
                                                                    {station.station_code}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="px-3 py-3 text-gray-700">
                                                            {station.scheduled_arrival
                                                                ? new Date(
                                                                    station.scheduled_arrival,
                                                                ).toLocaleTimeString([], {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })
                                                                : "—"}
                                                        </td>

                                                        <td className="px-3 py-3 text-gray-700">
                                                            {station.scheduled_departure
                                                                ? new Date(
                                                                    station.scheduled_departure,
                                                                ).toLocaleTimeString([], {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })
                                                                : "—"}
                                                        </td>

                                                        <td className="px-3 py-3 text-gray-700">
                                                            {station.platform ?? "—"}
                                                        </td>

                                                        <td className="px-3 py-3 text-gray-700">
                                                            {station.distance_from_source_km != null
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

                    {isCompletedJourney && (
                        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                            <p className="font-semibold text-green-900">
                                Journey Completed
                            </p>

                            <p className="mt-1 text-sm text-green-800">
                                {result.message
                                    ?? "This train has completed the current journey. No further ETA predictions are required."}
                            </p>

                            {result.journey.observed_stations > 0 && (
                                <p className="mt-2 text-xs text-green-700">
                                    Observed stations: {result.journey.observed_stations}
                                </p>
                            )}
                        </div>
                    )}



                    {isWaitingForObservations && (
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                            <p className="font-semibold text-yellow-900">
                                Waiting for Verified Live Observations
                            </p>

                            <p className="mt-1 text-sm text-yellow-800">
                                {result.message
                                    ?? "Live journey data is available, but there are not yet enough verified observations for a safe ETA prediction."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-yellow-800">
                                <span>
                                    Observed stations:{" "}
                                    <strong>{result.journey.observed_stations}</strong>
                                </span>

                                <span>
                                    Upcoming stations:{" "}
                                    <strong>{result.journey.upcoming_stations}</strong>
                                </span>
                            </div>

                            <p className="mt-3 text-xs text-yellow-700">
                                RailETA will not fabricate an ETA until sufficient leakage-safe
                                observations are available.
                            </p>
                        </div>
                    )}
                    {result.backend && (
                        <p className="text-xs text-gray-500">
                            Live data cache:{" "}
                            {result.backend.provider_payload_cache}
                        </p>
                    )}

                    {hasLiveResult
                        && !isCompletedJourney
                        && !isWaitingForObservations
                        && !isScheduledNotStarted && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                                <span>Auto-refreshing every 60 seconds</span>
                            </div>
                        )}
                </div>
            )}

            {result && nextPrediction && (
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    {/* Current → Next summary strip */}
                    <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Current Train State
                            </p>

                            <p className="mt-2 break-words text-xl font-bold sm:text-2xl">
                                {result.journey.current_station_name
                                    ?? result.journey.current_station_code
                                    ?? "Unknown"}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                Current delay:{" "}
                                <span className="font-semibold text-gray-900">
                                    {result.journey.current_delay_min == null
                                        ? "Unavailable"
                                        : result.journey.current_delay_min < 0
                                            ? `${Math.abs(result.journey.current_delay_min)} min early`
                                            : result.journey.current_delay_min === 0
                                                ? "On time"
                                                : `${result.journey.current_delay_min} min late`}
                                </span>
                            </p>
                        </div>


                        <div className="hidden text-3xl text-gray-400 lg:block">
                            →
                        </div>


                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Next Station
                            </p>

                            <p className="mt-2 break-words text-xl font-bold sm:text-2xl">
                                {nextPrediction.station.name
                                    ?? nextPrediction.station.code}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                {nextPrediction.station.code}
                            </p>
                        </div>


                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Predicted ETA
                            </p>

                            <p className="mt-2 text-xl font-bold">
                                {nextPrediction.forecast.eta
                                    ? new Date(
                                        nextPrediction.forecast.eta,
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "Unavailable"}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                Delay:{" "}
                                {nextPrediction.forecast.predicted_delay_min} min
                            </p>
                        </div>


                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Confidence
                            </p>

                            <span
                                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${confidenceClass(
                                    nextPrediction.forecast.confidence,
                                )}`}
                            >
                                {nextPrediction.forecast.confidence}
                            </span>
                        </div>


                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Position
                            </p>

                            <p className="mt-2 font-bold">
                                {livePositionSource === "REAL_PROVIDER_GPS"
                                    ? "Live GPS"
                                    : livePositionSource === "CURRENT_STATION"
                                        ? "Station Position"
                                        : livePositionSource === "ESTIMATED_BETWEEN_STATIONS"
                                            ? "Estimated"
                                            : "Unavailable"}
                            </p>
                        </div>

                    </div>
                </div>
            )}

            {result && (
                <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">

                    {!isScheduledNotStarted
                        && result.route && (
                            // Result container
                            <div className="space-y-4 rounded-xl border p-4 sm:p-5">
                                <div>
                                    <h3 className="text-xl font-bold">
                                        Live Route Map
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Live train position,
                                        upcoming stations and
                                        weather risk along the route.
                                    </p>
                                </div>

                                <RouteMap
                                    key={`${result.journey.train_number}-${result.route.current_position?.latitude ?? "na"}-${result.route.current_position?.longitude ?? "na"}`}
                                    route={result.route}
                                    etaWeather={
                                        result.eta_weather_corridor
                                    }
                                />
                            </div>
                        )}


                    {!isScheduledNotStarted
    && result.eta_weather_corridor.length > 0 && (
                        <div className="space-y-3">

                            <div>
                                <h3 className="text-xl font-bold">
                                    Weather Ahead
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                    Forecast conditions near
                                    predicted station arrival times.
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 font-medium text-green-800">
                                        LOW
                                    </span>

                                    <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 font-medium text-yellow-800">
                                        MODERATE
                                    </span>

                                    <span className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 font-medium text-orange-800">
                                        HIGH
                                    </span>

                                    <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1 font-medium text-red-800">
                                        SEVERE
                                    </span>
                                </div>
                            </div>


                            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">

                                {result.eta_weather_corridor.map(
                                    (item) => {
                                        const weather =
                                            item.weather;

                                        return (
                                            <div
                                                key={item.station_code}
                                                className="rounded-xl border bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">

                                                    <div>
                                                        <p className="font-semibold">
                                                            {item.station_name
                                                                ?? item.station_code}
                                                        </p>

                                                        <p className="text-xs text-gray-500">
                                                            {item.station_code}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${weatherRiskClass(
                                                            weather?.risk_level
                                                            ?? "UNKNOWN",
                                                        )}`}
                                                    >
                                                        {weather?.risk_level
                                                            ?? "UNKNOWN"}
                                                    </span>

                                                </div>


                                                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">

                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            Condition
                                                        </p>

                                                        <p className="font-medium">
                                                            {weather?.condition
                                                                ?? "Unavailable"}
                                                        </p>
                                                    </div>


                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            Temperature
                                                        </p>

                                                        <p className="font-medium">
                                                            {weather?.temperature_c
                                                                != null
                                                                ? `${weather.temperature_c}°C`
                                                                : "N/A"}
                                                        </p>
                                                    </div>


                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            Rain probability
                                                        </p>

                                                        <p className="font-medium">
                                                            {weather
                                                                ?.precipitation_probability_pct
                                                                != null
                                                                ? `${weather.precipitation_probability_pct}%`
                                                                : "N/A"}
                                                        </p>
                                                    </div>


                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            Arrival ETA
                                                        </p>

                                                        <p className="font-medium">
                                                            {new Date(
                                                                item.predicted_eta,
                                                            ).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    },
                                )}

                            </div>
                        </div>
                    )}

                </div>
            )}

            {result && result.predictions.length > 0 && (
                <div className="space-y-3">
                    <div>
                        <h3 className="text-xl font-bold">
                            Station Progress
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                            Predicted progression from the next station
                            to the destination.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-white">
                        {result.predictions.map(
                            (prediction, index) => {
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
                                    index ===
                                    result.predictions.length - 1;

                                return (
                                    <div
                                        key={`${prediction.station.code}-${prediction.station.stations_ahead}-${index}`}
                                        className={`grid gap-4 border-b p-4 last:border-b-0 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.8fr_1fr] ${stationRowClass(
                                            isNext,
                                            isLast,
                                        )}`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">

                                                <div
                                                    className={
                                                        isNext
                                                            ? "flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
                                                            : isLast
                                                                ? "flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white"
                                                                : "flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm font-bold text-gray-600"
                                                    }
                                                >
                                                    {isNext
                                                        ? "→"
                                                        : isLast
                                                            ? "◆"
                                                            : prediction.station.stations_ahead}
                                                </div>

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <p className="font-semibold">
                                                            {prediction.station.name
                                                                ?? prediction.station.code}
                                                        </p>

                                                        {isNext && (
                                                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                                                Next
                                                            </span>
                                                        )}

                                                        {isLast && (
                                                            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                                                Destination
                                                            </span>
                                                        )}

                                                    </div>

                                                    <p className="text-xs text-gray-500">
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

                                        <div>
                                            <p className="text-xs uppercase text-gray-500">
                                                Predicted ETA
                                            </p>

                                            <p className="font-medium">
                                                {prediction.forecast.eta
                                                    ? new Date(
                                                        prediction.forecast.eta,
                                                    ).toLocaleString()
                                                    : "Unavailable"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase text-gray-500">
                                                Delay
                                            </p>

                                            <p className="font-medium">
                                                {
                                                    prediction.forecast
                                                        .predicted_delay_min
                                                }{" "}
                                                min
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase text-gray-500">
                                                Weather Risk
                                            </p>

                                            <span
                                                className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${weatherRiskClass(
                                                    weather?.risk_level
                                                    ?? "UNKNOWN",
                                                )}`}
                                            >
                                                {
                                                    weather?.risk_level
                                                    ?? "UNKNOWN"
                                                }
                                            </span>

                                            {weather?.condition && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {weather.condition}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>
            )}

            {result && result.predictions.length > 0 && (
                <div className="space-y-3">
                    <div>
                        <h3 className="text-xl font-bold">
                            Model Insights
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                            Model evaluation and prediction
                            explainability for the current forecast.
                        </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">

                        {/* Explainability */}
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Prediction Explainability
                            </p>

                            {result.diagnostics
                                ?.prediction_explanation
                                ?.explanation_available ? (
                                <div className="mt-4 space-y-3">

                                    <p className="text-sm text-gray-600">
                                        Method:{" "}
                                        <span className="font-semibold text-gray-900">
                                            {
                                                result.diagnostics
                                                    .prediction_explanation
                                                    .method
                                            }
                                        </span>
                                    </p>

                                    {result.diagnostics
                                        .prediction_explanation
                                        .factors
                                        .slice(0, 5)
                                        .map((factor) => (
                                            <div
                                                key={`${factor.feature}-${factor.rank ?? 0}`}
                                                className="rounded-xl border p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold">
                                                            {factor.display_name ?? factor.feature}
                                                        </p>

                                                        <p className="text-xs text-gray-500">
                                                            {factor.feature}
                                                        </p>
                                                    </div>

                                                    <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                                                        {factor.direction === "INCREASES_DELAY"
                                                            ? "Pushes ETA later"
                                                            : factor.direction === "REDUCES_DELAY"
                                                                ? "Pulls ETA earlier"
                                                                : factor.direction}
                                                    </span>
                                                </div>

                                                {factor.contribution != null && (
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Contribution:{" "}
                                                        <span className="font-semibold text-gray-900">
                                                            {factor.contribution.toFixed(2)} min
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                    {result.diagnostics.prediction_explanation.interpretation && (
                                        <p className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                                            {result.diagnostics.prediction_explanation.interpretation}
                                        </p>
                                    )}


                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed bg-gray-50 p-4">
                                    <p className="font-semibold">
                                        Explainability not available yet
                                    </p>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Explanation is unavailable for this
                                        prediction because attribution could
                                        not be safely reconstructed for the
                                        served model output.
                                    </p>
                                </div>
                            )}
                        </div>


                        {/* Evaluation */}
                        <div className="rounded-2xl border bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Model Evaluation
                            </p>
                            <p className="mt-2 text-xs leading-5 text-gray-500">
                                These values are evaluation errors in minutes, not an accuracy percentage.
                                Lower values indicate better performance.
                            </p>

                            {result.diagnostics?.evaluation ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            MAE
                                        </p>

                                        <p className="mt-1 text-xl font-bold">
                                            {result.diagnostics.evaluation.mae_minutes != null
                                                ? `${result.diagnostics.evaluation.mae_minutes.toFixed(2)} min`
                                                : "N/A"}
                                        </p>
                                        Average absolute prediction error.
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            RMSE
                                        </p>

                                        <p className="mt-1 text-xl font-bold">
                                            {result.diagnostics.evaluation.rmse_minutes != null
                                                ? `${result.diagnostics.evaluation.rmse_minutes.toFixed(2)} min`
                                                : "N/A"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Gives more weight to larger prediction errors.
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            Median Error
                                        </p>

                                        <p className="mt-1 font-bold">
                                            {result.diagnostics.evaluation.median_absolute_error_minutes != null
                                                ? `${result.diagnostics.evaluation.median_absolute_error_minutes.toFixed(2)} min`
                                                : "N/A"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Typical absolute prediction error.
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            P90 Error
                                        </p>

                                        <p className="mt-1 font-bold">
                                            {result.diagnostics.evaluation.p90_absolute_error_minutes != null
                                                ? `${result.diagnostics.evaluation.p90_absolute_error_minutes.toFixed(2)} min`
                                                : "N/A"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            90% of evaluated errors were below this value.
                                        </p>
                                    </div>

                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed bg-gray-50 p-4">
                                    <p className="font-semibold">
                                        Evaluation metrics not available yet
                                    </p>

                                    <p className="mt-1 text-sm text-gray-600">
                                        Evaluation metrics are unavailable for
                                        the model serving this prediction.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}




            {result && result.predictions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xl font-bold">
                                Detailed ETA Predictions
                            </h3>

                            <p className="mt-1 text-sm text-gray-600">
                                Station-level prediction intervals,
                                confidence and model details.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowDetailedPredictions(
                                    (current) => !current,
                                )
                            }
                            className="w-full rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 sm:w-auto"
                        >
                            {showDetailedPredictions
                                ? "Hide Details"
                                : `Show ${result.predictions.length} Predictions`}
                        </button>
                    </div>

                    {showDetailedPredictions && (
                        <div className="space-y-4">
                            {result.predictions.map(
                                (prediction, index) => (
                                    <article
                                        key={`${prediction.station.code}-${prediction.station.stations_ahead}`}
                                        className={
                                            prediction.station.stations_ahead === 1
                                                ? "rounded-2xl border-2 border-blue-600 bg-white p-4 shadow-sm sm:p-5"
                                                : "rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
                                        }
                                    >
                                        {/* Station identity */}
                                        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-lg font-bold sm:text-xl">
                                                        {prediction.station.name
                                                            ?? prediction.station.code}
                                                    </p>

                                                    {prediction.station.stations_ahead === 1 && (
                                                        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase text-white">
                                                            Next Station
                                                        </span>
                                                    )}

                                                    {index === result.predictions.length - 1 && (
                                                        <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-semibold uppercase text-white">
                                                            Destination
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 text-sm text-gray-500">
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

                                            <div className="sm:text-right">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Expected Arrival
                                                </p>

                                                <p className="mt-1 text-2xl font-bold">
                                                    {prediction.forecast.eta
                                                        ? new Date(
                                                            prediction.forecast.eta,
                                                        ).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "Unavailable"}
                                                </p>

                                                {prediction.forecast.eta && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {new Date(
                                                            prediction.forecast.eta,
                                                        ).toLocaleDateString([], {
                                                            day: "numeric",
                                                            month: "short",
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>


                                        {/* Passenger summary */}
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                                            <div className="rounded-xl bg-gray-50 p-3">
                                                <p className="text-xs uppercase text-gray-500">
                                                    Expected Delay
                                                </p>

                                                <p className="mt-1 text-lg font-bold">
                                                    {prediction.forecast.predicted_delay_min} min
                                                </p>

                                                <span
                                                    className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${delayBadgeClass(
                                                        prediction.forecast.delay_status,
                                                    )}`}
                                                >
                                                    {prediction.forecast.delay_status
                                                        .replaceAll("_", " ")}
                                                </span>
                                            </div>


                                            <div className="rounded-xl bg-gray-50 p-3">
                                                <p className="text-xs uppercase text-gray-500">
                                                    Forecast Confidence
                                                </p>

                                                <span
                                                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${confidenceClass(
                                                        prediction.forecast.confidence,
                                                    )}`}
                                                >
                                                    {prediction.forecast.confidence}
                                                </span>

                                                <p className="mt-2 text-xs text-gray-500">
                                                    {prediction.forecast.confidence === "HIGH"
                                                        ? "Prediction is relatively more reliable."
                                                        : prediction.forecast.confidence === "MEDIUM"
                                                            ? "Arrival time may change as the train progresses."
                                                            : "Use this ETA with additional caution."}
                                                </p>
                                            </div>


                                            <div className="rounded-xl bg-gray-50 p-3 sm:col-span-2 lg:col-span-1">
                                                <p className="text-xs uppercase text-gray-500">
                                                    Expected Arrival Window
                                                </p>

                                                <p className="mt-1 text-sm font-semibold">
                                                    {prediction.forecast.lower_eta
                                                        ? new Date(
                                                            prediction.forecast.lower_eta,
                                                        ).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "N/A"}

                                                    {" – "}

                                                    {prediction.forecast.upper_eta
                                                        ? new Date(
                                                            prediction.forecast.upper_eta,
                                                        ).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "N/A"}
                                                </p>

                                                <p className="mt-2 text-xs text-gray-500">
                                                    Actual arrival may fall within this range.
                                                </p>
                                            </div>

                                        </div>


                                        {/* Technical details kept secondary */}
                                        <details className="mt-4 rounded-xl border bg-gray-50">
                                            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                                                How was this ETA calculated?
                                            </summary>

                                            <div className="space-y-3 border-t px-4 py-3 text-sm text-gray-600">

                                                <div>
                                                    <span className="font-semibold text-gray-900">
                                                        Forecast method:{" "}
                                                    </span>

                                                    <span>
                                                        {prediction.model.prediction_engine === "MODEL_2_NEXT_STATION"
                                                            ? "Next-station specialist"
                                                            : prediction.model.prediction_engine === "MODEL_3_MULTI_HORIZON"
                                                                ? "Multi-station forecast"
                                                                : "Hybrid ETA forecast"}
                                                    </span>
                                                    <p className="text-xs text-gray-500">
                                                        Engine: {prediction.model.prediction_engine}
                                                    </p>
                                                </div>

                                                <p>
                                                    {prediction.station.stations_ahead === 1
                                                        ? "This ETA uses the latest observed train movement and recent delay pattern for the immediate next station."
                                                        : "This ETA uses the current delay trend and guarded delay propagation for stations further ahead."}
                                                </p>

                                                {prediction.explanation && (
                                                    <p className="text-xs text-gray-500">
                                                        Technical note: {prediction.explanation}
                                                    </p>
                                                )}
                                                {prediction.comparison_only.provider_eta && (
                                                    <div className="rounded-lg border border-dashed bg-white p-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                            External Provider Reference
                                                        </p>

                                                        <p className="mt-1 font-medium text-gray-900">
                                                            {new Date(
                                                                prediction.comparison_only.provider_eta,
                                                            ).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>

                                                        {prediction.comparison_only.provider_delay_min != null && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                Provider-reported delay:{" "}
                                                                {prediction.comparison_only.provider_delay_min} min
                                                            </p>
                                                        )}

                                                        <p className="mt-2 text-xs text-gray-500">
                                                            Reference only — this value is not used as the RailETA
                                                            model prediction.
                                                        </p>
                                                    </div>
                                                )}

                                            </div>
                                        </details>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}