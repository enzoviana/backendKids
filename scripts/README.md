# 📦 Scripts de Migration et Utilitaires

## 🚀 Migration de données

### Script Simple (Recommandé)
```bash
npm run migrate
```

Script interactif qui vous guide pas à pas pour migrer vos données de votre base locale vers Render.

**Ce qu'il fait:**
- ✅ Demande les URLs source et cible
- ✅ Exporte toutes les données
- ✅ Importe dans la base cible
- ✅ Affiche un résumé détaillé
- ✅ Gère automatiquement les doublons

**Usage:**
```bash
cd /Volumes/SSD_ENZO/Crech-main/api
npm run migrate
```

Ou avec variables d'environnement:
```bash
SOURCE_DATABASE_URL="postgresql://localhost..." \
TARGET_DATABASE_URL="postgresql://render..." \
npm run migrate
```

---

## 🔐 Génération de secrets JWT

```bash
npm run generate-secrets
```

Génère deux secrets JWT sécurisés (32 bytes) pour la production.

---

## ✅ Vérification du déploiement

```bash
npm run check-deploy
```

Vérifie que tout est prêt pour le déploiement:
- Scripts npm
- Configuration Railway/Render
- .gitignore
- Prisma schema
- Migrations

---

## 📝 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run migrate` | Migration interactive des données |
| `npm run generate-secrets` | Génère des secrets JWT |
| `npm run check-deploy` | Vérifie l'état du déploiement |

---

## 📚 Documentation

- [HOW_TO_MIGRATE.md](../../HOW_TO_MIGRATE.md) - Guide complet de migration
- [QUICK_MIGRATE.md](../../QUICK_MIGRATE.md) - Migration rapide avec pg_dump
- [MIGRATE_DATA.md](../../MIGRATE_DATA.md) - Toutes les méthodes de migration

---

## 🆘 Besoin d'aide?

Consultez les guides dans le dossier racine du projet.
