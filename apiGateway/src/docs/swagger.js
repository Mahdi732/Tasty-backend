import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const buildOpenApiSpec = () => {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Tasty API Gateway',
        version: '1.0.0',
        description: 'Centralized REST docs for Auth, Restaurant, Order, and Face Recognition endpoints.',
      },
      servers: [
        {
          url: 'https://localhost',
          description: 'Local HTTPS gateway',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ApiSuccessEnvelope: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
            },
          },
          ApiErrorEnvelope: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'ORDER_CREATE_FAILED' },
                  message: { type: 'string', example: 'Validation failed' },
                },
              },
            },
          },
        },
      },
    },
    apis: [path.join(__dirname, './openapi.paths.js')],
  };

  return swaggerJsdoc(options);
};
