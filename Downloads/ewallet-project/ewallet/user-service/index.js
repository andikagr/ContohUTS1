const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// =============================================
// Database Connection
// =============================================
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root123",
  database: process.env.DB_NAME || "ewallet_db",
};

let db;
async function connectDB() {
  let retries = 10;
  while (retries > 0) {
    try {
      db = await mysql.createConnection(dbConfig);
      console.log("✅ User Service connected to MySQL");
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for DB... retries left: ${retries}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// =============================================
// Swagger Configuration
// =============================================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "User Service API",
      version: "1.0.0",
      description:
        "E-Wallet User Service — manages user accounts and balances.",
      contact: { name: "E-Wallet Team" },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: "User Service" }],
  },
  apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// =============================================
// Routes
// =============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is running
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "user-service" });
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
app.get("/users", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users ORDER BY id");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
app.get("/users/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /users:
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
 *         description: User created successfully
 *       400:
 *         description: Email already exists
 */
app.post("/users", async (req, res) => {
  const { name, email, phone, balance = 0 } = req.body;
  if (!name || !email)
    return res
      .status(400)
      .json({ success: false, message: "name and email are required" });
  try {
    const [result] = await db.execute(
      "INSERT INTO users (name, email, phone, balance) VALUES (?, ?, ?, ?)",
      [name, email, phone, balance]
    );
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user data
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
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
app.put("/users/:id", async (req, res) => {
  const { name, phone } = req.body;
  try {
    const [check] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (check.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    await db.execute("UPDATE users SET name = ?, phone = ? WHERE id = ?", [
      name || check[0].name,
      phone || check[0].phone,
      req.params.id,
    ]);
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
app.delete("/users/:id", async (req, res) => {
  try {
    const [check] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (check.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    await db.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /users/{id}/balance:
 *   patch:
 *     summary: Update user balance (internal use by Payment Service)
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
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Positive to add, negative to deduct
 *                 example: -50000
 *     responses:
 *       200:
 *         description: Balance updated
 *       400:
 *         description: Insufficient balance
 */
app.patch("/users/:id/balance", async (req, res) => {
  const { amount } = req.body;
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const newBalance = parseFloat(rows[0].balance) + parseFloat(amount);
    if (newBalance < 0)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    await db.execute("UPDATE users SET balance = ? WHERE id = ?", [
      newBalance,
      req.params.id,
    ]);
    res.json({ success: true, data: { id: rows[0].id, balance: newBalance } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Budi Santoso
 *         email:
 *           type: string
 *           example: budi@email.com
 *         phone:
 *           type: string
 *           example: "081234567890"
 *         balance:
 *           type: number
 *           example: 500000
 *         created_at:
 *           type: string
 *           format: date-time
 */

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 User Service running on http://localhost:${PORT}`);
    console.log(
      `📚 Swagger Docs: http://localhost:${PORT}/api-docs`
    );
  });
});
