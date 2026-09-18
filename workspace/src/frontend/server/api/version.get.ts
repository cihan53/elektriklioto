import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return {
    service: 'elektriklioto-web',
    version: '1.0.0-faz2',
    buildId: process.env.NUXT_BUILD_ID || process.env.BUILD_ID || 'build-faz2-s12',
    buildTime: 1789713982000,
    timestamp: Date.now(),
  };
});
