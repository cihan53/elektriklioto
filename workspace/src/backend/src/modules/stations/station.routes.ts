
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import {
  StationsBBoxSchemaDef,
  StationsDeltaSchemaDef,
  StationDetailSchemaDef,
  type StationsBBoxQuery,
  type StationsDeltaQuery,
  type StationSlugParams,
  type ProblemDetails,
} from './station.schema.js';
import {
  getStationsInBBox,
  getStationsDelta,
  getStationBySlug,
  InvalidBBoxError,
} from './station.service.js';

// TALEP-046 — [UAT] S31-T2 canlı kabul denetimi başarısız (UAT-06: Web arayüzü
// HTTP 500). Kök neden: `/api/v1/stations` ucu, `bbox` eksik/hatalı geldiğinde
// veya sorgu sırasında beklenmeyen bir istisna (ör. `operator_id` çözümlenmemiş
// bir istasyonun `null` operatörle serileştirilmesi) oluştuğunda ham hatayı
// yakalamadan sızdırıyor, bu da web istemcisinin SSR aşamasındaki upstream
// çağrısının çökmesine (500) yol açıyordu. Bu dosyadaki `try/catch` + RFC 7807
// problem+json zarfı KORUNACAK — geri alınmamalıdır.
function sendProblem(
  reply: FastifyReply,
  status: number,
  title: string,
  detail?: string,
): FastifyReply {
  const problem: ProblemDetails = {
    type: `https://elektriklioto.com/problems/${status}`,
    title,
    status,
    ...(detail ? { detail } : {}),
  };
  return reply
    .code(status)
    .header('content-type', 'application/problem+json; charset=utf-8')
    .send(problem);
}

export const stationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/v1/stations?bbox=min_lon,min_lat,max_lon,max_lat&zoom=12
  fastify.get<{ Querystring: StationsBBoxQuery }>(
    '/stations',
    {
      schema: StationsBBoxSchemaDef,
      config: {
        rateLimit: { max: 120, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const { bbox, zoom, since } = request.query;

      // TALEP-046: bbox 4 bileşene ayrıştırılır ve WGS 84 sınırları
      // (-180..180 boylam, -90..90 enlem) + min < max denetimi yapılır.
      // Şema `pattern` ile kaba biçimi zaten süzer; burada sayısal/mantıksal
      // geçerlilik (NaN, ters sıralı kutu, sınır dışı) denetlenir. Geçersizse
      // PostGIS katmanına ASLA ham değer gönderilmez — 400 döner.
      const parts = bbox.split(',').map((v) => Number.parseFloat(v));
      const [minLon, minLat, maxLon, maxLat] = parts;

      const allFinite = parts.every((n) => Number.isFinite(n));
      const withinWgs84 =
        allFinite &&
        minLon >= -180 &&
        maxLon <= 180 &&
        minLat >= -90 &&
        maxLat <= 90;
      const orderedCorrectly = allFinite && minLon < maxLon && minLat < maxLat;

      if (!allFinite || !withinWgs84 || !orderedCorrectly) {
        return sendProblem(
          reply,
          400,
          'Geçersiz bbox parametresi',
          'bbox, WGS 84 sınırları içinde min_lon,min_lat,max_lon,max_lat sırasıyla ve min < max koşuluyla verilmelidir.',
        );
      }

      try {
        const result = await getStationsInBBox({
          minLon,
          minLat,
          maxLon,
          maxLat,
          zoom,
          sinceEpoch: since,
        });
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof InvalidBBoxError) {
          return sendProblem(reply, 400, 'Geçersiz bbox parametresi', err.message);
        }
        // TALEP-046: Beklenmeyen hata (DB bağlantı kaybı, PostGIS istisnası
        // vb.) artık sürece sızmaz; backlog US-04 AC4 gereği anlamlı 503/500
        // JSON gövdesi ile karşılanır. İç hata detayı yanıta yazılmaz.
        request.log.error({ err }, 'stations bbox query failed');
        return sendProblem(
          reply,
          503,
          'İstasyon verisi geçici olarak sunulamıyor',
          'Sunucu içi mekânsal sorgu tamamlanamadı, lütfen daha sonra tekrar deneyin.',
        );
      }
    },
  );

  // GET /api/v1/stations/delta?since=<epoch>
  fastify.get<{ Querystring: StationsDeltaQuery }>(
    '/stations/delta',
    {
      schema: StationsDeltaSchemaDef,
      config: {
        rateLimit: { max: 120, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      try {
        const items = await getStationsDelta(request.query.since);
        return reply.code(200).send({ count: items.length, items });
      } catch (err) {
        request.log.error({ err }, 'stations delta query failed');
        return sendProblem(
          reply,
          503,
          'Delta senkronizasyonu geçici olarak sunulamıyor',
        );
      }
    },
  );

  // GET /api/v1/stations/:slug
  fastify.get<{ Params: StationSlugParams }>(
    '/stations/:slug',
    {
      schema: StationDetailSchemaDef,
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      try {
        const station = await getStationBySlug(request.params.slug);
        if (!station) {
          return sendProblem(
            reply,
            404,
            'İstasyon bulunamadı',
            `"${request.params.slug}" slug'ına sahip bir istasyon kaydı yok.`,
          );
        }
        return reply.code(200).send(station);
      } catch (err) {
        request.log.error({ err, slug: request.params.slug }, 'station detail query failed');
        return sendProblem(reply, 500, 'İstasyon detayı okunamadı');
      }
    },
  );
};

export default stationRoutes;
