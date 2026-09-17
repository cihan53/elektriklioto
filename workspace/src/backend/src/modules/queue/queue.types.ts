
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobRecord {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}
