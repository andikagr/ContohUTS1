const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

// Middleware
app.use(cors());
app.use(express.json());

// ====== API Gateway Swagger Documentation ======
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce SOA - API Gateway',
      version: '1.0.0',
      description: `
## API Gateway untuk E-Commerce Microservice

Gateway ini meneruskan request ke service yang sesuai:

| Route | Service | Port |
|-------|---------|------|
| \`/api/users/**\` | User Service | 3001 |
| \`/api/products/**\` | Product Service | 3002 |
| \`/api/orders/**\` | Order Service | 3003 |

### Arsitektur SOA
\`\`\`
Frontend → API Gateway (3000) → User Service (3001)
                              → Product Service (3002)
                              → Order Service (3003)
\`\`\`

### Swagger Docs per Service
- User Service: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- Product Service: [http://localhost:3002/api-docs](http://localhost:3002/api-docs)
- Order Service: [http://localhost:3003/api-docs](http://localhost:3003/api-docs)
      `,
      contact: {
        name: 'Developer'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'API Gateway'
      }
    ],
    tags: [
      { name: 'Users', description: 'Operasi User (proxy ke User Service)' },
      { name: 'Products', description: 'Operasi Product (proxy ke Product Service)' },
      { name: 'Orders', description: 'Operasi Order (proxy ke Order Service)' }
    ],
    paths: {
      '/api/users': {
        get: {
          summary: 'Mendapatkan semua user',
          tags: ['Users'],
          responses: { 200: { description: 'Daftar user' } }
        },
        post: {
          summary: 'Membuat user baru',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'john@example.com' },
                    phone: { type: 'string', example: '081234567890' },
                    address: { type: 'string', example: 'Jl. Merdeka No. 1' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'User berhasil dibuat' } }
        }
      },
      '/api/users/{id}': {
        get: {
          summary: 'Mendapatkan user by ID',
          tags: ['Users'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Data user' } }
        },
        put: {
          summary: 'Update user',
          tags: ['Users'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'John Updated' },
                    email: { type: 'string', example: 'john@example.com' },
                    phone: { type: 'string', example: '081234567890' },
                    address: { type: 'string', example: 'Jl. Baru No. 2' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'User berhasil diupdate' } }
        },
        delete: {
          summary: 'Hapus user',
          tags: ['Users'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User berhasil dihapus' } }
        }
      },
      '/api/products': {
        get: {
          summary: 'Mendapatkan semua produk',
          tags: ['Products'],
          responses: { 200: { description: 'Daftar produk' } }
        },
        post: {
          summary: 'Menambahkan produk baru',
          tags: ['Products'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Laptop ASUS' },
                    description: { type: 'string', example: 'Laptop gaming' },
                    price: { type: 'number', example: 15000000 },
                    stock: { type: 'integer', example: 50 },
                    category: { type: 'string', example: 'Elektronik' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Produk berhasil ditambahkan' } }
        }
      },
      '/api/products/{id}': {
        get: {
          summary: 'Mendapatkan produk by ID',
          tags: ['Products'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Data produk' } }
        },
        put: {
          summary: 'Update produk',
          tags: ['Products'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Laptop Updated' },
                    description: { type: 'string', example: 'Updated description' },
                    price: { type: 'number', example: 16000000 },
                    stock: { type: 'integer', example: 45 },
                    category: { type: 'string', example: 'Elektronik' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Produk berhasil diupdate' } }
        },
        delete: {
          summary: 'Hapus produk',
          tags: ['Products'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Produk berhasil dihapus' } }
        }
      },
      '/api/orders': {
        get: {
          summary: 'Mendapatkan semua order',
          tags: ['Orders'],
          responses: { 200: { description: 'Daftar order' } }
        },
        post: {
          summary: 'Membuat order baru (integrasi User & Product Service)',
          tags: ['Orders'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', example: '60d5ec49f1b2c72b9c8e4d3a' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          productId: { type: 'string', example: '60d5ec49f1b2c72b9c8e4d3b' },
                          quantity: { type: 'integer', example: 2 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Order berhasil dibuat' } }
        }
      },
      '/api/orders/{id}': {
        get: {
          summary: 'Mendapatkan order by ID',
          tags: ['Orders'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Data order' } }
        },
        delete: {
          summary: 'Hapus order',
          tags: ['Orders'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Order berhasil dihapus' } }
        }
      },
      '/api/orders/{id}/status': {
        put: {
          summary: 'Update status order',
          tags: ['Orders'],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
                      example: 'confirmed'
                    }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Status berhasil diupdate' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'E-Commerce SOA - API Gateway Docs'
}));

// ====== Proxy Routes ======

// User Service Proxy
app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/api/users' },
  onError: (err, req, res) => {
    res.status(503).json({ success: false, message: 'User Service tidak tersedia', error: err.message });
  }
}));

// Product Service Proxy
app.use('/api/products', createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/api/products' },
  onError: (err, req, res) => {
    res.status(503).json({ success: false, message: 'Product Service tidak tersedia', error: err.message });
  }
}));

// Order Service Proxy
app.use('/api/orders', createProxyMiddleware({
  target: ORDER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/api/orders' },
  onError: (err, req, res) => {
    res.status(503).json({ success: false, message: 'Order Service tidak tersedia', error: err.message });
  }
}));

// Gateway Info
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    docs: '/api-docs',
    routes: {
      users: '/api/users → User Service',
      products: '/api/products → Product Service',
      orders: '/api/orders → Order Service'
    },
    services: {
      userService: USER_SERVICE_URL,
      productService: PRODUCT_SERVICE_URL,
      orderService: ORDER_SERVICE_URL
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'api-gateway' });
});

app.listen(PORT, () => {
  console.log(`🌐 API Gateway running on port ${PORT}`);
  console.log(`📖 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`📡 Routing:`);
  console.log(`   /api/users    → ${USER_SERVICE_URL}`);
  console.log(`   /api/products → ${PRODUCT_SERVICE_URL}`);
  console.log(`   /api/orders   → ${ORDER_SERVICE_URL}`);
});

module.exports = app;
