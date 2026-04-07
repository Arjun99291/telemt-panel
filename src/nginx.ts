import { getDb, ProxyRecord } from './db';
import { getContainerIp, docker } from './docker';
import fs from 'fs';
import path from 'path';

const NGINX_CONF_PATH = '/opt/mtproto-panel/nginx/nginx.conf';
const NGINX_CONTAINER_NAME = 'mtproto-nginx';

export async function regenerateNginxConfig(): Promise<void> {
  const db = getDb();
  const proxies = db.prepare("SELECT * FROM proxies WHERE status != 'deleted'").all() as ProxyRecord[];

  const mapEntries: string[] = [];
  const upstreamBlocks: string[] = [];

  for (const proxy of proxies) {
    if (!proxy.container_id) continue;
    const ip = await getContainerIp(proxy.container_id);
    if (!ip) continue;

    mapEntries.push(`        ${proxy.domain}    backend_${proxy.id};`);
    upstreamBlocks.push(`    upstream backend_${proxy.id} {
        server ${ip}:${proxy.internal_port};
    }`);
  }

  const defaultBackend = mapEntries.length > 0 ? '' : '        default         127.0.0.1:1;';

  const config = `
worker_processes auto;

events {
    worker_connections 4096;
}

stream {
${upstreamBlocks.join('\n')}

    map $ssl_preread_server_name $backend {
${mapEntries.join('\n')}
${defaultBackend}
    }

    server {
        listen 8443;
        ssl_preread on;
        proxy_pass $backend;
        proxy_connect_timeout 10s;
        proxy_timeout 300s;
    }
}
`;

  const dir = path.dirname(NGINX_CONF_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(NGINX_CONF_PATH, config);
}

export async function reloadNginx(): Promise<void> {
  try {
    const container = docker.getContainer(NGINX_CONTAINER_NAME);
    const inspect = await container.inspect();
    if (inspect.State.Running) {
      const exec = await container.exec({
        Cmd: ['nginx', '-s', 'reload'],
        AttachStdout: true,
        AttachStderr: true,
      });
      await exec.start({ Detach: false });
    }
  } catch (err) {
    console.error('Failed to reload nginx:', err);
  }
}

export async function updateAndReloadNginx(): Promise<void> {
  await regenerateNginxConfig();
  await reloadNginx();
}
