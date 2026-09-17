
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  invalid_params?: Array<{
    name: string;
    reason: string;
  }>;
}

export interface RouteStop {
  station_uid: string;
  order: number;
}

export interface RoutePayload {
  version: number;
  stops: string[];
  expires_at: number;
  sig?: string;
}
