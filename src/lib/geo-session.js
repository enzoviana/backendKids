/**
 * Sessions de géolocalisation RSAI (mémoire du serveur).
 *
 * Les clients mobile, web et PWA appellent déjà `/securite/verifier-position`
 * ou `/securite/verifier-acces` avant d'ouvrir un dossier. On mémorise la
 * dernière position validée pour que les routes de données puissent exiger
 * une vérification récente, au lieu de faire confiance au seul client.
 *
 * Limite : une position validée reste valable 24 h (pas de suivi continu).
 * Un redémarrage du serveur vide le cache ; le client doit alors revérifier.
 */
const TTL_MS = 24 * 3600_000;
const MAX_ENTRIES = 5_000;
const sessions = new Map();

function prune(now) {
  for (const [userId, session] of sessions) {
    if (now - session.at > TTL_MS) sessions.delete(userId);
  }
  while (sessions.size > MAX_ENTRIES) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) break;
    sessions.delete(oldest);
  }
}

export function rememberGeo(userId, lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!userId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const now = Date.now();
  prune(now);
  sessions.set(userId, { lat: latitude, lng: longitude, at: now });
  return true;
}

export function getGeoSession(userId) {
  if (!userId) return null;
  const session = sessions.get(userId);
  if (!session) return null;
  if (Date.now() - session.at > TTL_MS) {
    sessions.delete(userId);
    return null;
  }
  return session;
}

export function clearGeoSession(userId) {
  sessions.delete(userId);
}
