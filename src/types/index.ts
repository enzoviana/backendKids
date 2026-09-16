import { UserRole } from '@prisma/client';
import { Request } from 'express';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Login/Register DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  tel?: string;
  role?: UserRole;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  prenom?: string;
  nom?: string;
  tel?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  photo?: string;
  langue?: string;
  timezone?: string;
}
