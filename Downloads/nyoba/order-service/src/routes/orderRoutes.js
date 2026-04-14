const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');

// URL service lain (bisa dari environment variable)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           description: ID produk dari Product Service
 *           example: "60d5ec49f1b2c72b9c8e4d3a"
 *         productName:
 *           type: string
 *           description: Nama produk (otomatis diisi dari Product Service)
 *           example: Laptop ASUS ROG
 *         price:
 *           type: number
 *           description: Harga produk (otomatis diisi dari Product Service)
 *           example: 15000000
 *         quantity:
 *           type: integer
 *           description: Jumlah item
 *           example: 2
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         userId:
 *           type: string
 *           description: ID user dari User Service
 *           example: "60d5ec49f1b2c72b9c8e4d3a"
 *         userName:
 *           type: string
 *           description: Nama user (otomatis dari User Service)
 *           example: John Doe
 *         userEmail:
 *           type: string
 *           description: Email user (otomatis dari User Service)
 *           example: john@example.com
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         totalPrice:
 *           type: number
 *           description: Total harga order
 *           example: 30000000
 *         status:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *           description: Status pesanan
 *           example: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     OrderInput:
 *       type: object
 *       required:
 *         - userId
 *         - items
 *       properties:
 *         userId:
 *           type: string
 *           description: ID user yang memesan
 *           example: "60d5ec49f1b2c72b9c8e4d3a"
 *         items:
 *           type: array
 *           description: Daftar produk yang dipesan
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: "60d5ec49f1b2c72b9c8e4d3b"
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     StatusInput:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *           example: confirmed
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Mendapatkan semua pesanan
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Daftar semua order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Mendapatkan order berdasarkan ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Data order ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order tidak ditemukan
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Membuat order baru (memanggil User Service & Product Service)
 *     description: |
 *       Endpoint ini mendemonstrasikan **integrasi antar service (SOA)**:
 *       1. Memanggil **User Service** untuk validasi user
 *       2. Memanggil **Product Service** untuk validasi dan mengambil data produk
 *       3. Menghitung total harga
 *       4. Menyimpan order ke database
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Order berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validasi gagal atau user/produk tidak ditemukan
 *       503:
 *         description: Service lain tidak tersedia
 */
router.post('/', async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userId dan items (minimal 1) diperlukan'
      });
    }

    // ====== INTEGRASI 1: Panggil User Service ======
    let userData;
    try {
      const userResponse = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      userData = userResponse.data.data;
      console.log(`✅ User ditemukan: ${userData.name} (${userData.email})`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return res.status(400).json({
          success: false,
          message: `User dengan ID ${userId} tidak ditemukan di User Service`
        });
      }
      return res.status(503).json({
        success: false,
        message: 'User Service tidak tersedia',
        detail: error.message
      });
    }

    // ====== INTEGRASI 2: Panggil Product Service untuk setiap item ======
    let orderItems = [];
    let totalPrice = 0;

    for (const item of items) {
      try {
        const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${item.productId}`);
        const productData = productResponse.data.data;
        console.log(`✅ Produk ditemukan: ${productData.name} - Rp${productData.price}`);

        // Cek stok
        if (productData.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stok produk "${productData.name}" tidak mencukupi. Tersedia: ${productData.stock}, diminta: ${item.quantity}`
          });
        }

        const itemTotal = productData.price * item.quantity;
        orderItems.push({
          productId: item.productId,
          productName: productData.name,
          price: productData.price,
          quantity: item.quantity
        });
        totalPrice += itemTotal;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return res.status(400).json({
            success: false,
            message: `Produk dengan ID ${item.productId} tidak ditemukan di Product Service`
          });
        }
        return res.status(503).json({
          success: false,
          message: 'Product Service tidak tersedia',
          detail: error.message
        });
      }
    }

    // ====== Simpan Order ======
    const order = new Order({
      userId,
      userName: userData.name,
      userEmail: userData.email,
      items: orderItems,
      totalPrice,
      status: 'pending'
    });

    await order.save();
    console.log(`✅ Order berhasil dibuat: ${order._id} - Total: Rp${totalPrice}`);

    res.status(201).json({
      success: true,
      message: 'Order berhasil dibuat',
      data: order
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Mengupdate status order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatusInput'
 *     responses:
 *       200:
 *         description: Status order berhasil diupdate
 *       404:
 *         description: Order tidak ditemukan
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilih salah satu: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Menghapus/membatalkan order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order berhasil dihapus
 *       404:
 *         description: Order tidak ditemukan
 */
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }
    res.json({ success: true, message: 'Order berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
