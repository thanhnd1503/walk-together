// Lưu tiến độ nhiệm vụ của từng phòng vào data/progress.json
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR cho phép test dùng thư mục riêng, không đụng dữ liệu thật
const DIR = process.env.DATA_DIR ?? fileURLToPath(new URL('../data/', import.meta.url));
const FILE = join(DIR, 'progress.json');
const WRITE_DELAY_MS = 500;

let cache = {};
try {
  cache = JSON.parse(readFileSync(FILE, 'utf8'));
} catch {
  cache = {}; // chưa có file thì bắt đầu trống
}

let timer = null;

function flush() {
  timer = null;
  mkdirSync(DIR, { recursive: true });
  // Ghi ra file tạm rồi đổi tên, tránh hỏng file nếu server tắt giữa chừng
  writeFileSync(`${FILE}.tmp`, JSON.stringify(cache, null, 2));
  renameSync(`${FILE}.tmp`, FILE);
}

export function loadProgress(code) {
  return cache[code] ?? null;
}

export function saveProgress(code, data) {
  cache[code] = { ...data, savedAt: new Date().toISOString() };
  if (!timer) timer = setTimeout(flush, WRITE_DELAY_MS);
}
