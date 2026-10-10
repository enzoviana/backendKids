import { Router } from 'express';
import { mfaController } from '../controllers/mfaController';

const router = Router();

/**
 * POST /api/auth/mfa/send-code
 * Envoyer un code de vérification par SMS
 *
 * Body: { userId: string, phone: string }
 * Response: { success: true, message: "Code envoyé", expiresIn: 300 }
 */
router.post('/send-code', mfaController.sendCode.bind(mfaController));

/**
 * POST /api/auth/mfa/verify-code
 * Vérifier un code de vérification SMS
 *
 * Body: { userId: string, code: string }
 * Response: { success: true, verified: true, message: "Code vérifié" }
 */
router.post('/verify-code', mfaController.verifyCode.bind(mfaController));

export default router;
