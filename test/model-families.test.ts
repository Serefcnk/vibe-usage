import assert from 'node:assert/strict';
import test from 'node:test';
import { CLAUDE_ALIASES, claudeAlias, modelTier, nameMatchesFamily, quotaScopeFamily, tierFamilies } from '../src/core/model-families.ts';

test('a family matches as a word of its own, in model ids, display names and scope names alike', () => {
  assert.equal(nameMatchesFamily('claude-fable-5-1', 'fable'), true);
  assert.equal(nameMatchesFamily('Fable', 'fable'), true, 'a quota scope as Claude reports it');
  assert.equal(nameMatchesFamily('gemini-3.8-flash', 'mini'), false, '"gemini" is not the "mini" family');
  assert.equal(nameMatchesFamily('opusplan', 'opus'), false);
});

test('tiers, quota scopes and Claude Code aliases come from the one table', () => {
  assert.equal(modelTier('gpt-5.4-mini-high'), 'fast');
  assert.equal(modelTier('gemini-2.5-flash-lite'), 'fast', 'a variant named after its base is the variant');
  assert.equal(modelTier('gemini-2.5-flash'), 'balanced');
  assert.equal(modelTier('unknown-model'), undefined);
  assert.deepEqual(tierFamilies('fast').slice(0, 2), ['haiku', 'mini'], 'most preferred first');
  assert.deepEqual(quotaScopeFamily('claude-fable-5-1'), { name: 'fable', scopeRequired: true });
  assert.deepEqual(quotaScopeFamily('gpt-5.4-mini'), { name: 'gpt', scopeRequired: false }, 'a tier family is not a quota scope');
  assert.equal(quotaScopeFamily(undefined), undefined);
  assert.deepEqual(CLAUDE_ALIASES, ['opus', 'fable', 'sonnet', 'haiku']);
  assert.equal(claudeAlias('fast'), 'haiku');
});
