"use client";

export type EtaHistoryPoint = {
    observedAt: string;
    predictedEta: string;
};

type Props = {
    points: EtaHistoryPoint[];
};

function formatClock(value: string) {
    return new Date(value).toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        },
    );
}

export default function EtaPredictionTrend({
    points,
}: Props) {
    if (points.length === 0) {
        return null;
    }

    const parsed = points
        .map((point) => ({
            ...point,
            etaMs: new Date(
                point.predictedEta,
            ).getTime(),
        }))
        .filter((point) =>
            Number.isFinite(point.etaMs),
        );

    if (parsed.length === 0) {
        return null;
    }

    const firstEta =
        parsed[0].etaMs;

    const trendPoints = parsed.map(
        (point) => ({
            ...point,
            deltaMin:
                (
                    point.etaMs
                    - firstEta
                )
                / 60000,
        }),
    );

    const minDelta =
        Math.min(
            ...trendPoints.map(
                (point) =>
                    point.deltaMin,
            ),
            0,
        );

    const maxDelta =
        Math.max(
            ...trendPoints.map(
                (point) =>
                    point.deltaMin,
            ),
            1,
        );

    const width = 460;
    const height = 170;

    const left = 38;
    const right = 18;
    const top = 20;
    const bottom = 38;

    const chartWidth =
        width - left - right;

    const chartHeight =
        height - top - bottom;

    function xFor(index: number) {
        if (trendPoints.length === 1) {
            return (
                left
                + chartWidth / 2
            );
        }

        return (
            left
            + (
                index
                / (
                    trendPoints.length
                    - 1
                )
            )
            * chartWidth
        );
    }

    function yFor(
        delta: number,
    ) {
        const range =
            maxDelta - minDelta || 1;

        return (
            top
            + (
                1
                - (
                    delta
                    - minDelta
                )
                / range
            )
            * chartHeight
        );
    }

    const polylinePoints =
        trendPoints
            .map(
                (point, index) =>
                    `${xFor(index)},${yFor(
                        point.deltaMin,
                    )}`,
            )
            .join(" ");

    const latest =
        trendPoints[
        trendPoints.length - 1
        ];

    const overallChange =
        latest.deltaMin;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                    Prediction history
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-950">
                    ETA prediction trend
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    How the next-station ETA changed as live forecast updates were received.
                </p>
            </div>

            <div className="p-5">
                {trendPoints.length === 1 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-sm font-semibold text-slate-700">
                            First prediction recorded
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            The trend will build as the live journey refreshes.
                        </p>
                    </div>
                ) : (
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-[190px] w-full"
                        role="img"
                        aria-label="ETA prediction trend"
                    >
                        {[0, 0.25, 0.5, 0.75, 1].map(
                            (ratio) => {
                                const y =
                                    top
                                    + ratio
                                    * chartHeight;

                                return (
                                    <line
                                        key={ratio}
                                        x1={left}
                                        x2={
                                            width
                                            - right
                                        }
                                        y1={y}
                                        y2={y}
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                    />
                                );
                            },
                        )}

                        <polyline
                            points={
                                polylinePoints
                            }
                            fill="none"
                            stroke="#0876c9"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {trendPoints.map(
                            (
                                point,
                                index,
                            ) => {
                                const x =
                                    xFor(
                                        index,
                                    );

                                const y =
                                    yFor(
                                        point.deltaMin,
                                    );

                                return (
                                    <g
                                        key={`${point.observedAt}-${index}`}
                                    >
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={
                                                index
                                                    === trendPoints.length - 1
                                                    ? "7"
                                                    : "5"
                                            }
                                            fill={
                                                index
                                                    === trendPoints.length - 1
                                                    ? "#0f172a"
                                                    : "#0876c9"
                                            }
                                        />

                                        <title>
                                            {`Observed ${new Date(
                                                point.observedAt,
                                            ).toLocaleTimeString(
                                                "en-IN",
                                                {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                },
                                            )} · ETA ${formatClock(
                                                point.predictedEta,
                                            )} · ${point.deltaMin > 0
                                                ? "+"
                                                : ""
                                                }${point.deltaMin.toFixed(0)} min from first prediction`}
                                        </title>
                                        {index === trendPoints.length - 1 && (
                                            <text
                                                x={x}
                                                y={Math.max(y - 12, 12)}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fontWeight="700"
                                                fill="#0f172a"
                                            >
                                                {formatClock(
                                                    point.predictedEta,
                                                )}
                                            </text>
                                        )}
                                        {(
                                            trendPoints.length <= 6
                                            || index === 0
                                            || index === trendPoints.length - 1
                                            || index % 2 === 0
                                        ) && (
                                                <text
                                                    x={x}
                                                    y={height - 12}
                                                    textAnchor="middle"
                                                    fontSize="10"
                                                    fill="#64748b"
                                                >
                                                    {new Date(
                                                        point.observedAt,
                                                    ).toLocaleTimeString(
                                                        "en-IN",
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: false,
                                                        },
                                                    )}
                                                </text>
                                            )}
                                    </g>
                                );
                            },
                        )}
                    </svg>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            First prediction
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                            {formatClock(
                                trendPoints[0].predictedEta,
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                            Latest prediction
                        </p>

                        <p className="mt-1 text-lg font-bold text-sky-800">
                            {formatClock(
                                latest.predictedEta,
                            )}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
                    {trendPoints
                        .slice(-4)
                        .map(
                            (
                                point,
                                index,
                            ) => (
                                <div
                                    key={`${point.observedAt}-summary-${index}`}
                                    className="text-xs"
                                >
                                    <span className="font-semibold text-slate-900">
                                        {new Date(
                                            point.observedAt,
                                        ).toLocaleTimeString(
                                            "en-IN",
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            },
                                        )}
                                    </span>

                                    <span className="mx-1 text-slate-400">
                                        →
                                    </span>

                                    <span className="font-semibold text-sky-700">
                                        {formatClock(
                                            point.predictedEta,
                                        )}
                                    </span>
                                </div>
                            ),
                        )}
                </div>

                {trendPoints.length > 1 && (
                    <div
                        className={[
                            "mt-4 rounded-xl border px-4 py-3 text-sm",
                            overallChange > 0
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : overallChange < 0
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                        ].join(" ")}
                    >
                        <strong>
                            ETA changed{" "}
                            {overallChange > 0
                                ? "+"
                                : ""}
                            {overallChange.toFixed(
                                0,
                            )}{" "}
                            min
                        </strong>

                        <span className="ml-2">
                            since the first recorded prediction.
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}