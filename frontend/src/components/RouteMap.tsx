"use client";

import {
    CircleMarker,
    MapContainer,
    Polyline,
    Popup,
    TileLayer,
    Tooltip,
    useMap,
} from "react-leaflet";

import {
    useEffect,
} from "react";
import type {
    StationWeatherAtETA,
} from "@/lib/api/api-types";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


type RouteStation = {
    code: string;
    name?: string | null;
    latitude: number;
    longitude: number;
    status:
    | "PASSED"
    | "CURRENT"
    | "NEXT"
    | "UPCOMING"
    | "DESTINATION";
    stations_ahead?: number | null;
};


type TrainPosition = {
    latitude: number;
    longitude: number;
    position_source:
    | "REAL_PROVIDER_GPS"
    | "ESTIMATED_BETWEEN_STATIONS"
    | "CURRENT_STATION";
    accuracy_note?: string | null;
};


type RouteMapData = {
    current_position?: TrainPosition | null;
    stations: RouteStation[];
};


type Props = {
    route: RouteMapData;
    etaWeather?: StationWeatherAtETA[];
};

function isValidIndiaCoordinate(
    latitude: number,
    longitude: number,
) {
    return (
        Number.isFinite(latitude)
        && Number.isFinite(longitude)
        && latitude >= 6
        && latitude <= 38
        && longitude >= 68
        && longitude <= 98
    );
}


function MapAutoFit({
    route,
}: {
    route: RouteMapData;
}) {
    const map = useMap();

    useEffect(() => {
        const points: L.LatLngExpression[] =
            route.stations
                .filter((station) =>
                    isValidIndiaCoordinate(
                        station.latitude,
                        station.longitude,
                    ),
                )
                .map(
                    (station) => [
                        station.latitude,
                        station.longitude,
                    ],
                );



        if (
            route.current_position
            && isValidIndiaCoordinate(
                route.current_position.latitude,
                route.current_position.longitude,
            )
        ) {
            points.push([
                route.current_position.latitude,
                route.current_position.longitude,
            ]);
        }

        if (points.length === 0) {
            return;
        }

        const bounds = L.latLngBounds(
            points,
        );

        map.fitBounds(
            bounds,
            {
                padding: [40, 40],
                maxZoom: 9,
            },
        );

    }, [
        map,
        route,
    ]);

    return null;
}


function stationRadius(
    status: RouteStation["status"],
) {
    if (status === "NEXT") {
        return 9;
    }

    if (status === "DESTINATION") {
        return 9;
    }

    if (status === "CURRENT") {
        return 8;
    }

    return 5;
}

function weatherRiskStyle(
    risk:
        | "LOW"
        | "MODERATE"
        | "HIGH"
        | "SEVERE"
        | "UNKNOWN"
        | undefined,
) {
    switch (risk) {
        case "SEVERE":
            return {
                radiusBoost: 5,
                weight: 5,
            };

        case "HIGH":
            return {
                radiusBoost: 4,
                weight: 4,
            };

        case "MODERATE":
            return {
                radiusBoost: 2,
                weight: 3,
            };

        default:
            return {
                radiusBoost: 0,
                weight: 2,
            };
    }
}


