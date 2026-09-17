
import { db } from '../../db/index.js';
import { operators, stations } from '../../db/schema/index.js';
import { eq, ilike, and, sql, count } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors.js';
import { turkishSlugify } from '../../utils/unicode.js';
import { OperatorSummary, OperatorDetail } from './operator.schema.js';
import { DeepLinkConfig } from '../../db/schema/operators.js';

// Bilinen popüler operatörler için hazır deep-link ve logo verileri (Seed öncesi ve fallback)
export const SEED_OPERATOR_CONFIGS: Record<string, {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  deepLinkConfig: DeepLinkConfig;
}> = {
  zes: {
    name: 'Zorlu Energy Solutions (ZES)',
    logoUrl: 'https://cdn.elektriklioto.com/operators/zes.svg',
    websiteUrl: 'https://zes.net',
    deepLinkConfig: {
      iosSchemeTemplate: 'zes://station/{station_code}',
      androidSchemeTemplate: 'zes://station/{station_code}',
      universalLinkTemplate: 'https://app.zes.net/station/{station_code}',
      storeUrls: {
        ios: 'https://apps.apple.com/tr/app/zes-zorlu-energy-solutions/id1434913214',
        android: 'https://play.google.com/store/apps/details?id=com.zes.client',
      },
      clipboardFallback: false,
    },
  },
  trugo: {
    name: 'Trugo Akıllı Şarj Çözümleri',
    logoUrl: 'https://cdn.elektriklioto.com/operators/trugo.svg',
    websiteUrl: 'https://trugo.com.tr',
    deepLinkConfig: {
      iosSchemeTemplate: 'trugo://charge?station={station_code}',
      androidSchemeTemplate: 'trugo://charge?station={station_code}',
      universalLinkTemplate: 'https://app.trugo.com.tr/station/{station_code}',
      storeUrls: {
        ios: 'https://apps.apple.com/tr/app/trugo/id1641042738',
        android: 'https://play.google.com/store/apps/details?id=com.trugo.app',
      },
      clipboardFallback: false,
    },
  },
  esarj: {
    name: 'Eşarj Elektrikli Araçlar Şarj Sistemleri',
    logoUrl: 'https://cdn.elektriklioto.com/operators/esarj.svg',
    websiteUrl: 'https://esarj.com',
    deepLinkConfig: {
      iosSchemeTemplate: 'esarj://station/{station_code}',
      androidSchemeTemplate: 'esarj://station/{station_code}',
      universalLinkTemplate: 'https://esarj.com/istasyonlar/{station_code}',
      storeUrls: {
        ios: 'https://apps.apple.com/tr/app/e%C5%9Farj/id1256429532',
        android: 'https://play.google.com/store/apps/details?id=com.esarj.mobile',
      },
      clipboardFallback: false,
    },
  },
  voltrun: {
    name: 'Voltrun Şarj Ağı',
    logoUrl: 'https://cdn.elektriklioto.com/operators/voltrun.svg',
    websiteUrl: 'https://voltrun.com',
    deepLinkConfig: {
      iosSchemeTemplate: 'voltrun://station/{station_code}',
      androidSchemeTemplate: 'voltrun://station/{station_code}',
      universalLinkTemplate: null,
      storeUrls: {
        ios: 'https://apps.apple.com/tr/app/voltrun/id1166667954',
        android: 'https://play.google.com/store/apps/details?id=com.voltrun.mobile',
      },
      clipboardFallback: false,
    },
  },
  sharz: {
    name: 'Sharz.net',
    logoUrl: 'https://cdn.elektriklioto.com/operators/sharz.svg',
    websiteUrl: 'https://sharz.net',
    deepLinkConfig: {
      iosSchemeTemplate: 'sharz://station/{station_code}',
      androidSchemeTemplate: 'sharz://station/{station_code}',
      universalLinkTemplate: null,
      storeUrls: {
        ios: 'https://apps.apple.com/tr/app/sharz-net/id1463935293',
        android: 'https://play.google.com/store/apps/details?id=com.sharz.sharzmobile',
      },
      clipboardFallback: false,
    },
  },
};

