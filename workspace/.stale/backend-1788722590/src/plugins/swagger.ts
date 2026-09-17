
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const swaggerPluginAsync: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'elektriklioto.com REST API',
        description: `
elektriklioto.com e-Mobilite Asistanı ve İstasyon Bilgi Hub'ı API sözleşmesi.

**Yasal Bildirim:**
Platform yasal olarak bir EMP adayı ve bilgi asistanıdır; hiçbir aşamada lisanslı şarj operatörü değildir, doğrudan elektrik satışı ve faturalama yapmaz.
        `.trim(),
        version: '1.0.0-faz1',
        contact: {
          name: 'elektriklioto.com Teknik Ekip',
          url: 'https://elektriklioto.com',
        },
      },
      servers: [
        {
          url: 'https://api.elektriklioto.com',
          description: 'Canlı Üretim Sunucusu',
        },
        {
          url: 'http://localhost:3001',
          description: 'Yerel Geliştirme Sunucusu',
        },
      ],
      tags: [
        { name: 'Stations', description: 'İstasyon arama, detay ve filtreleme uç noktaları' },
        { name: 'Operators', description: 'Şarj ağı işletmecileri (CPO) sözlüğü ve derin bağlantı şablonları' },
        { name: 'Deep-Link', description: 'CPO uygulamalarına doğrudan yönlendirme ve clipboard fallback' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
};

export const swaggerPlugin = fp(swaggerPluginAsync, {
  name: 'swagger-plugin',
});
