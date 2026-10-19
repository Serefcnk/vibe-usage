// Removes recognizable credentials from text the app passes on to another tool (a handover
// brief). Patterns match the documented shapes of common keys, so ordinary text such as paths,
// commit hashes and prose stays intact; a secret of an unknown shape (a password given as a
// command-line flag, a wallet's word list) is not detected.
export const REDACTED = '[REDACTED_SECRET]';

// Names that always announce a credential in `name=value` or `"name": "value"` form, optionally
// prefixed (DB_PASSWORD, STRIPE_SECRET_KEY, config.secret_key_base). The name must end there:
// `max_tokens` is not one.
const SECRET_NAME = String.raw`\b([\w.-]*?(?:password|passwd|pwd|secret|token|credentials?|api[_-]?key|access[_-]?key|private[_-]?key|secret[_-]?key|key[_-]?base))\b`;
// Any other name ending in `key` (ENCRYPTION_KEY, signingKey) counts only with a value that
// looks generated, since `sortKey: "createdAt"` is not a secret.
const KEY_NAME = String.raw`\b([\w.-]*?key)\b`;
const GENERATED = (quote: string) => String.raw`(?=[^${quote}\s]*\d)(?=[^${quote}\s]*[A-Za-z])[^${quote}\s]{16,}`;
// A value in double, single or back quotes, which may contain escaped quotes.
const quoted = (body: (quote: string) => string) => ['"', "'", '`'].map(quote => String.raw`${quote}${body(quote)}${quote}`).join('|');
const ANY_VALUE = (quote: string) => String.raw`(?:\\.|[^${quote}\\\r\n]){4,}?`;
// The end of an unquoted value.
const UNQUOTED_END = String.raw`(?=$|[\s"'\`,;&)}\]])`;

type Replacement = string | ((match: string, ...groups: string[]) => string);

// Keeps the name, the separator and the quotes; only the value goes.
const keepQuotes = (_match: string, name: string, separator: string, value: string): string =>
  `${name}${separator}${value.charAt(0)}${REDACTED}${value.charAt(0)}`;

// Ordered: whole key blocks first, then token shapes, then values announced by their name.
const PATTERNS: readonly (readonly [RegExp, Replacement])[] = [
  // PEM and PGP private keys. An unterminated block (a clipped message) is redacted to the end.
  [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----|$)/g, REDACTED],
  // OpenAI (sk-, sk-proj-) and Anthropic (sk-ant-) API keys.
  [/\bsk-[A-Za-z0-9_-]{20,}/g, REDACTED],
  // Stripe secret and restricted keys.
  [/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g, REDACTED],
  // GitHub personal, OAuth, app and refresh tokens, and fine-grained tokens.
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, REDACTED],
  // GitLab personal access tokens, npm and Hugging Face tokens.
  [/\b(?:glpat-[A-Za-z0-9_-]{20,}|npm_[A-Za-z0-9]{36}|hf_[A-Za-z0-9]{30,})/g, REDACTED],
  // AWS access key ids (long-term and temporary).
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, REDACTED],
  // Slack bot, user, app and refresh tokens.
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, REDACTED],
  // Google API keys and OAuth access tokens.
  [/\b(?:AIza[0-9A-Za-z_-]{35}|ya29\.[A-Za-z0-9_-]{20,})/g, REDACTED],
  // JSON Web Tokens: two base64url JSON segments (`{"` encodes as `eyJ`) and a signature.
  [/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, REDACTED],
  // Any credential in an Authorization header (also as a JSON field), whatever its length.
  [/(\bAuthorization["']?\s*:\s*["']?(?:Bearer|Basic|token)\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${REDACTED}`],
  // A bearer token elsewhere is recognized by its length: "Bearer" alone is an ordinary word.
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, `Bearer ${REDACTED}`],
  // The password in a URL's user info (postgres://user:password@host), up to the last `@`
  // before the host, since a password may contain one.
  [/(\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s/]*@/gi, `$1${REDACTED}@`],
  // A quoted value after `:` or `=`: JSON, YAML, code.
  [new RegExp(String.raw`${SECRET_NAME}(["'\`]?\s*[:=]\s*)(${quoted(ANY_VALUE)})`, 'gi'), keepQuotes],
  [new RegExp(String.raw`${KEY_NAME}(["'\`]?\s*[:=]\s*)(${quoted(GENERATED)})`, 'gi'), keepQuotes],
  // An unquoted value after `=` (shell, .env, URL queries, connection strings). A call such
  // as `token = getToken()` is code, not a value.
  [new RegExp(String.raw`${SECRET_NAME}(\s*=\s*)[^\s"'\`,;&(){}<>[\]]{8,}${UNQUOTED_END}`, 'gi'), `$1$2${REDACTED}`],
  // An unquoted value after `:` (YAML, headers) counts only when it mixes letters and digits,
  // so prose like `token: required` stays.
  [
    new RegExp(String.raw`${SECRET_NAME}(\s*:\s*)(?=[^\s"'\`]*\d)(?=[^\s"'\`]*[A-Za-z])[^\s"'\`,;(){}<>[\]]{8,}${UNQUOTED_END}`, 'gi'),
    `$1$2${REDACTED}`
  ],
  [new RegExp(String.raw`${KEY_NAME}(\s*[:=]\s*)${GENERATED(String.raw`"'\`,;(){}<>[\]`)}${UNQUOTED_END}`, 'gi'), `$1$2${REDACTED}`]
];

export function redactSecrets(text: string): string {
  return PATTERNS.reduce(
    (result, [pattern, replacement]) =>
      typeof replacement === 'string' ? result.replace(pattern, replacement) : result.replace(pattern, replacement),
    text
  );
}
