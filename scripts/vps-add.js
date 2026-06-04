#!/usr/bin/env node
/**
 * Estlem — Add a new VPS environment
 *
 * Interactive wizard that:
 *   1. Prompts for VPS details (IP, domain, user)
 *   2. Adds an entry to config/environments.json
 *   3. Generates an SSH connect helper script
 *   4. Prints exact commands to run on the VPS to provision it
 *
 * Use this whenever you spin up a new server (Contabo, DigitalOcean,
 * Hetzner, AWS EC2, etc.) so it becomes a switchable environment.
 *
 * Usage:
 *   pnpm vps:add
 *
 * After adding, switch to it with:
 *   pnpm env:switch  (and pick your new env)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'environments.json');
const REPO_URL = 'https://github.com/moon15mm/estlem.git';

const c = {
  r: '\x1b[0m', b: '\x1b[1m', d: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const log = (m, col = 'r') => console.log(`${c[col]}${m}${c.r}`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║   Estlem — Add VPS Environment             ║', 'cyan');
  log('╚════════════════════════════════════════════╝\n', 'cyan');

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  log('Tell me about your VPS:\n', 'b');

  const envKey = (await ask('Environment key (e.g. vps-contabo): ')).trim() || 'vps';
  if (config.environments[envKey]) {
    log(`Environment "${envKey}" already exists. Aborted.`, 'red');
    rl.close();
    return;
  }

  const label = (await ask('Label (e.g. "Contabo VPS - Production"): ')).trim() || envKey;
  const ip = (await ask('VPS IP address (e.g. 167.86.77.174): ')).trim();
  const sshUser = (await ask('SSH user [root]: ')).trim() || 'root';
  const domain = (await ask('Main domain (e.g. estlem.store): ')).trim();
  if (!domain) {
    log('Domain is required. Aborted.', 'red');
    rl.close();
    return;
  }

  // Build the env definition
  const envData = {
    label,
    apiUrl: `https://api.${domain}`,
    apiBase: `https://api.${domain}/api/v1`,
    wsUrl: `https://api.${domain}`,
    webUrl: `https://${domain}`,
    dashboardUrl: `https://dashboard.${domain}`,
    database: {
      provider: 'self-hosted',
      host: '127.0.0.1',
      port: 5432,
      name: 'estlem',
      connectionEnv: 'DATABASE_URL',
    },
    deployment: {
      api:       { platform: 'vps', host: ip, sshUser, pm2: 'estlem-api',       port: 3001 },
      web:       { platform: 'vps', host: ip, sshUser, pm2: 'estlem-web',       port: 3000 },
      dashboard: { platform: 'vps', host: ip, sshUser, pm2: 'estlem-dashboard', port: 3002 },
    },
  };

  log(`\nAbout to add environment "${envKey}":`, 'green');
  log(`  IP:        ${ip}`, 'd');
  log(`  SSH user:  ${sshUser}`, 'd');
  log(`  Web:       ${envData.webUrl}`, 'd');
  log(`  Dashboard: ${envData.dashboardUrl}`, 'd');
  log(`  API:       ${envData.apiUrl}`, 'd');

  const confirm = await ask('\nAdd this environment? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    log('Aborted.', 'yellow');
    rl.close();
    return;
  }

  config.environments[envKey] = envData;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  log(`\n✅ Added "${envKey}" to environments.json`, 'green');

  // Print the manual setup steps for the VPS
  log('\n══════════════════════════════════════════════', 'cyan');
  log('  NEXT STEPS — run these ON THE VPS as root', 'cyan');
  log('══════════════════════════════════════════════\n', 'cyan');

  log('1) DNS — point these A records to ' + ip + ':', 'b');
  log(`     ${domain}              A   ${ip}`, 'yellow');
  log(`     www.${domain}          A   ${ip}`, 'yellow');
  log(`     dashboard.${domain}    A   ${ip}`, 'yellow');
  log(`     api.${domain}          A   ${ip}\n`, 'yellow');

  log('2) SSH into the VPS:', 'b');
  log(`     ssh ${sshUser}@${ip}\n`, 'yellow');

  log('3) Provision the server (installs Node, Postgres, Nginx, etc.):', 'b');
  log(`     curl -fsSL https://raw.githubusercontent.com/moon15mm/estlem/main/scripts/vps/01-provision.sh | bash\n`, 'yellow');

  log('4) Deploy the app:', 'b');
  log(`     git clone ${REPO_URL} /opt/estlem`, 'yellow');
  log(`     bash /opt/estlem/scripts/vps/02-deploy.sh ${REPO_URL} ${domain}\n`, 'yellow');

  log('5) (Optional) Migrate DB from current Render Postgres:', 'b');
  log(`     bash /opt/estlem/scripts/vps/04-migrate-db.sh "<render-db-url>"\n`, 'yellow');

  log('6) On your local machine, switch to the new env:', 'b');
  log(`     pnpm env:switch  →  pick "${envKey}"\n`, 'yellow');

  log('7) Routine updates from then on:', 'b');
  log(`     ssh ${sshUser}@${ip} 'bash /opt/estlem/scripts/vps/03-update.sh'\n`, 'yellow');

  rl.close();
}

main().catch((e) => {
  console.error('Error:', e);
  rl.close();
  process.exit(1);
});