export default function RouteMap({
    route,
    etaWeather = [],
}: Props) {

    const validStations = route.stations.filter(
        (station) =>
            isValidIndiaCoordinate(
                station.latitude,
                station.longitude,
            ),
    );

    const stationPoints =
        validStations.map(
            (station) =>
                [
                    station.latitude,
                    station.longitude,
                ] as [number, number],
        );

    const completedPoints = validStations
        .filter(
            (station) =>
                station.status === "PASSED"
                || station.status === "CURRENT",
        )
        .map(
            (station) =>
                [
                    station.latitude,
                    station.longitude,
                ] as [number, number],
        );

    const pendingPoints = validStations
        .filter(
            (station) =>
                station.status === "CURRENT"
                || station.status === "NEXT"
                || station.status === "UPCOMING"
                || station.status === "DESTINATION",
        )
        .map(
            (station) =>
                [
                    station.latitude,
                    station.longitude,
                ] as [number, number],
        );


    const hasValidCurrentPosition =
        route.current_position
        && isValidIndiaCoordinate(
            route.current_position.latitude,
            route.current_position.longitude,
        );

    const center: [number, number] =
        hasValidCurrentPosition
            ? [
                route.current_position!.latitude,
                route.current_position!.longitude,
            ]
            : stationPoints[0]
            ?? [22.5, 79.0];

    const weatherByStation = new Map(
        etaWeather.map((item) => [
            item.station_code,
            item,
        ]),
    );

    return (
        <div className="w-full overflow-hidden rounded-2xl border">
            <div className="h-[520px]">
                <MapContainer
                    center={center}
                    zoom={6}
                    scrollWheelZoom
                    className="h-full w-full"
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapAutoFit
                        route={route}
                    />


                    {completedPoints.length > 1 && (
                        <Polyline
                            positions={completedPoints}
                            weight={5}
                            color="#16a34a"
                            opacity={0.9}
                        />
                    )}

                    {pendingPoints.length > 1 && (
                        <Polyline
                            positions={pendingPoints}
                            weight={4}
                            dashArray="10 8"
                            color="#2563eb"
                            opacity={0.85}
                        />
                    )}


                    {validStations.map((station) => {
                        const etaWeatherEntry =
                            weatherByStation.get(
                                station.code,
                            );

                        const weather =
                            etaWeatherEntry?.weather;

                        const riskStyle =
                            weatherRiskStyle(
                                weather?.risk_level,
                            );

                        return (
                            <CircleMarker
                                key={`${station.code}-${station.status}`}
                                center={[
                                    station.latitude,
                                    station.longitude,
                                ]}
                                radius={
                                    stationRadius(
                                        station.status,
                                    )
                                    + riskStyle.radiusBoost
                                }
                                weight={
                                    station.status === "NEXT"
                                        || station.status === "DESTINATION"
                                        ? Math.max(
                                            4,
                                            riskStyle.weight,
                                        )
                                        : riskStyle.weight
                                }
                                color={
                                    station.status === "PASSED"
                                        ? "#15803d"
                                        : station.status === "CURRENT"
                                            ? "#1d4ed8"
                                            : station.status === "NEXT"
                                                ? "#2563eb"
                                                : station.status === "DESTINATION"
                                                    ? "#7c3aed"
                                                    : "#64748b"
                                }
                                fillColor={
                                    station.status === "PASSED"
                                        ? "#22c55e"
                                        : station.status === "CURRENT"
                                            ? "#3b82f6"
                                            : station.status === "NEXT"
                                                ? "#60a5fa"
                                                : station.status === "DESTINATION"
                                                    ? "#a78bfa"
                                                    : "#cbd5e1"
                                }
                                fillOpacity={
                                    station.status === "UPCOMING"
                                        ? 0.65
                                        : 1
                                }
                            >
                                <Tooltip
                                    permanent={
                                        station.status === "NEXT"
                                        || station.status === "DESTINATION"
                                        || station.status === "CURRENT"
                                    }
                                    direction="top"
                                    offset={[0, -8]}
                                >
                                    <div className="text-xs font-semibold">
                                        {station.status === "NEXT" && (
                                            <>
                                                NEXT •{" "}
                                            </>
                                        )}

                                        {station.status === "DESTINATION" && (
                                            <>
                                                DEST •{" "}
                                            </>
                                        )}

                                        {station.status === "CURRENT" && (
                                            <>
                                                CURRENT •{" "}
                                            </>
                                        )}

                                        {station.status === "PASSED" && (
                                            <>
                                                PASSED •{" "}
                                            </>
                                        )}

                                        {station.name
                                            ?? station.code}
                                    </div>
                                </Tooltip>

                                <Popup>
                                    <div>
                                        <strong>
                                            {station.name
                                                ?? station.code}
                                        </strong>

                                        <br />

                                        Station:{" "}
                                        {station.code}

                                        <br />

                                        Status:{" "}
                                        {station.status}

                                        {station.stations_ahead
                                            != null && (
                                                <>
                                                    <br />

                                                    Stations ahead:{" "}
                                                    {
                                                        station.stations_ahead
                                                    }
                                                </>
                                            )}

                                        {etaWeatherEntry && (
                                            <>
                                                <hr />

                                                <strong>
                                                    Weather near ETA
                                                </strong>

                                                <br />

                                                Forecast:{" "}
                                                {weather?.condition
                                                    ?? "Unavailable"}

                                                <br />

                                                Risk:{" "}
                                                {weather?.risk_level
                                                    ?? "UNKNOWN"}

                                                {weather?.temperature_c != null && (
                                                    <>
                                                        <br />
                                                        Temperature:{" "}
                                                        {weather.temperature_c}°C
                                                    </>
                                                )}

                                                {weather
                                                    ?.precipitation_probability_pct
                                                    != null && (
                                                        <>
                                                            <br />
                                                            Rain probability:{" "}
                                                            {
                                                                weather
                                                                    .precipitation_probability_pct
                                                            }
                                                            %
                                                        </>
                                                    )}

                                                <br />

                                                Weather for predicted arrival:{" "}
                                                {new Date(
                                                    etaWeatherEntry.predicted_eta,
                                                ).toLocaleTimeString()}
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}


                    {route.current_position && (
                        <CircleMarker
                            center={[
                                route.current_position
                                    .latitude,

                                route.current_position
                                    .longitude,
                            ]}
                            radius={13}
                            weight={5}
                            fillOpacity={1}
                        >
                            <Tooltip
                                permanent
                                direction="top"
                                offset={[0, -12]}
                            >
                                <div className="font-bold">
                                    🚆 LIVE TRAIN
                                </div>
                            </Tooltip>

                            <Popup>
                                <div>
                                    <strong>
                                        Current Train Position
                                    </strong>

                                    <br />

                                    Source:{" "}
                                    {
                                        route.current_position
                                            .position_source
                                    }

                                    {route.current_position
                                        .accuracy_note && (
                                            <>
                                                <br />

                                                {
                                                    route
                                                        .current_position
                                                        .accuracy_note
                                                }
                                            </>
                                        )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    )}

                </MapContainer>
            </div>
            <div className="flex flex-wrap gap-4 border-t bg-white px-4 py-3 text-xs">
                <span className="font-semibold">
                    Route status:
                </span>

                <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    Completed journey
                </span>

                <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Current train
                </span>

                <span className="flex items-center gap-1">
                    <span className="inline-block h-[2px] w-6 border-t-2 border-dashed border-blue-500" />
                    Pending journey
                </span>

                <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
                    Destination
                </span>
            </div>

        </div>
    );
}