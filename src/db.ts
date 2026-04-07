import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || '/opt/mtproto-panel/data/panel.db';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      container_id TEXT,
      container_name TEXT UNIQUE NOT NULL,
      domain TEXT UNIQUE NOT NULL,
      internal_port INTEGER NOT NULL,
      secret TEXT NOT NULL,
      proxy_link TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }
}

export interface ProxyRecord {
  id: number;
  name: string;
  container_id: string;
  container_name: string;
  domain: string;
  internal_port: number;
  secret: string;
  proxy_link: string;
  status: string;
  created_at: string;
}
