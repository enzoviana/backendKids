/**
 * Documents exigés par défaut pour le dossier d'inscription d'une crèche.
 * La crèche peut ensuite les modifier ou les supprimer depuis « Documents obligatoires ».
 */
export const DEFAULT_DOCUMENTS_OBLIGATOIRES = [
  { type: "Certificat médical d'aptitude", description: "Aptitude à la vie en collectivité", validiteMois: 12 },
  { type: "Carnet de vaccination", description: "Vaccins obligatoires à jour", validiteMois: 12 },
  { type: "Justificatif de domicile", description: "Justificatif de moins de 3 mois", validiteMois: 12 },
  { type: "Attestation CAF", description: "Attestation d'allocations familiales", validiteMois: 12 },
  { type: "Autorisation de soins", description: "Autorisation parentale en cas d'urgence", validiteMois: null },
  { type: "PAI signé (si allergie)", description: "Projet d'accueil individualisé", validiteMois: 12 },
];

/** Crée les documents obligatoires par défaut s'ils n'existent pas déjà pour la crèche. */
export async function ensureDefaultDocuments(prisma, etablissementId) {
  if (!etablissementId) return;
  const existing = await prisma.documentObligatoire.count({ where: { etablissementId } });
  if (existing > 0) return;
  await prisma.documentObligatoire.createMany({
    data: DEFAULT_DOCUMENTS_OBLIGATOIRES.map((d) => ({ ...d, etablissementId })),
  });
}
