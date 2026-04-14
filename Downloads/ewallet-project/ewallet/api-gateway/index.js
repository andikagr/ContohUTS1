const express = require("express");
const cors = require("cors");
const axios = require("axios");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3001";
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3002";

app.use(cors());
app.use(express.json());

// =============================================
// Swagger Configuration (Unified Docs)
// =============================================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Wallet API Gateway",
      version: "1.0.0",
      description: `
## E-Wallet SOA (Service-Oriented Architecture)

This **API Gateway** is the single entry point that routes requests to:
- 🧑 **User Service** (port 3001) — manages users & balances
- 💳 **Payment Service** (port 3002) — manages transactions

### Architecture Flow
\`\`\`
Frontend → API Gateway (3000) → User Service (3001)
                              → Payment Service (3002) → User Service (3001)
\`\`\`

The Payment Service internally calls User Service to verify users and update balances.
      `,
      contact: { name: "E-Wallet Team" },
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "API Gateway (Main Entry Point)" },
    ],
  },
  apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  customSiteTitle: "E-Wallet API Docs",
}));

// =============================================
// Helper: proxy request to service
// =============================================
async function proxy(req, res, serviceUrl, path) {
  try {
    const url = `${serviceUrl}${path}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: { "Content-Type": "application/json" },
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { success: false, message: err.message };
    res.status(status).json(data);
  }
}

// =============================================
// Health Check
// =============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Gateway and services health check
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Health status of all services
 */
app.get("/health", async (req, res) => {
  const checks = await Promise.allSettled([
    axios.get(`${USER_SERVICE_URL}/health`),
    axios.get(`${PAYMENT_SERVICE_URL}/health`),
  ]);
  res.json({
    gateway: "ok",
    userService: checks[0].status === "fulfilled" ? "ok" : "down",
    paymentService: checks[1].status === "fulfilled" ? "ok" : "down",
  });
});

// =============================================
// User Routes (proxied to User Service)
// =============================================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
app.get("/api/users", (req, res) => proxy(req, res, USER_SERVICE_URL, "/users"));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 */
app.get("/api/users/:id", (req, res) =>
  proxy(req, res, USER_SERVICE_URL, `/users/${req.params.id}`)
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@email.com
 *               phone:
 *                 type: string
 *                 example: "081234567890"
 *               balance:
 *                 type: number
 *                 example: 100000
 *     responses:
 *       201:
 *         description: User created
 */
app.post("/api/users", (req, res) => proxy(req, res, USER_SERVICE_URL, "/users"));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
app.put("/api/users/:id", (req, res) =>
  proxy(req, res, USER_SERVICE_URL, `/users/${req.params.id}`)
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 */
app.delete("/api/users/:id", (req, res) =>
  proxy(req, res, USER_SERVICE_URL, `/users/${req.params.id}`)
);

// =============================================
// Transaction Routes (proxied to Payment Service)
// =============================================

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions
 */
app.get("/api/transactions", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, "/transactions")
);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction data
 */
app.get("/api/transactions/:id", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, `/transactions/${req.params.id}`)
);

/**
 * @swagger
 * /api/transactions/user/{userId}:
 *   get:
 *     summary: Get transactions by user ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User's transactions
 */
app.get("/api/transactions/user/:userId", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, `/transactions/user/${req.params.userId}`)
);

/**
 * @swagger
 * /api/transactions/transfer:
 *   post:
 *     summary: Transfer balance between users
 *     tags: [Transactions]
 *     description: |
 *       Payment Service will internally call User Service to update balances.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sender_id, receiver_id, amount]
 *             properties:
 *               sender_id:
 *                 type: integer
 *                 example: 1
 *               receiver_id:
 *                 type: integer
 *                 example: 2
 *               amount:
 *                 type: number
 *                 example: 50000
 *               description:
 *                 type: string
 *                 example: "Bayar makan siang"
 *     responses:
 *       201:
 *         description: Transfer successful
 *       400:
 *         description: Insufficient balance
 */
app.post("/api/transactions/transfer", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, "/transactions/transfer")
);

/**
 * @swagger
 * /api/transactions/topup:
 *   post:
 *     summary: Top up user balance
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, amount]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 example: 100000
 *     responses:
 *       201:
 *         description: Top up successful
 */
app.post("/api/transactions/topup", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, "/transactions/topup")
);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete transaction record
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction deleted
 */
app.delete("/api/transactions/:id", (req, res) =>
  proxy(req, res, PAYMENT_SERVICE_URL, `/transactions/${req.params.id}`)
);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
});
