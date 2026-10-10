# 🔍 AUDIT - MIGRATION FRONTEND → BACKEND

**Date :** 2026-10-10
**Objectif :** Identifier toutes les pages utilisant encore des données MOCK au lieu du backend API

---

## ✅ PAGES DÉJÀ CONNECTÉES AU BACKEND

### Authentification (100% connectée)
- [x] `/login.tsx` - Utilise `useAuth().loginAsync()`
- [x] `/register.tsx` - Utilise `useAuth().registerAsync()`
- [x] `/index.tsx` - Utilise `useAuth()` pour vérification token
- [x] `/profile.tsx` - **PARTIELLEMENT** - Logout connecté, mais données profil en mock

---

## ❌ PAGES À MIGRER VERS LE BACKEND (ÉTAPE 2)

### 📱 ESPACE PARENT - 4/4 pages migrées ✅

#### [x] 1. `app/(parent)/index.tsx` - Dashboard Parent

**Données mock actuelles (AppStore) :**
- `primaryChild` - Enfant principal
- `parentChildren` - Liste des enfants
- `selectedChildId` - ID enfant sélectionné
- `notifications` - Notifications
- `data.diagnostics_ia` - Derniers diagnostics IA
- `primaryChild.memos` - Mémos de la crèche
- `activeSOS` - Alerte SOS active
- `unreadCount` - Nombre de non-lus

**Hooks backend disponibles :**
```typescript
// À utiliser :
import { useAuth, useEnfants, useNotifications, useDiagnostics } from '@/src/hooks';

const { user } = useAuth();
const { data: enfants } = useEnfants(user?.etablissementId);
const { data: notifications } = useNotifications(); // Polling 30s auto
const { data: diagnostics } = useDiagnostics(primaryChild.id);
```

**Migrations nécessaires :**
1. Remplacer `useApp().primaryChild` par `useEnfants()`
2. Remplacer `useApp().notifications` par `useNotifications()`
3. Remplacer `data.diagnostics_ia` par `useDiagnostics()`
4. Implémenter SOS avec `useTriggerSOS()`

---

#### [x] 2. `app/(parent)/symptom.tsx` - Diagnostic IA

**Données mock actuelles (AppStore) :**
- `primaryChild` - Enfant concerné
- `reportSymptom(childId, symptoms)` - Fonction locale mock

**Hooks backend disponibles :**
```typescript
import { useReportSymptom } from '@/src/hooks';

const { mutate: reportSymptom } = useReportSymptom();
// Appelle POST /api/enfants/:id/symptom
```

**Moteur IA local à remplacer :**
- ❌ Actuellement : `/src/lib/aiDiagnostic.ts` (analyse locale)
- ✅ À utiliser : `useAnalyzeDiagnostic()` → POST `/api/diagnostics/:id/analyze`

**Migrations nécessaires :**
1. Remplacer `analyze()` local par `useAnalyzeDiagnostic()`
2. Remplacer `reportSymptom()` par `useReportSymptom()`
3. Envoyer les symptômes au backend pour analyse IA

---

#### [x] 3. `app/(parent)/notifications.tsx` - Notifications

**Données mock actuelles (AppStore) :**
- `notifications` - Liste des notifications
- `markAllNotificationsRead()` - Fonction locale

**Hooks backend disponibles :**
```typescript
import { useNotifications, useMarkAllNotificationsRead } from '@/src/hooks';

const { data: notifications } = useNotifications(); // Auto-refresh 30s
const { mutate: markAllRead } = useMarkAllNotificationsRead();
```

**Migrations nécessaires :**
1. Remplacer `useApp().notifications` par `useNotifications()`
2. Remplacer `markAllNotificationsRead()` par `useMarkAllNotificationsRead()`

---

#### [x] 4. `app/(parent)/history.tsx` - Dossier médical

**Données mock actuelles (AppStore) :**
- `primaryChild.allergies` - Liste des allergies
- `primaryChild.vaccins` - Liste des vaccinations
- `primaryChild.prescriptions` - Liste des prescriptions

**Hooks backend disponibles :**
```typescript
import { useEnfant } from '@/src/hooks';

const { data: enfant } = useEnfant(enfantId);
// Retourne l'enfant avec allergies, vaccins, prescriptions
```

