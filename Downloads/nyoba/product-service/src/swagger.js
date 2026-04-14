const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description: 'Microservice untuk mengelola data produk pada sistem E-Commerce SOA',
      contact: {
        name: 'Developer'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Product Service'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = specs;
