import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload } from '../types';

/**
 * Génère un access token JWT
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload as any, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as any,
  } as any);
};

/**
 * Génère un refresh token JWT
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload as any, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as any,
  } as any);
};

/**
 * Vérifie et décode un access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, env.jwtAccessSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
};

/**
 * Vérifie et décode un refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, env.jwtRefreshSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Refresh token invalide ou expiré');
  }
};
