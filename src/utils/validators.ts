import { body, ValidationChain } from 'express-validator';

/**
 * Validation pour le login
 */
export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
];

/**
 * Validation pour l'inscription
 */
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
  body('prenom')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis')
    .isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('nom')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('tel')
    .optional()
    .matches(/^(\+33|0)[1-9](\d{2}){4}$/)
    .withMessage('Numéro de téléphone invalide'),
];

/**
 * Validation pour le changement de mot de passe
 */
export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un chiffre')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un caractère spécial'),
];

/**
 * Validation pour la mise à jour du profil
 */
export const updateProfileValidation: ValidationChain[] = [
  body('prenom')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('tel')
    .optional()
    .matches(/^(\+33|0)[1-9](\d{2}){4}$/)
    .withMessage('Numéro de téléphone invalide'),
  body('codePostal')
    .optional()
    .matches(/^\d{5}$/)
    .withMessage('Code postal invalide'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
];
