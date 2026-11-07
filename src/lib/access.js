import { prisma, isAdmin, fail } from "./core.js";
import { getGeoSession } from "./geo-session.js";
import { effectiveSecurity, getGlobalSecurity } from "./security-defaults.js";
import { hm, jourIso, dansPlageParis } from "./paris-time.js";

const distanceM = (a, b, c, d) => {
  const R = 6371e3, r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Affectations RSAI actives (aujourd'hui) */
async function rsaiEtabIds(userId) {
  const now = new Date();
  const a = await prisma.affectation.findMany({
    where: { rsaiId: userId, statut: "active", dateDebut: { lte: now }, OR: [{ dateFin: null }, { dateFin: { gte: now } }] },
    select: { etablissementId: true },
  });
  return a.map((x) => x.etablissementId);
}

/** Établissements visibles par l'utilisateur. null = tous. */
async function etabScope(user) {
  if (isAdmin(user)) return null;
  if (user.role === "creche") return user.etablissementId ? [user.etablissementId] : [];
  if (user.role === "rsai") return rsaiEtabIds(user.id);
  return [];
}

/** L'utilisateur peut-il voir le dossier de l'enfant ? */
async function canAccessEnfant(user, enfantId) {
  if (isAdmin(user)) return true;
  const e = await prisma.enfant.findUnique({ where: { id: enfantId }, select: { etablissementId: true } });
  if (!e) return false;
  if (user.role === "creche") return !!e.etablissementId && e.etablissementId === user.etablissementId;
  if (user.role === "rsai") return (await rsaiEtabIds(user.id)).includes(e.etablissementId);
  const l = await prisma.liaison.findUnique({ where: { enfantId_userId: { enfantId, userId: user.id } } });
  return !!l;
}

async function assertEnfant(user, enfantId) {
  const e = await prisma.enfant.findUnique({ where: { id: enfantId } });
  if (!e) fail(404, "Enfant introuvable");
  if (!(await canAccessEnfant(user, enfantId))) fail(403, "Permissions insuffisantes sur cet enfant");
  // La RSAI doit avoir validé sa position récemment (sur site, dans la plage horaire).
  // Le contrôle est fait côté serveur pour ne pas dépendre uniquement de l'interface.
  if (user.role === "rsai") {
    const geo = getGeoSession(user.id);
    if (!geo) fail(403, "Géolocalisation requise avant d'ouvrir un dossier", { motif: "geolocalisation_requise", securite: true });
    const controle = await verifierAcces(user, enfantId, geo.lat, geo.lng);
    if (!controle.autorise) {
      const message =
        controle.motif === "hors_plage" ? "Accès hors plage horaire"
          : controle.motif === "hors_zone" ? "Accès hors zone de la crèche"
            : "Accès refusé";
      fail(403, message, { motif: controle.motif, distanceM: controle.distanceM, securite: true });
    }
  }
  // Les horaires de la crèche s'appliquent aussi aux comptes crèche, sans exiger de GPS.
  if (user.role === "creche") {
    const controle = await verifierAcces(user, enfantId, null, null);
    if (!controle.autorise && controle.motif === "hors_plage") {
      fail(403, "Accès hors plage horaire de la crèche", { motif: "hors_plage", securite: true });
    }
  }
  return e;
}

async function assertEtab(user, etablissementId) {
  const scope = await etabScope(user);
  if (scope && !scope.includes(etablissementId)) fail(403, "Permissions insuffisantes sur cet établissement");
}

/** Enfants accessibles (ids). null = tous. */
async function enfantScope(user) {
  if (isAdmin(user)) return null;
  const etabs = await etabScope(user);
  if (user.role === "creche" || user.role === "rsai") {
    const e = await prisma.enfant.findMany({ where: { etablissementId: { in: etabs } }, select: { id: true } });
    return e.map((x) => x.id);
  }
  const l = await prisma.liaison.findMany({ where: { userId: user.id }, select: { enfantId: true } });
  return l.map((x) => x.enfantId);
}

/** Contrôle géorepérage + horaires pour une RSAI / crèche. */
async function verifierAcces(user, enfantId, lat, lng) {
  const e = await prisma.enfant.findUnique({ where: { id: enfantId }, include: { etablissement: true } });
  if (!e) return { autorise: false, motif: "introuvable", distanceM: null };
  if (!(await canAccessEnfant(user, enfantId))) return { autorise: false, motif: "non_lie", distanceM: null };
  const et = e.etablissement;
  if (!et) return { autorise: true, motif: null, distanceM: null };
  const defauts = await getGlobalSecurity(prisma);
  const securite = effectiveSecurity(et, defauts);
  let dist = null;
  if (et.latitude != null && lat != null && lng != null) dist = Math.round(distanceM(lat, lng, et.latitude, et.longitude));
  if (user.role === "rsai") {
    const now = new Date();
    const a = await prisma.affectation.findFirst({
      where: { rsaiId: user.id, etablissementId: et.id, statut: "active", jours: { has: jourIso(now) } },
    });
    if (!a || hm(now) < a.debut || hm(now) > a.fin) return { autorise: false, motif: "hors_plage", distanceM: dist, rayonMetres: securite.rayonMetres };
  }
  if (securite.blocageHorsZone && (user.role === "rsai" || user.role === "creche")) {
    if (user.role === "rsai") {
      if (dist == null || dist > securite.rayonMetres) return { autorise: false, motif: "hors_zone", distanceM: dist, rayonMetres: securite.rayonMetres };
    } else if (dist != null && dist > securite.rayonMetres) {
      // Une crèche sur ordinateur n'a pas toujours de GPS : on ne bloque la zone
      // que si une position a été fournie. Les horaires restent appliqués.
      return { autorise: false, motif: "hors_zone", distanceM: dist, rayonMetres: securite.rayonMetres };
    }
    const plages = securite.plagesHoraires;
    if (!dansPlageParis(plages)) return { autorise: false, motif: "hors_plage", distanceM: dist, rayonMetres: securite.rayonMetres };
  }
  return { autorise: true, motif: null, distanceM: dist, rayonMetres: securite.rayonMetres };
}

export { canAccessEnfant, assertEnfant, assertEtab, etabScope, enfantScope, rsaiEtabIds, verifierAcces, distanceM };