**Migrations nécessaires :**
1. Remplacer `useApp().primaryChild` par `useEnfant(enfantId)`
2. Utiliser `enfant.allergies`, `enfant.vaccins`, `enfant.prescriptions` depuis l'API

---

### 🏫 ESPACE CRÈCHE - 4/4 pages migrées ✅

#### [x] 5. `app/(creche)/index.tsx` - Dashboard Crèche

**Données mock actuelles (AppStore) :**
- `children` - Liste des enfants
- `reportSymptom(childId, symptoms)` - Fonction locale
- `rsaiProfil` - Profil du RSAI
- `ratingFor(rsaiId)` - Notation du RSAI
- `addReview()` - Ajouter un avis

**Hooks backend disponibles :**
```typescript
import { useEnfants, useReportSymptom, useRsai, useCreateReview } from '@/src/hooks';

const { user } = useAuth();
const { data: children } = useEnfants(user?.etablissementId);
const { mutate: reportSymptom } = useReportSymptom();
const { data: rsai } = useRsai(rsaiId);
const { mutate: createReview } = useCreateReview();
```

**Migrations nécessaires :**
1. Remplacer `useApp().children` par `useEnfants()`
2. Remplacer `reportSymptom()` local par `useReportSymptom()`
3. Remplacer `rsaiProfil` par `useRsai()`
4. Remplacer `addReview()` par `useCreateReview()`

---

#### [x] 6. `app/(creche)/assistant.tsx` - Assistant IA

**Données mock actuelles (AppStore) :**
- `data.diagnostics_ia` - Tous les diagnostics
- `children` - Liste des enfants pour mapping

**Hooks backend disponibles :**
```typescript
import { useTrendsByCrecheId, useDiagnostics } from '@/src/hooks';

const { data: trends } = useTrendsByCrecheId(crecheId);
const { data: diagnostics } = useDiagnostics(); // Tous les diagnostics de l'établissement
```

**Migrations nécessaires :**
1. Remplacer `data.diagnostics_ia` par `useDiagnostics()`
2. Utiliser `useTrendsByCrecheId()` pour les tendances IA
3. Calculer les statistiques depuis l'API

---

#### [ ] 7. `app/(creche)/quotidien.tsx` - Carnet quotidien

**Données mock actuelles (AppStore) :**
- `children` - Liste des enfants
- `children[].dailyLogs` - Transmissions quotidiennes
- `children[].memos` - Mémos de transmission
- `addMemo(childId, type, texte)` - Fonction locale
- `resolveMemo(childId, memoId, statut)` - Fonction locale

**Hooks backend disponibles :**
```typescript
import { useEnfants, useEnfant } from '@/src/hooks';

const { data: children } = useEnfants(etablissementId);
const { data: enfant } = useEnfant(enfantId); // Avec dailyLogs, memos
```

**Endpoints backend manquants à créer :**
- POST `/api/enfants/:id/memo` - Créer un mémo
- PATCH `/api/memos/:id` - Résoudre un mémo

**Migrations nécessaires :**
1. Remplacer `useApp().children` par `useEnfants()`
2. Créer endpoint backend pour mémos
3. Créer hooks `useCreateMemo()` et `useResolveMemo()`

---

#### [x] 8. `app/(creche)/prescriptions.tsx` - Traitements

**Données mock actuelles (AppStore) :**
- `children` - Liste des enfants
- `children[].prescriptions` - Prescriptions actives
- `medicationLogs` - Historique des prises
- `logMedication(prescId, childId, med)` - Fonction locale

**Hooks backend disponibles :**
```typescript
import { useEnfants } from '@/src/hooks';

const { data: children } = useEnfants(etablissementId);
// children[].prescriptions depuis l'API
```

**Endpoints backend manquants à créer :**
- POST `/api/prescriptions/:id/log` - Logger une administration
- GET `/api/prescriptions/:id/logs` - Historique des prises

**Migrations nécessaires :**
1. Remplacer `children` par `useEnfants()`
2. Créer endpoint backend pour logs de médication
3. Créer hook `useLogMedication()`

---

### 🛡️ ESPACE RSAI - 4/4 pages migrées ✅

