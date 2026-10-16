'use strict';

const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Smart Mushroom Core API',
      version: '1.0.0',
      description: 'API quản lý hoạt động trồng nấm',
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Core service local development',
      },
    ],
    components: {
      schemas: {
        IdParam: {
          type: 'string',
          format: 'uuid',
        },
        CreateRoomRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Phòng A',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              default: 'ACTIVE',
              example: 'ACTIVE',
            },
          },
          example: {
            name: 'Phòng A',
            status: 'ACTIVE',
          },
        },
        UpdateRoomRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Phòng A - Updated',
            },
          },
          example: {
            name: 'Phòng A - Updated',
          },
        },
        UpdateRoomStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              example: 'INACTIVE',
            },
          },
          example: {
            status: 'INACTIVE',
          },
        },
        CreateTrayRequest: {
          type: 'object',
          required: ['trayCode', 'roomId', 'locationRow', 'locationShelf', 'locationSlot'],
          properties: {
            trayCode: { type: 'string', minLength: 1, maxLength: 100, example: 'T-001' },
            roomId: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-4111-8111-111111111111',
            },
            locationRow: { type: 'integer', minimum: 1, example: 1 },
            locationShelf: { type: 'integer', minimum: 1, example: 1 },
            locationSlot: { type: 'integer', minimum: 1, example: 1 },
          },
          example: {
            trayCode: 'T-001',
            roomId: '11111111-1111-4111-8111-111111111111',
            locationRow: 1,
            locationShelf: 1,
            locationSlot: 1,
          },
        },
        UpdateTrayRequest: {
          allOf: [{ $ref: '#/components/schemas/CreateTrayRequest' }],
          example: {
            trayCode: 'T-001-UPDATED',
            roomId: '11111111-1111-4111-8111-111111111111',
            locationRow: 1,
            locationShelf: 2,
            locationSlot: 3,
          },
        },
        UpdateTrayStatusRequest: {
          type: 'object',
          required: ['occupancyStatus'],
          properties: {
            occupancyStatus: {
              type: 'string',
              enum: ['AVAILABLE', 'RESERVED', 'RENTED', 'CLEANING'],
              example: 'CLEANING',
            },
          },
        },
      },
    },
  },

  // swagger-jsdoc resolves relative paths from process.cwd(), which varies
  // between local and container startup. Resolve from this config file instead.
  apis: [
    path.join(__dirname, '../routes/**/*.js').replace(/\\/g, '/'),
    path.join(__dirname, '../app.js').replace(/\\/g, '/'),
  ],
  failOnErrors: true,
};

module.exports = swaggerJsdoc(options);
