/**
 * Multi-Channel Distribution Packager: Suika Merge Drop
 * Generates:
 * - dist/crazygames/ + dist/crazygames.zip (CrazyGames SDK v3 bundle)
 * - dist/poki/ + dist/poki.zip (Poki SDK v2 bundle)
 * - dist/android-web/ (Capacitor Android web assets)
 * - dist/suika-merge-drop-commercial-v1.0.zip (Commercial asset release package)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyCommonWebAssets(targetDir) {
  ensureDir(targetDir);
  // Copy style.css
  fs.copyFileSync(path.join(ROOT_DIR, 'style.css'), path.join(targetDir, 'style.css'));
  // Copy src/
  copyDirRecursive(path.join(ROOT_DIR, 'src'), path.join(targetDir, 'src'));
  // Copy vendor/
  copyDirRecursive(path.join(ROOT_DIR, 'vendor'), path.join(targetDir, 'vendor'));
}

function createZipFromDirectory(sourceDir, zipFilePath) {
  // Use Python's built-in zipfile module for 100% reliable cross-platform zip generation
  const pythonScript = `
import os, sys, zipfile

src_dir = sys.argv[1]
zip_path = sys.argv[2]

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, src_dir)
            zipf.write(full_path, rel_path)
`;

  try {
    execFileSync('python', ['-c', pythonScript, sourceDir, zipFilePath], { stdio: 'inherit' });
  } catch (err) {
    // Try python3 if python fails
    execFileSync('python3', ['-c', pythonScript, sourceDir, zipFilePath], { stdio: 'inherit' });
  }
}

function createCommercialZip(zipFilePath) {
  // Commercial package includes clean source code, configs, guides, and vendor files
  // without node_modules, .git, or dist artifacts.
  const pythonScript = `
import os, sys, zipfile

root_dir = sys.argv[1]
zip_path = sys.argv[2]

include_files = [
    'index.html',
    'style.css',
    'capacitor.config.json',
    'package.json',
    'DOCUMENTATION.md',
    'RESKIN_GUIDE.md',
    'SALES_COPY_MARKETPLACE.md',
    'ANDROID_SETUP_GUIDE.md',
    'SUBMISSION_GUIDE_CRAZYGAMES.md',
    'SUBMISSION_GUIDE_POKI.md'
]

include_dirs = [
    'src',
    'vendor',
    'scripts',
    os.path.join('.github', 'workflows')
]

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add root files
    for f in include_files:
        p = os.path.join(root_dir, f)
        if os.path.exists(p):
            zipf.write(p, f)
            
    # Add directories
    for d in include_dirs:
        full_d = os.path.join(root_dir, d)
        if os.path.exists(full_d):
            for r, dirs, files in os.walk(full_d):
                for file in files:
                    fp = os.path.join(r, file)
                    rel = os.path.relpath(fp, root_dir)
                    zipf.write(fp, rel)
`;

  try {
    execFileSync('python', ['-c', pythonScript, ROOT_DIR, zipFilePath], { stdio: 'inherit' });
  } catch (err) {
    execFileSync('python3', ['-c', pythonScript, ROOT_DIR, zipFilePath], { stdio: 'inherit' });
  }
}

async function run() {
  console.log('=== Suika Merge Drop: Multi-Channel Packaging ===\n');

  ensureDir(DIST_DIR);
  const baseHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // 1. Channel 1: CrazyGames Bundle
  console.log('[1/4] Building CrazyGames distribution bundle...');
  const cgDir = path.join(DIST_DIR, 'crazygames');
  copyCommonWebAssets(cgDir);

  const cgScript = '  <!-- CrazyGames SDK v3 -->\n  <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n';
  const cgHtml = baseHtml.replace('</head>', `${cgScript}</head>`);
  fs.writeFileSync(path.join(cgDir, 'index.html'), cgHtml, 'utf8');

  const cgZipPath = path.join(DIST_DIR, 'crazygames.zip');
  if (fs.existsSync(cgZipPath)) fs.unlinkSync(cgZipPath);
  createZipFromDirectory(cgDir, cgZipPath);
  console.log(`  -> Created: dist/crazygames.zip (${(fs.statSync(cgZipPath).size / 1024).toFixed(1)} KB)`);

  // 2. Channel 1: Poki Bundle
  console.log('[2/4] Building Poki distribution bundle...');
  const pokiDir = path.join(DIST_DIR, 'poki');
  copyCommonWebAssets(pokiDir);

  const pokiScript = '  <!-- Poki SDK v2 -->\n  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n';
  const pokiHtml = baseHtml.replace('</head>', `${pokiScript}</head>`);
  fs.writeFileSync(path.join(pokiDir, 'index.html'), pokiHtml, 'utf8');

  const pokiZipPath = path.join(DIST_DIR, 'poki.zip');
  if (fs.existsSync(pokiZipPath)) fs.unlinkSync(pokiZipPath);
  createZipFromDirectory(pokiDir, pokiZipPath);
  console.log(`  -> Created: dist/poki.zip (${(fs.statSync(pokiZipPath).size / 1024).toFixed(1)} KB)`);

  // 3. Channel 3: Android Web Assets (Capacitor webDir)
  console.log('[3/4] Building Android Web assets (dist/android-web)...');
  const androidDir = path.join(DIST_DIR, 'android-web');
  copyCommonWebAssets(androidDir);
  fs.writeFileSync(path.join(androidDir, 'index.html'), baseHtml, 'utf8');
  console.log('  -> Staged clean web assets in dist/android-web');

  // 4. Channel 4: Commercial Clean Distribution ZIP
  console.log('[4/4] Building Commercial Marketplace ZIP (dist/suika-merge-drop-commercial-v1.0.zip)...');
  const commercialZipPath = path.join(DIST_DIR, 'suika-merge-drop-commercial-v1.0.zip');
  if (fs.existsSync(commercialZipPath)) fs.unlinkSync(commercialZipPath);
  createCommercialZip(commercialZipPath);
  console.log(`  -> Created: dist/suika-merge-drop-commercial-v1.0.zip (${(fs.statSync(commercialZipPath).size / 1024).toFixed(1)} KB)`);

  console.log('\n=== All Multi-Channel Packages Built Successfully! ===');
}

run().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
