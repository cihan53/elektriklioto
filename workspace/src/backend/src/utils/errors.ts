
import { ProblemDetails } from '../types/route-bridge.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly title: string;
  public readonly code: string;

  constructor(statusCode: number, title: string, detail: string, code = 'INTERNAL_ERROR', type = 'https://api.elektriklioto.com/errors/general') {
    super(detail);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.title = title;
    this.code = code;
    this.type = type;
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.statusCode,
      detail: this.message,
      instance,
      code: this.code,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(detail: string, code = 'NOT_FOUND') {
    super(404, 'Station Not Found', detail, code, 'https://api.elektriklioto.com/errors/not-found');
  }
}

export class BadRequestError extends AppError {
  constructor(detail: string, code = 'BAD_REQUEST', title = 'Geçersiz İstek') {
    super(400, title, detail, code, 'https://api.elektriklioto.com/errors/bad-request');
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail: string, code = 'UNAUTHORIZED', title = 'Yetkisiz Erişim') {
    super(401, title, detail, code, 'https://api.elektriklioto.com/errors/unauthorized');
  }
}

export class ConflictError extends AppError {
  constructor(detail: string, code = 'CONFLICT', title = 'Çakışma') {
    super(409, title, detail, code, 'https://api.elektriklioto.com/errors/conflict');
  }
}
