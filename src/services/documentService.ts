import prisma from '../config/prisma';
import { ApiError } from '../middleware/errorHandler';
import { differenceInDays } from 'date-fns';

/**
 * Calculer le statut réel d'un document basé sur l'expiration
 */
const calculateDocumentStatus = (doc: any): string => {
  if (doc.statut === 'rejete' || doc.statut === 'en_attente' || doc.statut === 'soumis') {
    return doc.statut;
  }

  if (!doc.dateExpiration) return doc.statut;

  const daysUntilExpiry = differenceInDays(new Date(doc.dateExpiration), new Date());

  if (daysUntilExpiry < 0) return 'expire';
  if (daysUntilExpiry < 30) return 'expire_bientot';

  return 'valide';
};

/**
 * Service de gestion des documents
 */
export class DocumentService {
  /**
   * Demander un document à un parent
   */
  async demanderDocument(data: {
    enfantId: string;
    type: string;
    commentaire?: string;
    auteurId: string;
    auteurRole: string;
  }) {
    const { enfantId, type, commentaire, auteurId, auteurRole } = data;

    // Créer le document
    const document = await prisma.document.create({
      data: {
        enfantId,
        type: type as any,
        nom: '',
        statut: 'en_attente',
        obligatoire: true,
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId,
        type: 'demande',
        auteurId,
        auteurRole: auteurRole as any,
        commentaire,
      },
    });

    // Récupérer l'enfant pour notifier les parents
    const enfant = await prisma.enfant.findUnique({
      where: { id: enfantId },
      include: {
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Créer une notification pour chaque parent
    if (enfant) {
      for (const parent of enfant.parents) {
        await prisma.notification.create({
          data: {
            destinataireId: parent.id,
            destinataireRole: 'parent',
            enfantId,
            documentId: document.id,
            type: 'document_demande',
            titre: 'Document requis',
            message: `Merci de fournir le document: ${type.replace('_', ' ')} pour ${enfant.prenom}`,
            priorite: 'haute',
          },
        });
      }
    }

    return document;
  }

  /**
   * Uploader un document (parent)
   */
  async uploadDocument(data: {
    documentId: string;
    nom: string;
    fichierUrl: string;
    userId: string;
  }) {
    const { documentId, nom, fichierUrl, userId } = data;

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        nom,
        fichierUrl,
        statut: 'soumis',
        dateUpload: new Date(),
        uploadedBy: userId,
      },
      include: {
        enfant: true,
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId: document.enfantId,
        type: 'upload',
        auteurId: userId,
        auteurRole: 'parent',
        commentaire: `Document uploadé: ${nom}`,
      },
    });

    // Notifier la crèche
    await prisma.notification.create({
      data: {
        destinataireId: userId, // Temporaire, devrait être l'établissement
        destinataireRole: 'creche',
        enfantId: document.enfantId,
        documentId: document.id,
        type: 'info_generale',
        titre: 'Nouveau document soumis',
        message: `Document soumis pour ${document.enfant.prenom}: ${document.type}`,
        priorite: 'normale',
      },
    });

    return document;
  }

