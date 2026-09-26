
import { defineEventHandler, setHeader } from 'h3';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import defaultChangelog from '../../data/changelog.json';

interface RawTalep {
  id: string;
  tarih?: string;
  tur?: string;
  oncelik?: string;
  baslik: string;
  aciklama: string;
  sayfa_url?: string;
  durum: string;
  gorevli_rol?: string;
  studio_notu?: string;
  github_issue_number?: number;
  github_issue_url?: string;
}

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');

  // Candidate paths for musteri_talepleri.json
  const candidatePaths = [
    resolve(process.cwd(), '../../docs/musteri_talepleri.json'),
    resolve(process.cwd(), '../docs/musteri_talepleri.json'),
    resolve(process.cwd(), 'workspace/docs/musteri_talepleri.json'),
    resolve(process.cwd(), 'docs/musteri_talepleri.json'),
    resolve(process.cwd(), '../../workspace/docs/musteri_talepleri.json')
  ];

  let diskTalepler: RawTalep[] = [];
  for (const p of candidatePaths) {
    try {
      if (existsSync(p)) {
        const raw = readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.talepler)) {
          diskTalepler = parsed.talepler;
          break;
        }
      }
    } catch {
      // try next
    }
  }

  // Clone base releases
  const releases = JSON.parse(JSON.stringify(defaultChangelog.releases));

  if (diskTalepler.length > 0) {
    // Map of existing items
    const existingItemIds = new Set<string>();
    for (const rel of releases) {
      for (const item of rel.items) {
        existingItemIds.add(item.id.toUpperCase());
      }
    }

    // Filter solved requests not yet in static release history
    const newlySolved = diskTalepler.filter((t) => {
      const isSolved = t.durum === 'COZULDU';
      const notInHistory = !existingItemIds.has(t.id.toUpperCase());
      return isSolved && notInHistory;
    });

    if (newlySolved.length > 0 && releases.length > 0) {
      for (const t of newlySolved) {
        const categoryMap: Record<string, { cat: 'feature' | 'bug' | 'ux' | 'data' | 'infra'; label: string }> = {
          HATA: { cat: 'bug', label: 'Hata Düzeltme' },
          ISTEK: { cat: 'feature', label: 'Yeni Özellik' },
          UX: { cat: 'ux', label: 'UX İyileştirme' },
          VERI: { cat: 'data', label: 'Veri & Altyapı' },
          PERFORMANS: { cat: 'infra', label: 'Performans & Hız' }
        };
        const mapped = categoryMap[t.tur || 'HATA'] || { cat: 'bug', label: 'Hata Düzeltme' };

        releases[0].items.unshift({
          id: t.id,
          title: t.baslik,
          category: mapped.cat,
          categoryLabel: mapped.label,
          scope: t.sayfa_url || 'Genel Sistem',
          description: t.aciklama,
          status: 'COZULDU',
          githubIssueNumber: t.github_issue_number,
          date: t.tarih ? t.tarih.split(' ')[0] : '2026-09-26'
        });
      }
    }
  }

  // Count total resolved across all releases
  let totalResolved = 0;
  for (const rel of releases) {
    totalResolved += rel.items.filter((i: any) => i.status === 'COZULDU').length;
  }

  const latestRelease = releases[0] || {
    version: 'v1.4.0',
    date: '26 Eylül 2026',
    buildId: 'build 125'
  };

  return {
    success: true,
    version: latestRelease.version,
    buildId: latestRelease.buildId || 'build 125',
    latestReleaseDate: latestRelease.date,
    totalResolved,
    releasesCount: releases.length,
    releases,
    syncedAt: new Date().toISOString()
  };
});
