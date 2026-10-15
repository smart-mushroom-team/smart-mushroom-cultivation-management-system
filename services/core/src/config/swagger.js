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
