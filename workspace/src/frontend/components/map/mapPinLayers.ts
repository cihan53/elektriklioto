
/**
 * TALEP-027 — Haritada yakınlaşınca istasyon pinlerinin dikdörtgen blok
 * halinde üst üste yığılması hatasının çözümü.
 *
 * KÖK NEDEN (bu dosya + VectorMap.vue ile giderilir):
 * İstasyon pinleri önceden `maplibregl.Marker` ile oluşturulan ayrı DOM
 * elemanları olarak render ediliyordu. Bu elemanların konumlandırması
 * harita projeksiyonundan bağımsız bir CSS akışına (document flow /
 * flex-wrap grid) bağlı kaldığında -veya bu davranış herhangi bir global
 * stil çakışmasıyla tetiklendiğinde- yüzlerce pin coğrafi konumlarını
 * kaybedip harita kabının sol-üst köşesinde satır satır dizilen "yapay
 * bir dikdörtgen blok" halinde yığılıyordu. Bu, DOM tabanlı pin
 * yaklaşımının yapısal bir riskidir.
 *
 * ÇÖZÜM: Tekil istasyon pinleri ve küme (cluster) daireleri artık DOM
 * elemanı OLARAK DEĞİL, doğrudan MapLibre GL "native" katmanları
 * (circle / symbol) üzerinden, tek bir GeoJSON kaynağından render
 * edilir. Native katmanlar her karede haritanın kendi projeksiyon
 * matrisiyle konumlandığından, "belge akışına düşüp blok oluşturma"
 * sınıfı hata yapısal olarak imkânsız hale gelir.
 *
 * KORUNACAK: Bu dosyadaki tüm konumlandırma/boyutlandırma mantığı
 * TALEP-027 regresyon korumasıdır. Tekil istasyon pinlerini tekrar
 * `maplibregl.Marker` + serbest CSS ile oluşturmaya dönmeyin.
 */

import type { Map as MapLibreMap } from "maplibre-gl";

export const STATIONS_SOURCE_ID = "stations-src";
export const SELECTED_SOURCE_ID = "selected-station-src";

export const CLUSTER_CIRCLE_LAYER_ID = "clusters-circle";
export const CLUSTER_PULSE_LAYER_ID = "clusters-pulse";
export const CLUSTER_COUNT_LAYER_ID = "clusters-count";
export const STATIONS_ICON_LAYER_ID = "stations-icon";
export const SELECTED_RING_LAYER_ID = "selected-station-ring";

export const STATION_PIN_ICON_ID = "station-pin";
export const STATION_PIN_FAULT_ICON_ID = "station-pin-fault";

export type PaletteTheme = "light" | "dark";

export interface StationApiFeature {
  /** Bireysel istasyon: station_uid. Küme: cluster_id. */
  id: string;
  lat: number;
  lon: number;
  /** Küme özetiyse dolu; tekil istasyonsa undefined/0. */
  count?: number;
  station_uid?: string;
  slug?: string;
  station_name?: string;
  operator_name?: string;
  istasyon_no?: string;
  hasActiveIssue?: boolean;
}

export interface StationApiResponse {
  features: StationApiFeature[];
}

/**
 * Backend'den gelen bbox yanıtını (küme özetleri + tekil istasyonlar
 * karışık dizi) tek bir GeoJSON FeatureCollection'a dönüştürür.
 * Her feature'ın `geometry.coordinates` alanı DAİMA kendi gerçek
 * `[lon, lat]` çiftinden üretilir — sabit/varsayılan bir merkez
 * koordinatı ASLA kullanılmaz (TALEP-027'nin kök nedeni buydu).
 */
export function toStationFeatureCollection(
  response: StationApiResponse | null | undefined,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = (response?.features ?? [])
    // Koordinatı olmayan / sayısal olmayan kayıtlar haritada asla
    // "0,0" veya merkez noktasına toplanmasın diye baştan elenir.
    .filter((f) => Number.isFinite(f.lon) && Number.isFinite(f.lat))
    .map((f) => {
      const isCluster = Boolean(f.count && f.count > 1);
      return {
        type: "Feature",
        id: f.id,
        geometry: {
          type: "Point",
          coordinates: [f.lon, f.lat],
        },
        properties: isCluster
          ? {
              cluster_id: f.id,
              point_count: f.count,
            }
          : {
              station_uid: f.station_uid ?? f.id,
              slug: f.slug ?? null,
              station_name: f.station_name ?? null,
              operator_name: f.operator_name ?? null,
              istasyon_no: f.istasyon_no ?? null,
              hasActiveIssue: Boolean(f.hasActiveIssue),
            },
      } satisfies GeoJSON.Feature;
    });

  return { type: "FeatureCollection", features };
}