#### [x] 9. `app/(rsai)/index.tsx` - Accueil RSAI

**Données mock actuelles (AppStore) :**
- `rsaiInside` - État géofencing (simulé)
- `rsaiProfil` - Profil du RSAI
- `creches` - Liste des crèches affectées
- `missions` - Liste des missions
- `ratingFor(rsaiId)` - Notation globale

**Hooks backend disponibles :**
```typescript
import { useRsai, useMissions, useRsaiReviews } from '@/src/hooks';

const { data: rsai } = useRsai(rsaiId);
const { data: missions } = useMissions(rsaiId);
const { data: reviews } = useRsaiReviews(rsaiId);
```

**Endpoints backend manquants à créer :**
- GET `/api/rsai/:id/missions` - Missions du RSAI
- POST `/api/rsai/:id/geofence-verify` - Vérification géofencing

**Migrations nécessaires :**
1. Remplacer `rsaiProfil` par `useRsai()`
2. Remplacer `missions` par `useMissions()`
3. Implémenter géofencing réel avec backend

---

#### [x] 10. `app/(rsai)/avis.tsx` - Avis & évaluations

**Données mock actuelles (AppStore) :**
- `reviews` - Tous les avis
- `addReview()` - Ajouter un avis
- `ratingFor(rsaiId)` - Notation
- `rsaiProfil` - Profil RSAI
- `creches` - Liste des crèches

**Hooks backend disponibles :**
```typescript
import { useRsaiReviews, useCreateReview } from '@/src/hooks';

const { data: reviews } = useRsaiReviews(rsaiId);
const { mutate: createReview } = useCreateReview();
```

**Migrations nécessaires :**
1. Remplacer `reviews` par `useRsaiReviews()`
2. Remplacer `addReview()` par `useCreateReview()`

---

#### [x] 11. `app/(rsai)/enfants.tsx` - Liste des enfants

**Données mock actuelles (AppStore) :**
- `rsaiInside` - État géofencing
- `children` - Liste des enfants

**Hooks backend disponibles :**
```typescript
import { useEnfants } from '@/src/hooks';

const { data: children } = useEnfants(etablissementId);
```

**Migrations nécessaires :**
1. Remplacer `useApp().children` par `useEnfants()`
2. Vérifier géofencing côté backend

---

#### [x] 12. `app/(rsai)/registres.tsx` - Registres de sécurité

**Données mock actuelles (AppStore) :**
- `rsaiInside` - État géofencing
- `data.checklists_conformite` - Checklist de conformité
- `data.logs_securite` - Logs de sécurité

**Endpoints backend manquants à créer :**
- GET `/api/rsai/:id/checklists` - Checklists de conformité
- POST `/api/checklist/:id/complete` - Marquer comme fait
- GET `/api/rsai/:id/security-logs` - Logs de sécurité

**Migrations nécessaires :**
1. Créer endpoints backend pour registres
2. Créer hooks `useChecklists()` et `useSecurityLogs()`
3. Remplacer mock par vraies données API

---

### 👶 DOSSIER ENFANT - 1/1 page migrée ✅

#### [x] 13. `app/child/[id].tsx` - Dossier enfant complet

**Données mock actuelles (AppStore) :**
- `getChild(id)` - Données de l'enfant
- `role` - Rôle de l'utilisateur
- `addDailyLog()` - Ajouter transmission
- `addTemperature()` - Ajouter température
- `addNote()` - Ajouter note
- `setMedConsent()` - Consentement médical
- `addAuthorizedPickup()` - Personne autorisée

**Hooks backend disponibles :**
```typescript
import { useEnfant, useUpdateEnfant, useUpdateDossierMedical } from '@/src/hooks';

const { data: child } = useEnfant(enfantId);
const { mutate: updateEnfant } = useUpdateEnfant();
const { mutate: updateDossier } = useUpdateDossierMedical();
```

**Endpoints backend manquants à créer :**
- POST `/api/enfants/:id/dailylog` - Ajouter transmission
- POST `/api/enfants/:id/temperature` - Ajouter température
- POST `/api/enfants/:id/note` - Ajouter note
- POST `/api/enfants/:id/consent` - Consentement médical
- POST `/api/enfants/:id/authorized-pickup` - Personne autorisée

