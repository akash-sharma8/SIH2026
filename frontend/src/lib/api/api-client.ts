import type {
    ApplicationErrorResponse,
    LiveForecastRequest,
    LiveForecastResponse,
    PredepartureForecastRequest,
    PredepartureForecastResponse,
    ValidationErrorResponse,
    HealthResponse,
    ReadyResponse,
    TrainSearchResponse,
} from "./api-types";

export type ApiFailure =
    | ApplicationErrorResponse
    | ValidationErrorResponse;


export class RailETAApiError extends Error {
    status: number;
    requestId: string | null;
    body: ApiFailure | unknown;

    constructor(
        message: string,
        status: number,
        requestId: string | null,
        body: ApiFailure | unknown,
    ) {
        super(message);

        this.name = "RailETAApiError";
        this.status = status;
        this.requestId = requestId;
        this.body = body;
    }
}


export interface RailETAClientOptions {
    baseUrl: string;
}


export class RailETAClient {
    private readonly baseUrl: string;

    constructor(
        options: RailETAClientOptions,
    ) {
        this.baseUrl =
            options.baseUrl.replace(/\/+$/, "");
    }


    private async request<T>(
        path: string,
        init?: RequestInit,
    ): Promise<T> {
        const response = await fetch(
            `${this.baseUrl}${path}`,
            {
                ...init,

                headers: {
                    "Content-Type": "application/json",
                    ...(init?.headers ?? {}),
                },
            },
        );

        const requestId =
            response.headers.get("X-Request-ID");

        let body: unknown = null;

        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok) {
            let message =
                `RailETA request failed with status ${response.status}.`;

            if (
                body &&
                typeof body === "object" &&
                "error" in body
            ) {
                const errorBody =
                    body as ApplicationErrorResponse;

                message =
                    errorBody.error?.message ??
                    message;
            }

            if (
                body &&
                typeof body === "object" &&
                "detail" in body
            ) {
                const validationBody =
                    body as ValidationErrorResponse;

                const firstError =
                    validationBody.detail?.[0];

                if (firstError?.msg) {
                    message = firstError.msg;
                }
            }

            throw new RailETAApiError(
                message,
                response.status,
                requestId,
                body,
            );
        }

        return body as T;
    }


    async getDemo():
        Promise<LiveForecastResponse> {
        return this.request<LiveForecastResponse>(
            "/v1/demo",
            {
                method: "GET",
            },
        );
    }

     async searchTrains(
        query: string,
        limit: number = 10,
    ): Promise<TrainSearchResponse> {
        const params = new URLSearchParams({
            q: query,
            limit: String(limit),
        });

        return this.request<TrainSearchResponse>(
            `/v1/trains/search?${params.toString()}`,
            {
                method: "GET",
            },
        );
    }




    async getLiveForecast(
        payload: LiveForecastRequest,
    ): Promise<LiveForecastResponse> {
        return this.request<LiveForecastResponse>(
            "/v1/forecast/live",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
        );
    }


    async getPredepartureForecast(
        payload: PredepartureForecastRequest,
    ): Promise<PredepartureForecastResponse> {
        return this.request<
            PredepartureForecastResponse
        >(
            "/v1/forecast/predeparture",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
        );
    }


    async health(): Promise<HealthResponse> {
        return this.request<HealthResponse>(
            "/health",
            {
                method: "GET",
            },
        );
    }


    async ready(): Promise<ReadyResponse> {
        return this.request<ReadyResponse>(
            "/ready",
            {
                method: "GET",
            },
        );
    }
}
