/**
 * Valeurs de sécurité par défaut de la plateforme.
 *
 * Une crèche hérite de ces valeurs tant que `securitePersonnalisee` est false.
 * Dès que l'administrateur enregistre un réglage dans la fiche de la crèche,
 * la crèche passe en mode personnalisé et n'utilise plus ces valeurs.
 */
export const DEFAULT_SECURITE = Object.freeze({
  rayonMetres: 50,
  blocageHorsZone: true,
  plagesHoraires: [1, 2, 3, 4, 5, 6, 7].map((jour) => ({ jour, debut: "08:00", fin: "20:00" })),
});

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Nettoie une liste de plages horaires (1 = lundi … 7 = dimanche). */
export function normalizePlages(plages) {
  if (!Array.isArray(plages)) return [];
  return plages
    .map((p) => ({
      jour: Number(p?.jour),
      debut: String(p?.debut ?? "08:00"),
      fin: String(p?.fin ?? "20:00"),
    }))
    .filter((p) => Number.isInteger(p.jour) && p.jour >= 1 && p.jour <= 7 && HEURE.test(p.debut) && HEURE.test(p.fin))
    .sort((a, b) => a.jour - b.jour);
}

/** Valeurs par défaut effectives (config globales ou constantes). */
export async function getGlobalSecurity(prisma) {
  const r = await prisma.reglesAcces.findUnique({ where: { id: "global" } });
  if (!r) return { ...DEFAULT_SECURITE, plagesHoraires: DEFAULT_SECURITE.plagesHoraires.map((p) => ({ ...p })) };
  return {
    rayonMetres: r.rayonDefaut ?? DEFAULT_SECURITE.rayonMetres,
    blocageHorsZone: r.blocageDefaut ?? DEFAULT_SECURITE.blocageHorsZone,
    // Un tableau vide est un choix explicite : aucune restriction horaire.
    plagesHoraires: normalizePlages(r.plagesDefaut),
  };
}

/** Valeurs effectives d'une crèche : personnalisées, sinon valeurs globales. */
export function effectiveSecurity(etablissement, defauts = DEFAULT_SECURITE) {
  const custom = etablissement?.securitePersonnalisee === true;
  return {
    rayonMetres: custom ? etablissement.rayonMetres : defauts.rayonMetres,
    blocageHorsZone: custom ? etablissement.blocageHorsZone : defauts.blocageHorsZone,
    plagesHoraires: custom ? normalizePlages(etablissement.plagesHoraires) : defauts.plagesHoraires,
  };
}
