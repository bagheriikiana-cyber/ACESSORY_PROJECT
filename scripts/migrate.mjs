import { spawnSync } from 'node:child_process';
// Use a direct connection for schema changes while keeping pooled runtime connections.
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL },
});
process.exit(result.status ?? 1);
