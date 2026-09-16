# Kids'Med IA - Backend API

API REST sécurisée avec authentification JWT et gestion des rôles pour l'application Kids'Med IA.

## 🚀 Technologies

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **PostgreSQL** - Base de données relationnelle
- **Prisma** - ORM moderne pour TypeScript
- **JWT** - Authentification par tokens
- **bcrypt** - Hashage sécurisé des mots de passe
- **express-validator** - Validation des données

## 📋 Prérequis

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm ou yarn

## 🔧 Installation

### 1. Installer les dépendances

```bash
cd api
npm install
```

### 2. Configurer les variables d'environnement

Créer un fichier `.env` basé sur `.env.example` :

```bash
cp .env.example .env
```

Éditer le fichier `.env` avec vos paramètres :

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/kidsmed_db?schema=public"

# Server
PORT=5000
NODE_ENV=development

# JWT Secrets (CHANGEZ CES VALEURS EN PRODUCTION!)
JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production

# JWT Expiration
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Bcrypt
BCRYPT_ROUNDS=12
```

### 3. Configurer PostgreSQL

#### Option A: Installation locale

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Créer la base de données
createdb kidsmed_db
```

#### Option B: Docker

```bash
docker run --name kidsmed-postgres \
  -e POSTGRES_USER=kidsmed \
  -e POSTGRES_PASSWORD=kidsmed123 \
  -e POSTGRES_DB=kidsmed_db \
  -p 5432:5432 \
  -d postgres:14
```

### 4. Initialiser Prisma

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer les migrations et appliquer le schéma
npm run prisma:migrate

# Seed la base de données (crée le super admin par défaut)
npm run prisma:seed
```

### 5. Démarrer le serveur

```bash
# Mode développement (avec hot-reload)
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 🔑 Comptes par défaut

Après le seed, les comptes suivants sont créés :

### Super Admin
- **Email**: `superadmin@kidsmed.local`
- **Mot de passe**: `SuperAdmin2024!`
- **Rôle**: `super_admin`

### Directeur de crèche
- **Email**: `directeur@petitsloups.fr`
- **Mot de passe**: `Directeur2024!`
- **Rôle**: `admin_structure`

### Parent
- **Email**: `parent@test.fr`
- **Mot de passe**: `Parent2024!`
- **Rôle**: `parent`

⚠️ **IMPORTANT**: Changez ces mots de passe dès la première connexion!

## 📚 Documentation API

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Authentification

##### POST /auth/login
Connexion d'un utilisateur

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.fr",
    "password": "Parent2024!"
  }'
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "parent@test.fr",
      "role": "parent",
      "profile": { ... },
      "mustChangePassword": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Connexion réussie"
}
```

##### POST /auth/register
Inscription d'un nouveau parent

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouveau@parent.fr",
    "password": "SecurePass123!",
    "prenom": "Jean",
    "nom": "Dupont",
    "tel": "+33612345678"
  }'
```

##### POST /auth/refresh
Rafraîchir le token d'accès

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

##### POST /auth/change-password
Changer le mot de passe (authentifié)

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

##### GET /auth/me
Récupérer les infos de l'utilisateur connecté

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Gestion des utilisateurs

##### GET /users/profile
Récupérer son profil (authentifié)

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

##### PUT /users/profile
Mettre à jour son profil (authentifié)

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "prenom": "Jean",
    "nom": "Martin",
    "tel": "+33612345678",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "codePostal": "75001"
  }'
```

##### GET /users
Lister tous les utilisateurs (admin seulement)

```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

##### PATCH /users/:userId/status
Activer/désactiver un utilisateur (admin seulement)

```bash
curl -X PATCH http://localhost:5000/api/users/USER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "isActive": false
  }'
```

## 🔒 Sécurité

### Authentification JWT

L'API utilise des JSON Web Tokens (JWT) pour l'authentification :

- **Access Token**: Expire après 15 minutes, utilisé pour les requêtes API
- **Refresh Token**: Expire après 7 jours, utilisé pour renouveler l'access token

### Rôles et permissions

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Super administrateur | Accès complet à tout le système |
| `admin_structure` | Directeur de crèche | Gestion d'un établissement |
| `professionnel` | Éducateur, puéricultrice | Gestion quotidienne des enfants |
| `parent` | Parent d'un enfant | Accès aux infos de ses enfants |

### Protection contre les attaques

- **Mots de passe**: Hashés avec bcrypt (12 rounds)
- **Validation**: express-validator pour toutes les entrées
- **SQL Injection**: Prisma utilise des requêtes paramétrées
- **XSS**: Validation et sanitization des inputs
- **CORS**: Configuration stricte des origines autorisées
- **Rate limiting**: À implémenter en production

## 🗄️ Structure de la base de données

```
User
├── id (UUID)
├── email (unique)
├── password (bcrypt hash)
├── role (enum: super_admin, admin_structure, professionnel, parent)
├── isActive
├── mustChangePassword
└── Profile
    ├── prenom
    ├── nom
    ├── tel
    ├── adresse
    └── ...

Etablissement
├── id
├── nom
├── adresse
├── capaciteAccueil
└── Sections
    ├── nom
    ├── trancheAge
    └── capacite

Enfant
├── id
├── prenom
├── nom
├── dateNaissance
├── codeConfidentiel (unique, 6 chars)
├── groupeSanguin
├── allergies
└── parents (relation many-to-many avec User)
```

## 📝 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur en mode développement |
| `npm run build` | Compile le TypeScript en JavaScript |
| `npm start` | Démarre le serveur en mode production |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:migrate` | Crée et applique les migrations |
| `npm run prisma:studio` | Ouvre l'interface Prisma Studio |
| `npm run prisma:seed` | Remplit la base avec les données initiales |
| `npm run db:reset` | Réinitialise la base de données |

## 🐛 Debugging

### Logs Prisma

Pour voir toutes les requêtes SQL exécutées, activez les logs dans `src/config/prisma.ts`.

### Morgan logging

Les requêtes HTTP sont loggées automatiquement :
- **Development**: Format `dev` (coloré, concis)
- **Production**: Format `combined` (Apache standard)

## 🚀 Déploiement en production

### Variables d'environnement

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@production-host:5432/db"
JWT_ACCESS_SECRET="CHANGEZ-MOI-SECRET-TRES-LONG-ET-ALEATOIRE"
JWT_REFRESH_SECRET="CHANGEZ-MOI-AUSSI-SECRET-TRES-LONG-ET-ALEATOIRE"
CORS_ORIGIN="https://votre-domaine.fr"
```

### Checklist de sécurité

- [ ] Changer tous les secrets JWT
- [ ] Utiliser HTTPS uniquement
- [ ] Configurer un reverse proxy (nginx)
- [ ] Activer le rate limiting
- [ ] Configurer les logs en production
- [ ] Mettre en place des backups automatiques
- [ ] Surveiller les métriques (CPU, RAM, DB)
- [ ] Changer les mots de passe par défaut

## 📄 Licence

Ce projet fait partie de Kids'Med IA.
