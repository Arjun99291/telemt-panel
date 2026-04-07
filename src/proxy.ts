import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from './auth';
import { getDb, ProxyRecord } from './db';
import { createProxyContainer, startContainer, stopContainer, removeContainer, getContainerStats } from './docker';
import { generateSecret, generateProxyLink } from './secret';
import { DOMAIN_POOL } from './domains';
import fs from 'fs';
import path from 'path';

const router = Router();
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const CONFIG_DIR = '/opt/mtproto-panel/data/configs';
const PORT_RANGE_START = 10000;
const PORT_RANGE_END = 20000;

router.use(authMiddleware);

function getAvailableDomain(): string | null {
  const db = getDb();
  const usedDomains = db.prepare("SELECT domain FROM proxies WHERE status != 'deleted'").all() as { domain: string }[];
  const usedSet = new Set(usedDomains.map(d => d.domain));
  return DOMAIN_POOL.find(d => !usedSet.has(d)) || null;
}

function getAvailablePort(): number {
  const db = getDb();
  const usedPorts = db.prepare("SELECT internal_port FROM proxies WHERE status != 'deleted'").all() as { internal_port: number }[];
  const usedSet = new Set(usedPorts.map(p => p.internal_port));
  for (let port = PORT_RANGE_START; port < PORT_RANGE_END; port++) {
    if (!usedSet.has(port)) return port;
  }
  throw new Error('No available ports');
}

function generateConfig(port: number, domain: string, userSecret: string): string {
  return `[general]
use_middle_proxy = true

[general.modes]
classic = false
secure = false
tls = true

[server]
port = ${port}

[censorship]
tls_domain = "${domain}"
mask = true

[access.users]
user1 = "${userSecret}"
`;
}

// List all proxies
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const proxies = db.prepare("SELECT * FROM proxies WHERE status != 'deleted' ORDER BY created_at DESC").all() as ProxyRecord[];

    const result = [];
    for (const proxy of proxies) {
      let stats = { rx: 0, tx: 0, status: proxy.status };
      if (proxy.container_id && proxy.status !== 'deleted') {
        try {
          stats = await getContainerStats(proxy.container_id);
          if (stats.status !== proxy.status) {
            db.prepare('UPDATE proxies SET status = ? WHERE id = ?').run(stats.status, proxy.id);
          }
        } catch {}
      }
      result.push({
        ...proxy,
        status: stats.status,
        traffic_rx: stats.rx,
        traffic_tx: stats.tx,
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create proxy
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const domain = getAvailableDomain();
    if (!domain) {
      return res.status(400).json({ error: 'No available domains in pool' });
    }

    const internalPort = getAvailablePort();
    const { secret, userKey } = generateSecret(domain);
    // Each proxy gets its own external port — direct binding, no nginx needed
    const proxyLink = generateProxyLink(SERVER_IP, internalPort, secret);
    const containerName = `mtproto-proxy-${Date.now()}`;

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const configPath = path.join(CONFIG_DIR, `${containerName}.toml`);
    fs.writeFileSync(configPath, generateConfig(internalPort, domain, userKey));

    // Create container with direct port binding (host port = container port)
    const containerId = await createProxyContainer(containerName, configPath, internalPort, internalPort);

    // Save to DB
    const db = getDb();
    db.prepare(`
      INSERT INTO proxies (name, container_id, container_name, domain, internal_port, secret, proxy_link, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running')
    `).run(name, containerId, containerName, domain, internalPort, secret, proxyLink);

    const proxy = db.prepare('SELECT * FROM proxies WHERE container_name = ?').get(containerName);
    res.json(proxy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start proxy
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const proxy = db.prepare('SELECT * FROM proxies WHERE id = ?').get(req.params.id) as ProxyRecord;
    if (!proxy) return res.status(404).json({ error: 'Proxy not found' });

    await startContainer(proxy.container_id);
    db.prepare("UPDATE proxies SET status = 'running' WHERE id = ?").run(proxy.id);

    res.json({ message: 'Proxy started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stop proxy
router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const proxy = db.prepare('SELECT * FROM proxies WHERE id = ?').get(req.params.id) as ProxyRecord;
    if (!proxy) return res.status(404).json({ error: 'Proxy not found' });

    await stopContainer(proxy.container_id);
    db.prepare("UPDATE proxies SET status = 'stopped' WHERE id = ?").run(proxy.id);

    res.json({ message: 'Proxy stopped' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete proxy
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const proxy = db.prepare('SELECT * FROM proxies WHERE id = ?').get(req.params.id) as ProxyRecord;
    if (!proxy) return res.status(404).json({ error: 'Proxy not found' });

    db.prepare("UPDATE proxies SET status = 'deleted' WHERE id = ?").run(proxy.id);

    // Remove container
    await removeContainer(proxy.container_id);

    // Remove config file
    const configPath = path.join(CONFIG_DIR, `${proxy.container_name}.toml`);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    // Remove from DB
    db.prepare('DELETE FROM proxies WHERE id = ?').run(proxy.id);

    res.json({ message: 'Proxy deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
