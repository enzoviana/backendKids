import fs from 'fs';
import path from 'path';
import { prisma } from './core.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

/**
 * Conserve une copie du fichier téléversé dans PostgreSQL.
 * Le disque Render peut être réinitialisé à chaque redémarrage/déploiement :
 * cette copie permet de continuer à servir les documents et images.
 */
export async function persistUpload(file) {
  if (!file?.filename) return;
  try {
    const filePath = path.resolve(UPLOAD_DIR, path.basename(file.filename));
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return;
    const data = fs.readFileSync(filePath);
    await prisma.fichier.upsert({
      where: { name: path.basename(file.filename) },
      update: { mimeType: file.mimetype ?? null, taille: data.length, data },
      create: { name: path.basename(file.filename), mimeType: file.mimetype ?? null, taille: data.length, data },
    });
  } catch (err) {
    // Le téléversement ne doit pas échouer si la copie de secours échoue :
    // le fichier reste disponible sur le disque tant qu'il existe.
    console.error('Persistance fichier impossible :', err?.message ?? err);
  }
}

/** Retourne le fichier depuis le disque, sinon depuis PostgreSQL. */
export async function readStoredFile(name) {
  const clean = path.basename(String(name ?? ''));
  if (!clean) return null;
  const filePath = path.resolve(UPLOAD_DIR, clean);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return { path: filePath };
  const row = await prisma.fichier.findUnique({ where: { name: clean } }).catch(() => null);
  if (!row) return null;
  return { buffer: Buffer.from(row.data), mimeType: row.mimeType ?? 'application/octet-stream' };
}
