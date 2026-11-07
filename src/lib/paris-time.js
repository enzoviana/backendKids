/**
 * Heure et jour à Europe/Paris, indépendamment du fuseau du serveur.
 * Utile sur Render (souvent en UTC) pour appliquer les horaires 08:00–20:00 locaux.
 */
const PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "long",
  hourCycle: "h23",
});

const JOURS = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 };

export function parisParts(date = new Date()) {
  const parts = Object.fromEntries(PARIS.formatToParts(date).map((p) => [p.type, p.value]));
  const weekday = String(parts.weekday ?? "").toLowerCase();
  return {
    hm: `${parts.hour}:${parts.minute}`,
    jour: JOURS[weekday] ?? 1,
  };
}

export const hm = (date = new Date()) => parisParts(date).hm;
export const jourIso = (date = new Date()) => parisParts(date).jour;

export function dansPlageParis(plages, date = new Date()) {
  if (!Array.isArray(plages) || plages.length === 0) return true;
  const { hm: heure, jour } = parisParts(date);
  return plages.some((p) => Number(p.jour) === jour && heure >= p.debut && heure <= p.fin);
}