export class OperatorService {
  /**
   * Tüm operatörleri listeler (Arama ve aktiflik filtresiyle)
   */
  public static async listOperators(options: { activeOnly?: boolean; search?: string }): Promise<OperatorSummary[]> {
    try {
      const conditions = [];

      if (options.activeOnly !== false) {
        conditions.push(eq(operators.isActive, true));
      }

      if (options.search && options.search.trim() !== '') {
        const term = `%${options.search.trim()}%`;
        conditions.push(ilike(operators.name, term));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: operators.id,
          slug: operators.slug,
          name: operators.name,
          logoUrl: operators.logoUrl,
          websiteUrl: operators.websiteUrl,
          isActive: operators.isActive,
          deepLinkConfig: operators.deepLinkConfig,
          stationCount: count(stations.id),
        })
        .from(operators)
        .leftJoin(stations, eq(stations.operatorId, operators.id))
        .where(whereClause)
        .groupBy(operators.id)
        .orderBy(operators.name);

      return rows.map((row) => {
        const config = row.deepLinkConfig as DeepLinkConfig | null;
        const supportsDeepLink = Boolean(
          config && (config.iosSchemeTemplate || config.androidSchemeTemplate || config.universalLinkTemplate)
        );

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          logo_url: row.logoUrl,
          website_url: row.websiteUrl,
          is_active: row.isActive,
          supports_deep_link: supportsDeepLink,
          station_count: Number(row.stationCount || 0),
        };
      });
    } catch (error) {
      // Veritabanı bağlantı hatasında güvenli fallback olarak tohum operatörlerini dön
      return Object.entries(SEED_OPERATOR_CONFIGS).map(([slug, cfg], idx) => ({
        id: idx + 1,
        slug,
        name: cfg.name,
        logo_url: cfg.logoUrl,
        website_url: cfg.websiteUrl,
        is_active: true,
        supports_deep_link: !cfg.deepLinkConfig.clipboardFallback,
        station_count: 0,
      }));
    }
  }

  /**
   * Slug ile tek bir operatörün detaylarını getirir
   */
  public static async getOperatorBySlug(slug: string): Promise<OperatorDetail> {
    const cleanSlug = turkishSlugify(slug);

    try {
      const [row] = await db
        .select({
          operator: operators,
          stationCount: count(stations.id),
        })
        .from(operators)
        .leftJoin(stations, eq(stations.operatorId, operators.id))
        .where(eq(operators.slug, cleanSlug))
        .groupBy(operators.id)
        .limit(1);

      if (!row) {
        // Tohum sözlüğünde var mı kontrol et
        const fallback = SEED_OPERATOR_CONFIGS[cleanSlug];
        if (fallback) {
          return {
            id: 1,
            slug: cleanSlug,
            name: fallback.name,
            logo_url: fallback.logoUrl,
            website_url: fallback.websiteUrl,
            is_active: true,
            deep_link_config: fallback.deepLinkConfig,
            station_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        throw new NotFoundError('Operatör', slug);
      }

      const op = row.operator;
      const config = (op.deepLinkConfig as DeepLinkConfig) || { clipboardFallback: true };

      return {
        id: op.id,
        slug: op.slug,
        name: op.name,
        logo_url: op.logoUrl,
        website_url: op.websiteUrl,
        is_active: op.isActive,
        deep_link_config: config,
        station_count: Number(row.stationCount || 0),
        created_at: op.createdAt.toISOString(),
        updated_at: op.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      const fallback = SEED_OPERATOR_CONFIGS[cleanSlug];
      if (fallback) {
        return {
          id: 1,
          slug: cleanSlug,
          name: fallback.name,
          logo_url: fallback.logoUrl,
          website_url: fallback.websiteUrl,
          is_active: true,
          deep_link_config: fallback.deepLinkConfig,
          station_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      throw new NotFoundError('Operatör', slug);
    }
  }
}
