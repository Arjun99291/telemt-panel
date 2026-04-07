import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db';
import authRouter from './auth';
import proxyRouter from './proxy';
import { ensureNetwork } from './docker';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Auth routes
app.use('/api/auth', authRouter);

// Proxy management routes (protected)
app.use('/api/proxies', proxyRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  getDb();
  await ensureNetwork();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MTProto Panel running on port ${PORT}`);
  });
}

start().catch(console.error);
