import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected.');
    db.run(`
      CREATE TABLE IF NOT EXISTS balloons (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL DEFAULT '익명',
        text TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        colorClass TEXT,
        isHidden INTEGER DEFAULT 0,
        mergedIntoId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // 이미 존재하는 테이블일 경우를 대비해 마이그레이션(컬럼 추가) 시도
      db.run(`ALTER TABLE balloons ADD COLUMN author TEXT NOT NULL DEFAULT '익명'`, (err) => {
        // 이미 컬럼이 존재하면 에러가 발생하므로 무시함
      });
    });
  }
});

export default db;
