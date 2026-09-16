import { Request, Response, NextFunction } from 'express';

/**
 * Classe d'erreur personnalisée pour l'API
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Middleware de gestion des erreurs
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ Erreur:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Erreurs Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      error: 'Erreur de base de données',
    });
    return;
  }

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne',
  });
};

/**
 * Middleware pour les routes non trouvées
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
  });
};
