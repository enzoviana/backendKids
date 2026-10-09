# Fix : Listes vides sur pages Médecins et RSAI

## 🐛 Problème identifié

Les routes suivantes retournaient des listes vides :
- `GET /api/medecins` → `{ success: true, data: [] }`
- `GET /api/rsai` → `{ success: true, data: [] }`

Alors que des comptes avec ces rôles existaient :
- `medecin@demo.fr` (role: medecin)
- `rsai@demo.com` (role: rsai)

## 🔍 Cause

Les contrôleurs retournaient des données mockées (hardcodées) au lieu d'interroger la base de données :

```typescript
// ❌ AVANT
async getMedecins(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
}
```

## ✅ Solution

Les contrôleurs filtrent maintenant les utilisateurs par rôle dans la table `User` et incluent leur profil :

```typescript
// ✅ APRÈS
async getMedecins(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const medecins = await prisma.user.findMany({
      where: { role: 'medecin' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedMedecins = medecins.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      prenom: user.profile?.prenom || '',
      nom: user.profile?.nom || '',
      tel: user.profile?.tel || '',
      ville: user.profile?.ville || '',
      photo: user.profile?.photo || '',
      // ...
    }));

    res.status(200).json({
      success: true,
      data: formattedMedecins,
      total: formattedMedecins.length,
    });
  } catch (error) {
    next(error);
  }
}
```

## 📊 Fichiers modifiés

### 1. `src/controllers/medecinController.ts`
- ✅ `GET /api/medecins` filtre maintenant `where: { role: 'medecin' }`
- ✅ Inclut le profil (prenom, nom, tel, ville, photo)
- ✅ Support filtrage par `isActive` (query param)
- ✅ Retourne le total

### 2. `src/controllers/rsaiController.ts`
- ✅ `GET /api/rsai` filtre maintenant `where: { role: 'rsai' }`
- ✅ Inclut le profil (prenom, nom, tel, ville, photo)
- ✅ Support filtrage par `isActive` (query param)
- ✅ Support filtrage par `ville` (query param)
- ✅ Retourne le total

## 🎯 Résultat

Maintenant, les appels suivants retournent les vrais utilisateurs :

### Médecins
```http
GET /api/medecins
Authorization: Bearer <token>
```

Réponse :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-medecin",
      "email": "medecin@demo.fr",
      "role": "medecin",
      "isActive": true,
      "prenom": "Dr.",
      "nom": "Médecin",
      "tel": "0123456789",
      "ville": "Paris",
      "photo": null
    }
  ],
  "total": 1
}
```

### RSAI
```http
GET /api/rsai
Authorization: Bearer <token>
```

Réponse :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-rsai",
      "email": "rsai@demo.com",
      "role": "rsai",
      "isActive": true,
      "prenom": "Agent",
      "nom": "RSAI",
      "tel": "0987654321",
      "ville": "Lyon",
      "photo": null
    }
  ],
  "total": 1
}
```

## 🔍 Filtres disponibles

### Par statut actif/inactif
```http
GET /api/medecins?isActive=true
GET /api/rsai?isActive=false
```

### Par ville (RSAI uniquement)
```http
GET /api/rsai?ville=Paris
```

## 🚀 Déploiement

Le code est pushé. Une fois Render redémarré :
1. ✅ Les comptes médecins s'affichent dans la page Médecins
2. ✅ Les comptes RSAI s'affichent dans la page RSAI
3. ✅ Les filtres fonctionnent
4. ✅ Les informations de profil sont incluses

## 📝 Note

La route `GET /api/users` fonctionnait déjà correctement car elle utilisait `userService.getAllUsers()` qui interroge bien la base de données. Les routes médecins et RSAI étaient juste des stubs (fonctions temporaires vides) qui n'avaient pas encore été implémentées.
