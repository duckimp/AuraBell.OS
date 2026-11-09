import { createHash } from 'node:crypto';
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resourcesRoot = join(projectRoot, 'src-tauri', 'resources', 'tts');
const modelRevision = '2115c4b78e65fa224cb5aac1aad73f9e054a7f23';
const modelBaseUrl = `https://huggingface.co/okasi/piper-indonesian-news-tts-onnx-q8/resolve/${modelRevision}`;
const licenseSha256 = '4cd71dece7037f1d6d93cce7570c57ab75ea9ac566fd4990be2f3ab08d15b47f';
const modelFiles = [
  {
    name: 'id_ID-news_tts-medium-q8.onnx',
    sha256: 'cb18ababdd66fd6562b4b8b5c186865d6122a0ade0755c8483c44467f3dacf27',
  },
  {
    name: 'id_ID-news_tts-medium-q8.onnx.json',
    sha256: '1ef677072668a5e172e0759b1d3871f129009d1167f093325a17607f7add5ad7',
  },
  {
    name: 'LICENSE',
    sha256: licenseSha256,
  },
];

const piperRelease = '2023.11.14-2';
const platformAssets = {
  linux: {
    archive: `https://github.com/rhasspy/piper/releases/download/${piperRelease}/piper_linux_x86_64.tar.gz`,
    sha256: 'a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992',
    fileName: 'piper-linux.tar.gz',
    executable: 'piper',
  },
  win32: {
    archive: `https://github.com/rhasspy/piper/releases/download/${piperRelease}/piper_windows_amd64.zip`,
    sha256: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea',
    fileName: 'piper-windows.zip',
    executable: 'piper.exe',
  },
};

async function download(url, destination, expectedHash) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) {
    throw new Error(`Download gagal (${response.status}): ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  const actualHash = createHash('sha256').update(readFileSync(destination)).digest('hex');
  if (actualHash !== expectedHash) {
    rmSync(destination, { force: true });
    throw new Error(`Checksum SHA-256 tidak cocok untuk ${url}`);
  }
}

function matchesHash(filePath, expectedHash) {
  if (!existsSync(filePath)) return false;
  const actualHash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  return actualHash === expectedHash;
}

function verifySynthesizer(piperDir, executablePath, modelDir) {
  const smokeDirectory = mkdtempSync(join(resourcesRoot, '.smoke-'));
  const outputPath = join(smokeDirectory, 'sample.wav');
  try {
    const result = spawnSync(
      executablePath,
      [
        '--model',
        join(modelDir, modelFiles[0].name),
        '--output_file',
        outputPath,
        '--length_scale',
        '1.053',
        '--espeak_data',
        join(piperDir, 'espeak-ng-data'),
      ],
      {
        cwd: piperDir,
        encoding: 'utf8',
        input: 'Perhatian, panggilan uji AuraBell.',
        timeout: 60_000,
      }
    );
    if (result.error) {
      throw new Error(`Gagal menjalankan Piper smoke test: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(
        `Piper smoke test gagal (${result.status}): ${result.stderr.trim() || 'tanpa detail error'}`
      );
    }

    const audio = readFileSync(outputPath);
    if (audio.length <= 44 || audio.subarray(0, 4).toString() !== 'RIFF') {
      throw new Error('Piper smoke test tidak menghasilkan file WAV yang valid.');
    }
    console.log(`Piper berhasil mensintesis WAV (${audio.length} bytes).`);
  } finally {
    rmSync(smokeDirectory, { recursive: true, force: true });
  }
}

