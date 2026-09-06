'use strict';
/**
 * db.js — SpendGuard Database Layer using sql.js (pure JS SQLite/WASM)
 * No native compilation required. Database is persisted to disk as a binary file.
 */
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let _db = null;
let _dbPath = null;
let _SQL = null;

// Thin synchronous wrapper around sql.js to match the better-sqlite3 API surface
// so the rest of the codebase works unchanged.
class SyncDb {
  constructor(sqlJs, filePath) {
    this._SQL = sqlJs;
    this._path = filePath;
    // Load from file or create new
    if (filePath && fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this._db = new sqlJs.Database(data);
    } else {
      this._db = new sqlJs.Database();
    }
  }

  // Save to disk
  _persist() {
    if (!this._path) return;
    const data = this._db.export();
    const dir  = path.dirname(this._path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this._path, Buffer.from(data));
  }

  pragma(str) {
    try { this._db.run(`PRAGMA ${str}`); } catch (_) {}
  }

  exec(sql) {
    // sql.js executes each statement and auto-commits DDL.
    // For DML transaction blocks we use run() internally.
    const stmts = sql.trim().split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) {
      try { this._db.run(s); } catch (e) {
        // Swallow "cannot commit/rollback - no transaction is active" errors gracefully
        if (!e.message.includes('no transaction is active')) throw e;
      }
    }
    this._persist();
    return this;
  }

  // Returns a statement-like object with .run(), .get(), .all()
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const args = self._normalizeArgs(params);
        self._db.run(sql, args);
        self._persist();
        return { changes: 1 };
      },
      get(...params) {
        const args = self._normalizeArgs(params);
        const stmt = self._db.prepare(sql);
        stmt.bind(args);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return self._castRow(row);
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const args = self._normalizeArgs(params);
        const stmt = self._db.prepare(sql);
        stmt.bind(args);
        const rows = [];
        while (stmt.step()) rows.push(self._castRow(stmt.getAsObject()));
        stmt.free();
        return rows;
      },
    };
  }

  // Run a function as a transaction
  transaction(fn) {
    return (...args) => {
      try {
        this._db.run('BEGIN TRANSACTION');
      } catch (_) { /* already in transaction – ignore */ }
      try {
        fn(...args);
        try { this._db.run('COMMIT'); } catch (_) {}
      } catch (e) {
        try { this._db.run('ROLLBACK'); } catch (_) {}
        throw e;
      }
      this._persist();
    };
  }

  _normalizeArgs(params) {
    if (params.length === 0) return {};
    // Named params object
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const obj = params[0];
      // sql.js wants { $key: val } for named :key / @key params
      const named = {};
      for (const [k, v] of Object.entries(obj)) {
        named[`@${k}`] = v === undefined ? null : v;
      }
      return named;
    }
    // Positional
    return params.map(v => (v === undefined ? null : v));
  }

  _castRow(row) {
    // sql.js returns all values as JS types but integers may come back as BigInt
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return out;
  }
}

async function initDb() {
  if (_db) return _db;
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/spendguard.db');
  _dbPath = dbPath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _SQL = await initSqlJs();
  _db  = new SyncDb(_SQL, dbPath);
  return _db;
}

function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

module.exports = { initDb, getDb };
