
/* eslint-disable camelcase */

/**
 * İlk migration: PostGIS uzantısını etkinleştirir.
 * (zorunlu) Veritabanı postgis/postgis:16-3.4 imajı üzerinde çalışır; bu migration
 * boş bir postgis imajında dahi CREATE EXTENSION ile uzantıyı garanti altına alır.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('postgis', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropExtension('postgis', { ifExists: true });
};
