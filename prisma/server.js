/**
 * TUGAS PERTEMUAN 13: BACKEND NODE.JS
 * Fitur: CRUD, Validation (Zod), Security (Helmet/Cors/RateLimit), Logging (Pino), Graceful Shutdown.
 * Database: MySQL via Prisma ORM
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { z } = require('zod');

// --- 1. CONFIGURATION & INSTANCES ---
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Logger Configuration (Pino)
const logger = pino({
  transport: {
    target: 'pino-pretty', // Agar log berwarna dan rapi di terminal
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// --- 2. MIDDLEWARE (SECURITY & UTILS) ---

// a. Helmet: Mengamankan HTTP Headers (XSS Filter, No-Sniff, dll)
app.use(helmet());

// b. CORS: Mengizinkan akses dari frontend (diset '*' untuk kemudahan development lokal)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// c. Rate Limiting: Mencegah Brute Force / DDoS ringan
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Limit setiap IP ke 100 requests per windowMs
  message: { status: 'error', message: 'Terlalu banyak request, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter); // Terapkan limit hanya ke route API

// d. Body Parser & Logger Middleware
app.use(express.json()); // Parsing JSON body
app.use(pinoHttp({ logger })); // Auto-log setiap request HTTP

// --- 3. VALIDATION SCHEMAS (ZOD) ---
// Validasi ketat untuk input data agar tidak ada injeksi data sampah

const productSchema = z.object({
  name: z.string().min(3, "Nama produk minimal 3 karakter").max(100),
  category: z.string().min(2, "Kategori wajib diisi"),
  price: z.number().positive("Harga harus angka positif"),
  stock: z.number().int().nonnegative("Stok tidak boleh negatif"),
  description: z.string().optional(),
});

// --- 4. API ROUTES (CRUD) ---

const router = express.Router();

// GET: Ambil Semua Produk (Read)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: products });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// GET: Stats (Fitur Tambahan untuk Dashboard)
router.get('/stats', async (req, res) => {
    try {
        const totalProducts = await prisma.product.count();
        const lowStock = await prisma.product.count({ where: { stock: { lt: 10 } } });
        // Hitung total nilai aset (price * stock)
        // Prisma aggregate bisa digunakan, tapi untuk simpel kita fetch semua lalu reduce di JS (utk skala kecil)
        const all = await prisma.product.findMany({ select: { price: true, stock: true }});
        const totalValue = all.reduce((acc, curr) => acc + (Number(curr.price) * curr.stock), 0);

        res.json({ 
            status: 'success', 
            data: { 
                totalProducts, 
                lowStock, 
                totalValue 
            } 
        });
    } catch (error) {
        req.log.error(error);
        res.status(500).json({ status: 'error', message: 'Gagal memuat statistik' });
    }
});

// POST: Tambah Produk Baru (Create)
router.post('/products', async (req, res) => {
  try {
    // 1. Validasi Input (Zod)
    const validatedData = productSchema.parse(req.body);

    // 2. Sanitasi manual sederhana (contoh: trim whitespace ekstra)
    validatedData.name = validatedData.name.trim();

    // 3. Simpan ke Database
    const newProduct = await prisma.product.create({
      data: validatedData,
    });

    logger.info(`Product created: ${newProduct.name}`);
    res.status(201).json({ status: 'success', data: newProduct });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'fail', errors: error.errors });
    }
    req.log.error(error);
    res.status(500).json({ status: 'error', message: 'Gagal membuat produk' });
  }
});

// PUT: Update Produk (Update)
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const validatedData = productSchema.partial().parse(req.body); // partial() agar tidak wajib isi semua field

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: validatedData,
    });

    res.json({ status: 'success', data: updatedProduct });
  } catch (error) {
    if (error.code === 'P2025') { // Error Prisma record not found
        return res.status(404).json({ status: 'fail', message: 'Produk tidak ditemukan' });
    }
    if (error instanceof z.ZodError) {
        return res.status(400).json({ status: 'fail', errors: error.errors });
    }
    req.log.error(error);
    res.status(500).json({ status: 'error', message: 'Gagal update produk' });
  }
});

// DELETE: Hapus Produk (Delete)
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    res.json({ status: 'success', message: 'Produk berhasil dihapus' });
  } catch (error) {
    if (error.code === 'P2025') {
        return res.status(404).json({ status: 'fail', message: 'Produk tidak ditemukan' });
    }
    req.log.error(error);
    res.status(500).json({ status: 'error', message: 'Gagal menghapus produk' });
  }
});

app.use('/api', router);

// Default Route
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>🚀 Backend API Running</h1>
        <p>Status: Active | Security: Helmet Enabled | Logger: Pino</p>
        <p>Access Dashboard UI: <a href="/dashboard.html">Click Here</a> (Make sure dashboard.html is in 'public' folder)</p>
    </div>
  `);
});

// Setup Static file serving agar Frontend bisa diakses dari localhost:3000/dashboard.html
app.use(express.static('public'));

// --- 5. GRACEFUL SHUTDOWN ---
// Menutup koneksi database dengan bersih saat server dimatikan (Ctrl+C)

const server = app.listen(PORT, () => {
  logger.info(`Server berjalan di http://localhost:${PORT}`);
});

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
  logger.info('Menerima sinyal shutdown, menutup koneksi...');
  server.close(() => {
    logger.info('HTTP server ditutup.');
    prisma.$disconnect().then(() => {
      logger.info('Koneksi database Prisma ditutup.');
      process.exit(0);
    });
  });
}