  /**
   * Valider un document
   */
  async validerDocument(data: {
    documentId: string;
    auteurId: string;
    auteurRole: string;
    dateExpiration?: string;
  }) {
    const { documentId, auteurId, auteurRole, dateExpiration } = data;

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        statut: 'valide',
        dateValidation: new Date(),
        validatedBy: auteurId,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
      },
      include: {
        enfant: {
          include: {
            parents: true,
          },
        },
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId: document.enfantId,
        type: 'validation',
        auteurId,
        auteurRole: auteurRole as any,
        commentaire: 'Document validé',
      },
    });

    // Notifier les parents
    for (const parent of document.enfant.parents) {
      await prisma.notification.create({
        data: {
          destinataireId: parent.id,
          destinataireRole: 'parent',
          enfantId: document.enfantId,
          documentId: document.id,
          type: 'document_valide',
          titre: 'Document validé',
          message: `Le document "${document.type}" de ${document.enfant.prenom} a été validé`,
          priorite: 'normale',
        },
      });
    }

    return document;
  }

  /**
   * Rejeter un document
   */
  async rejeterDocument(data: {
    documentId: string;
    commentaire: string;
    auteurId: string;
    auteurRole: string;
  }) {
    const { documentId, commentaire, auteurId, auteurRole } = data;

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        statut: 'rejete',
        rejectedBy: auteurId,
        commentaire,
      },
      include: {
        enfant: {
          include: {
            parents: true,
          },
        },
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId: document.enfantId,
        type: 'rejet',
        auteurId,
        auteurRole: auteurRole as any,
        commentaire,
      },
    });

    // Notifier les parents
    for (const parent of document.enfant.parents) {
      await prisma.notification.create({
        data: {
          destinataireId: parent.id,
          destinataireRole: 'parent',
          enfantId: document.enfantId,
          documentId: document.id,
          type: 'document_rejete',
          titre: 'Document refusé',
          message: `Le document "${document.type}" de ${document.enfant.prenom} a été refusé. Raison: ${commentaire}`,
          priorite: 'haute',
        },
      });
    }

    return document;
  }

  /**
   * Relancer pour un document
   */
  async relancerDocument(data: {
    documentId: string;
    auteurId: string;
    auteurRole: string;
  }) {
    const { documentId, auteurId, auteurRole } = data;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        enfant: {
          include: {
            parents: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, 'Document non trouvé');
    }

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId: document.enfantId,
        type: 'relance',
        auteurId,
        auteurRole: auteurRole as any,
        commentaire: 'Relance pour document',
      },
    });

    // Notifier les parents
    for (const parent of document.enfant.parents) {
      await prisma.notification.create({
        data: {
          destinataireId: parent.id,
          destinataireRole: 'parent',
          enfantId: document.enfantId,
          documentId: document.id,
          type: 'relance',
          titre: 'Rappel document',
          message: `Rappel: merci de fournir le document "${document.type}" pour ${document.enfant.prenom}`,
          priorite: 'haute',
        },
      });
    }

    return { message: 'Relance envoyée avec succès' };
  }

  /**
   * Récupérer tous les documents d'un enfant
   */
  async getDocumentsByEnfant(enfantId: string) {
    const documents = await prisma.document.findMany({
      where: { enfantId },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculer les statuts réels
    return documents.map((doc) => ({
      ...doc,
      statut: calculateDocumentStatus(doc),
    }));
  }

  /**
   * Récupérer tous les documents d'un établissement
   */
  async getDocumentsByEtablissement(etablissementId: string) {
    const documents = await prisma.document.findMany({
      where: {
        enfant: {
          etablissementId,
        },
      },
      include: {
        enfant: {
          include: {
            section: true,
          },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => ({
      ...doc,
      statut: calculateDocumentStatus(doc),
    }));
  }

  /**
   * Upload direct d'un document (créer + uploader en une seule étape)
   */
  async uploadDirectDocument(data: {
    enfantId: string;
    type: string;
    nom: string;
    fichierUrl: string;
    userId: string;
    userRole: string;
    dateExpiration?: string;
  }) {
    const { enfantId, type, nom, fichierUrl, userId, userRole, dateExpiration } = data;

    // Créer le document directement avec le fichier
    const document = await prisma.document.create({
      data: {
        enfantId,
        type: type as any,
        nom,
        fichierUrl,
        statut: 'soumis',
        obligatoire: true,
        dateUpload: new Date(),
        uploadedBy: userId,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
      },
      include: {
        enfant: {
          include: {
            parents: true,
          },
        },
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        documentId: document.id,
        enfantId: document.enfantId,
        type: 'upload',
        auteurId: userId,
        auteurRole: userRole as any,
        commentaire: `Document uploadé directement: ${nom}`,
      },
    });

    // Notifier selon le rôle
    if (userRole === 'parent') {
      // Si c'est un parent qui upload, notifier la crèche
      await prisma.notification.create({
        data: {
          destinataireId: userId,
          destinataireRole: 'creche',
          enfantId: document.enfantId,
          documentId: document.id,
          type: 'info_generale',
          titre: 'Nouveau document soumis',
          message: `Document soumis pour ${document.enfant.prenom}: ${document.type}`,
          priorite: 'normale',
        },
      });
    } else {
      // Si c'est la crèche qui upload, notifier les parents
      for (const parent of document.enfant.parents) {
        await prisma.notification.create({
          data: {
            destinataireId: parent.id,
            destinataireRole: 'parent',
            enfantId: document.enfantId,
            documentId: document.id,
            type: 'info_generale',
            titre: 'Document ajouté',
            message: `Un document a été ajouté pour ${document.enfant.prenom}: ${document.type}`,
            priorite: 'normale',
          },
        });
      }
    }

    return document;
  }
}

export const documentService = new DocumentService();
