/* 생성 원화 자르기. 예전 SVG로 새 그림을 덮어쓰지 않는다. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync('python3', [fileURLToPath(new URL('./cut-storm-weapons.py', import.meta.url))], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
