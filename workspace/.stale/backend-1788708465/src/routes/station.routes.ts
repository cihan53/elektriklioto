
import type { FastifyPluginAsync } from 'fastify';
import { sql } from '../db/connection.js';
import { parseBBox } from '../utils/geo.js';
import {
  StationsQuerySchema,
  StationsResponseSchema,
  StationDetailParamsSchema,
  StationDetailResponseSchema,
  type StationsQuery,
} from '../schemas/station.schema.js';

export const stationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/stations (BBox Mekânsal Sorgu ve Düşük Zoom Kümeleme)
  fastify.get<{ Querystring: StationsQuery }>(
    '/stations',
    {
      schema: {
        description: 'Verilen harita sınır kutusundaki (bbox) şarj istasyonlarını listeler veya zoom < 10 ise kümeleyerek döner.',
        tags: ['Stations'],
        querystring: StationsQuerySchema,
        response: {
          200: StationsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { bbox, zoom = 12, operator, limit = 1000 } = request.query;

      const parsedBbox = parseBBox(bbox);
      if (!parsedBbox) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Geçersiz bbox parametresi. Format: min_lon,min_lat,max_lon,max_lat (WGS84 sınırları içinde).',
        });
      }

      const { minLon, minLat, maxLon, maxLat } = parsedBbox;

      // Zoom < 10: PostGIS ST_SnapToGrid ile kümelenmiş özet veri
      if (zoom < 10) {
        // Zoom seviyesine bağlı dinamik grid aralığı (derece cinsinden)
        const gridSize = Math.max(0.05, (10 - zoom) * 0.15);

        const clusterRows = await sql`
          SELECT 
            md5(concat(round(st_y(st_snaptogrid(geom::geometry, ${gridSize}))::numeric, 4), ':', round(st_x(st_snaptogrid(geom::geometry, ${gridSize}))::numeric, 4))) AS cluster_id,
            count(*)::int AS count,
            round(avg(st_y(geom::geometry))::numeric, 6)::float AS lat,
            round(avg(st_x(geom::geometry))::numeric, 6)::float AS lon
          FROM stations
          WHERE ST_Intersects(geom, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
            AND is_active = true
            ${operator ? sql`AND operator_id = (SELECT id FROM operators WHERE slug = ${operator} LIMIT 1)` : sql``}
          GROUP BY st_snaptogrid(geom::geometry, ${gridSize})
          ORDER BY count DESC
          LIMIT 500
        `;

        return {
          type: 'clusters',
          zoom,
          count: clusterRows.length,
          data: clusterRows.map((row) => ({
            cluster_id: row.cluster_id,
            count: Number(row.count),
            lat: Number(row.lat),
            lon: Number(row.lon),
          })),
        };
      }

      // Zoom >= 10: Tekil istasyonların PostGIS ST_Intersects ile çekilmesi
      const stationRows = await sql`
        SELECT 
          s.id,
          s.istasyon_no,
          s.slug,
          s.name,
          s.lat::float,
          s.lon::float,
          s.address,
          s.city,
          s.district,
          s.updated_at,
          o.id AS operator_id,
          o.name AS operator_name,
          o.slug AS operator_slug,
          o.is_active AS operator_is_active
        FROM stations s
        JOIN operators o ON s.operator_id = o.id
        WHERE ST_Intersects(s.geom, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
          AND s.is_active = true
          ${operator ? sql`AND o.slug = ${operator}` : sql``}
        ORDER BY s.id
        LIMIT ${limit}
      `;

      return {
        type: 'stations',
        zoom,
        count: stationRows.length,
        data: stationRows.map((row) => ({
          id: row.id,
          istasyon_no: row.istasyon_no,
          slug: row.slug,
          name: row.name,
          operator: {
            id: row.operator_id,
            name: row.operator_name,
            slug: row.operator_slug,
            logo_url: null,
            is_active: row.operator_is_active,
          },
          lat: Number(row.lat),
          lon: Number(row.lon),
          address: row.address,
          city: row.city,
          district: row.district,
          // Faz 1 zorunlu kısıt: Veri yokken uydurma değer girilemez; alanlar kesinlikle NULL döner.
          connector_types: null,
          power_kw: null,
          current_tariff: null,
          connectors: null,
          status: 'OPERATIONAL',
          updated_at: new Date(row.updated_at).toISOString(),
        })),
      };
    }
  );

  // GET /api/v1/stations/:slug (Detay Uç Noktası)
  fastify.get<{ Params: { slug: string } }>(
    '/stations/:slug',
    {
      schema: {
        description: 'İstasyonun kanonik slug bilgisiyle tekil detayını döner.',
        tags: ['Stations'],
        params: StationDetailParamsSchema,
        response: {
          200: StationDetailResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const rows = await sql`
        SELECT 
          s.id,
          s.istasyon_no,
          s.slug,
          s.name,
          s.lat::float,
          s.lon::float,
          s.address,
          s.city,
          s.district,
          s.updated_at,
          o.id AS operator_id,
          o.name AS operator_name,
          o.slug AS operator_slug,
          o.is_active AS operator_is_active
        FROM stations s
        JOIN operators o ON s.operator_id = o.id
        WHERE s.slug = ${slug}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Belirtilen istasyon bulunamadı.',
        });
      }

      const row = rows[0];

      return {
        data: {
          id: row.id,
          istasyon_no: row.istasyon_no,
          slug: row.slug,
          name: row.name,
          operator: {
            id: row.operator_id,
            name: row.operator_name,
            slug: row.operator_slug,
            logo_url: null,
            is_active: row.operator_is_active,
          },
          lat: Number(row.lat),
          lon: Number(row.lon),
          address: row.address,
          city: row.city,
          district: row.district,
          connector_types: null,
          power_kw: null,
          current_tariff: null,
          connectors: null,
          status: 'OPERATIONAL',
          updated_at: new Date(row.updated_at).toISOString(),
        },
        disclaimer: 'elektriklioto.com bir e-Mobilite Asistanıdır; EPDK lisanslı şarj operatörü değildir. Elektrik satışı yapılmaz.',
      };
    }
  );
};
