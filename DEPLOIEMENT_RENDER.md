# 🚀 Déploiement sur Render avec migrations automatiques

## Problème

Sur Render (et autres services similaires), vous n'avez pas accès au shell pour exécuter `npx prisma migrate deploy`.

## Solution : Routes API de migration

J'ai créé des routes API protégées (développeurs uniquement) pour gérer les migrations directement via Postman ou votre interface.

## 📋 Routes disponibles

### 1. Vérifier les migrations en attente

```http
GET /api/developer/database/migrations/pending
Authorization: Bearer <votre-token-developpeur>
```

**Réponse :**
```json
{
  "success": true,
  "hasPendingMigrations": true,
  "output": "Database schema is up to date!\n\nFollowing migration have not yet been applied:\n20261009115435_add_ticket_support"
}
```

### 2. Appliquer les migrations

```http
POST /api/developer/database/migrate
Authorization: Bearer <votre-token-developpeur>
```

**Réponse :**
```json
{
  "success": true,
  "message": "Migrations appliquées avec succès",
  "output": "Applying migration `20261009115435_add_ticket_support`\nThe following migration(s) have been applied:\n\nmigrations/\n  └─ 20261009115435_add_ticket_support/\n    └─ migration.sql\n\nYour database is now in sync with your schema."
}
```

### 3. Générer le client Prisma

```http
POST /api/developer/database/generate
Authorization: Bearer <votre-token-developpeur>
```

**Réponse :**
```json
{
  "success": true,
  "message": "Client Prisma généré avec succès",
  "output": "✔ Generated Prisma Client"
}
```

## 🔧 Procédure de déploiement

### Étape 1 : Push le code

```bash
git add .
git commit -m "Ajout système tickets de support"
git push
```

### Étape 2 : Render redémarre automatiquement

Render va :
1. Détecter le nouveau commit
2. Pull le code
3. Run `npm install`
4. Redémarrer l'application

⚠️ À ce stade, **la table TicketSupport n'existe pas encore** dans la base de données.

### Étape 3 : Appliquer la migration via API

**Option A : Via Postman**

1. Obtenir votre token développeur :
   ```http
   POST /api/auth/login
   {
     "email": "votre-email-developpeur@example.com",
     "password": "votre-mot-de-passe"
   }
   ```

2. Copier le `accessToken` de la réponse

3. Vérifier les migrations en attente :
   ```http
   GET https://votre-api.render.com/api/developer/database/migrations/pending
   Authorization: Bearer <votre-access-token>
   ```

4. Appliquer les migrations :
   ```http
   POST https://votre-api.render.com/api/developer/database/migrate
   Authorization: Bearer <votre-access-token>
   ```

**Option B : Via curl**

```bash
# 1. Se connecter et récupérer le token
TOKEN=$(curl -X POST https://votre-api.render.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"votre-mdp"}' \
  | jq -r '.data.accessToken')

# 2. Vérifier les migrations
curl -X GET https://votre-api.render.com/api/developer/database/migrations/pending \
  -H "Authorization: Bearer $TOKEN"

# 3. Appliquer les migrations
curl -X POST https://votre-api.render.com/api/developer/database/migrate \
  -H "Authorization: Bearer $TOKEN"
```

**Option C : Via votre interface développeur**

Si vous avez une interface web pour les développeurs, ajoutez un bouton qui appelle :
```javascript
fetch('/api/developer/database/migrate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    alert('✅ Migrations appliquées !');
  } else {
    alert('❌ Erreur : ' + data.error);
  }
});
```

### Étape 4 : Vérifier que tout fonctionne

Testez la création d'un ticket :
```http
POST https://votre-api.render.com/api/developer/support/tickets
Authorization: Bearer <votre-token>
Content-Type: application/json

{
  "titre": "Test ticket",
  "description": "Vérification que le système fonctionne",
  "categorie": "question",
  "priorite": "normale"
}
```

Si vous recevez un ticket avec un numéro (TCK-0001), c'est bon ! ✅

## 🔒 Sécurité

Ces routes sont **protégées par le middleware `requireDeveloper`** :
- Seuls les utilisateurs avec le rôle `developpeur` peuvent les appeler
- Nécessite un token JWT valide

## ⚠️ Important

**Ne jamais exposer ces routes publiquement**. Elles doivent rester accessibles uniquement aux développeurs authentifiés.

## 🆘 En cas d'erreur

Si la migration échoue :

1. Vérifier les logs dans Render
2. Vérifier que la base de données PostgreSQL est accessible
3. Vérifier que la variable d'environnement `DATABASE_URL` est correcte
4. Essayer de régénérer le client Prisma d'abord :
   ```http
   POST /api/developer/database/generate
   ```
   Puis réessayer la migration

## 📝 Logs

Les routes retournent :
- `stdout` : Sortie standard de la commande
- `stderr` : Erreurs/warnings de la commande
- `error` : Description de l'erreur si échec

Utilisez ces informations pour déboguer en cas de problème.
