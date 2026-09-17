
/**
 * RFC 7807 Problem Details Standardına Uygun Hata Sınıfları
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail: string;

  constructor(status: number, title: string, detail: string, typeSuffix: string) {
    super(detail);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = `https://api.elektriklioto.com/errors/${typeSuffix}`;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      ...(instance ? { instance } : {}),
    };
  }
}

export class NotFoundError extends HttpError {
  constructor(entity: string, identifier: string) {
    super(
      404,
      `${entity} Bulunamadı`,
      `'${identifier}' kimlikli veya slug'lı ${entity.toLowerCase()} sistemde bulunamadı.`,
      'not-found'
    );
  }
}

export class BadRequestError extends HttpError {
  constructor(detail: string) {
    super(400, 'Geçersiz İstek', detail, 'bad-request');
  }
}

export class InternalServerError extends HttpError {
  constructor(detail = 'Beklenmeyen bir sunucu hatası oluştu.') {
    super(500, 'Sunucu Hatası', detail, 'internal-server-error');
  }
}
