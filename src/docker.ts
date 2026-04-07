import Dockerode from 'dockerode';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const NETWORK_NAME = 'mtproto-net';
const PROXY_IMAGE = 'telemt-proxy-v3';

export async function ensureNetwork(): Promise<void> {
  try {
    const network = docker.getNetwork(NETWORK_NAME);
    await network.inspect();
  } catch {
    await docker.createNetwork({
      Name: NETWORK_NAME,
      Driver: 'bridge',
    });
  }
}

export async function createProxyContainer(
  containerName: string,
  configPath: string,
  internalPort: number,
  externalPort: number
): Promise<string> {
  await ensureNetwork();

  const container = await docker.createContainer({
    Image: PROXY_IMAGE,
    name: containerName,
    HostConfig: {
      Binds: [`${configPath}:/etc/telemt/config.toml:ro`],
      NetworkMode: NETWORK_NAME,
      RestartPolicy: { Name: 'unless-stopped' },
      PortBindings: {
        [`${internalPort}/tcp`]: [{ HostPort: `${externalPort}` }],
      },
    },
    ExposedPorts: {
      [`${internalPort}/tcp`]: {},
    },
  });

  await container.start();
  return container.id;
}

export async function startContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop();
}

export async function removeContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  try {
    await container.stop();
  } catch {
    // Already stopped
  }
  await container.remove({ force: true });
}

export async function getContainerStats(containerId: string): Promise<{ rx: number; tx: number; status: string }> {
  try {
    const container = docker.getContainer(containerId);
    const inspect = await container.inspect();
    const status = inspect.State.Running ? 'running' : 'stopped';

    if (!inspect.State.Running) {
      return { rx: 0, tx: 0, status };
    }

    const stats = await container.stats({ stream: false });
    const networks = stats.networks || {};
    let rx = 0, tx = 0;
    for (const iface of Object.values(networks) as any[]) {
      rx += iface.rx_bytes || 0;
      tx += iface.tx_bytes || 0;
    }
    return { rx, tx, status };
  } catch {
    return { rx: 0, tx: 0, status: 'unknown' };
  }
}

export async function getContainerIp(containerId: string): Promise<string | null> {
  try {
    const container = docker.getContainer(containerId);
    const inspect = await container.inspect();
    const networks = inspect.NetworkSettings.Networks;
    if (networks[NETWORK_NAME]) {
      return networks[NETWORK_NAME].IPAddress;
    }
    return null;
  } catch {
    return null;
  }
}

export { docker };
