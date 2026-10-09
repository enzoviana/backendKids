# Migration des Tickets de Support

## Problème résolu

Avant, les tickets de support étaient mockés et ne se sauvegardaient pas en base de données. Maintenant, ils sont complètement fonctionnels avec sauvegarde en PostgreSQL.

## Ce qui a été fait

1. **Modèle Prisma `TicketSupport` créé** avec :
   - `id`, `numero` (TCK-0001, TCK-0002, etc.)
   - Informations auteur (id, nom, email, rôle)
   - `titre`, `description`
   - `categorie` : bug, amelioration, question, probleme_technique, autre
   - `priorite` : basse, normale, haute, critique
   - `statut` : ouvert, en_cours, resolu, ferme
   - `reponse`, `reponduPar`, `dateReponse`, `dateFermeture`

2. **Logique implémentée** :
   - ✅ `POST /api/developer/support/tickets` - Créer un ticket (tous les rôles)
   - ✅ `GET /api/developer/support/tickets` - Tous les tickets avec stats (développeurs)
   - ✅ `GET /api/developer/support/tickets/mine` - Mes tickets (tous les rôles)
   - ✅ `GET /api/developer/support/tickets/:id` - Détails d'un ticket (tous les rôles)
   - ✅ `PATCH /api/developer/support/tickets/:id` - Répondre/modifier un ticket (développeurs)

## Migration à appliquer

⚠️ **IMPORTANT** : Vous devez lancer la migration pour créer la table en base de données.

### Option 1 : Via l'API (recommandé pour Render/services sans shell)

**1. Vérifier les migrations en attente**
```bash
GET /api/developer/database/migrations/pending
Authorization: Bearer <token-developpeur>
```

**2. Appliquer les migrations**
```bash
POST /api/developer/database/migrate
Authorization: Bearer <token-developpeur>
```

Exemple avec curl :
```bash
curl -X POST https://votre-api.com/api/developer/database/migrate \
  -H "Authorization: Bearer VOTRE_TOKEN_DEVELOPPEUR" \
  -H "Content-Type: application/json"
```

### Option 2 : Via le shell (si accès disponible)

```bash
cd /Volumes/SSD_ENZO/Crech-main/api
npx prisma migrate deploy
```

### Option 3 : Créer une nouvelle migration (développement local)

```bash
cd /Volumes/SSD_ENZO/Crech-main/api
npx prisma migrate dev --name add-ticket-support
```

## Utilisation

### Créer un ticket (n'importe quel utilisateur)

```bash
POST /api/developer/support/tickets
{
  "titre": "Impossible de se connecter",
  "description": "J'obtiens une erreur 500 lors de la connexion",
  "categorie": "probleme_technique",
  "priorite": "haute"
}
```

### Voir tous les tickets (développeurs uniquement)

```bash
GET /api/developer/support/tickets
GET /api/developer/support/tickets?statut=ouvert
GET /api/developer/support/tickets?priorite=haute
```

### Voir mes tickets (tous les utilisateurs)

```bash
GET /api/developer/support/tickets/mine
```

### Répondre à un ticket (développeurs uniquement)

```bash
PATCH /api/developer/support/tickets/:id
{
  "statut": "resolu",
  "reponse": "Le problème a été corrigé dans la version 1.2.3"
}
```

## Résultat

Maintenant, quand un utilisateur crée un ticket :
1. ✅ Le ticket est sauvegardé en base de données
2. ✅ Un numéro unique est généré (TCK-0001, TCK-0002, etc.)
3. ✅ Les développeurs peuvent voir tous les tickets dans leur console
4. ✅ Les développeurs peuvent répondre et changer le statut
5. ✅ Chaque utilisateur peut voir ses propres tickets