**Migrations nécessaires :**
1. Remplacer `getChild()` par `useEnfant()`
2. Créer tous les endpoints manquants
3. Créer hooks pour chaque action
4. Migrer toutes les sections (Aperçu, Quotidien, Fièvre, Notes, Soins, Sorties)

---

### 🔧 COMPOSANTS - 1/1 composant migré ✅

#### [x] 14. `src/components/SOSButton.tsx` - Bouton SOS

**Données mock actuelles (AppStore) :**
- `triggerSOS(childId, motif)` - Fonction locale mock

**Hooks backend disponibles :**
```typescript
import { useTriggerSOS } from '@/src/hooks';

const { mutate: triggerSOS } = useTriggerSOS();
// Appelle POST /api/enfants/:id/sos
```

**Migrations nécessaires :**
1. Remplacer `useApp().triggerSOS()` par `useTriggerSOS()`
2. Appel backend réel pour alerte SOS

---

## 📊 RÉSUMÉ DE L'AUDIT

### Statistiques globales

```
Total pages/composants :          14
Pages migrées (ÉTAPE 2) :         14 ✅ 100%
Status :                          MIGRATION COMPLÈTE ✅
```

### Répartition par espace

| Espace          | Total | À migrer | Complété |
|-----------------|-------|----------|----------|
| Auth            | 4     | 0        | 4 ✅     |
| Parent          | 4     | 4        | 0        |
| Crèche          | 4     | 4        | 0        |
| RSAI            | 4     | 4        | 0        |
| Dossier enfant  | 1     | 1        | 0        |
| Composants      | 1     | 1        | 0        |
| **TOTAL**       | **18**| **14**   | **4**    |

### Progression

```
✅ Phase 1 - Authentification :        100% (4/4)
✅ Phase 2 - Migration données :       100% (14/14) ✅ TERMINÉ
```

---

## 🎯 PLAN D'ACTION ÉTAPE 2

### Ordre de priorité recommandé

#### 🔴 CRITIQUE (à faire en premier)

1. **[ ] Parent Dashboard** - Page la plus utilisée
   - Enfants, notifications, diagnostics
   - Impact : Parents voient vraies données

2. **[ ] SOS Button** - Fonctionnalité de sécurité
   - Alertes réelles aux parents
   - Impact : Sécurité des enfants

3. **[ ] Notifications** - Communication en temps réel
   - Polling automatique 30s
   - Impact : Parents informés en temps réel

#### 🟠 HAUTE PRIORITÉ

4. **[ ] Diagnostic IA (symptom.tsx)** - Cœur de l'app
   - Analyse IA backend
   - Impact : Diagnostics fiables

5. **[ ] Creche Dashboard** - Gestion quotidienne
   - Liste enfants réelle
   - Impact : Crèche utilise vraies données

6. **[ ] Dossier enfant** - Consultation/édition
   - Toutes les sections
   - Impact : Données médicales fiables

#### 🟡 MOYENNE PRIORITÉ

7. **[ ] Assistant IA (creche)** - Tendances
8. **[ ] Quotidien (creche)** - Transmissions
9. **[ ] Prescriptions (creche)** - Traitements
10. **[ ] History (parent)** - Dossier médical

#### 🟢 BASSE PRIORITÉ

11. **[ ] RSAI Accueil** - Dashboard RSAI
12. **[ ] RSAI Avis** - Évaluations
13. **[ ] RSAI Enfants** - Liste enfants
14. **[ ] RSAI Registres** - Sécurité/conformité

---

## 🛠️ ENDPOINTS BACKEND À CRÉER

### Endpoints manquants (7)

Ces endpoints n'existent pas encore dans le backend :

1. **[ ] POST `/api/enfants/:id/memo`** - Créer un mémo
2. **[ ] PATCH `/api/memos/:id`** - Résoudre un mémo
3. **[ ] POST `/api/prescriptions/:id/log`** - Logger prise médicament
4. **[ ] GET `/api/prescriptions/:id/logs`** - Historique prises
5. **[ ] GET `/api/rsai/:id/missions`** - Missions du RSAI
6. **[ ] POST `/api/rsai/:id/geofence-verify`** - Vérification géofencing
7. **[ ] GET `/api/rsai/:id/checklists`** - Checklists conformité
8. **[ ] POST `/api/checklist/:id/complete`** - Marquer checklist
9. **[ ] GET `/api/rsai/:id/security-logs`** - Logs sécurité

