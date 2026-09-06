import { RailETAClient } from "./api-client";


const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim()
  || "http://127.0.0.1:8000";


export const railEtaApi =
  new RailETAClient({
    baseUrl: apiBaseUrl,
  });