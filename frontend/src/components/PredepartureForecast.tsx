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


const initialPayload: PredepartureForecastRequest = {
    train: {
        train_number: "12615",
        train_type: "Express",
    },

    schedule: {
        year: 2026,
        month: 9,
        day_of_week: 1,
        departure_hour: 10,
        is_weekend: 0,
        is_night_departure: 0,
        is_peak_hour: 0,
        is_festival_season: 0,
        season: "Monsoon",
    },

    route: {
        zone: "SR",
        zone_abbr: "SR",
        source_station_category: "A1",
        destination_station_category: "A1",
        distance_km: 2182,
        num_scheduled_stops: 40,
        scheduled_travel_hours: 36,
        route_historical_ontime_pct: 70,
    },

    infrastructure: {
        track_doubled: 1,
        is_hdn_route: 1,
        traction_type: "Electric (25kV AC)",
        is_electrified: 1,
        psr_count: 1,
        is_circular_route: 0,
    },

    weather_risk: {
        is_monsoon_season: 1,
        is_fog_risk: 0,
        fog_risk_score: 0.1,
        zone_fog_index: 0.2,
        zone_congestion_index: 0.3,
        season_severity_score: 0.4,
    },

    operations: {
        loco_age_years: 5,
        coach_age_years: 4,
        has_lhb_coaches: 1,
        is_rake_shared: 0,
        maintenance_score: 85,
        seat_utilisation_pct: 80,
        is_overloaded: 0,
        late_incoming_rake: 0,
        is_special_train: 0,
    },
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

            train: {
                ...current.train,
                train_number: value,
            },
        }));
    }


    function updateDepartureHour(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,

            schedule: {
                ...current.schedule,
                departure_hour:
                    Number(value),
            },
        }));
    }


    function updateDistance(
        value: string,
    ) {
        setPayload((current) => ({
            ...current,

            route: {
                ...current.route,
                distance_km:
                    Number(value),
            },
        }));
    }


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
                <div className="grid gap-4 md:grid-cols-3">

                    <div>
                        <label
                            htmlFor="pre-train-number"
                            className="mb-1 block font-medium"
                        >
                            Train Number
                        </label>

                        <input
                            id="pre-train-number"
                            value={
                                payload.train
                                    .train_number
                            }
                            onChange={(event) =>
                                updateTrainNumber(
                                    event.target.value,
                                )
                            }
                            required
                            inputMode="numeric"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>


                    <div>
                        <label
                            htmlFor="departure-hour"
                            className="mb-1 block font-medium"
                        >
                            Departure Hour
                        </label>

                        <input
                            id="departure-hour"
                            type="number"
                            min={0}
                            max={23}
                            value={
                                payload.schedule
                                    .departure_hour
                            }
                            onChange={(event) =>
                                updateDepartureHour(
                                    event.target.value,
                                )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>


                    <div>
                        <label
                            htmlFor="distance"
                            className="mb-1 block font-medium"
                        >
                            Route Distance (km)
                        </label>

                        <input
                            id="distance"
                            type="number"
                            min={1}
                            value={
                                payload.route
                                    .distance_km
                            }
                            onChange={(event) =>
                                updateDistance(
                                    event.target.value,
                                )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                </div>


                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {loading
                        ? "Generating Forecast..."
                        : "Predict Destination Delay"}
                </button>
                {loading && (
                    <p className="text-xs text-gray-500">
                        Evaluating route, schedule and operational conditions...
                    </p>
                )}
            </form>


            {error && (
                <div className="rounded-xl border p-5">
                    <p className="font-semibold">
                        Unable to generate forecast
                    </p>

                    <p className="mt-1">
                        {error}
                    </p>

                    {requestId && (
                        <p className="mt-2 text-xs text-gray-500">
                            Request ID: {requestId}
                        </p>
                    )}
                </div>
            )}


            {result && (
                <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                            Pre-departure model
                        </span>

                        <span className="text-xs text-gray-500">
                            {result.model.role}
                        </span>
                    </div>


                    <div className="grid gap-4 md:grid-cols-4">

                        <div className="rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Predicted Destination Delay
                            </p>

                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {result.forecast.predicted_destination_delay_min} min
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                Estimated delay at the destination before departure.
                            </p>
                        </div>


                        <div className="rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Delay Risk
                            </p>

                            <span
                                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskBadgeClass(
                                    result.forecast.risk_level,
                                )}`}
                            >
                                {result.forecast.risk_level}
                            </span>
                        </div>


                        <div className="rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Forecast Confidence
                            </p>

                            <span
                                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${confidenceBadgeClass(
                                    result.forecast.confidence,
                                )}`}
                            >
                                {result.forecast.confidence}
                            </span>

                            <p className="mt-2 text-xs text-gray-500">
                                {result.forecast.confidence === "HIGH"
                                    ? "Prediction is relatively more reliable."
                                    : result.forecast.confidence === "MEDIUM"
                                        ? "Use this forecast with moderate caution."
                                        : "Use this forecast with additional caution."}
                            </p>
                        </div>


                        <div className="rounded-2xl border bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Input Completeness
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {result.input_quality.feature_completeness_pct}%
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                Model features successfully supplied.
                            </p>
                        </div>

                    </div>


                    <div className="rounded-2xl border bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Expected Delay Range
                        </p>

                        <p className="mt-2 text-xl font-bold text-gray-900">
                            {result.forecast.lower_delay_min} – {result.forecast.upper_delay_min} min
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            The actual destination delay may fall within this interval.
                        </p>
                    </div>

                    {(
                        result.input_quality.missing_features.length > 0
                        || result.input_quality.missing_critical_features.length > 0
                        || Object.keys(result.input_quality.unknown_categories).length > 0
                    ) && (
                            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                                <p className="font-semibold text-yellow-900">
                                    Input Quality Notes
                                </p>

                                {result.input_quality.missing_critical_features.length > 0 && (
                                    <p className="mt-2 text-sm text-yellow-900">
                                        Missing critical features:{" "}
                                        {result.input_quality.missing_critical_features.join(", ")}
                                    </p>
                                )}

                                {result.input_quality.missing_features.length > 0 && (
                                    <p className="mt-2 text-sm text-yellow-900">
                                        Missing features:{" "}
                                        {result.input_quality.missing_features.join(", ")}
                                    </p>
                                )}

                                {Object.keys(result.input_quality.unknown_categories).length > 0 && (
                                    <div className="mt-2 text-sm text-yellow-900">
                                        <p>
                                            Some categorical values were not recognized by the model:
                                        </p>

                                        <ul className="mt-1 list-disc pl-5">
                                            {Object.entries(
                                                result.input_quality.unknown_categories,
                                            ).map(([key, value]) => (
                                                <li key={key}>
                                                    {key}: {String(value)}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}


                    {result.limitations.length > 0 && (
                        <details className="rounded-2xl border border-yellow-200 bg-yellow-50">
                            <summary className="cursor-pointer px-4 py-3 font-semibold text-yellow-900">
                                Forecast limitations
                            </summary>

                            <div className="border-t border-yellow-200 px-4 py-3">
                                <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-900">
                                    {result.limitations.map(
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
                    {result.diagnostics && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-bold">
                                    Model Insights
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                    Explanation and evaluation details for the pre-departure forecast.
                                </p>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">

                                {/* Explainability */}
                                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Why this forecast?
                                    </p>

                                    {result.diagnostics.prediction_explanation?.explanation_available ? (
                                        <div className="mt-4 space-y-3">

                                            <p className="text-sm text-gray-600">
                                                Method:{" "}
                                                <span className="font-semibold text-gray-900">
                                                    {result.diagnostics.prediction_explanation.method}
                                                </span>
                                            </p>

                                            {result.diagnostics.prediction_explanation.factors
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
                                                                    ? "Pushes delay higher"
                                                                    : factor.direction === "REDUCES_DELAY"
                                                                        ? "Pulls delay lower"
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
                                                Explainability unavailable
                                            </p>

                                            <p className="mt-1 text-sm text-gray-600">
                                                The served prediction could not be safely reconstructed for explanation.
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

                                    {result.diagnostics.evaluation ? (
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

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Average absolute prediction error.
                                                </p>
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
                                                    Gives more weight to larger errors.
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
                                                Evaluation unavailable
                                            </p>

                                            <p className="mt-1 text-sm text-gray-600">
                                                Evaluation metrics are not available for this forecast.
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            )}

        </section>
    );
}