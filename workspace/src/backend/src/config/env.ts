
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elektriklioto',
  proximitySecret: process.env.PROXIMITY_SECRET || 'elektriklioto-proximity-secret-key-32b!',
  routeBridgeSecret: process.env.ROUTE_BRIDGE_SECRET || 'elektriklioto-route-bridge-secret-32b!',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  reportRateLimitMax: Number(process.env.REPORT_RATE_LIMIT_MAX || 5),
  reportDefectThreshold: Number(process.env.REPORT_DEFECT_THRESHOLD || 3),
  reportWindowMinutes: Number(process.env.REPORT_WINDOW_MINUTES || 120),
  // S5 Worker & Circuit Breaker Yapılandırmaları
  workerPollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 1000),
  circuitBreakerFailureThreshold: Number(process.env.CB_FAILURE_THRESHOLD || 5),
  circuitBreakerCooldownMs: Number(process.env.CB_COOLDOWN_MS || 15 * 60 * 1000), // 15 dakika
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS || 5000), // 5000ms
  cpoSyncIntervalMinutes: Number(process.env.CPO_SYNC_INTERVAL_MINUTES || 15),
};
