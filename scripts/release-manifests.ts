// Writes the package manager manifests for the version in package.json from the packages in
// release/: a winget manifest set (zip with a portable app) and a Homebrew cask. Run it after
// downloading a release's packages into release/; see docs/RELEASING.md.
// Usage: node scripts/release-manifests.ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isObject } from '../src/core/files.ts';
import { APP_NAME, APP_REPOSITORY, APP_SLUG } from '../src/shared/catalog.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

const WINGET_ID = 'MustafaCagriGuven.VibeUsage';
const WINGET_MANIFEST_VERSION = '1.6.0';
const CASK = APP_SLUG;
const RELEASE_DIR = path.join(ROOT, 'release');
const OUT_DIR = path.join(RELEASE_DIR, 'manifests');

// The package fields the manifests carry; a release is not made from a package without them.
function readPackage(): { version: string; description: string; author: string } {
  const pkg: unknown = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (!isObject(pkg)) throw new Error('package.json is not an object');
  const { version, description, author } = pkg;
  if (typeof version !== 'string' || typeof description !== 'string' || typeof author !== 'string')
    throw new Error('package.json needs a version, a description and an author');
  return { version, description, author };
}
const pkg = readPackage();
const { version } = pkg;
const download = (file: string): string => `https://github.com/${APP_REPOSITORY}/releases/download/v${version}/${file}`;
const sha256 = (file: string): string =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(RELEASE_DIR, file)))
    .digest('hex');

// The packages of this version, by platform and architecture (named by package.json's artifactName).
function packages(os: 'win' | 'mac', extension: string): { arch: string; file: string }[] {
  const pattern = new RegExp(`^Vibe-Usage-${version.replaceAll('.', '\\.')}-${os}-(x64|arm64)\\.${extension}$`);
  return fs.readdirSync(RELEASE_DIR).flatMap(file => {
    const arch = pattern.exec(file)?.[1];
    return arch ? [{ arch, file }] : [];
  });
}

function winget(): void {
  const zips = packages('win', 'zip');
  if (!zips.length) throw new Error(`no Windows zip for ${version} in release/`);
  const dir = path.join(OUT_DIR, 'winget', version);
  fs.mkdirSync(dir, { recursive: true });
  const header = (type: string): string[] => [
    `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${WINGET_MANIFEST_VERSION}.schema.json`,
    `PackageIdentifier: ${WINGET_ID}`,
    `PackageVersion: ${version}`
  ];
  const footer = (type: string): string[] => [`ManifestType: ${type}`, `ManifestVersion: ${WINGET_MANIFEST_VERSION}`, ''];
  fs.writeFileSync(
    path.join(dir, `${WINGET_ID}.yaml`),
    [...header('version'), 'DefaultPackageLocale: en-US', ...footer('version')].join('\n')
  );
  fs.writeFileSync(
    path.join(dir, `${WINGET_ID}.installer.yaml`),
    [
      ...header('installer'),
      'InstallerType: zip',
      'NestedInstallerType: portable',
      'NestedInstallerFiles:',
      `  - RelativeFilePath: ${APP_NAME}.exe`,
      `    PortableCommandAlias: ${CASK}`,
      'Installers:',
      ...zips.flatMap(({ arch, file }) => [
        `  - Architecture: ${arch}`,
        `    InstallerUrl: ${download(file)}`,
        `    InstallerSha256: ${sha256(file).toUpperCase()}`
      ]),
      ...footer('installer')
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(dir, `${WINGET_ID}.locale.en-US.yaml`),
    [
      ...header('defaultLocale'),
      'PackageLocale: en-US',
      `Publisher: ${pkg.author}`,
      `PackageName: ${APP_NAME}`,
      'License: MIT',
      `ShortDescription: ${pkg.description}`,
      `PackageUrl: https://github.com/${APP_REPOSITORY}`,
      `ReleaseNotesUrl: https://github.com/${APP_REPOSITORY}/releases/tag/v${version}`,
      ...footer('defaultLocale')
    ].join('\n')
  );
}

function cask(): void {
  const dmgs = packages('mac', 'dmg');
  if (!dmgs.length) throw new Error(`no macOS dmg for ${version} in release/`);
  const byArch = (arch: string) => dmgs.find(p => p.arch === arch);
  const arm = byArch('arm64');
  const intel = byArch('x64');
  const single = arm ?? intel;
  if (!single) throw new Error(`no macOS dmg for ${version} in release/`);
  // One architecture: a plain sha256; both: per architecture.
  const lines =
    arm && intel
      ? [
          '  arch arm: "arm64", intel: "x64"',
          '',
          `  version "${version}"`,
          `  sha256 arm:   "${sha256(arm.file)}",`,
          `         intel: "${sha256(intel.file)}"`,
          '',
          `  url "https://github.com/${APP_REPOSITORY}/releases/download/v#{version}/Vibe-Usage-#{version}-mac-#{arch}.dmg"`,
          ''
        ]
      : [
          ...(arm ? ['  depends_on arch: :arm64', ''] : []),
          `  version "${version}"`,
          `  sha256 "${sha256(single.file)}"`,
          '',
          `  url "https://github.com/${APP_REPOSITORY}/releases/download/v#{version}/Vibe-Usage-#{version}-mac-${single.arch}.dmg"`,
          ''
        ];
  const text = [
    `cask "${CASK}" do`,
    ...lines,
    `  name "${APP_NAME}"`,
    `  desc "${pkg.description.replace(/"/g, '\\"')}"`,
    `  homepage "https://github.com/${APP_REPOSITORY}"`,
    '',
    `  app "${APP_NAME}.app"`,
    '',
    `  zap trash: "~/Library/Application Support/${APP_NAME}"`,
    'end',
    ''
  ].join('\n');
  fs.mkdirSync(path.join(OUT_DIR, 'homebrew'), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'homebrew', `${CASK}.rb`), text);
}

const made: string[] = [];
for (const [name, write] of [
  ['winget', winget],
  ['homebrew', cask]
] as const) {
  try {
    write();
    made.push(name);
  } catch (error) {
    console.warn(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(made.length ? `Manifests (${made.join(', ')}): ${OUT_DIR}` : 'No manifests written.');
process.exitCode = made.length ? 0 : 1;
