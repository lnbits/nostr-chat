const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const buildCommand = process.env.ANDROID_BUILD_COMMAND || 'all-release';

ensureInstall(projectRoot);
ensureInstall(path.resolve(projectRoot, 'src-capacitor'));

run(
  process.execPath,
  [path.resolve(__dirname, 'build-android.cjs'), buildCommand],
  projectRoot
);

function ensureInstall(directory) {
  const packageJsonPath = path.resolve(directory, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Missing package.json in ${directory}`);
    process.exit(1);
  }

  const lockPath = path.resolve(directory, 'package-lock.json');
  const nodeModulesPath = path.resolve(directory, 'node_modules');
  const markerPath = path.resolve(nodeModulesPath, '.android-docker-lock-hash');
  const hash = computeInstallHash(packageJsonPath, lockPath);

  const hasInstall = fs.existsSync(nodeModulesPath) && fs.existsSync(markerPath);
  const markerMatches = hasInstall && fs.readFileSync(markerPath, 'utf8') === hash;

  if (markerMatches) {
    return;
  }

  console.log(`Android Docker: installing dependencies in ${path.relative(projectRoot, directory) || '.'}`);
  const args = fs.existsSync(lockPath) ? ['ci'] : ['install'];
  run('npm', args, directory);

  fs.writeFileSync(markerPath, hash, 'utf8');
}

function computeInstallHash(packageJsonPath, lockPath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(packageJsonPath));

  if (fs.existsSync(lockPath)) {
    hash.update(fs.readFileSync(lockPath));
  }

  hash.update(process.version);
  hash.update(process.platform);
  hash.update(process.arch);
  return hash.digest('hex');
}

function run(bin, args, cwd) {
  const result = spawnSync(bin, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
