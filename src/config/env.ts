import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  corsOrigin: string;
  bcryptRounds: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env: EnvConfig = {
  port: parseInt(getEnvVar('PORT', '5001')),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  jwtAccessSecret: getEnvVar('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: getEnvVar('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'https://web-app-kids-eta.vercel.app'),
  bcryptRounds: parseInt(getEnvVar('BCRYPT_ROUNDS', '12')),
};
