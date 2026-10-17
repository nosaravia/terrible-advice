import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const databaseId = process.env.TERRIBLE_ADVICE_DATABASE_ID;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId || '')) throw Error('Set TERRIBLE_ADVICE_DATABASE_ID to the Cloudflare D1 database UUID.');
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
config.d1_databases = [{ binding: 'DB', database_name: 'terrible-advice-db', database_id: databaseId, migrations_dir: './migrations' }];
writeFileSync('wrangler.deploy.json', JSON.stringify(config, null, 2));
for (const args of [['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.deploy.json'], ['deploy', '--config', 'wrangler.deploy.json']]) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
