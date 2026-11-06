#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { levelsFile } = require('../src/lib/levels');
const { economyFile } = require('../src/lib/economy');

function readRecordCount(file) {
  if (!fs.existsSync(file)) return 0;

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const users = Array.isArray(parsed) ? parsed : parsed?.users;
  if (!Array.isArray(users)) {
    throw new Error(`${file} has an unexpected shape.`);
  }
  return users.length;
}

function backupFile(file, now) {
  if (!fs.existsSync(file)) return null;

  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backup = file.replace(/\.json$/i, '') + `.reset-${stamp}.json`;
  fs.copyFileSync(file, backup);
  return backup;
}

function writeEmptyFile(file, now) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;

  try {
    fs.writeFileSync(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: now.toISOString(),
        users: [],
      }, null, 2)}\n`,
      'utf8',
    );
    fs.renameSync(temporary, file);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

/**
 * Clears all XP and wallet records for every server. Nothing is written unless
 * `confirm` is true, so the command can be previewed safely.
 *
 * @param {{confirm?: boolean, now?: Date}} [options]
 * @returns {{confirmed: boolean, reset: boolean, targets: object[]}}
 */
function resetProgression({ confirm = false, now = new Date() } = {}) {
  const targets = [
    { label: 'XP', file: levelsFile() },
    { label: 'wallets', file: economyFile() },
  ].map((target) => ({ ...target, records: readRecordCount(target.file) }));

  if (!confirm) return { confirmed: false, reset: false, targets };

  for (const target of targets) {
    target.backup = backupFile(target.file, now);
    writeEmptyFile(target.file, now);
  }

  return { confirmed: true, reset: true, targets };
}

function printResult(result) {
  console.log(`[reset] ${result.reset ? 'Cleared' : 'Would clear'} progression for every server:`);
  for (const target of result.targets) {
    console.log(`[reset] ${target.label}: ${target.records} record(s) in ${target.file}`);
    if (target.backup) console.log(`[reset] backup: ${target.backup}`);
  }
  if (!result.confirmed) {
    console.log('[reset] Dry run only. Re-run with --confirm to back up and clear both files.');
  }
}

if (require.main === module) {
  try {
    const result = resetProgression({ confirm: process.argv.includes('--confirm') });
    printResult(result);
  } catch (error) {
    console.error(`[reset] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { resetProgression };
