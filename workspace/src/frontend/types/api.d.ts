
/**
 * Bu dosya `openapi-typescript` ile üretilir (bkz. package.json → "generate:api").
 * Kaynak şema: packages/contracts/openapi.json (backend'de `@fastify/swagger` ile
 * Fastify JSON şemalarından üretilip depoya işlenir — bkz. teknik_mimari_dokumani.md §5.2).
 *
 * > **Varsayım:** Bu görev sırasında `packages/contracts/openapi.json` bu teslimin
 * > (`workspace/src/frontend/`) erişebildiği kapsamda mevcut değildi. Aşağıdaki tipler,
 * > `teknik_mimari_dokumani.md` §5.1 ve `kabul_kriterleri.md` AC-01/AC-02/AC-06/AC-07
 * > tanımlarına birebir uyacak şekilde `openapi-typescript` çıktı biçiminde elle
 * > senkronize edilmiştir. Gerçek şema depoya eklendiğinde `pnpm generate:api` bu
 * > dosyanın üzerine yazar; dosya CI'da drift kontrolüne tabidir (AC-32).
 *
 * ELLE DÜZENLEMEYİN.
 */

export interface paths {
  "/api/v1/stations": {
    get: operations["getStations"];
  };
}

export interface components {
  schemas: {
    StationPin: {
      kind: "pin";
      uid: string;
      lat: number;
      lon: number;
      operatorId: string;
      operatorName: string;
      maxPowerKw: number;
      socketTypes: ("AC_TYPE2" | "DC_CCS" | "DC_CHADEMO")[];
      status: "available" | "occupied" | "unknown" | "faulted" | "decommissioned";
      /** @description read_model.freshness_seconds — bkz. teknik_mimari_dokumani.md §7 */
      freshnessSeconds: number;
    };
    StationCluster: {
      kind: "cluster";
      lat: number;
      lon: number;
      /** @description kümedeki istasyon sayısı — bkz. kabul_kriterleri.md AC-02 */
      count: number;
    };
    StationsResponse: {
      mode: "pins" | "clusters";
      items: (components["schemas"]["StationPin"] | components["schemas"]["StationCluster"])[];
    };
  };
}

export interface operations {
  getStations: {
    parameters: {
      query: {
        /** @description "minLon,minLat,maxLon,maxLat" */
        bbox: string;
        zoom: number;
        power?: string;
        socket?: string;
        operator?: string;
        status?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["StationsResponse"];
        };
      };
      400: {
        content: {
          "application/json": {
            message: string;
          };
        };
      };
    };
  };
}
