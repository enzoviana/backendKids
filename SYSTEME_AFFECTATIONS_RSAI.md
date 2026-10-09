# 🏥 Système d'affectations RSAI

## 🐛 Problème résolu

**Avant** : Quand une crèche demandait une RSAI et qu'un admin l'affectait, personne ne voyait les affectations (ni admin, ni crèche, ni RSAI). Tout était mocké avec des données hardcodées qui n'étaient jamais sauvegardées.

**Maintenant** : Système complet de demandes et d'affectations RSAI avec sauvegarde en base de données PostgreSQL.

## 📊 Modèles créés

### 1. **DemandeRsai** - Demandes d'intervention
Quand une crèche a besoin d'une RSAI, elle crée une demande.

```typescript
{
  id: string;
  crecheId: string;              // Qui demande
  etablissementId: string;       // Pour quel établissement
  motif: string;                 // Raison de la demande
  dateDebut: Date;               // Quand
  dateFin?: Date;                // Jusqu'à quand
  urgence: boolean;              // Demande urgente ?
  statut: 'en_attente' | 'acceptee' | 'refusee' | 'annulee';
  traitePar?: string;            // Admin qui a traité
  commentaire?: string;          // Commentaire de l'admin
  dateTraitement?: Date;         // Quand traitée
}
```

### 2. **AffectationRsai** - Affectations actives
Quand un admin affecte une RSAI à une crèche.

```typescript
{
  id: string;
  rsaiId: string;                // Quelle RSAI
  crecheId: string;              // Pour quelle crèche
  etablissementId: string;       // Quel établissement
  dateDebut: Date;               // Début affectation
  dateFin?: Date;                // Fin affectation
  horaires?: JSON;               // Horaires par jour
  perimetreGps?: JSON;           // Zone géographique
  statut: 'active' | 'terminee' | 'revoquee';
  creePar: string;               // Admin qui a créé
  revoqueePar?: string;          // Admin qui a révoqué
  dateRevocation?: Date;         // Quand révoquée
}
```

### 3. **AvisRsai** - Évaluations
Quand une crèche note une RSAI après intervention.

```typescript
{
  id: string;
  rsaiId: string;                // RSAI notée
  crecheId: string;              // Crèche qui note
  auteurId: string;              // Qui a noté
  auteurNom: string;             // Nom de l'auteur
  note: number;                  // 1-5 étoiles
  commentaire?: string;          // Commentaire optionnel
}
```

## 🔄 Workflow complet

### Étape 1 : Crèche demande une RSAI

```http
POST /api/coordination/demandes-rsai
Authorization: Bearer <token-creche>
Content-Type: application/json

{
  "etablissementId": "uuid-etablissement",
  "motif": "Besoin d'une RSAI pour formation du personnel",
  "dateDebut": "2026-10-15T09:00:00Z",
  "dateFin": "2026-10-15T17:00:00Z",
  "urgence": false
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "demande-uuid",
    "statut": "en_attente",
    "motif": "Besoin d'une RSAI pour formation du personnel",
    "dateDebut": "2026-10-15T09:00:00.000Z",
    ...
  },
  "message": "Demande créée avec succès"
}
```

### Étape 2 : Crèche vérifie ses demandes

```http
GET /api/coordination/demandes-rsai
Authorization: Bearer <token-creche>
```

Ou filtrer :
```http
GET /api/coordination/demandes-rsai?statut=en_attente
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "demande-uuid",
      "statut": "en_attente",
      "motif": "Besoin d'une RSAI...",
      ...
    }
  ],
  "total": 1
}
```

### Étape 3 : Admin voit toutes les demandes

```http
GET /api/coordination/demandes-rsai
Authorization: Bearer <token-admin>
```

**Réponse :** Voit toutes les demandes (pas seulement les siennes)

### Étape 4 : Admin traite la demande

**Accepter :**
```http
PATCH /api/coordination/demandes-rsai/demande-uuid
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "statut": "acceptee",
  "commentaire": "Demande validée, affectation en cours"
}
```

**Refuser :**
```http
PATCH /api/coordination/demandes-rsai/demande-uuid
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "statut": "refusee",
  "commentaire": "Aucune RSAI disponible à cette date"
}
```

### Étape 5 : Admin affecte une RSAI

