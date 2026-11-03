// Kiểm tra cú pháp mọi file JS của dự án bằng `node --check`
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dirs = ['server', 'shared', 'public', 'scripts'];

function listJs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listJs(path);
    return path.endsWith('.js') ? [path] : [];
  });
}

const files = dirs.flatMap(listJs);
let failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log(failed ? `❌ ${failed}/${files.length} file lỗi` : `✅ ${files.length} file OK`);
process.exit(failed ? 1 : 0);
