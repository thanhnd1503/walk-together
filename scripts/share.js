// `npm run share`: chạy server + Cloudflare Tunnel, in ra link https để gửi cho người ấy.
// Link đổi mỗi lần chạy lại (quick tunnel không cần tài khoản). Ctrl+C để tắt cả hai.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || '3456';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LINK = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const server = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT }, stdio: 'inherit' });
const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });

let shown = false;
const watch = (chunk) => {
  const link = !shown && String(chunk).match(LINK)?.[0];
  if (!link) return;
  shown = true;
  console.log(`\n🌍 Link gửi người ấy: ${link}\n   (giữ cửa sổ này mở; tắt máy hoặc Ctrl+C là link ngừng chạy)\n`);
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);

tunnel.on('error', () => {
  console.error('❌ Chưa cài cloudflared. Tải tại: https://github.com/cloudflare/cloudflared/releases');
  server.kill();
  process.exit(1);
});

const stop = () => {
  server.kill();
  tunnel.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  tunnel.kill();
  process.exit(code ?? 0);
});
tunnel.on('exit', (code) => {
  if (code) console.error(`❌ Tunnel dừng (mã ${code}). Chạy lại npm run share nhé.`);
  server.kill();
});
