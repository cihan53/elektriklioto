export interface CpoSourceDefinition {
  id: string;
  name: string;
  description: string;
  mode: 'LIVE_API' | 'LOCAL_CACHE' | 'REMOTE_FALLBACK';
  status: 'ACTIVE' | 'DEGRADED' | 'STANDBY';
  rawRecordCount?: number;
  lastCheckedAt?: string;
}

export interface DataPipelineStatus {
  service: 'elektriklioto-etl';
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  normalizedStationCount: number;
  sources: CpoSourceDefinition[];
  lastSyncAt: string;
  zeroRecordGuardActive: boolean;
}