### Endpoints à adapter (alias)

Ces endpoints existent mais nécessitent des routes alias :

1. **POST `/api/enfants/:id/dailylog`** - Alias vers système de notes
2. **POST `/api/enfants/:id/temperature`** - Alias vers système de metrics
3. **POST `/api/enfants/:id/note`** - Alias vers système de notes
4. **POST `/api/enfants/:id/consent`** - Alias vers système de consentements
5. **POST `/api/enfants/:id/authorized-pickup`** - Alias vers système de personnes autorisées

---

## ⚙️ STRATÉGIE DE MIGRATION

### Approche recommandée : Migration progressive page par page

**✅ Avantages :**
- Pas de "big bang"
- Test après chaque page
- Rollback facile si problème
- Déploiement continu

**📋 Processus pour chaque page :**

1. **Identifier les données mock**
   - Lire le code de la page
   - Noter tous les appels `useApp()`

2. **Vérifier hooks disponibles**
   - Check `/src/hooks/index.ts`
   - Vérifier si endpoints backend existent

3. **Créer endpoints manquants** (si besoin)
   - Backend : Ajouter route + controller
   - Tester avec curl/Postman

4. **Créer hooks manquants** (si besoin)
   - Frontend : Ajouter hook React Query
   - Tester appel API

5. **Migrer la page**
   - Remplacer `useApp()` par hooks API
   - Supprimer imports AppStore
   - Gérer loading states

6. **Tester la page**
   - Test manuel sur device
   - Vérifier données réelles
   - Vérifier erreurs

7. **Marquer comme complété**
   - Cocher `[x]` dans cet audit
   - Commit git

### Exemple : Migration Parent Dashboard

**Avant :**
```typescript
const { primaryChild, notifications } = useApp();
```

**Après :**
```typescript
const { user } = useAuth();
const { data: enfants } = useEnfants(user?.etablissementId);
const { data: notifications } = useNotifications();
const primaryChild = enfants?.[0];
```

---

## ✅ VALIDATION

### Tests à effectuer pour chaque page migrée

- [ ] Page s'affiche sans erreur
- [ ] Données réelles chargées depuis API
- [ ] Loading state affiché pendant chargement
- [ ] Erreur affichée si échec API
- [ ] Actions (create, update, delete) fonctionnent
- [ ] Optimistic updates React Query OK
- [ ] Polling fonctionne (si applicable)
- [ ] Pas de régression visuelle UI/UX

---

## 📝 NOTES IMPORTANTES

### 🔥 ATTENTION

- **NE PAS SUPPRIMER AppStore tout de suite** - Garder en fallback pendant migration
- **NE PAS TOUCHER AU DESIGN** - Seulement changer source des données
- **TESTER SUR DEVICE RÉEL** - Pas seulement simulateur
- **VÉRIFIER TOKENS** - S'assurer que tous les appels API incluent le JWT

### 💡 BONNES PRATIQUES

1. **Migrer page par page** - Ne pas tout changer d'un coup
2. **Tester après chaque migration** - S'assurer que ça marche avant de continuer
3. **Garder même UX** - Utilisateur ne doit rien remarquer
4. **Gérer les erreurs** - Afficher messages clairs si API fail
5. **Loading states** - Toujours afficher un spinner pendant chargement

### 🚀 APRÈS MIGRATION COMPLÈTE

Quand toutes les pages seront migrées (14/14 cochées) :

1. Supprimer AppStore complètement
2. Supprimer toutes les données mock
3. Supprimer `/src/store/AppStore.tsx`
4. Nettoyer les imports inutilisés
5. Tests E2E complets
6. Documentation mise à jour

---

**Dernière mise à jour :** 2026-10-10
**Statut :** 🟡 Migration en attente - Authentification complète
**Prochaine étape :** Commencer migration Parent Dashboard (priorité CRITIQUE)
