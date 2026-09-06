import { RailETAClient } from "./api-client";


export function createRailETAClient(
  baseUrl: string = "http://127.0.0.1:8000",
): RailETAClient {
  return new RailETAClient({
    baseUrl: baseUrl.trim(),
  });
}