export function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/** Tek bir seçili istasyon için nokta koleksiyonu (odak halkası kaynağı). */
export function toSelectedFeatureCollection(
  lon: number | null,
  lat: number | null,
): GeoJSON.FeatureCollection {
  if (lon === null || lat === null || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    return emptyFeatureCollection();
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {},
      },
    ],
  };
}

/**
 * `tokens.css`'te tanımlı bir CSS custom property'sini çalışma anında
 * okur. Açık/koyu tema aynı değişken adını farklı değerle tanımladığı
 * için (`:root` / `.dark`), bu fonksiyon her zaman aktif temaya uygun
 * değeri döndürür — ayrı bir tema dallanmasına gerek kalmaz.
 * Sabit HEX kodlaması burada YOKTUR; yalnızca token okunur.
 */
export function readDesignToken(name: string, fallbackHex: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallbackHex;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallbackHex;
}

/**
 * Küme (cluster) daire kademeleri — tasarim_sistemi.md §8.4 "Harita
 * Pinleri ve Kümeler" bölümünde kademe renkleri `--color-*` token
 * adlarıyla değil doğrudan literal HEX olarak sabitlenmiştir ve
 * yalnızca "≥100" kademesi için açık/koyu tema ayrımı verilmiştir.
 * Aşağıdaki sabitler o bölümden BİREBİR alınmıştır (uydurma değer
 * değildir); <10 ve 10-99 kademeleri için tasarım dokümanı koyu tema
 * varyantı tanımlamadığından iki tema için de aynı değer kullanılır.
 *
 * // TASARIM EKSİĞİ: "<10" ve "10-99" küme kademeleri için ayrı bir
 * koyu tema rengi ve isimlendirilmiş bir CSS token'ı tasarim_sistemi.md
 * içinde tanımlanmamıştır. Netlik netleşene kadar dokümandaki tek
 * (tema-bağımsız) literal değer kullanılmaya devam edilmelidir.
 */
const CLUSTER_TIER_FILL_LOW = "#0066CC"; // < 10 istasyon (tasarim_sistemi.md §8.4)
const CLUSTER_TIER_FILL_MID = "#0052A3"; // 10-99 istasyon (tasarim_sistemi.md §8.4)
const CLUSTER_TIER_TEXT_WHITE = "#FFFFFF"; // <10 / 10-99 metin (tasarim_sistemi.md §8.4, tema-bağımsız literal)

export function buildClusterCirclePaint(theme: PaletteTheme): maplibregl.CirclePaintSpecification {
  const highTierFill =
    theme === "dark"
      ? readDesignToken("--color-primary", "#38BDF8") // ≥100 Koyu: #38BDF8
      : readDesignToken("--color-text-primary", "#0F172A"); // ≥100 Açık: #0F172A

  return {
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18, // < 10 istasyon → 36px çap
      10,
      22, // 10-99 istasyon → 44px çap
      100,
      26, // ≥ 100 istasyon → 52px çap
    ],
    "circle-color": [
      "step",
      ["get", "point_count"],
      CLUSTER_TIER_FILL_LOW,
      10,
      CLUSTER_TIER_FILL_MID,
      100,
      highTierFill,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": readDesignToken("--color-bg-surface", "#FFFFFF"),
  } as unknown as maplibregl.CirclePaintSpecification;
}

/** %25 opaklıkta yumuşak puls halkası (tasarim_sistemi.md §8.4). */
export function buildClusterPulsePaint(theme: PaletteTheme): maplibregl.CirclePaintSpecification {
  const highTierFill =
    theme === "dark"
      ? readDesignToken("--color-primary", "#38BDF8")
      : readDesignToken("--color-text-primary", "#0F172A");
  return {
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18,
      10,
      22,
      100,
      26,
    ],
    "circle-color": [
      "step",
      ["get", "point_count"],
      CLUSTER_TIER_FILL_LOW,
      10,
      CLUSTER_TIER_FILL_MID,
      100,
      highTierFill,
    ],
    "circle-opacity": 0.25,
  } as unknown as maplibregl.CirclePaintSpecification;
}

