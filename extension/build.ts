/**
 * RepurposeAI Chrome Extension Build Script
 *
 * This extension uses plain JavaScript (no TS compilation needed at runtime).
 * This script handles:
 * 1. Updating the APP_URL in service-worker.js before packaging
 * 2. Validating all required files exist
 * 3. Creating a .zip for Chrome Web Store submission
 *
 * Usage:
 *   npx ts-node extension/build.ts --url https://your-domain.com
 *   npx ts-node extension/build.ts --url http://localhost:3000
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const EXTENSION_DIR = process.cwd();
const DIST_DIR = path.resolve(EXTENSION_DIR, "dist");

// Parse CLI args
const args = process.argv.slice(2);
const urlFlagIndex = args.indexOf("--url");
const appUrl = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : null;

if (!appUrl) {
  console.error("Usage: npx ts-node extension/build.ts --url https://your-domain.com");
  process.exit(1);
}

// Normalize: strip trailing slash
const normalizedUrl = appUrl.replace(/\/+$/, "");

// Required files
const REQUIRED_FILES = [
  "manifest.json",
  "popup/index.html",
  "popup/popup.js",
  "content/inject-button.js",
  "content/styles.css",
  "background/service-worker.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

console.log("\n🔧 RepurposeAI Extension Builder\n");

// Step 1: Validate files
console.log("Checking required files...");
const missing: string[] = [];

for (const file of REQUIRED_FILES) {
  const filePath = path.join(EXTENSION_DIR, file);
  if (!fs.existsSync(filePath)) {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error("❌ Missing files:");
  missing.forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
}

console.log("✅ All files present.\n");

// Step 2: Create dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Step 3: Copy files to dist and inject APP_URL
console.log(`Injecting APP_URL: ${normalizedUrl}`);

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === "dist" || entry.name === "build.ts" || entry.name === "README.md") {
      continue; // Skip build artifacts and non-extension files
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      let content = fs.readFileSync(srcPath, "utf-8");

      // Replace localhost URL with production URL
      if (entry.name.endsWith(".js") || entry.name.endsWith(".html")) {
        content = content.replace(
          /https:\/\/your-domain\.com/g,
          normalizedUrl
        );
        content = content.replace(
          /http:\/\/localhost:3000/g,
          normalizedUrl
        );
      }

      fs.writeFileSync(destPath, content);
    }
  }
}

copyDir(EXTENSION_DIR, DIST_DIR);
console.log("✅ Files copied to dist/\n");

// Step 4: Create zip (cross-platform)
const zipName = "repurpose-ai-extension.zip";
const zipPath = path.join(EXTENSION_DIR, zipName);

function createZip() {
  const isWindows = process.platform === "win32";

  try {
    if (isWindows) {
      // PowerShell Compress-Archive
      const distGlob = path.join(DIST_DIR, "*");
      execSync(
        `powershell -Command "Compress-Archive -Path '${distGlob}' -DestinationPath '${zipPath}' -Force"`,
        { stdio: "pipe" }
      );
    } else {
      execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, { stdio: "pipe" });
    }
    console.log(`✅ Created ${zipName}`);
  } catch {
    console.log("⚠️  Could not create zip automatically.");
    console.log(`   Manually zip the contents of: ${DIST_DIR}`);
  }
}

createZip();

console.log("\n🚀 Extension build complete!");
console.log(`   Load unpacked from: ${DIST_DIR}`);
console.log(`   Upload to Chrome Web Store: ${zipPath}\n`);
