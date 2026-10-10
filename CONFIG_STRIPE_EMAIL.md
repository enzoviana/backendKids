# 🔧 Configuration Stripe & Email - Guide complet

Ce guide vous explique comment configurer Stripe (paiements) et l'envoi d'emails dans votre API Kids'Med IA.

---

## 📦 1. Configuration Stripe (Paiements & Abonnements)

### Étape 1.1 : Créer un compte Stripe

1. Allez sur [https://stripe.com](https://stripe.com)
2. Créez un compte (gratuit)
3. Activez votre compte en mode **Test** pour commencer

### Étape 1.2 : Obtenir les clés API

1. Connectez-vous au [Stripe Dashboard](https://dashboard.stripe.com)
2. Allez dans **Developers** → **API keys**
3. Copiez les clés suivantes dans votre fichier `.env` :

```env
STRIPE_SECRET_KEY=sk_test_51...  # Clé secrète (GARDEZ SECRÈTE!)
STRIPE_PUBLIC_KEY=pk_test_51...  # Clé publique (utilisée côté frontend)
```

⚠️ **IMPORTANT** : Ne commitez JAMAIS votre clé secrète dans Git !

### Étape 1.3 : Créer les prix des abonnements

1. Dans le Stripe Dashboard, allez dans **Products** → **Create product**
2. Créez un produit pour chaque formule :

#### Exemple : Créer "Crèche Essentiel"

- **Nom** : Crèche Essentiel
- **Description** : Formule essentielle pour les crèches
- **Pricing** :
  - Type : Recurring (Abonnement)
  - Price : 79 EUR
  - Billing period : Monthly
- **Copiez l'ID du prix** (commence par `price_...`)
- **Ajoutez-le dans votre `.env`** :

```env
STRIPE_PRICE_CRECHE_ESSENTIEL=price_1abc123...
```

Répétez pour tous les plans :
- ✅ Crèche Essentiel (79€/mois)
- ✅ Crèche Premium (149€/mois)
- ✅ RSAI Basic (49€/mois)
- ✅ RSAI Pro (99€/mois)
- ✅ Médecin Solo (29€/mois)
- ✅ Médecin Groupe (79€/mois)

### Étape 1.4 : Configurer les Webhooks

Les webhooks permettent à Stripe de notifier votre backend lors d'événements (paiement réussi, échec, etc.).

1. Dans Stripe Dashboard, allez dans **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. **URL du endpoint** : `https://votre-api.onrender.com/api/webhooks/stripe`
4. **Événements à écouter** (sélectionnez) :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. **Copiez le webhook secret** (commence par `whsec_...`)
6. **Ajoutez-le dans votre `.env`** :

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

### Étape 1.5 : Configurer les URLs de redirection

```env
STRIPE_SUCCESS_URL=https://votre-frontend.vercel.app/abonnement/success
STRIPE_CANCEL_URL=https://votre-frontend.vercel.app/abonnement/cancel
```

---

## 📧 2. Configuration Email (3 options au choix)

Vous devez choisir **UNE seule option** parmi les 3 ci-dessous.

---

### ✅ Option A : SendGrid (Recommandée - Simple et fiable)

**Avantages** : 100 emails/jour gratuits, simple à configurer, très fiable

#### Étape A.1 : Créer un compte SendGrid

1. Allez sur [https://sendgrid.com](https://sendgrid.com)
2. Créez un compte gratuit (Free Plan : 100 emails/jour)

#### Étape A.2 : Obtenir une clé API

1. Connectez-vous à SendGrid
2. Allez dans **Settings** → **API Keys**
3. Cliquez sur **Create API Key**
4. **Nom** : "KidsMed API Production"
5. **Permissions** : Full Access
6. **Copiez la clé** (commence par `SG.`)
7. **Ajoutez dans votre `.env`** :

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@kidsmed.fr
SENDGRID_FROM_NAME=Kids'Med IA
```

#### Étape A.3 : Vérifier votre domaine (Optionnel mais recommandé)

1. Dans SendGrid, allez dans **Settings** → **Sender Authentication**
2. Suivez les instructions pour authentifier votre domaine
3. Ajoutez les enregistrements DNS fournis dans votre hébergeur de domaine

⚠️ **En développement** : Vous pouvez utiliser un email personnel vérifié (ex: votre-email@gmail.com)

---

### ✅ Option B : AWS SES (Amazon Simple Email Service)

**Avantages** : 62 000 emails/mois gratuits, très évolutif

#### Étape B.1 : Créer un compte AWS

1. Allez sur [https://aws.amazon.com](https://aws.amazon.com)
2. Créez un compte AWS (nécessite une carte bancaire, mais SES est gratuit jusqu'à 62k emails/mois)

#### Étape B.2 : Activer SES

1. Connectez-vous à la [Console AWS](https://console.aws.amazon.com)
2. Recherchez "SES" dans la barre de recherche
3. Sélectionnez **eu-west-3** (Paris) comme région
4. Allez dans **Verified identities** → **Create identity**
5. Vérifiez votre email ou domaine

#### Étape B.3 : Créer des clés d'accès

1. Allez dans **IAM** → **Users** → **Create user**
2. Nom : "kidsmed-ses-user"
3. Cochez **Programmatic access**
4. **Permissions** : Attachez la politique `AmazonSESFullAccess`
5. **Copiez** l'Access Key ID et la Secret Access Key
6. **Ajoutez dans votre `.env`** :

```env
EMAIL_PROVIDER=aws-ses
AWS_SES_REGION=eu-west-3
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=abc123...
AWS_SES_FROM_EMAIL=noreply@kidsmed.fr
```

#### Étape B.4 : Sortir du mode Sandbox (Production)

Par défaut, SES est en mode "Sandbox" (emails limités). Pour envoyer à tous :
1. Allez dans **Account dashboard** → **Request production access**
2. Remplissez le formulaire (justification : "Application de gestion de crèches")
3. Attendez l'approbation (24-48h)

---

### ✅ Option C : SMTP Générique (Gmail, Outlook, etc.)

**Avantages** : Utilise un compte email existant

#### Pour Gmail :

1. **Activez l'authentification à deux facteurs** sur votre compte Google
2. Allez dans **Sécurité** → **Mots de passe d'application**
3. Créez un mot de passe d'application pour "Mail"
4. **Copiez le mot de passe** (16 caractères)
5. **Ajoutez dans votre `.env`** :

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM_EMAIL=votre-email@gmail.com
SMTP_FROM_NAME=Kids'Med IA
```

⚠️ **Limite Gmail** : 500 emails/jour maximum

#### Pour Outlook/Hotmail :

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@outlook.com
SMTP_PASSWORD=votre_mot_de_passe
SMTP_FROM_EMAIL=votre-email@outlook.com
SMTP_FROM_NAME=Kids'Med IA
```

---

## 🌐 3. Configuration des URLs Frontend

Ces URLs sont utilisées dans les emails (liens de réinitialisation de mot de passe, etc.).

```env
# URL de base de votre frontend
FRONTEND_URL=https://votre-frontend.vercel.app

# URL de la page de réinitialisation de mot de passe
FRONTEND_RESET_PASSWORD_URL=https://votre-frontend.vercel.app/reset-password
```

En développement local :
```env
FRONTEND_URL=http://localhost:3000
FRONTEND_RESET_PASSWORD_URL=http://localhost:3000/reset-password
```

---

## 📝 4. Exemple de fichier `.env` complet

Voici un exemple de configuration complète avec SendGrid + Stripe :

```env
# Database
DATABASE_URL="postgresql://user:pass@hostname:5432/kidsmed_db?schema=public"

# Server
PORT=5000
NODE_ENV=production

# JWT Secrets
JWT_ACCESS_SECRET=votre-secret-access-super-securise-changez-moi
JWT_REFRESH_SECRET=votre-secret-refresh-super-securise-changez-moi
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://votre-frontend.vercel.app

# Bcrypt
BCRYPT_ROUNDS=12

# Stripe
STRIPE_SECRET_KEY=sk_live_51abc123...
STRIPE_PUBLIC_KEY=pk_live_51abc123...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
STRIPE_PRICE_CRECHE_ESSENTIEL=price_1abc123...
STRIPE_PRICE_CRECHE_PREMIUM=price_1def456...
STRIPE_PRICE_RSAI_BASIC=price_1ghi789...
STRIPE_PRICE_RSAI_PRO=price_1jkl012...
STRIPE_PRICE_MEDECIN_SOLO=price_1mno345...
STRIPE_PRICE_MEDECIN_GROUPE=price_1pqr678...
STRIPE_SUCCESS_URL=https://votre-frontend.vercel.app/abonnement/success
STRIPE_CANCEL_URL=https://votre-frontend.vercel.app/abonnement/cancel

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@kidsmed.fr
SENDGRID_FROM_NAME=Kids'Med IA

# URLs Frontend
FRONTEND_URL=https://votre-frontend.vercel.app
FRONTEND_RESET_PASSWORD_URL=https://votre-frontend.vercel.app/reset-password
```

---

## 🚀 5. Déploiement sur Render

### Sur Render.com :

1. Allez dans votre service → **Environment**
2. Cliquez sur **Add Environment Variable**
3. Ajoutez **toutes les variables** une par une (ou en bulk avec "Add from .env")
4. **Redéployez** votre service pour appliquer les changements

---

## 🧪 6. Tester la configuration

### Tester Stripe :

```bash
# Créer une session de paiement test
curl -X POST https://votre-api.onrender.com/api/abonnements/checkout-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "creche-essentiel"}'
```

### Tester l'envoi d'email :

```bash
# Demander une réinitialisation de mot de passe
curl -X POST https://votre-api.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@example.com"}'
```

Vérifiez que vous recevez bien l'email avec le lien de réinitialisation.

---

## ❓ FAQ

### Q : Quel service d'email choisir ?

**Recommandation** :
- 🥇 **SendGrid** : Simple, fiable, 100 emails/jour gratuits (parfait pour démarrer)
- 🥈 **AWS SES** : Si vous avez déjà AWS ou prévoyez beaucoup d'emails (62k/mois gratuits)
- 🥉 **SMTP/Gmail** : Pour tester en développement, mais limité à 500 emails/jour

### Q : Combien coûte Stripe ?

Stripe prend **2,9% + 0,25€** par transaction réussie. Pas de frais d'abonnement mensuel.

Exemple : Si un client paie 79€/mois, Stripe prend ~2,54€, vous recevez ~76,46€.

### Q : Dois-je passer en mode production Stripe immédiatement ?

Non ! Utilisez le **mode Test** (clés `sk_test_...`) pendant le développement. Vous basculerez en mode **Live** (clés `sk_live_...`) uniquement quand vous êtes prêt à accepter de vrais paiements.

### Q : Comment basculer en production ?

1. Dans Stripe Dashboard, activez votre compte (fournir infos bancaires)
2. Créez de nouveaux prix en mode **Live**
3. Créez un nouveau webhook en mode **Live**
4. Remplacez les clés `sk_test_...` par `sk_live_...` dans votre `.env` de production
5. Redéployez

### Q : Que faire si les emails n'arrivent pas ?

1. Vérifiez les **logs de votre API** pour voir les erreurs
2. Vérifiez votre **dossier spam**
3. Pour SendGrid : Vérifiez que votre email expéditeur est vérifié
4. Pour AWS SES : Assurez-vous d'être sorti du mode Sandbox
5. Pour Gmail : Vérifiez que vous utilisez un "mot de passe d'application" (pas votre mot de passe normal)

---

## 📚 Ressources utiles

- [Documentation Stripe](https://stripe.com/docs)
- [Documentation SendGrid](https://docs.sendgrid.com)
- [Documentation AWS SES](https://docs.aws.amazon.com/ses/)
- [Tester vos emails avec Mailtrap](https://mailtrap.io) (environnement de test)

---

## ✅ Checklist finale

Avant de passer en production, vérifiez que :

- [ ] Toutes les variables Stripe sont configurées
- [ ] Les prix Stripe sont créés et leurs IDs ajoutés dans `.env`
- [ ] Le webhook Stripe est configuré et fonctionnel
- [ ] Un service d'email est configuré (SendGrid/SES/SMTP)
- [ ] L'envoi d'email de test fonctionne (forgot-password)
- [ ] Les URLs frontend sont correctes
- [ ] Les secrets JWT sont changés (pas les valeurs par défaut)
- [ ] Le fichier `.env` n'est PAS committé dans Git
- [ ] Les variables d'environnement sont ajoutées sur Render

---

Besoin d'aide ? Consultez les logs de votre API pour identifier les erreurs ! 🚀
