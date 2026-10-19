// What a package build changes in the electron-builder configuration of package.json. An
// unsigned build (the default) changes nothing and never looks for a certificate. A signed
// build is asked for explicitly and fails before building when a credential is missing, so a
// release that should be signed is never published unsigned.

export type PackagePlatform = 'win' | 'mac';

// electron-builder reads these from the environment; nothing here reads their values.
const WINDOWS_SIGNING = ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD'];
const MAC_SIGNING = ['CSC_LINK', 'CSC_KEY_PASSWORD'];
// Notarization takes an App Store Connect API key (recommended) or an Apple ID.
const MAC_NOTARIZATION = [
  ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER'],
  ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
];

export interface PackagePlan {
  // Deep-merged over the `build` section of package.json.
  config: Record<string, unknown>;
  env: Record<string, string>;
}

const present = (env: NodeJS.ProcessEnv, name: string): boolean => Boolean(env[name]?.trim());

// The credentials a signed build of `platform` lacks; [] when it has them all.
export function missingSigningCredentials(platform: PackagePlatform, env: NodeJS.ProcessEnv): string[] {
  if (platform === 'win') return WINDOWS_SIGNING.filter(name => !present(env, name));
  const notarization = MAC_NOTARIZATION.find(set => set.every(name => present(env, name)));
  return [
    ...MAC_SIGNING.filter(name => !present(env, name)),
    ...(notarization ? [] : [MAC_NOTARIZATION.map(set => set.join(' + ')).join(' or ')])
  ];
}

export function packagePlan(platform: PackagePlatform, { signed, env }: { signed: boolean; env: NodeJS.ProcessEnv }): PackagePlan {
  // Turning discovery off keeps electron-builder from signing with any identity it finds in the
  // keychain. An unsigned macOS app is still signed ad hoc (`-`): Apple silicon requires that.
  if (!signed) return { config: platform === 'mac' ? { mac: { identity: '-' } } : {}, env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false' } };
  const missing = missingSigningCredentials(platform, env);
  if (missing.length) throw new Error(`A signed ${platform} build needs ${missing.join(', ')}; nothing was built.`);
  // Without an identity electron-builder finds the certificate from CSC_LINK; forceCodeSigning
  // makes the build fail rather than finish unsigned should it still not sign.
  return platform === 'win'
    ? { config: { forceCodeSigning: true, win: { signExecutable: true } }, env: {} }
    : { config: { forceCodeSigning: true, mac: { hardenedRuntime: true, notarize: true } }, env: {} };
}
