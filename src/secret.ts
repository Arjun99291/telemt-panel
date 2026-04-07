import crypto from 'crypto';

export function generateSecret(domain: string): { secret: string; userKey: string } {
  // userKey = 16 random bytes = 32 hex chars (goes into config.toml as user1)
  const userKey = crypto.randomBytes(16).toString('hex');
  // tg:// link secret = ee + userKey + hex(domain)
  const domainHex = Buffer.from(domain, 'utf-8').toString('hex');
  const secret = 'ee' + userKey + domainHex;
  return { secret, userKey };
}

export function generateProxyLink(serverIp: string, port: number, secret: string): string {
  return `tg://proxy?server=${serverIp}&port=${port}&secret=${secret}`;
}
