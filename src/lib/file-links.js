import crypto from "crypto";
import path from "path";

/**
 * Signature des liens de fichiers.
 *
 * Le secret est lu à chaque appel (et non au chargement du module) : il peut ainsi
 * provenir d'une variable d'environnement mise à jour sans redémarrer le module.
 * On privilégie `FILE_SIGN_SECRET`, qui ne doit jamais changer ; `JWT_SECRET` n'est
 * qu'un repli de compatibilité car sa rotation invalide les anciennes URL.
 */
const fileSecret = () =>
  process.env.FILE_SIGN_SECRET || process.env.JWT_SECRET || "kidsmed-secret-key-file-signing";

const publicBaseUrl = () =>
  (process.env.PUBLIC_URL || process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");

/**
 * Génère une URL d'accès pour un fichier téléversé.
 *
 * @param {string} filename - Nom du fichier enregistré
 * @param {number} [expiresInSec=31536000] - Durée de validité en secondes (1 an par défaut)
 * @returns {string|null} URL signée
 */
export function signFile(filename, expiresInSec = 31536000) {
  if (!filename) return null;

  // Si c'est déjà une URL complète (Cloudinary, S3, lien externe), la retourner telle quelle.
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Déjà une URL signée relative : la compléter avec la base si besoin.
  if (filename.includes("/api/fichiers/")) {
    return filename.startsWith("http") ? filename : `${publicBaseUrl()}${filename}`;
  }

  // Nettoyer le nom du fichier au cas où il contient un chemin relatif ou une query.
  const cleanFilename = path.basename(filename.split("?")[0]);

  const exp = Math.floor(Date.now() / 1000) + Math.max(60, Number(expiresInSec) || 31536000);
  const sig = crypto.createHmac("sha256", fileSecret()).update(`${cleanFilename}:${exp}`).digest("hex");

  return `${publicBaseUrl()}/api/fichiers/${encodeURIComponent(cleanFilename)}?exp=${exp}&sig=${sig}`;
}

/**
 * Vérifie l'authenticité et la validité temporelle d'un fichier demandé via URL signée.
 *
 * @param {string} name - Nom du fichier
 * @param {string|number} exp - Timestamp d'expiration (en secondes)
 * @param {string} sig - Signature HMAC envoyée dans la requête
 * @returns {boolean} true si le lien est valide et non expiré
 */
export function verifyFile(name, exp, sig) {
  if (!name || !exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = crypto.createHmac("sha256", fileSecret()).update(`${name}:${exp}`).digest("hex");
  try {
    const a = Buffer.from(String(sig), "hex");
    const b = Buffer.from(expectedSig, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Re-signe une URL de fichier déjà stockée en base.
 *
 * Les URL signées étaient persistées telles quelles (avatarUrl, photoUrl…). Quand
 * le secret change, elles restent en base avec une signature devenue invalide et
 * l'image renvoie 403. On ne conserve donc plus la signature : on l'extrait du nom
 * de fichier et on en génère une nouvelle à chaque lecture.
 *
 * @param {string} url - URL absolue ou relative (`/api/fichiers/<nom>?exp=…&sig=…`)
 * @param {number} [expiresInSec=31536000] - Nouvelle durée de validité
 * @returns {string} URL re-signée (ou valeur inchangée si ce n'est pas un fichier interne)
 */
export function refreshFileUrl(url, expiresInSec = 3600 * 24 * 365) {
  if (typeof url !== "string" || !url.includes("/api/fichiers/")) return url;
  const after = url.split("/api/fichiers/")[1] ?? "";
  const rawName = after.split("?")[0].split("#")[0];
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    /* nom déjà décodé */
  }
  const clean = path.basename(name);
  if (!clean) return url;
  return signFile(clean, expiresInSec);
}
