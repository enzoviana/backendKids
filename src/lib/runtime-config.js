// Configuration d'exécution.
//
// Toutes les variables listées dans `CONFIG_KEYS` peuvent être enregistrées depuis la
// console développeur (`PUT /api/developer/config`) et sont relues à chaud, sans
// redéploiement :
//   - `cfg()`      : lecture asynchrone (base puis environnement), met en cache ;
//   - `cfgSync()`  : lecture synchrone du cache (utile dans les templates e-mail, les
//                    liens signés, WebAuthn…) après `preloadConfig()`.
//
// Les variables d'infrastructure (DATABASE_URL, JWT_SECRET, PORT, UPLOAD_DIR,
// NODE_ENV, SEED_*, RENDER_*) ne sont volontairement pas éditables : elles sont lues
// au démarrage, et changer JWT_SECRET invaliderait toutes les sessions et les secrets
// TOTP existants.

/**
 * Variables exposées dans la console développeur.
 */
export const CONFIG_KEYS = [
  // E-mails
  'EMAIL_PROVIDER',
  'EMAIL_MOCK_MODE',
  'EMAIL_FROM',
  'SENDGRID_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_NAME',
  'SMTP_TLS_REJECT_UNAUTHORIZED',
  // SMS / MFA
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM',
  'MFA_DEMO_CODE',
  'MSG_MFA',
  'MSG_ALERTE_ACCES',
  // Application et liens des e-mails
  'APP_NAME',
  'APP_SUPPORT_EMAIL',
  'PUBLIC_URL',
  'FRONTEND_URL',
  'FRONTEND_LOGIN_URL',
  'FRONTEND_RESET_PASSWORD_URL',
  'FRONTEND_ACTIVATE_ACCOUNT_URL',
  'FRONTEND_MESSAGES_URL',
  'FRONTEND_TRANSMISSIONS_URL',
  'FRONTEND_AFFECTATIONS_URL',
  'FRONTEND_DOCUMENTS_URL',
  'FRONTEND_VACCINS_URL',
  'FRONTEND_ORDONNANCES_URL',
  'FRONTEND_FACTURES_URL',
  'FRONTEND_PREFERENCES_URL',
  'FRONTEND_SUPPORT_URL',
  // Localisation
  'GEOCODING_API_KEY',
  // Paiement
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  // Sécurité et WebAuthn
  'WEBAUTHN_RP_ID',
  'WEBAUTHN_ORIGINS',
  'FILE_SIGN_SECRET',
  // Accès API
  'CORS_ORIGINS',
];

/**
 * Variables d'infrastructure : affichées comme non modifiables dans la console.
 * Elles nécessitent une modification de l'environnement et un redémarrage.
 */
export const READONLY_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'UPLOAD_DIR',
  'NODE_ENV',
  'SEED_PASSWORD',
  'SEED_PHONE',
];

/**
 * Clés masquées dans les réponses API et jamais réaffichées en clair.
 */
export const SECRET_KEYS = [
  'SENDGRID_API_KEY',
  'SMTP_PASSWORD',
  'TWILIO_AUTH_TOKEN',
  'MFA_DEMO_CODE',
  'GEOCODING_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FILE_SIGN_SECRET',
];

const KNOWN_KEYS = new Set(CONFIG_KEYS);

/** Valeur en cache : chaîne non vide, ou `null` quand la base n'a pas de valeur. */
const cache = new Map();

function fromEnv(key, defaultValue) {
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== '') return envValue;
  return defaultValue ?? '';
}

/**
 * Charge en mémoire toutes les valeurs stockées en base.
 * Appelé au démarrage puis après chaque enregistrement depuis la console.
 */
export async function preloadConfig() {
  const { prisma } = await import('./core.js');
  try {
    const rows = await prisma.configEntry.findMany();
    cache.clear();
    for (const key of CONFIG_KEYS) cache.set(key, null);
    for (const row of rows) {
      if (!KNOWN_KEYS.has(row.key)) continue;
      cache.set(row.key, row.value ? row.value : null);
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Configuration : chargement depuis la base impossible —', error.message);
    return false;
  }
}

/** Vide le cache : la prochaine lecture repassera par la base. */
export function clearConfigCache() {
  cache.clear();
}

/**
 * Lecture synchrone (cache uniquement, puis environnement).
 * À n'utiliser que pour les valeurs déjà chargées par `preloadConfig()`/`cfg()`.
 */
export function cfgSync(key, defaultValue = '') {
  if (cache.has(key)) {
    const value = cache.get(key);
    if (value) return value;
  }
  return fromEnv(key, defaultValue);
}

/**
 * Lecture de la configuration effective : base de données en priorité, puis
 * variables d'environnement, puis valeur par défaut.
 */
export async function cfg(key, defaultValue = '') {
  if (cache.has(key)) {
    const value = cache.get(key);
    if (value) return value;
    return fromEnv(key, defaultValue);
  }

  const { prisma } = await import('./core.js');
  try {
    const entry = await prisma.configEntry.findUnique({ where: { key } });
    const value = entry && entry.value ? entry.value : null;
    cache.set(key, value);
    if (value) return value;
  } catch (error) {
    // Pas de cache sur erreur : une panne passagère ne doit pas figer la valeur.
    console.warn(`Configuration : lecture de ${key} impossible —`, error.message);
  }

  return fromEnv(key, defaultValue);
}

/**
 * Origine de la valeur effective d'une clé :
 * `base` (console développeur), `environnement` ou `défaut`.
 */
export function cfgSource(key) {
  if (cache.has(key) && cache.get(key)) return 'base';
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== '') return 'environnement';
  return 'défaut';
}

/**
 * Origine de plusieurs clés, dans l'ordre demandé.
 */
export function configSources(keys) {
  return keys.map((key) => ({ key, source: cfgSource(key) }));
}

/**
 * Lecture de plusieurs clés en une fois (console développeur).
 */
export async function readConfig(keys = CONFIG_KEYS) {
  const out = {};
  for (const key of keys) out[key] = await cfg(key);
  return out;
}

/** Masque une valeur secrète sans jamais révéler son contenu complet. */
export function maskSecret(value) {
  const v = String(value ?? '');
  if (!v) return '';
  if (v.length <= 8) return '••••';
  return `${v.slice(0, 3)}••••${v.slice(-4)}`;
}
