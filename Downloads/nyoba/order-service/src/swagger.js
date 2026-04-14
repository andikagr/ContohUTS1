const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'Microservice untuk mengelola pesanan pada sistem E-Commerce SOA. Service ini berkomunikasi dengan User Service dan Product Service.',
      contact: {
        name: 'Developer'
      }
    },
    servers: [
      {
        url: 'http://localhost:3003',
        description: 'Order Service'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = specs;
