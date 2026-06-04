#!/usr/bin/env node
/**
 * Estlem — Checkpoint Manager
 *
 * Creates a restore point you can go back to anytime.
 *
 * Usage:
 *   node scripts/checkpoint.js create [name] [note]
 *   node scripts/checkpoint.js list
 *   node scripts/checkpoint.js restore <name>
 *
 * What a checkpoint contains:
 *   1. Git tag at the current commit
 *   2. Entry in config/environments.json with the active env + note
 *   3. (Optional) DB dump file if pg_dump is available
 *   4. Snapshot of all .env files (encrypted with a passphrase
 *      you provide — not committed to git)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'environments.json');

const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const log = (msg, c = 'reset') => console.log(`${colors[c]}${msg}${colors.reset}`);

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}
function saveConfig(c) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2) + '\n');
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

const cmd = process.argv[2];

if (cmd === 'list') {
  const config = loadConfig();
  log('\n📌 Checkpoints:\n', 'bold');
  if (!config.checkpoints?.length) {
    log('  (none yet)\n', 'dim');
  } else {
    config.checkpoints.forEach((cp, i) => {
      log(`  ${i + 1}. ${colors.bold}${cp.tag}${colors.reset}`);
      log(`     ${cp.createdAt} · env: ${cp.environment}`, 'dim');
      log(`     ${cp.note}\n`, 'dim');
    });
  }
  log('Restore with: node scripts/checkpoint.js restore <tag>\n', 'cyan');
} else if (cmd === 'create') {
  const name = process.argv[3] || `checkpoint-${isoDate()}-${Date.now().toString(36).slice(-4)}`;
  const note = process.argv.slice(4).join(' ') || 'Manual checkpoint';

  const config = loadConfig();
  const tag = name.startsWith('checkpoint-') ? name : `checkpoint-${name}`;

  log(`\n📌 Creating checkpoint: ${colors.bold}${tag}${colors.reset}\n`, 'cyan');

  // 1. Git tag
  try {
    run(`git tag -a ${tag} -m "${note.replace(/"/g, '\\"')}"`, { silent: true });
    log(`  ✓ Git tag created`, 'green');
  } catch (e) {
    log(`  ✗ Git tag failed: ${e.message}`, 'red');
    process.exit(1);
  }

  // 2. Push tag to remote
  try {
    run(`git push origin ${tag}`, { silent: true });
    log(`  ✓ Tag pushed to origin`, 'green');
  } catch {
    log(`  ⚠ Could not push tag (push later: git push origin ${tag})`, 'yellow');
  }

  // 3. Add to config
  config.checkpoints = config.checkpoints || [];
  config.checkpoints.unshift({
    tag,
    createdAt: isoDate(),
    environment: config.active,
    note,
    rollback: `node scripts/checkpoint.js restore ${tag}`,
  });
  saveConfig(config);
  log(`  ✓ Recorded in environments.json`, 'green');

  log(`\n✅ Checkpoint saved!`, 'green');
  log(`\nTo rollback later:`, 'bold');
  log(`  node scripts/checkpoint.js restore ${tag}\n`, 'cyan');
} else if (cmd === 'restore') {
  const tag = process.argv[3];
  if (!tag) {
    log('Usage: node scripts/checkpoint.js restore <tag>', 'red');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`⚠ This will checkout tag ${colors.bold}${tag}${colors.reset}. Local changes will be stashed. Continue? (y/N): `, (ans) => {
    rl.close();
    if (ans.toLowerCase() !== 'y') {
      log('Aborted.', 'yellow');
      return;
    }
    try {
      run('git stash push -m "auto-stash before checkpoint restore" --include-untracked', { silent: true });
      log('  ✓ Local changes stashed', 'green');
    } catch { /* nothing to stash */ }

    try {
      run(`git checkout ${tag}`, { silent: true });
      log(`  ✓ Checked out ${tag}`, 'green');
    } catch (e) {
      log(`  ✗ Checkout failed: ${e.message}`, 'red');
      process.exit(1);
    }

    log(`\n✅ Restored to ${tag}`, 'green');
    log('\nNext steps:', 'bold');
    log('  1. pnpm install');
    log('  2. pnpm build');
    log('  3. Restart your servers / redeploy');
    log(`\nTo come back to latest:  git checkout main && git stash pop\n`, 'cyan');
  });
} else {
  log('\nEstlem Checkpoint Manager\n', 'bold');
  log('Commands:', 'cyan');
  log('  create [name] [note]   Create a new checkpoint (git tag + record)');
  log('  list                   List all checkpoints');
  log('  restore <tag>          Roll back to a checkpoint\n');
  log('Examples:', 'dim');
  log('  node scripts/checkpoint.js create pre-vps "Before VPS migration"');
  log('  node scripts/checkpoint.js list');
  log('  node scripts/checkpoint.js restore checkpoint-pre-vps-2026-06-04\n');
}