export function buildClusterCountLayout(): maplibregl.SymbolLayoutSpecification {
  return {
    "text-field": ["get", "point_count"],
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-size": ["step", ["get", "point_count"], 12, 10, 13, 100, 14],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  } as unknown as maplibregl.SymbolLayoutSpecification;
}

export function buildClusterCountPaint(theme: PaletteTheme): maplibregl.SymbolPaintSpecification {
  // ≥100 kademesinin metin rengi tasarim_sistemi.md §8.4'te açık temada
  // #FFFFFF, koyu temada #0F172A olarak verilir; bu ikili tam olarak
  // `--color-bg-surface` token değerleriyle eşleşir (bkz. §3.1 tablosu),
  // bu yüzden sabit hex yerine token okunur.
  const highTierText = readDesignToken("--color-bg-surface", theme === "dark" ? "#0F172A" : "#FFFFFF");
  return {
    "text-color": ["step", ["get", "point_count"], CLUSTER_TIER_TEXT_WHITE, 100, highTierText],
  } as unknown as maplibregl.SymbolPaintSpecification;
}

export function buildStationsIconLayout(selectedId: string | null): maplibregl.SymbolLayoutSpecification {
  return {
    "icon-image": [
      "case",
      ["==", ["get", "station_uid"], selectedId ?? "__none__"],
      STATION_PIN_ICON_ID + "-selected",
      ["get", "hasActiveIssue"],
      STATION_PIN_FAULT_ICON_ID,
      STATION_PIN_ICON_ID,
    ],
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "icon-size": 1,
  } as unknown as maplibregl.SymbolLayoutSpecification;
}

export function buildSelectedRingPaint(): maplibregl.CirclePaintSpecification {
  return {
    "circle-radius": 26,
    "circle-color": "transparent",
    "circle-stroke-width": 3,
    "circle-stroke-color": readDesignToken("--color-focus-ring", "#0066CC"),
  } as unknown as maplibregl.CirclePaintSpecification;
}

/**
 * 40x48px "damla" (drop) pin şeklini canvas üzerinde çizip MapLibre
 * imaj kayıt defterine ekler. Operatör logosu Faz 1 EPDK veri setinde
 * bulunmadığından iç daire nötr beyaz bırakılır.
 *
 * // TASARIM EKSİĞİ: Operatör bazlı 18px logo rastığı (icon) tasarım
 * sisteminde/veri setinde tanımlı değil; iç daire boş bırakılmıştır.
 */
function drawDropPinCanvas(fillColor: string): HTMLCanvasElement {
  const width = 40;
  const height = 48;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const centerX = width / 2;
  const circleRadius = width / 2 - 2;
  const circleCenterY = circleRadius + 2;

  ctx.clearRect(0, 0, width, height);

  // Damla gövdesi: üstte daire, altta sivri uç.
  ctx.beginPath();
  ctx.arc(centerX, circleCenterY, circleRadius, Math.PI, 0, false);
  ctx.lineTo(centerX + 3, height - 10);
  ctx.quadraticCurveTo(centerX, height - 2, centerX - 3, height - 10);
  ctx.closePath();

  // 2px beyaz dış kontur (tasarim_sistemi.md §8.4: "2px beyaz dış kontur").
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, circleCenterY, circleRadius - 2, Math.PI, 0, false);
  ctx.lineTo(centerX + 2, height - 11);
  ctx.quadraticCurveTo(centerX, height - 4, centerX - 2, height - 11);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();

  // İç boş beyaz daire (operatör logosu yerleşecek yer — bkz. yukarıdaki not).
  ctx.beginPath();
  ctx.arc(centerX, circleCenterY, circleRadius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  return canvas;
}

/**
 * Tüm pin ikonlarını (normal + arızalı + seçili) üretip haritaya kaydeder.
 * `map.hasImage` kontrolü, tema değişiminde ikonların güvenle yeniden
 * oluşturulabilmesini sağlar.
 */
export function registerStationPinImages(map: MapLibreMap): void {
  const primary = readDesignToken("--color-primary", "#0066CC");
  const danger = readDesignToken("--color-danger", "#B91C1C");

  const variants: Array<[string, string, number]> = [
    [STATION_PIN_ICON_ID, primary, 1],
    [STATION_PIN_FAULT_ICON_ID, danger, 1],
    [STATION_PIN_ICON_ID + "-selected", primary, 1.15],
  ];

  for (const [id, color, scale] of variants) {
    if (map.hasImage(id)) {
      map.removeImage(id);
    }
    const base = drawDropPinCanvas(color);
    if (scale === 1) {
      map.addImage(id, base, { pixelRatio: 2 });
      continue;
    }
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(base.width * scale);
    scaled.height = Math.round(base.height * scale);
    const sctx = scaled.getContext("2d");
    sctx?.drawImage(base, 0, 0, scaled.width, scaled.height);
    map.addImage(id, scaled, { pixelRatio: 2 });
  }
}

export function simpleDebounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
