// Lưu dữ liệu theo phòng: tiến độ nhiệm vụ (data/progress.json) và ảnh kỷ niệm (data/memories.json)
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR cho phép test dùng thư mục riêng, không đụng dữ liệu thật
const DIR = process.env.DATA_DIR ?? fileURLToPath(new URL('../data/', import.meta.url));
const WRITE_DELAY_MS = 500;

// Một file JSON giữ trong bộ nhớ, ghi xuống đĩa gom lại sau WRITE_DELAY_MS
function jsonStore(name) {
  const file = join(DIR, name);
  let data = {};
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    data = {}; // chưa có file thì bắt đầu trống
  }
  let timer = null;
  const flush = () => {
    timer = null;
    mkdirSync(DIR, { recursive: true });
    // Ghi ra file tạm rồi đổi tên, tránh hỏng file nếu server tắt giữa chừng
    writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2));
    renameSync(`${file}.tmp`, file);
  };
  return {
    data,
    touch() {
      if (!timer) timer = setTimeout(flush, WRITE_DELAY_MS);
    },
  };
}

const progress = jsonStore('progress.json');
const memories = jsonStore('memories.json');

export function loadProgress(code) {
  return progress.data[code] ?? null;
}

export function saveProgress(code, data) {
  progress.data[code] = { ...data, savedAt: new Date().toISOString() };
  progress.touch();
}

export function addPhoto(code, photo) {
  (memories.data[code] ??= { photos: [] }).photos.push(photo);
  memories.touch();
}

export function loadPhotos(code) {
  return memories.data[code]?.photos ?? [];
}
