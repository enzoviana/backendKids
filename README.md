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

### Fournisseur : votre SMTP ou SendGrid

`EMAIL_PROVIDER` accepte `auto` (défaut), `smtp` ou `sendgrid` :

| Valeur | Comportement |
| --- | --- |
| `auto` | utilise votre serveur SMTP dès que `SMTP_HOST`, `SMTP_USER` et `SMTP_PASSWORD` sont renseignés ; sinon SendGrid ; sinon simulation |
| `smtp` | uniquement votre serveur SMTP (aucune dépendance à un fournisseur d'API) |
| `sendgrid` | uniquement l'API SendGrid |

Aucune modification de code n'est nécessaire : `nodemailer` envoie via `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, avec `EMAIL_FROM` / `SMTP_FROM_NAME` comme expéditeur.
Les valeurs peuvent aussi être saisies dans Console développeur > Clés API (stockées en base, prioritaires sur l'environnement).

Bonnes pratiques si vous hébergez votre propre serveur (Postfix, Mailcow, Docker Mailserver) :

- autoriser le port 25 sortant depuis le serveur et configurer un **PTR/rDNS** cohérent ;
- publier **SPF**, **DKIM** et **DMARC** sur le domaine d'envoi, sinon les messages partent en spam ;
- garder le port 587/STARTTLS ou 465/SSL pour la soumission authentifiée utilisée par l'API ;
- sur Render, les ports 25/465/587 sont bloqués pour le plan gratuit : utiliser le plan Starter
  (c'est le cas de `render.yaml`) ou un relais SMTP qui écoute sur le port 2525.

Le diagnostic `GET /api/developer/config/email/diagnostic` indique le fournisseur réellement
retenu, l'adresse d'envoi et si le port SMTP est joignable depuis l'instance.

### Console développeur : toutes les variables à chaud

`GET /api/developer/config` et `PUT /api/developer/config` (rôle développeur) exposent et
enregistrent l'ensemble des variables d'exécution : e-mail (SMTP/SendGrid), SMS, Stripe,
liens des e-mails, nom et support de l'application, WebAuthn, secret des liens de fichiers,
CORS, géocodage et messages système. Les valeurs sont stockées dans `ConfigEntry`, prises en
priorité sur l'environnement, et rechargées immédiatement : aucun redémarrage n'est nécessaire.

- Les clés secrètes sont masquées en lecture et un champ laissé vide conserve la valeur.
- Une valeur vide sur une clé non secrète revient à la variable d'environnement.
- `EMAIL_PROVIDER`, `SMTP_PORT` et les booléens sont validés avant enregistrement.
- Les variables d'infrastructure (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `UPLOAD_DIR`,
  `NODE_ENV`, `SEED_*`) restent en lecture seule : elles sont lues au démarrage et changer
  `JWT_SECRET` invaliderait les sessions et les secrets TOTP.

### « Envoi via SendGrid » alors que SMTP est configuré

L'ordre de priorité est : **valeur enregistrée en console** > **variable d'environnement** >
**valeur par défaut**. Une ancienne valeur `EMAIL_PROVIDER=sendgrid` (console ou `.env`)
force donc SendGrid même si le SMTP est complet.

1. Ouvrir Console développeur > Clés API & messages > E-mails ;
2. lire la mention à droite du libellé « Fournisseur » : `base` = valeur enregistrée en console,
   `environnement` = variable du serveur ;
3. choisir `smtp` (ou `auto`) puis Enregistrer ; « valeur du serveur (efface) » supprime la
   valeur en base et réutilise l'environnement ;
4. vérifier le diagnostic : il affiche désormais la raison exacte du fournisseur retenu,
   l'origine de chaque variable et la complétude de la configuration SMTP
   (`smtpPret`, `sendgridPret`).

## Paiement (Stripe)

Le paiement utilise le **Checkout embarqué** : le formulaire Stripe s'affiche dans la page
« Mon abonnement » de l'application, sans redirection vers un domaine d'hébergeur.

- `STRIPE_PUBLISHABLE_KEY` (`pk_live_…` / `pk_test_…`) active le formulaire embarqué.
  Sans elle, l'API renvoie automatiquement l'URL de la page Stripe hébergée.
- `STRIPE_SECRET_KEY` reste nécessaire côté serveur pour créer la session.
- `STRIPE_WEBHOOK_SECRET` valide la signature du webhook `POST /api/webhooks/stripe`.

Les URLs de retour (`return_url`, `success_url`, `cancel_url`, portail client) sont calculées
depuis l'en-tête `Origin` de l'appelant lorsqu'il est autorisé par `CORS_ORIGINS`, avec repli
sur `FRONTEND_URL`. Aucune URL d'hébergeur n'est codée en dur : le retour se fait sur le
domaine réellement utilisé (Vercel, domaine personnalisé…).

Webhook Stripe (Dashboard → Développeurs → Webhooks) : écouter uniquement
`checkout.session.completed`, `customer.subscription.deleted` et `invoice.payment_failed`.

