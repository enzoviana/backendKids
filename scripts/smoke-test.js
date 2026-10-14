// Test de bout en bout : node scripts/smoke-test.js http://localhost:4000/api [chemin-log-serveur]
const fs = require("fs");
const API = process.argv[2] || "http://localhost:4000/api";
const LOG = process.argv[3];
const PWD = process.env.SEED_PASSWORD || "KidsMed2026!";
let fails = 0, passes = 0;
const call = async (tok, method, path, body) => {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
};
const expect = async (label, p, okStatus = [200, 201]) => {
  const r = await p;
  const good = okStatus.includes(r.status);
  good ? passes++ : fails++;
  if (!good) console.log(`✗ ${label} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`);
  return r.j?.data;
};
async function login(email) {
  const l = await call(null, "POST", "/auth/login", { email, password: PWD });
  const pre = l.j.data.accessToken;
  await call(pre, "POST", "/auth/mfa/send-code");
  await new Promise((r) => setTimeout(r, 200));
  const code = process.env.MFA_DEMO_CODE || fs.readFileSync(LOG, "utf8").match(/code de connexion est (\d{6})/g).pop().slice(-6);
  const v = await call(pre, "POST", "/auth/mfa/verify-code", { code });
  if (!v.j.data?.accessToken) throw new Error(`MFA ${email}: ${JSON.stringify(v.j)}`);
  return v.j.data;
}
(async () => {
  await expect("mauvais mot de passe", call(null, "POST", "/auth/login", { email: "parent@test.fr", password: "x" }), [401]);
  const admin = (await login("superadmin@kidsmed.local")).accessToken;
  const dev = (await login("dev@kidsmed.local")).accessToken;
  const crecheS = await login("directeur@petitsloups.fr"); const creche = crecheS.accessToken;
  const rsaiS = await login("rsai@demo.com"); const rsai = rsaiS.accessToken;
  const medS = await login("medecin@demo.fr"); const med = medS.accessToken;
  const parent = (await login("parent@test.fr")).accessToken;
  const etab = crecheS.user.etablissementId;
  await expect("jeton provisoire refusé", call((await call(null, "POST", "/auth/login", { email: "parent@test.fr", password: PWD })).j.data.accessToken, "GET", "/enfants"), [401]);
  await expect("me", call(creche, "GET", "/auth/me"));
  await expect("forgot", call(null, "POST", "/auth/forgot-password", { email: "parent@test.fr" }));

  const enfant = await expect("créer enfant", call(creche, "POST", "/enfants", { prenom: "Léa", nom: "Petit", dateNaissance: "2024-03-01", allergies: "arachide" }));
  await expect("enfants étab", call(creche, "GET", `/enfants/etablissement/${etab}`));
  await expect("parent lie code", call(parent, "POST", "/enfants/lier-code", { code: enfant.codeLiaison }));
  await expect("médecin lie code", call(med, "POST", "/enfants/lier-code", { code: enfant.codeLiaison }));
  await expect("rsai refusé avant affectation", call(rsai, "GET", `/enfants/${enfant.id}`), [403]);
  await expect("affectation sans crèche", call(admin, "POST", "/coordination/affectations", { rsaiId: rsaiS.user.id }), [400]);
  await expect("affecter RSAI", call(admin, "POST", "/coordination/affectations", { rsaiId: rsaiS.user.id, crecheId: etab, dateDebut: "2026-01-01", jours: [1, 2, 3, 4, 5, 6, 7], debut: "00:00", fin: "23:59" }));
  await expect("rsai accède après affectation", call(rsai, "GET", `/enfants/${enfant.id}`));
  await expect("rsai affectations", call(rsai, "GET", "/rsai/me/affectations"));
  await expect("affectations crèche annee", call(creche, "GET", "/coordination/affectations?annee=2026"));
  await expect("demande rsai", call(creche, "POST", "/coordination/demandes-rsai", { motif: "Renfort", dateSouhaitee: "2026-11-01" }));
  await expect("demandes admin", call(admin, "GET", "/coordination/demandes-rsai"));
  await expect("avis rsai", call(creche, "POST", `/rsai/${rsaiS.user.id}/avis`, { note: 5, commentaire: "Top" }));
  await expect("avis étab", call(rsai, "POST", `/etablissements/${etab}/avis-rsai`, { note: 4 }));
  await expect("avis liste", call(admin, "GET", "/coordination/avis"));
  await expect("fiche rsai", call(creche, "GET", `/rsai/${rsaiS.user.id}`));
  await expect("annuaire rsai", call(creche, "GET", "/rsai"));
  await expect("annuaire médecins", call(creche, "GET", "/medecins"));
  await expect("fiche médecin", call(creche, "GET", `/medecins/${medS.user.id}`));
  await expect("stats médecin", call(med, "GET", `/medecins/${medS.user.id}/stats`));

  await expect("vaccin", call(med, "POST", `/enfants/${enfant.id}/vaccins`, { nom: "ROR", date: "2025-03-01" }));
  await expect("vaccins", call(parent, "GET", `/enfants/${enfant.id}/vaccins`));
  await expect("consentement", call(parent, "PUT", `/enfants/${enfant.id}/consentements/droit_image`, { accorde: true, signature: "Julie Petit" }));
  await expect("consentements", call(creche, "GET", `/enfants/${enfant.id}/consentements`));
  await expect("note médicale", call(med, "POST", `/enfants/${enfant.id}/notes`, { contenu: "Asthme léger", visibilite: "medicale", destinataire: "creche" }));
  const notesParent = await expect("notes parent", call(parent, "GET", `/enfants/${enfant.id}/notes`));
  if (notesParent.length !== 0) { fails++; console.log("✗ note médicale visible du parent"); }
  await expect("échange demande", call(med, "POST", `/enfants/${enfant.id}/echanges-documents`, { action: "demande", destinataire: "creche", type: "PAI" }));
  await expect("échanges", call(creche, "GET", `/enfants/${enfant.id}/echanges-documents`));
  await expect("dossier médical", call(parent, "PATCH", `/enfants/${enfant.id}/dossier-medical`, { groupeSanguin: "O+" }));
  await expect("qrcode", call(creche, "GET", `/enfants/${enfant.id}/qrcode`));
  await expect("liaisons enfant", call(creche, "GET", `/liaisons/enfant/${enfant.id}`));
  await expect("liaisons admin", call(admin, "GET", "/liaisons"));

  await expect("section", call(creche, "POST", "/sections", { nom: "Bébés", capacite: 10 }));
  await expect("sections", call(creche, "GET", `/sections/etablissement/${etab}`));
  await expect("sections stats", call(creche, "GET", `/sections/stats/${etab}`));
  await expect("personnel", call(creche, "POST", "/personnels", { prenom: "Ana", nom: "Roy", poste: "Auxiliaire" }));
  await expect("personnel stats", call(creche, "GET", `/personnels/stats/${etab}`));
  await expect("doc obligatoire", call(creche, "POST", "/documents-obligatoires", { type: "Certificat médical" }));
  await expect("alertes docs", call(creche, "GET", "/documents/alertes"));
  await expect("présence", call(creche, "POST", "/presences", { enfantId: enfant.id }));
  await expect("présences stats", call(creche, "GET", `/presences/stats/${etab}`));
  await expect("transmission", call(creche, "POST", "/transmissions", { enfantId: enfant.id, type: "repas", contenu: "A tout mangé" }));
  await expect("transmissions today", call(creche, "GET", `/transmissions/today/${etab}`));
  await expect("parent enfants", call(parent, "GET", "/parents/me/enfants"));
  await expect("parent transmissions", call(parent, "GET", "/parents/me/transmissions"));
  await expect("médicament", call(med, "POST", "/medicaments", { enfantId: enfant.id, nom: "Doliprane", posologie: "2,4 ml" }));
  await expect("médicaments today", call(rsai, "GET", `/medicaments/today/${etab}`));
  await expect("ordonnance", call(med, "POST", "/ordonnances", { enfantId: enfant.id, contenu: "Ventoline" }));
  await expect("ordonnances médecin", call(med, "GET", `/ordonnances/medecin/${medS.user.id}`));
  await expect("ordonnances stats", call(rsai, "GET", `/ordonnances/stats/${etab}`));
  await expect("docs étab", call(creche, "GET", `/documents/etablissement/${etab}`));
  await expect("docs accessibles", call(med, "GET", "/documents/accessibles"));
  await expect("IA", call(creche, "POST", "/diagnostics/analyser", { enfantId: enfant.id, symptomes: ["toux", "fievre"], temperature: 38.9 }));
  await expect("IA stats", call(med, "GET", "/diagnostics/stats"));
  await expect("IA liste", call(med, "GET", "/diagnostics"));
  await expect("parent alertes", call(parent, "GET", "/parents/me/alertes"));
  await expect("alerte symptôme", call(rsai, "POST", "/alertes/symptome", { enfantId: enfant.id, symptome: "Fièvre", gravite: "moyenne" }));

  await expect("message", call(med, "POST", "/messages", { destinataireId: crecheS.user.id, sujet: "PAI", contenu: "Merci" }));
  await expect("reçus", call(creche, "GET", "/messages/recus"));
  await expect("notif count", call(creche, "GET", "/notifications/count-unread"));
  await expect("notifs", call(creche, "GET", "/notifications"));

  await expect("tarif", call(admin, "POST", "/tarifs", { nom: "Médecin Pro", roleCible: "medecin", prixMensuel: 49 }));
  const t = await expect("tarifs médecin", call(med, "GET", "/tarifs"));
  if (t.some((x) => !["medecin", "tous"].includes(x.roleCible))) { fails++; console.log("✗ médecin voit d'autres forfaits"); }
  await expect("abonnement", call(admin, "POST", "/abonnements", { etablissementId: etab, plan: "premium", prixMensuel: 149, dateDebut: "2026-01-01" }));
  await expect("abos stats", call(admin, "GET", "/abonnements/stats"));
  await expect("revenus", call(admin, "GET", "/abonnements/revenus"));
  await expect("abo étab", call(creche, "GET", `/abonnements/etablissement/${etab}`));
  await expect("abo me", call(med, "GET", "/abonnements/me"));

  await expect("sécurité get", call(creche, "GET", `/etablissements/${etab}/securite`));
  await expect("sécurité put", call(creche, "PUT", `/etablissements/${etab}/securite`, { rayonMetres: 300, blocageHorsZone: true, plagesHoraires: [{ jour: 1, debut: "07:00", fin: "19:00" }], ipsAutorisees: [] }));
  await expect("vérifier accès", call(rsai, "POST", "/securite/verifier-acces", { enfantId: enfant.id, lat: 48.8556, lng: 2.3601 }));
  await expect("étab stats", call(creche, "GET", `/etablissements/${etab}/stats`));
  await expect("étab santé", call(rsai, "GET", `/etablissements/${etab}/sante`));
  await expect("créer étab", call(admin, "POST", "/etablissements", { nom: "Crèche test", adresse: "1 place de la Bourse 33000 Bordeaux", latitude: 44.84, longitude: -0.57 }));
  await expect("règles accès", call(admin, "GET", "/securite/regles-acces"));
  await expect("alertes sécu", call(admin, "GET", "/securite/alertes"));
  await expect("logs", call(admin, "GET", "/logs"));
  await expect("logs sécu", call(admin, "GET", "/logs/securite"));
  await expect("logs enfant", call(parent, "GET", `/logs/securite/enfant/${enfant.id}`));
  await expect("users", call(admin, "GET", "/users"));
  await expect("users refusé crèche", call(creche, "GET", "/users"), [403]);
  await expect("rgpd demande", call(parent, "POST", "/rgpd/demandes", { type: "acces" }));
  await expect("rgpd registre", call(admin, "GET", "/rgpd/registre"));
  await expect("export data", call(parent, "GET", "/users/export-data"));
  await expect("ticket", call(creche, "POST", "/developer/support/tickets", { titre: "Test ticket", description: "Vérification", categorie: "question", priorite: "normale" }));
  await expect("mes tickets", call(creche, "GET", "/developer/support/tickets/mine"));
  await expect("dev tickets", call(dev, "GET", "/developer/support/tickets"));
  await expect("dev metrics", call(dev, "GET", "/developer/metrics"));
  await expect("dev health", call(dev, "GET", "/developer/health-detailed"));
  await expect("dev errors", call(dev, "GET", "/developer/errors"));
  await expect("dev db", call(dev, "GET", "/developer/database/stats"));
  await expect("dev endpoints", call(dev, "GET", "/developer/endpoints"));
  await expect("dev refusé admin simple? (superadmin ok)", call(creche, "GET", "/developer/metrics"), [403]);
  await expect("route inconnue", call(admin, "GET", "/nimporte"), [404]);
  console.log(`\n${passes} réussis, ${fails} échecs`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
