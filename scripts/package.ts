// Packages the built app with electron-builder. Unsigned unless `--signed` (or
// VIBE_SIGNED_RELEASE=true) asks for a signed build, which then requires its credentials.
// Nothing is published from here; the release workflow uploads the files.
// Usage: node scripts/package.ts --win|--mac [--signed]
import { build } from 'electron-builder';
import { packagePlan, type PackagePlatform } from './package-config.ts';

const platform: PackagePlatform | undefined = process.argv.includes('--win') ? 'win' : process.argv.includes('--mac') ? 'mac' : undefined;
if (!platform) throw new Error('Choose --win or --mac');
const signed = process.argv.includes('--signed') || process.env.VIBE_SIGNED_RELEASE === 'true';
const plan = packagePlan(platform, { signed, env: process.env });
for (const name of plan.unset) Reflect.deleteProperty(process.env, name);
Object.assign(process.env, plan.env);
console.log(`Packaging ${platform}, ${signed ? 'signed' : 'unsigned'}`);
await build({ [platform]: [], config: plan.config, publish: 'never' });
