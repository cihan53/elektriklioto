
import type { components } from "~/types/api";

export type StationPin = components["schemas"]["StationPin"];
export type StationCluster = components["schemas"]["StationCluster"];
export type StationsResponse = components["schemas"]["StationsResponse"];

export interface StationsQuery {
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  zoom: number;
  power?: string;
  socket?: string;
  operator?: string;
  status?: string;
}

/**
 * `packages/contracts/openapi.json` şemasından `openapi-typescript` ile üretilen
 * tiplere (`~/types/api`) göre yazılmış ince bir `$fetch` sarmalayıcısıdır — elle
 * yazılmış istemci modeli değildir (bkz. teknik_mimari_dokumani.md §5.2).
 */
export function useStationsApi() {
  const config = useRuntimeConfig();

  async function fetchStations(query: StationsQuery): Promise<StationsResponse> {
    const [minLon, minLat, maxLon, maxLat] = query.bbox;
    return await $fetch<StationsResponse>("/api/v1/stations", {
      baseURL: config.public.apiBase as string,
      query: {
        bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
        zoom: Math.round(query.zoom),
        power: query.power,
        socket: query.socket,
        operator: query.operator,
        status: query.status,
      },
    });
  }

  return { fetchStations };
}
