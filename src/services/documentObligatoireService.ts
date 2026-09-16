import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

/**
 * Service de gestion des documents obligatoires personnalisés par établissement
 */
export const documentObligatoireService = {
  /**
   * Créer un document obligatoire personnalisé
   */
  async createDocumentObligatoire(data: {
    etablissementId: string;
    nom: string;
    description?: string;
    typeDocument: string;
  }) {
    // Vérifier que l'établissement existe
    const etablissement = await prisma.etablissement.findUnique({
      where: { id: data.etablissementId },
    });

    if (!etablissement) {
      throw new ApiError(404, 'Établissement non trouvé');
    }

    // Créer le document obligatoire
    const documentObligatoire = await prisma.documentObligatoireEtablissement.create({
      data: {
        etablissementId: data.etablissementId,
        nom: data.nom,
        description: data.description,
        typeDocument: data.typeDocument,
        isActive: true,
      },
    });

    return documentObligatoire;
  },

  /**
   * Récupérer tous les documents obligatoires d'un établissement
   */
  async getDocumentsObligatoiresByEtablissement(etablissementId: string) {
    const documentsObligatoires = await prisma.documentObligatoireEtablissement.findMany({
      where: {
        etablissementId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return documentsObligatoires;
  },

  /**
   * Mettre à jour un document obligatoire
   */
  async updateDocumentObligatoire(
    id: string,
    data: {
      nom?: string;
      description?: string;
      typeDocument?: string;
      isActive?: boolean;
    }
  ) {
    const documentObligatoire = await prisma.documentObligatoireEtablissement.update({
      where: { id },
      data: {
        ...(data.nom && { nom: data.nom }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.typeDocument && { typeDocument: data.typeDocument }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return documentObligatoire;
  },

  /**
   * Supprimer un document obligatoire
   */
  async deleteDocumentObligatoire(id: string) {
    await prisma.documentObligatoireEtablissement.delete({
      where: { id },
    });
  },

  /**
   * Désactiver un document obligatoire
   */
  async deactivateDocumentObligatoire(id: string) {
    const documentObligatoire = await prisma.documentObligatoireEtablissement.update({
      where: { id },
      data: { isActive: false },
    });

    return documentObligatoire;
  },
};
