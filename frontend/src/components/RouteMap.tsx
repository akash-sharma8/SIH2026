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


function MapAutoFit({
    route,
}: {
    route: RouteMapData;
}) {
    const map = useMap();

    useEffect(() => {
        const points: L.LatLngExpression[] =
            route.stations.map(
                (station) => [
                    station.latitude,
                    station.longitude,
                ],
            );

        if (route.current_position) {
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

    const stationPoints =
        route.stations.map(
            (station) =>
                [
                    station.latitude,
                    station.longitude,
                ] as [number, number],
        );


    const center: [number, number] =
        route.current_position
            ? [
                route.current_position.latitude,
                route.current_position.longitude,
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
        <div className="h-[520px] w-full overflow-hidden rounded-2xl border">
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


                {stationPoints.length > 1 && (
                    <Polyline
                        positions={stationPoints}
                        weight={4}
                    />
                )}


                {route.stations.map((station) => {
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
    );
}