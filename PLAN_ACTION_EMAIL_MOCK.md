# 📋 Plan d'action : Configuration Email & Suppression des données mockées

## 🎯 Objectifs

1. **Centraliser toutes les variables d'environnement** dans `.env`
2. **Créer un service d'envoi d'email** utilisant les templates HTML
3. **Connecter tous les templates email** aux routes correspondantes
4. **Remplacer toutes les données mockées** par :
   - Soit des vraies requêtes DB si possible
   - Soit des logs console indiquant que les données sont mockées
5. **Ajouter des logs console** partout où les données sont mockées

---

## 📊 Audit des Templates Email (14 templates trouvés)

| Template | Route associée | Status | Priorité |
|----------|----------------|--------|----------|
| `auth-forgot-password.html` | `POST /api/auth/forgot-password` | 🟡 Partiellement implémenté (log console) | ⭐⭐⭐ HAUTE |
| `auth-welcome.html` | `POST /api/auth/register` | ❌ Non implémenté | ⭐⭐⭐ HAUTE |
| `auth-mfa-code.html` | MFA (à créer) | ❌ Non implémenté | ⭐ BASSE |
| `rsai-affectation.html` | `POST /api/coordination/affectations` | ❌ Non implémenté | ⭐⭐ MOYENNE |
| `rsai-demande.html` | `POST /api/coordination/demandes-rsai` | ❌ Non implémenté | ⭐⭐ MOYENNE |
| `rsai-avis-recu.html` | `POST /api/coordination/avis` | ❌ Non implémenté | ⭐ BASSE |
| `msg-nouveau-message.html` | `POST /api/messages` | ❌ Non implémenté | ⭐⭐⭐ HAUTE |
| `abo-facture-recue.html` | Webhook Stripe `invoice.paid` | ❌ Non implémenté | ⭐⭐ MOYENNE |
| `doc-rappel-vaccin.html` | Cronjob vaccins (à créer) | ❌ Non implémenté | ⭐ BASSE |
| `doc-rappel-manquant.html` | Cronjob documents (à créer) | ❌ Non implémenté | ⭐ BASSE |
| `doc-demande-medecin.html` | `POST /api/documents` | ❌ Non implémenté | ⭐⭐ MOYENNE |
| `doc-ordonnance-expirante.html` | Cronjob ordonnances (à créer) | ❌ Non implémenté | ⭐ BASSE |
| `trans-alerte-symptome.html` | `POST /api/transmissions` | ❌ Non implémenté | ⭐⭐⭐ HAUTE |
| `sec-alerte-acces.html` | Middleware sécurité (hors zone/horaires) | ❌ Non implémenté | ⭐⭐ MOYENNE |

---

## 🔍 Audit des fonctionnalités mockées

### Controllers avec données mockées (à remplacer) :

| Controller | Méthodes mockées | Action requise |
|------------|-----------------|----------------|
| `abonnementController.ts` | `getMyAbonnement`, `createCheckoutSession`, `createPortalSession`, `attribuerAbonnement`, `getRevenus` | Intégration Stripe réelle + logs mock |
| `etablissementController.ts` | `getSanteIndicateurs`, `createAvisRsai` | Requêtes DB réelles + logs mock |
| `medecinController.ts` | `getMedecinStats` | Requêtes DB réelles + logs mock |
| `documentController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `vaccinController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `parentController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `consentementController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `rendezVousController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `presenceController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `diagnosticController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `alerteController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `securiteController.ts` | `getPlagesHoraires`, `getHistorique` | Requêtes DB réelles + logs mock |
| `rgpdController.ts` | `getTraitements`, `getIndicateurs` | Requêtes DB réelles + logs mock |
| `liaisonController.ts` | Plusieurs méthodes | Requêtes DB réelles + logs mock |
| `logController.ts` | `getLogsByEtablissement`, `getLogsByUser` | Requêtes DB réelles + logs mock |

---

## 🏗️ Architecture proposée

### 1. Service Email centralisé

Créer un nouveau fichier : `src/services/emailService.ts`