async function prepare() {
  if (!['linux', 'win32'].includes(process.platform) || process.arch !== 'x64') {
    throw new Error(
      `Bundel Piper hanya tersedia untuk Linux x64 dan Windows x64; platform saat ini ${process.platform}/${process.arch}.`
    );
  }

  const platformAsset = platformAssets[process.platform];
  const piperDir = join(resourcesRoot, 'piper');
  const modelDir = join(resourcesRoot, 'model');
  const executablePath = join(piperDir, platformAsset.executable);
  const runtimeFiles = process.platform === 'win32'
    ? ['espeak-ng.dll', 'onnxruntime.dll', 'onnxruntime_providers_shared.dll', 'piper_phonemize.dll']
    : ['libespeak-ng.so', 'libonnxruntime.so', 'libpiper_phonemize.so'];
  const cachedManifestPath = join(resourcesRoot, 'manifest.json');
  const expectedManifest = {
    piperRelease,
    modelRevision,
    platform: process.platform,
    architecture: process.arch,
  };

  let cachedManifest = null;
  if (existsSync(cachedManifestPath)) {
    try {
      cachedManifest = JSON.parse(readFileSync(cachedManifestPath, 'utf8'));
    } catch (error) {
      console.warn('Manifest resource TTS akan dibuat ulang:', error);
    }
  }
  if (
    existsSync(executablePath) &&
    existsSync(join(piperDir, 'espeak-ng-data')) &&
    runtimeFiles.every((file) => existsSync(join(piperDir, file))) &&
    modelFiles.every((file) => matchesHash(join(modelDir, file.name), file.sha256)) &&
    JSON.stringify(cachedManifest) === JSON.stringify(expectedManifest)
  ) {
    console.log('Resource Piper offline sudah tersedia dan terverifikasi.');
    if (process.argv.includes('--smoke')) {
      verifySynthesizer(piperDir, executablePath, modelDir);
    }
    return;
  }

  mkdirSync(resourcesRoot, { recursive: true });
  const temporaryDirectory = mkdtempSync(join(resourcesRoot, '.prepare-'));
  try {
    const archivePath = join(temporaryDirectory, platformAsset.fileName);
    const extractedDirectory = join(temporaryDirectory, 'extracted');
    const modelTemporaryDirectory = join(temporaryDirectory, 'model');
    mkdirSync(extractedDirectory);
    mkdirSync(modelTemporaryDirectory);

    await download(platformAsset.archive, archivePath, platformAsset.sha256);
    for (const file of modelFiles) {
      await download(
        `${modelBaseUrl}/${file.name}`,
        join(modelTemporaryDirectory, file.name),
        file.sha256
      );
    }
    await download(
      `https://raw.githubusercontent.com/rhasspy/piper/${piperRelease}/LICENSE.md`,
      join(temporaryDirectory, 'PIPER_LICENSE.md'),
      licenseSha256
    );

    if (process.platform === 'win32') {
      execFileSync(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Expand-Archive -LiteralPath $env:AURABELL_PIPER_ARCHIVE -DestinationPath $env:AURABELL_PIPER_EXTRACT -Force',
        ],
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            AURABELL_PIPER_ARCHIVE: archivePath,
            AURABELL_PIPER_EXTRACT: extractedDirectory,
          },
        }
      );
    } else {
      execFileSync('tar', ['-xzf', archivePath, '-C', extractedDirectory], {
        stdio: 'inherit',
      });
    }

    const extractedPiperDirectory = join(extractedDirectory, 'piper');
    if (!existsSync(join(extractedPiperDirectory, platformAsset.executable))) {
      throw new Error('Arsip Piper tidak berisi executable untuk platform ini.');
    }
    if (!existsSync(join(extractedPiperDirectory, 'espeak-ng-data'))) {
      throw new Error('Arsip Piper tidak berisi data eSpeak yang diperlukan.');
    }

    rmSync(piperDir, { recursive: true, force: true });
    rmSync(modelDir, { recursive: true, force: true });
    mkdirSync(resourcesRoot, { recursive: true });
    renameSync(extractedPiperDirectory, piperDir);
    mkdirSync(modelDir, { recursive: true });
    for (const file of modelFiles) {
      copyFileSync(join(modelTemporaryDirectory, file.name), join(modelDir, file.name));
    }
    copyFileSync(join(temporaryDirectory, 'PIPER_LICENSE.md'), join(piperDir, 'LICENSE.md'));
    if (process.argv.includes('--smoke')) {
      verifySynthesizer(piperDir, executablePath, modelDir);
    }
    writeFileSync(cachedManifestPath, `${JSON.stringify(expectedManifest, null, 2)}\n`);
    console.log(`Resource Piper offline siap untuk ${process.platform}/${process.arch}.`);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

prepare().catch((error) => {
  console.error('Gagal menyiapkan resource TTS offline:', error);
  process.exitCode = 1;
});
