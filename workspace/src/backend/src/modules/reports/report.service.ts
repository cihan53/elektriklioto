
import { randomUUID } from 'node:crypto';
import { proximityProofService } from './proximity-proof.service.js';
import { stationRepository } from '../stations/station.service.js';
import { config } from '../../config/env.js';
import { BadRequestError, NotFoundError, ConflictError, UnauthorizedError } from '../../utils/errors.js';

export interface ReportRecord {
  id: string;
  station_id: string;
  issue_type: string;
  description: string | null;
  proximity_verified: boolean;
  is_suppressed: boolean;
  device_uid: string;
  created_at: Date;
}

export class ReportService {
  private reports: ReportRecord[] = [];
  private shadowBannedDevices = new Set<string>();

  public shadowBanDevice(deviceUid: string): void {
    this.shadowBannedDevices.add(deviceUid);
  }

  public unbanDevice(deviceUid: string): void {
    this.shadowBannedDevices.delete(deviceUid);
  }

  public isDeviceShadowBanned(deviceUid: string): boolean {
    return this.shadowBannedDevices.has(deviceUid);
  }

  public clear(): void {
    this.reports = [];
    this.shadowBannedDevices.clear();
    proximityProofService.clearNonces();
  }

  /**
   * Sıfır Konum Saklama (Zero-Storage) ilkesiyle arıza bildirimi oluşturur.
   * Kullanıcı GPS koordinatları kesinlikle sunucuya kaydedilmez.
   */
  public async createReport(params: {
    stationIdentifier: string;
    deviceUid?: string;
    issueType: string;
    nonce: string;
    proximityProof: string;
    description?: string;
  }) {
    const { stationIdentifier, deviceUid, issueType, nonce, proximityProof, description } = params;

    // 1. Cihaz Tasdiki Kontrolü (KURAL-AUTH-02)
    if (!deviceUid || deviceUid.trim().length < 8) {
      throw new UnauthorizedError(
        'Arıza bildirimi yapabilmek için geçerli bir X-Device-Attestation başlığı gereklidir.',
        'MISSING_DEVICE_ATTESTATION',
        'Cihaz Tasdiki Gerekli'
      );
    }

    // 2. İstasyon Varlığı Kontrolü
    const station = await stationRepository.findByIdOrSlug(stationIdentifier);
    if (!station) {
      throw new NotFoundError(`İstasyon bulunamadı: ${stationIdentifier}`);
    }

    // 3. Kriptografik Proximity Proof Doğrulaması
    const verifyResult = proximityProofService.verify({
      stationId: station.id,
      deviceUid,
      nonce,
      proof: proximityProof,
    });

    if (verifyResult.reason === 'NONCE_REPLAY') {
      throw new ConflictError(
        'Bu istek belirteci (nonce) daha önce kullanılmış. Yeniden oynatma (replay) engellendi.',
        'NONCE_REPLAY',
        'Belirteç Zaten Kullanılmış'
      );
    }

    if (!verifyResult.valid) {
      throw new BadRequestError(
        'Geçersiz konum kanıtı (HMAC eşleşmedi veya zaman penceresi dışında).',
        'INVALID_PROXIMITY_PROOF',
        'Geçersiz Konum Kanıtı'
      );
    }

    // 4. Shadow-Ban ve İtibar Kontrolü
    const isSuppressed = this.isDeviceShadowBanned(deviceUid);

    // 5. Sıfır Konum Saklama: Yalnızca doğrulanmış rapor kaydedilir (KOORDİNAT YOK!)
    const report: ReportRecord = {
      id: randomUUID(),
      station_id: station.id,
      issue_type: issueType,
      description: description || null,
      proximity_verified: true,
      is_suppressed: isSuppressed,
      device_uid: deviceUid,
      created_at: new Date(),
    };

    this.reports.push(report);

    // 6. Arıza Eşik Değeri ve Dinamik Etiketleme (US-14 / T-01)
    const activeCount = this.getActiveReportCount(station.id);
    const shouldFlagDefective = activeCount >= config.reportDefectThreshold;

    if (shouldFlagDefective && !station.is_flagged_defective) {
      await stationRepository.markDefective(station.id, true);
    }

    return {
      id: report.id,
      station_id: report.station_id,
      issue_type: report.issue_type,
      proximity_verified: report.proximity_verified,
      is_flagged_defective: station.is_flagged_defective || shouldFlagDefective,
      created_at: report.created_at.toISOString(),
    };
  }

  public getActiveReportCount(stationId: string): number {
    const windowStart = new Date(Date.now() - config.reportWindowMinutes * 60 * 1000);
    const activeReports = this.reports.filter(
      (r) =>
        r.station_id === stationId &&
        !r.is_suppressed &&
        r.proximity_verified &&
        r.created_at >= windowStart
    );

    const uniqueDevices = new Set(activeReports.map((r) => r.device_uid));
    return uniqueDevices.size;
  }

  public async getSummary(stationIdentifier: string) {
    const station = await stationRepository.findByIdOrSlug(stationIdentifier);
    if (!station) {
      throw new NotFoundError(`İstasyon bulunamadı: ${stationIdentifier}`);
    }

    const activeCount = this.getActiveReportCount(station.id);

    return {
      station_id: station.id,
      is_flagged_defective: station.is_flagged_defective,
      active_report_count: activeCount,
      defect_threshold: config.reportDefectThreshold,
    };
  }

  public getAllReportsForAudit(): ReadonlyArray<ReportRecord> {
    return this.reports;
  }
}

export const reportService = new ReportService();
