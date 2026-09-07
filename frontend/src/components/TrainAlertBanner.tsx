"use client";

import type {
    TrainDisruptionAlert,
} from "@/lib/api/api-types";


interface TrainAlertBannerProps {
    alerts: TrainDisruptionAlert[];
    journeyCompleted?: boolean;
}

function displayMessage(
    alert: TrainDisruptionAlert,
    journeyCompleted: boolean,
) {
    if (
        journeyCompleted
        && alert.type === "DIVERTED"
    ) {
        return alert.message.replace(
            /^Train is diverted/i,
            "Train was diverted",
        );
    }

    if (
        journeyCompleted
        && alert.type === "RESCHEDULED"
    ) {
        return alert.message.replace(
            /^Train is rescheduled/i,
            "Train was rescheduled",
        );
    }

    return alert.message;
}

export function TrainAlertBanner({
    alerts,
    journeyCompleted = false,
}: TrainAlertBannerProps) {
    if (!alerts.length) {
        return null;
    }

    return (
        <div className="space-y-3">
            {alerts.map(
                (alert, index) => {
                    const isCritical =
                        alert.severity
                            .toUpperCase()
                        === "CRITICAL";

                    const containerClass =
                        isCritical
                            ? "border-red-300 bg-red-50 text-red-950"
                            : "border-amber-300 bg-amber-50 text-amber-950";

                    return (
                        <div
                            key={`${alert.type}-${index}`}
                            className={`rounded-2xl border p-5 shadow-sm ${containerClass}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-xl">
                                    ⚠
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-bold">
                                            {alert.title}
                                        </h3>

                                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                            {alert.type}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm">
                                        {displayMessage(
                                            alert,
                                            journeyCompleted,
                                        )}
                                    </p>

                                    {(
                                        alert.from_station
                                        || alert.to_station
                                    ) && (
                                            <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm">
                                                <p className="font-semibold">
                                                    Affected route
                                                </p>

                                                <p className="mt-1">
                                                    {alert.from_station
                                                        ? `${alert.from_station.name ?? "Unknown"} (${alert.from_station.code ?? "—"})`
                                                        : "Unknown"}
                                                    {" → "}
                                                    {alert.to_station
                                                        ? `${alert.to_station.name ?? "Unknown"} (${alert.to_station.code ?? "—"})`
                                                        : "Unknown"}
                                                </p>
                                            </div>
                                        )}

                                    {alert.affected_stations.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-semibold">
                                                Skipped / affected stations
                                            </p>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {alert.affected_stations.map(
                                                    (
                                                        station,
                                                        stationIndex,
                                                    ) => (
                                                        <span
                                                            key={`${station.code}-${stationIndex}`}
                                                            className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium"
                                                        >
                                                            {station.name
                                                                ?? "Unknown station"}
                                                            {station.code
                                                                ? ` (${station.code})`
                                                                : ""}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <p className="mt-3 text-[11px] opacity-70">
                                        Source: {alert.source}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                },
            )}
        </div>
    );
}