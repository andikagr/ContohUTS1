const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const axios = require("axios");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3001";

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
      console.log("✅ Payment Service connected to MySQL");
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
      title: "Payment Service API",
      version: "1.0.0",
      description:
        "E-Wallet Payment Service — manages transactions and calls User Service for balance updates.",
      contact: { name: "E-Wallet Team" },
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "Payment Service" },
    ],
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
  res.json({ status: "ok", service: "payment-service" });
});

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of all transactions
 */
app.get("/transactions", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM transactions ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /transactions/{id}:
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
 *         description: Transaction found
 *       404:
 *         description: Transaction not found
 */
app.get("/transactions/:id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM transactions WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /transactions/user/{userId}:
 *   get:
 *     summary: Get all transactions by user ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transactions for the user
 */
app.get("/transactions/user/:userId", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM transactions WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at DESC",
      [req.params.userId, req.params.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /transactions/transfer:
 *   post:
 *     summary: Transfer balance between users
 *     tags: [Transactions]
 *     description: |
 *       This endpoint calls **User Service** internally to:
 *       1. Verify sender and receiver exist
 *       2. Deduct balance from sender
 *       3. Add balance to receiver
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
 *         description: Insufficient balance or invalid data
 *       404:
 *         description: User not found
 */
app.post("/transactions/transfer", async (req, res) => {
  const { sender_id, receiver_id, amount, description } = req.body;
  if (!sender_id || !receiver_id || !amount) {
    return res.status(400).json({
      success: false,
      message: "sender_id, receiver_id, and amount are required",
    });
  }
  if (sender_id === receiver_id) {
    return res
      .status(400)
      .json({ success: false, message: "Cannot transfer to yourself" });
  }

  // Insert transaction as pending
  const [result] = await db.execute(
    "INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description) VALUES (?, ?, ?, 'transfer', 'pending', ?)",
    [sender_id, receiver_id, amount, description || ""]
  );
  const transactionId = result.insertId;

  try {
    // Call User Service to verify sender and deduct balance
    const senderRes = await axios.get(`${USER_SERVICE_URL}/users/${sender_id}`);
    if (!senderRes.data.success) throw new Error("Sender not found");

    const receiverRes = await axios.get(
      `${USER_SERVICE_URL}/users/${receiver_id}`
    );
    if (!receiverRes.data.success) throw new Error("Receiver not found");

    // Deduct from sender (call User Service)
    await axios.patch(`${USER_SERVICE_URL}/users/${sender_id}/balance`, {
      amount: -amount,
    });

    // Add to receiver (call User Service)
    await axios.patch(`${USER_SERVICE_URL}/users/${receiver_id}/balance`, {
      amount: amount,
    });

    // Update transaction status to success
    await db.execute(
      "UPDATE transactions SET status = 'success' WHERE id = ?",
      [transactionId]
    );

    const [rows] = await db.execute(
      "SELECT * FROM transactions WHERE id = ?",
      [transactionId]
    );
    res.status(201).json({
      success: true,
      message: "Transfer successful",
      data: rows[0],
    });
  } catch (err) {
    // Mark transaction as failed
    await db.execute("UPDATE transactions SET status = 'failed' WHERE id = ?", [
      transactionId,
    ]);
    const errMsg =
      err.response?.data?.message || err.message || "Transfer failed";
    res.status(400).json({ success: false, message: errMsg });
  }
});

/**
 * @swagger
 * /transactions/topup:
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
 *       404:
 *         description: User not found
 */
app.post("/transactions/topup", async (req, res) => {
  const { user_id, amount } = req.body;
  if (!user_id || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "user_id and amount are required" });
  }

  const [result] = await db.execute(
    "INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description) VALUES (?, ?, ?, 'topup', 'pending', 'Top Up')",
    [user_id, user_id, amount]
  );
  const transactionId = result.insertId;

  try {
    // Verify user exists via User Service
    const userRes = await axios.get(`${USER_SERVICE_URL}/users/${user_id}`);
    if (!userRes.data.success) throw new Error("User not found");

    // Add balance via User Service
    await axios.patch(`${USER_SERVICE_URL}/users/${user_id}/balance`, {
      amount: amount,
    });

    await db.execute(
      "UPDATE transactions SET status = 'success' WHERE id = ?",
      [transactionId]
    );

    const [rows] = await db.execute(
      "SELECT * FROM transactions WHERE id = ?",
      [transactionId]
    );
    res.status(201).json({
      success: true,
      message: "Top up successful",
      data: rows[0],
    });
  } catch (err) {
    await db.execute("UPDATE transactions SET status = 'failed' WHERE id = ?", [
      transactionId,
    ]);
    res
      .status(400)
      .json({ success: false, message: err.response?.data?.message || err.message });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Delete a transaction record
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
 *       404:
 *         description: Transaction not found
 */
app.delete("/transactions/:id", async (req, res) => {
  try {
    const [check] = await db.execute(
      "SELECT * FROM transactions WHERE id = ?",
      [req.params.id]
    );
    if (check.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    await db.execute("DELETE FROM transactions WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         sender_id:
 *           type: integer
 *         receiver_id:
 *           type: integer
 *         amount:
 *           type: number
 *         type:
 *           type: string
 *           enum: [transfer, topup, withdraw]
 *         status:
 *           type: string
 *           enum: [pending, success, failed]
 *         description:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Payment Service running on http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
  });
});
