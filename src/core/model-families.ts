// What the app knows about model families. No provider publishes a model's tier or which
// quota covers it, so this is matched by name; this table is the only place that knows it.

// From the most capable to the fastest.
const MODEL_TIERS = ['flagship', 'balanced', 'fast'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

interface ModelFamily {
  // The capability tier a model is matched to on another tool.
  tier?: ModelTier;
  // Providers report quota for the family under its own name (Claude's "Fable" limit).
  quotaScope?: boolean;
  // Its usage can be billed outside the general limits: without its own scope its quota is
  // unknown rather than covered by them.
  scopeRequired?: boolean;
  // Claude Code resolves the family's name to its newest model (`claude --model opus`).
  claudeAlias?: boolean;
}

// Within a tier, the most preferred family first.
const MODEL_FAMILIES: Readonly<Record<string, ModelFamily>> = {
  opus: { tier: 'flagship', quotaScope: true, claudeAlias: true },
  fable: { tier: 'flagship', quotaScope: true, scopeRequired: true, claudeAlias: true },
  terra: { tier: 'flagship' },
  sol: { tier: 'flagship' },
  pro: { tier: 'flagship' },
  'grok-4': { tier: 'flagship' },
  sonnet: { tier: 'balanced', quotaScope: true, claudeAlias: true },
  luna: { tier: 'balanced' },
  flash: { tier: 'balanced' },
  composer: { tier: 'balanced' },
  haiku: { tier: 'fast', quotaScope: true, claudeAlias: true },
  mini: { tier: 'fast' },
  nano: { tier: 'fast' },
  lite: { tier: 'fast' },
  spark: { tier: 'fast' },
  gemini: { quotaScope: true },
  gpt: { quotaScope: true }
};
const FAMILIES = Object.entries(MODEL_FAMILIES).map(([name, family]) => ({ name, ...family }));

// Whether a model or quota scope name belongs to the family: as a word of its own, so that
// "gemini" is not taken for "mini".
export const nameMatchesFamily = (name: string, family: string): boolean => familyPosition(name, family) >= 0;

// Where the family's name stands in a name as a word of its own; -1 when it does not.
function familyPosition(name: string, family: string): number {
  const match = new RegExp(`(^|[^a-z])${RegExp.escape(family)}([^a-z]|$)`).exec(name.toLowerCase());
  return match ? match.index + (match[1] ?? '').length : -1;
}

// The tier's families, most preferred first.
export const tierFamilies = (tier: ModelTier): string[] => FAMILIES.filter(f => f.tier === tier).map(f => f.name);

// A model's tier: a name naming several families takes the last one, as a variant is named after
// its base (`gemini-2.5-flash-lite` is the lite one, `gpt-5.4-mini` the mini one).
export function modelTier(model: string): ModelTier | undefined {
  let tier: ModelTier | undefined;
  let last = -1;
  for (const family of FAMILIES) {
    const at = family.tier ? familyPosition(model, family.name) : -1;
    if (at > last) [tier, last] = [family.tier, at];
  }
  return tier;
}

// The family a provider would report the model's own quota under, if any.
export function quotaScopeFamily(model: string | undefined): { name: string; scopeRequired: boolean } | undefined {
  const family = model ? FAMILIES.find(f => f.quotaScope && nameMatchesFamily(model, f.name)) : undefined;
  return family ? { name: family.name, scopeRequired: family.scopeRequired === true } : undefined;
}

// The names Claude Code takes for its newest model of a family, most capable first.
export const CLAUDE_ALIASES: readonly string[] = MODEL_TIERS.flatMap(tier =>
  FAMILIES.filter(f => f.tier === tier && f.claudeAlias).map(f => f.name)
);

// Claude Code's alias for the newest model of the tier.
export function claudeAlias(tier: ModelTier): string {
  const alias = FAMILIES.find(f => f.tier === tier && f.claudeAlias);
  if (!alias) throw new Error(`no Claude Code alias for the ${tier} tier`);
  return alias.name;
}