**Fonctionnalités** :
- Charger et compiler les templates HTML avec Handlebars
- Support SendGrid / AWS SES / SMTP selon variable d'env
- Mode mock en développement (log console au lieu d'envoyer)
- Gestion d'erreurs robuste

**Méthodes** :
```typescript
class EmailService {
  async sendPasswordReset(to: string, data: {...})
  async sendWelcome(to: string, data: {...})
  async sendNewMessage(to: string, data: {...})
  async sendRsaiAffectation(to: string, data: {...})
  async sendTransmissionAlert(to: string, data: {...})
  async sendInvoiceReceipt(to: string, data: {...})
  // ... etc
}
```

### 2. Variables d'environnement à ajouter

Dans `.env` / `.env.example` :

```env
# Email configuration
EMAIL_PROVIDER=sendgrid  # sendgrid | aws-ses | smtp | mock
EMAIL_MOCK_MODE=true     # true = log console, false = vraiment envoyer
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@kidsmed.fr
SENDGRID_FROM_NAME=Kids'Med IA

# Stripe (déjà ajoutées)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLIC_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_ENABLED=false     # true = vraie intégration, false = mock

# URLs frontend (déjà ajoutées)
FRONTEND_URL=http://localhost:3000
FRONTEND_RESET_PASSWORD_URL=http://localhost:3000/reset-password
FRONTEND_ACTIVATE_ACCOUNT_URL=http://localhost:3000/activate
FRONTEND_MESSAGES_URL=http://localhost:3000/messages
FRONTEND_TRANSMISSIONS_URL=http://localhost:3000/transmissions
FRONTEND_AFFECTATIONS_URL=http://localhost:3000/affectations
FRONTEND_DOCUMENTS_URL=http://localhost:3000/documents
FRONTEND_PREFERENCES_URL=http://localhost:3000/preferences
FRONTEND_SUPPORT_URL=http://localhost:3000/support

# Application
APP_NAME=Kids'Med IA
APP_SUPPORT_EMAIL=support@kidsmed.fr
```

### 3. Dépendances NPM à installer

```bash
npm install handlebars @sendgrid/mail aws-sdk nodemailer
npm install -D @types/handlebars @types/nodemailer
```

---

## 📝 Plan d'action détaillé

### Phase 1 : Configuration de base (Priorité HAUTE)

**Fichiers créés/modifiés** :
- ✅ `.env.example` - Ajouter toutes les variables
- 🆕 `src/services/emailService.ts` - Service email centralisé
- 🆕 `src/utils/emailTemplates.ts` - Helper pour charger les templates
- 🆕 `src/config/email.ts` - Configuration email

**Actions** :
1. Mettre à jour `.env.example` avec toutes les nouvelles variables
2. Créer le service email avec support Handlebars
3. Implémenter mode mock (EMAIL_MOCK_MODE=true) pour développement
4. Tester l'envoi d'un email de base

### Phase 2 : Intégration templates email prioritaires (Priorité HAUTE)

**Routes à modifier** :

#### A. Authentification
- 📝 `src/services/authService.ts` - Méthode `forgotPassword()`
  - Remplacer `console.log()` par `emailService.sendPasswordReset()`
  - Variables template : `{prenom, code, lien_action, expiration, lien_preferences, lien_support}`

- 📝 `src/services/authService.ts` - Méthode `register()` (à créer/modifier)
  - Ajouter `emailService.sendWelcome()`
  - Variables : `{prenom, role, lien_action, lien_preferences, lien_support}`

#### B. Messages
- 📝 `src/controllers/messageController.ts` - `createMessage()`
  - Ajouter `emailService.sendNewMessage()`
  - Variables : `{prenom, expediteur, objet, apercu, lien_action, lien_preferences, lien_support}`

#### C. Transmissions (Alertes symptômes)
- 📝 `src/controllers/transmissionController.ts` (à vérifier si existe)
  - Ajouter `emailService.sendTransmissionAlert()` pour symptômes urgents
  - Variables : `{prenom, nom_creche, heure, resume, lien_action, lien_preferences, lien_support}`

### Phase 3 : Intégration RSAI & Coordination (Priorité MOYENNE)

**Routes à modifier** :

- 📝 `src/controllers/coordinationController.ts` - `createAffectation()`
  - Ajouter `emailService.sendRsaiAffectation()` (envoyer à la RSAI ET à la crèche)
  - Variables : `{prenom, nom_rsai, nom_creche, adresse, horaires, date_debut, lien_action, lien_preferences, lien_support}`

- 📝 `src/controllers/coordinationController.ts` - `createDemandeRsai()`
  - Ajouter `emailService.sendRsaiDemande()` (notifier admin)
  - Variables : `{prenom, nom_creche, motif, date_debut, urgence, lien_action, lien_preferences, lien_support}`

### Phase 4 : Stripe & Abonnements (Priorité MOYENNE)

**Fichiers à modifier** :

- 📝 `src/controllers/abonnementController.ts`
  - `createCheckoutSession()` - Vraie intégration Stripe ou mode mock
  - `createPortalSession()` - Vraie intégration Stripe ou mode mock
  - `getMyAbonnement()` - Requête DB réelle ou mode mock

- 🆕 `src/controllers/webhookController.ts` (à créer)
  - Endpoint `POST /api/webhooks/stripe`
  - Event `invoice.paid` → `emailService.sendInvoiceReceipt()`
  - Variables : `{prenom, forfait, montant, periode, numero_facture, lien_action, lien_preferences, lien_support}`

### Phase 5 : Documents & Santé (Priorité BASSE)

**Routes à modifier** :

- 📝 `src/controllers/documentController.ts`
  - Méthode pour demande de document → `emailService.sendDocumentRequest()`

### Phase 6 : Cronjobs (Priorité BASSE)

**Fichiers à créer** :

- 🆕 `src/jobs/vaccinReminder.ts` - Rappel vaccins
- 🆕 `src/jobs/documentReminder.ts` - Rappel documents manquants
- 🆕 `src/jobs/ordonnanceExpiration.ts` - Ordonnances expirantes

### Phase 7 : Sécurité & Alertes (Priorité BASSE)

- 📝 `src/middleware/security.ts` (si existe)
  - Alerte accès hors zone/horaires → `emailService.sendSecurityAlert()`

---

## 📦 Fichiers qui seront créés

```
src/
├── services/
│   ├── emailService.ts           🆕 Service principal d'envoi email
│   └── stripeService.ts           🆕 Service Stripe (checkout, webhooks)
├── utils/
│   └── emailTemplates.ts          🆕 Helper chargement templates
├── config/
│   └── email.ts                   🆕 Configuration email (SendGrid/SES/SMTP)
├── jobs/
│   ├── vaccinReminder.ts          🆕 Cronjob rappels vaccins
│   ├── documentReminder.ts        🆕 Cronjob rappels documents
│   └── ordonnanceExpiration.ts    🆕 Cronjob ordonnances
└── controllers/
    └── webhookController.ts       🆕 Webhooks Stripe
```

---

## 📦 Fichiers qui seront modifiés

```
src/
├── services/
│   └── authService.ts             📝 Ajout envoi emails (welcome, reset password)
├── controllers/
│   ├── messageController.ts       📝 Ajout notification nouveau message
│   ├── transmissionController.ts  📝 Ajout alerte symptôme
│   ├── coordinationController.ts  📝 Ajout emails affectation/demande RSAI
│   ├── abonnementController.ts    📝 Intégration Stripe + mode mock
│   ├── documentController.ts      📝 Suppression données mockées + emails
│   ├── vaccinController.ts        📝 Suppression données mockées
│   ├── parentController.ts        📝 Suppression données mockées
│   ├── consentementController.ts  📝 Suppression données mockées
│   ├── rendezVousController.ts    📝 Suppression données mockées
│   ├── presenceController.ts      📝 Suppression données mockées
│   ├── diagnosticController.ts    📝 Suppression données mockées
│   ├── alerteController.ts        📝 Suppression données mockées
│   ├── securiteController.ts      📝 Suppression données mockées
│   ├── rgpdController.ts          📝 Suppression données mockées
│   ├── liaisonController.ts       📝 Suppression données mockées
│   ├── logController.ts           📝 Suppression données mockées
│   ├── medecinController.ts       📝 Suppression données mockées
│   └── etablissementController.ts 📝 Suppression données mockées
└── routes/
    └── index.ts                   📝 Ajout route webhooks
```

---

## 🎨 Exemple de log console pour données mockées

Au lieu de retourner silencieusement des données mockées, on affichera :

```typescript
async getMyAbonnement(req: Request, res: Response) {
  try {
    console.warn('⚠️ [MOCK] getMyAbonnement - Données mockées retournées');
    console.log('💡 Pour activer l\'abonnement réel, configurez STRIPE_ENABLED=true dans .env');

    res.status(200).json({
      success: true,
      data: {
        plan: 'essentiel',
        statut: 'actif',
        prixMensuel: 0,
        quota: {}
      },
      _mock: true  // Indicateur que les données sont mockées
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## ✅ Checklist de validation

Avant de commencer, je vais :

- [ ] Installer les dépendances nécessaires (`handlebars`, `@sendgrid/mail`, etc.)
- [ ] Créer le service email avec mode mock
- [ ] Mettre à jour `.env.example` avec toutes les variables
- [ ] Créer les helpers de templates
- [ ] Intégrer les templates prioritaires (auth, messages, transmissions)
- [ ] Remplacer toutes les données mockées par des logs console
- [ ] Ajouter le flag `_mock: true` dans les réponses mockées
- [ ] Tester l'envoi d'email en mode mock
- [ ] Tester l'envoi d'email en mode réel (SendGrid)
- [ ] Documenter la configuration dans README

---

## 🚀 Approche proposée

### Stratégie d'implémentation

**Approche progressive** :
1. ✅ Phase 1 : Infrastructure (service email, config, helpers)
2. ✅ Phase 2 : Templates prioritaires (auth, messages, transmissions)
3. ✅ Phase 3 : Remplacement données mockées avec logs
4. ✅ Phase 4 : Templates secondaires (RSAI, abonnements)
5. ✅ Phase 5 : Cronjobs et webhooks

**Mode de fonctionnement** :
- **Développement** : `EMAIL_MOCK_MODE=true` → Logs console uniquement
- **Staging** : `EMAIL_MOCK_MODE=false` + SendGrid test → Vrais emails
- **Production** : `EMAIL_MOCK_MODE=false` + SendGrid prod → Vrais emails

**Gestion des erreurs** :
- Si l'email échoue, on log l'erreur SANS bloquer la requête principale
- L'utilisateur reçoit quand même sa réponse (ex: compte créé) même si l'email n'est pas parti
- Les erreurs d'email sont loggées dans un fichier séparé pour debug

---

## 📊 Impact estimé

| Catégorie | Fichiers créés | Fichiers modifiés | LOC ajoutées |
|-----------|---------------|-------------------|--------------|
| Services | 3 | 1 | ~500 |
| Controllers | 1 | 18 | ~300 |
| Utils/Config | 2 | 0 | ~150 |
| Jobs | 3 | 0 | ~200 |
| Routes | 0 | 1 | ~10 |
| **TOTAL** | **9** | **20** | **~1160** |

---

## ❓ Questions pour validation

Avant de commencer, j'ai besoin de votre validation sur :

1. **Service email** : Quel provider voulez-vous utiliser en priorité ?
   - SendGrid (recommandé, 100 emails/jour gratuits)
   - AWS SES (62k emails/mois gratuits)
   - SMTP (Gmail, Outlook)
   - Mock (logs console uniquement)

2. **Priorités** : Voulez-vous que je commence par :
   - ✅ Phase 1 + 2 (Infrastructure + Templates prioritaires) ?
   - ✅ Ou tout d'un coup ?

3. **Stripe** : Voulez-vous une vraie intégration Stripe ou mode mock pour l'instant ?

4. **Cronjobs** : Voulez-vous implémenter les cronjobs (vaccins, documents, ordonnances) maintenant ou plus tard ?

5. **Tests** : Voulez-vous que j'ajoute des tests unitaires pour le service email ?

---

**Attendant votre validation pour démarrer ! 🚀**
