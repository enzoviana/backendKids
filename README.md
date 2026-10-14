# Kids'Med IA — Backend (Node.js + Express + Prisma + PostgreSQL)

API complète utilisée par l'application Kids'Med (crèche, RSAI, médecin, parent, admin, développeur).
Toutes les réponses : `{ "success": true, "data": ... }` ou `{ "success": false, "error": "..." }`.

## Démarrage local
```bash
cp .env.example .env        # renseignez DATABASE_URL et JWT_SECRET
npm install
npx prisma migrate deploy
npm run seed                # crée les comptes de départ + forfaits
npm run dev                 # http://localhost:4000/api/health
```

## Déploiement sur Render
1. Poussez ce dossier sur un dépôt GitHub.
2. Render > **New > Blueprint** > choisissez le dépôt (`render.yaml` crée l'API + la base PostgreSQL + un disque pour les fichiers).
   Ou, sur votre service existant `backendkids` : Build command `npm install && npm run build`, Start `npm start`.
3. Ajoutez les variables de `.env.example` (au minimum `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `PUBLIC_URL`).
4. La migration initiale est déjà incluse (`prisma/migrations`) : `npm run build` crée toutes les tables.
5. Lancez une fois `npm run seed` (Render > Shell).

> ⚠️ Ce backend utilise PostgreSQL. Si votre ancien backend utilisait une autre base, les comptes doivent être recréés (le seed recrée les 6 comptes de test).

## Comptes de départ (mot de passe `SEED_PASSWORD`, défaut `KidsMed2026!`)
superadmin@kidsmed.local · dev@kidsmed.local · directeur@petitsloups.fr · rsai@demo.com · medecin@demo.fr · parent@test.fr

## Connexion
1. `POST /api/auth/login {email,password}` → jeton provisoire (10 min, n'ouvre aucune donnée)
2. `POST /api/auth/mfa/send-code` → SMS (Twilio) ou code affiché dans les logs si Twilio n'est pas configuré
3. `POST /api/auth/mfa/verify-code {code}` → `accessToken` (15 min) + `refreshToken` (7 j)
4. `POST /api/auth/refresh {refreshToken}`

## Sécurité
- Chaque route vérifie le rôle **et** le lien avec l'enfant/établissement (`src/lib/access.js`) :
  crèche = son établissement ; RSAI = établissements de ses affectations actives ; parent/médecin = enfants liés ; admin/dev = tout.
- Notes « médicales » invisibles des crèches et parents. Accès aux dossiers journalisés (`LogSecurite`).
- Fichiers privés servis uniquement par liens signés temporaires (`/api/fichiers/...`).
- Webhook Stripe vérifié par signature.

## Modules (src/routes)
auth · users (profil, annuaires médecins/RSAI, parents) · etablissements (sécurité, géocodage) · enfants (liaisons, vaccins, consentements, notes, échanges) · quotidien (sections, personnel, présences, transmissions, médicaments, ordonnances, documents, alertes) · coordination (affectations, demandes, avis) · communication (messages, notifications, IA, alertes) · abonnements (tarifs par rôle, Stripe) · admin (sécurité, logs, RGPD, tickets, console dev)

## E-mails
Placez les fichiers HTML téléchargés depuis Espace Dev > Templates e-mails dans `email-templates/` (même nom que l'identifiant, ex. `auth-forgot-password.html`).