```http
POST /api/coordination/affectations
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "rsaiId": "uuid-rsai",
  "crecheId": "uuid-creche",
  "etablissementId": "uuid-etablissement",
  "dateDebut": "2026-10-15T09:00:00Z",
  "dateFin": "2026-10-15T17:00:00Z",
  "horaires": {
    "lundi": "09:00-17:00",
    "mardi": "09:00-17:00"
  },
  "perimetreGps": {
    "lat": 48.8566,
    "lng": 2.3522,
    "rayon": 5000
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "affectation-uuid",
    "rsaiId": "uuid-rsai",
    "crecheId": "uuid-creche",
    "statut": "active",
    ...
  },
  "message": "Affectation créée avec succès"
}
```

### Étape 6 : Tout le monde voit les affectations

**Admin voit toutes les affectations :**
```http
GET /api/coordination/affectations
Authorization: Bearer <token-admin>
```

**Crèche voit ses affectations :**
```http
GET /api/coordination/affectations
Authorization: Bearer <token-creche>
```

**RSAI voit ses affectations :**
```http
GET /api/rsai/me/affectations
Authorization: Bearer <token-rsai>
```

Ou via :
```http
GET /api/coordination/affectations
Authorization: Bearer <token-rsai>
```

**Filtrer par statut :**
```http
GET /api/coordination/affectations?statut=active
GET /api/coordination/affectations?statut=terminee
```

### Étape 7 : Admin peut révoquer une affectation

```http
DELETE /api/coordination/affectations/affectation-uuid
Authorization: Bearer <token-admin>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "affectation-uuid",
    "statut": "revoquee",
    "dateRevocation": "2026-10-09T12:45:00.000Z"
  },
  "message": "Affectation révoquée"
}
```

### Étape 8 : Crèche note la RSAI

```http
POST /api/rsai/uuid-rsai/avis
Authorization: Bearer <token-creche>
Content-Type: application/json

{
  "note": 5,
  "commentaire": "Excellent travail, très professionnelle"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "avis-uuid",
    "rsaiId": "uuid-rsai",
    "note": 5,
    ...
  },
  "stats": {
    "noteMoyenne": 4.8,
    "nbAvis": 12
  },
  "message": "Avis créé avec succès"
}
```

### Étape 9 : Consulter les avis

```http
GET /api/coordination/avis
Authorization: Bearer <token-admin|creche|rsai>
```

**Filtrage automatique :**
- Admin : Voit tous les avis
- Crèche : Voit les avis qu'elle a donnés
- RSAI : Voit les avis qu'elle a reçus

## 🔐 Permissions

| Route | Admin | Crèche | RSAI |
|-------|-------|--------|------|
| POST /coordination/demandes-rsai | ❌ | ✅ | ❌ |
| GET /coordination/demandes-rsai | ✅ Toutes | ✅ Ses demandes | ❌ |
| PATCH /coordination/demandes-rsai/:id | ✅ | ❌ | ❌ |
| POST /coordination/affectations | ✅ | ❌ | ❌ |
| GET /coordination/affectations | ✅ Toutes | ✅ Ses affectations | ✅ Ses affectations |
| DELETE /coordination/affectations/:id | ✅ | ❌ | ❌ |
| GET /rsai/me/affectations | ❌ | ❌ | ✅ |
| POST /rsai/:rsaiId/avis | ❌ | ✅ | ❌ |
| GET /coordination/avis | ✅ Tous | ✅ Donnés | ✅ Reçus |

## 🚀 Migration requise

⚠️ **Action nécessaire** : Appliquer la migration en base de données

### Via Postman (Render)

```http
POST https://votre-api.onrender.com/api/developer/database/migrate
Authorization: Bearer <token-developpeur>
```

### Via shell (si accès disponible)

```bash
npx prisma migrate deploy
```

## ✅ Résultat final

Maintenant :
1. ✅ Les crèches créent des demandes qui se sauvegardent
2. ✅ Les admins voient toutes les demandes
3. ✅ Les admins acceptent/refusent les demandes
4. ✅ Les admins affectent des RSAI aux crèches
5. ✅ Les affectations sont visibles par **admin, crèche ET RSAI**
6. ✅ Les RSAI voient leurs affectations avec horaires et GPS
7. ✅ Les crèches notent les RSAI (1-5 étoiles)
8. ✅ Les avis sont consultables par tous

Plus de listes vides ! 🎉
