import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de la base de données...\n');

  // CRITIQUE: Créer le compte super_admin par défaut
  const superAdminEmail = 'superadmin@kidsmed.local';
  const superAdminPassword = 'SuperAdmin2024!'; // À changer au premier login

  // Vérifier si le super_admin existe déjà
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    console.log('📌 Création du compte Super Admin par défaut...');

    const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        role: UserRole.superadmin,
        isActive: true,
        emailVerified: true,
        mustChangePassword: true, // Force le changement au premier login
        profile: {
          create: {
            prenom: 'Super',
            nom: 'Admin',
            tel: '+33 1 00 00 00 00',
            langue: 'fr',
            timezone: 'Europe/Paris',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    console.log('✅ Compte Super Admin créé avec succès:');
    console.log(`   📧 Email: ${superAdminEmail}`);
    console.log(`   🔑 Mot de passe: ${superAdminPassword}`);
    console.log(`   ⚠️  IMPORTANT: Changez ce mot de passe dès votre première connexion!\n`);
  } else {
    console.log('ℹ️  Le compte Super Admin existe déjà.\n');
  }

  // Créer un établissement de test (optionnel)
  console.log('📌 Création d\'un établissement de test...');

  const testEtablissement = await prisma.etablissement.upsert({
    where: { id: 'test-creche-001' },
    update: {},
    create: {
      id: 'test-creche-001',
      nom: 'Crèche Les Petits Loups',
      type: 'creche',
      adresse: '123 Rue de la Paix',
      codePostal: '75001',
      ville: 'Paris',
      telephone: '+33 1 23 45 67 89',
      email: 'contact@petitsloups.fr',
      numeroAgrement: 'PMI-75-001',
      capaciteAccueil: 60,
      horaires: {
        lundi: { ouverture: '07:30', fermeture: '18:30' },
        mardi: { ouverture: '07:30', fermeture: '18:30' },
        mercredi: { ouverture: '07:30', fermeture: '18:30' },
        jeudi: { ouverture: '07:30', fermeture: '18:30' },
        vendredi: { ouverture: '07:30', fermeture: '18:30' },
      },
    },
  });

  console.log(`✅ Établissement créé: ${testEtablissement.nom}`);

  // Créer des sections
  console.log('📌 Création des sections...');

  const sections = await Promise.all([
    prisma.section.upsert({
      where: { id: 'section-bebes' },
      update: {},
      create: {
        id: 'section-bebes',
        etablissementId: testEtablissement.id,
        nom: 'Bébés',
        trancheAge: '0-12 mois',
        capacite: 10,
        couleur: '#FFB6C1',
      },
    }),
    prisma.section.upsert({
      where: { id: 'section-moyens' },
      update: {},
      create: {
        id: 'section-moyens',
        etablissementId: testEtablissement.id,
        nom: 'Moyens',
        trancheAge: '12-24 mois',
        capacite: 20,
        couleur: '#87CEEB',
      },
    }),
    prisma.section.upsert({
      where: { id: 'section-grands' },
      update: {},
      create: {
        id: 'section-grands',
        etablissementId: testEtablissement.id,
        nom: 'Grands',
        trancheAge: '24-36 mois',
        capacite: 30,
        couleur: '#98FB98',
      },
    }),
  ]);

  console.log(`✅ ${sections.length} sections créées\n`);

  // Créer un directeur de crèche de test
  console.log('📌 Création d\'un compte directeur de test...');

  const directeurPassword = 'Directeur2024!';
  const hashedDirecteurPassword = await bcrypt.hash(directeurPassword, 12);

  const directeur = await prisma.user.upsert({
    where: { email: 'directeur@petitsloups.fr' },
    update: {},
    create: {
      email: 'directeur@petitsloups.fr',
      password: hashedDirecteurPassword,
      role: UserRole.creche,
      isActive: true,
      emailVerified: true,
      mustChangePassword: true,
      profile: {
        create: {
          prenom: 'Marie',
          nom: 'Dupont',
          tel: '+33 6 12 34 56 78',
          adresse: '45 Avenue Victor Hugo',
          codePostal: '75016',
          ville: 'Paris',
          langue: 'fr',
          timezone: 'Europe/Paris',
        },
      },
      etablissements: {
        create: {
          etablissementId: testEtablissement.id,
          poste: 'Directrice',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('✅ Compte directeur créé:');
  console.log(`   📧 Email: directeur@petitsloups.fr`);
  console.log(`   🔑 Mot de passe: ${directeurPassword}\n`);

  // Créer un parent de test
  console.log('📌 Création d\'un compte parent de test...');

  const parentPassword = 'Parent2024!';
  const hashedParentPassword = await bcrypt.hash(parentPassword, 12);

  const parent = await prisma.user.upsert({
    where: { email: 'parent@test.fr' },
    update: {},
    create: {
      email: 'parent@test.fr',
      password: hashedParentPassword,
      role: UserRole.parent,
      isActive: true,
      emailVerified: true,
      mustChangePassword: true,
      profile: {
        create: {
          prenom: 'Sophie',
          nom: 'Martin',
          tel: '+33 6 98 76 54 32',
          adresse: '12 Rue de la République',
          codePostal: '75011',
          ville: 'Paris',
          langue: 'fr',
          timezone: 'Europe/Paris',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('✅ Compte parent créé:');
  console.log(`   📧 Email: parent@test.fr`);
  console.log(`   🔑 Mot de passe: ${parentPassword}\n`);

  // Créer du personnel de test
  console.log('📌 Création du personnel de test...');

  const personnels = await Promise.all([
    prisma.personnel.upsert({
      where: { id: 'personnel-1' },
      update: {},
      create: {
        id: 'personnel-1',
        etablissementId: testEtablissement.id,
        sectionId: 'section-bebes',
        prenom: 'Sophie',
        nom: 'Bernard',
        email: 'sophie.bernard@petitsloups.fr',
        tel: '+33 6 12 34 56 78',
        role: 'EJE - Référente Technique',
        diplome: 'Diplôme d\'État Éducateur de Jeunes Enfants',
        dateEmbauche: new Date('2020-01-15'),
        statutDiplome: 'valide',
        habilitations: ['PSC1', 'Secouriste Petite Enfance'],
        contrat: 'CDI',
      },
    }),
    prisma.personnel.upsert({
      where: { id: 'personnel-2' },
      update: {},
      create: {
        id: 'personnel-2',
        etablissementId: testEtablissement.id,
        sectionId: 'section-moyens',
        prenom: 'Marie',
        nom: 'Leclerc',
        email: 'marie.leclerc@petitsloups.fr',
        tel: '+33 6 23 45 67 89',
        role: 'Auxiliaire Puéricultrice',
        diplome: 'Diplôme d\'État Auxiliaire de Puériculture',
        dateEmbauche: new Date('2021-03-10'),
        statutDiplome: 'valide',
        habilitations: ['PSC1', 'SST'],
        contrat: 'CDI',
      },
    }),
    prisma.personnel.upsert({
      where: { id: 'personnel-3' },
      update: {},
      create: {
        id: 'personnel-3',
        etablissementId: testEtablissement.id,
        sectionId: 'section-grands',
        prenom: 'Claire',
        nom: 'Rousseau',
        email: 'claire.rousseau@petitsloups.fr',
        tel: '+33 6 34 56 78 90',
        role: 'CAP Petite Enfance',
        diplome: 'CAP Accompagnant Éducatif Petite Enfance',
        dateEmbauche: new Date('2022-09-01'),
        statutDiplome: 'expire_bientot',
        habilitations: ['PSC1'],
        contrat: 'CDD',
      },
    }),
    prisma.personnel.upsert({
      where: { id: 'personnel-4' },
      update: {},
      create: {
        id: 'personnel-4',
        etablissementId: testEtablissement.id,
        prenom: 'Martin',
        nom: 'Dubois',
        email: 'martin.dubois@petitsloups.fr',
        tel: '+33 6 45 67 89 01',
        role: 'Médecin Pédiatre',
        diplome: 'Doctorat en Médecine + DES Pédiatrie',
        dateEmbauche: new Date('2019-06-01'),
        statutDiplome: 'valide',
        habilitations: ['Ordre des Médecins', 'SST'],
        contrat: 'Vacation',
      },
    }),
  ]);

  console.log(`✅ ${personnels.length} membres du personnel créés\n`);

  // Créer des enfants de test
  console.log('📌 Création des enfants de test...');

  const enfants = await Promise.all([
    prisma.enfant.upsert({
      where: { id: 'enfant-1' },
      update: {},
      create: {
        id: 'enfant-1',
        etablissementId: testEtablissement.id,
        sectionId: 'section-bebes',
        prenom: 'Lucas',
        nom: 'Martin',
        dateNaissance: new Date('2025-06-15'),
        sexe: 'M',
        codeConfidentiel: 'LUCAS2025',
        groupeSanguin: 'O+',
        allergies: ['Lactose'],
        regimeAlimentaire: 'Lait sans lactose',
        traitements: [],
        statut: 'sain',
        contactsUrgence: {
          contact1: {
            nom: 'Sophie Martin',
            relation: 'Mère',
            telephone: '+33 6 98 76 54 32',
          },
          contact2: {
            nom: 'Pierre Martin',
            relation: 'Père',
            telephone: '+33 6 12 34 56 78',
          },
        },
        parents: {
          connect: { id: parent.id },
        },
      },
    }),
    prisma.enfant.upsert({
      where: { id: 'enfant-2' },
      update: {},
      create: {
        id: 'enfant-2',
        etablissementId: testEtablissement.id,
        sectionId: 'section-moyens',
        prenom: 'Emma',
        nom: 'Dubois',
        dateNaissance: new Date('2024-08-20'),
        sexe: 'F',
        codeConfidentiel: 'EMMA2024',
        groupeSanguin: 'A+',
        allergies: ['Arachides', 'Oeufs'],
        regimeAlimentaire: 'Sans arachides',
        traitements: [],
        statut: 'symptome',
        contactsUrgence: {
          contact1: {
            nom: 'Julie Dubois',
            relation: 'Mère',
            telephone: '+33 6 45 67 89 01',
          },
        },
      },
    }),
    prisma.enfant.upsert({
      where: { id: 'enfant-3' },
      update: {},
      create: {
        id: 'enfant-3',
        etablissementId: testEtablissement.id,
        sectionId: 'section-grands',
        prenom: 'Noah',
        nom: 'Bernard',
        dateNaissance: new Date('2023-11-10'),
        sexe: 'M',
        codeConfidentiel: 'NOAH2023',
        groupeSanguin: 'B+',
        allergies: [],
        regimeAlimentaire: null,
        traitements: ['Ventoline en cas de crise'],
        statut: 'attention',
        contactsUrgence: {
          contact1: {
            nom: 'Isabelle Bernard',
            relation: 'Mère',
            telephone: '+33 6 78 90 12 34',
          },
        },
      },
    }),
  ]);

  console.log(`✅ ${enfants.length} enfants créés\n`);

  // Créer des messages
  console.log('📌 Création des messages...');

  const messages = await Promise.all([
    prisma.message.upsert({
      where: { id: 'message-1' },
      update: {},
      create: {
        id: 'message-1',
        expediteurId: directeur.id,
        destinataireId: parent.id,
        objet: 'Bienvenue à la crèche Les Petits Loups',
        contenu: 'Bonjour, nous sommes ravis d\'accueillir votre enfant dans notre établissement. N\'hésitez pas à nous contacter pour toute question.',
        lu: true,
        important: true,
      },
    }),
    prisma.message.upsert({
      where: { id: 'message-2' },
      update: {},
      create: {
        id: 'message-2',
        expediteurId: parent.id,
        destinataireId: directeur.id,
        objet: 'Question sur les horaires',
        contenu: 'Bonjour, est-il possible de récupérer mon enfant plus tôt ce vendredi ?',
        lu: false,
      },
    }),
    prisma.message.upsert({
      where: { id: 'message-3' },
      update: {},
      create: {
        id: 'message-3',
        expediteurId: directeur.id,
        destinataireId: parent.id,
        objet: 'Documents à fournir',
        contenu: 'Rappel : merci de nous fournir le certificat médical de votre enfant avant la fin du mois.',
        lu: false,
        important: true,
      },
    }),
    prisma.message.upsert({
      where: { id: 'message-4' },
      update: {},
      create: {
        id: 'message-4',
        expediteurId: parent.id,
        destinataireId: directeur.id,
        objet: 'Absence demain',
        contenu: 'Bonjour, Lucas sera absent demain pour raison médicale. Cordialement.',
        lu: true,
      },
    }),
    prisma.message.upsert({
      where: { id: 'message-5' },
      update: {},
      create: {
        id: 'message-5',
        expediteurId: directeur.id,
        destinataireId: parent.id,
        objet: 'Réunion des parents',
        contenu: 'Une réunion d\'information aura lieu le 20 septembre à 18h. Votre présence est souhaitée.',
        lu: false,
        important: true,
      },
    }),
  ]);

  console.log(`✅ ${messages.length} messages créés\n`);

  // Créer des ordonnances
  console.log('📌 Création des ordonnances...');

  const ordonnances = await Promise.all([
    prisma.ordonnance.upsert({
      where: { numeroOrdonnance: 'ORD-2026-001' },
      update: {},
      create: {
        enfantId: 'enfant-2',
        medecinId: 'personnel-4',
        medecinNom: 'Dr. Martin Dubois',
        dateOrdonnance: new Date('2026-09-01'),
        dateExpiration: new Date('2026-12-01'),
        diagnostic: 'Rhinopharyngite aiguë avec fièvre modérée',
        prescriptions: {
          medicaments: [
            {
              nom: 'Doliprane 100mg',
              dosage: '5ml',
              frequence: '3 fois par jour',
              duree: '5 jours',
            },
            {
              nom: 'Sérum physiologique',
              dosage: '1 dose par narine',
              frequence: '4 fois par jour',
              duree: '7 jours',
            },
          ],
        },
        recommandations: 'Repos, hydratation importante. Consulter si fièvre persiste au-delà de 3 jours.',
        numeroOrdonnance: 'ORD-2026-001',
        statut: 'active',
      },
    }),
    prisma.ordonnance.upsert({
      where: { numeroOrdonnance: 'ORD-2026-002' },
      update: {},
      create: {
        enfantId: 'enfant-3',
        medecinId: 'personnel-4',
        medecinNom: 'Dr. Martin Dubois',
        dateOrdonnance: new Date('2026-08-15'),
        dateExpiration: new Date('2027-08-15'),
        diagnostic: 'Asthme léger intermittent',
        prescriptions: {
          medicaments: [
            {
              nom: 'Ventoline 100µg',
              dosage: '2 bouffées',
              frequence: 'En cas de crise',
              duree: 'Long terme',
            },
          ],
        },
        recommandations: 'Éviter les allergènes, garder l\'inhalateur à portée. Consulter si crises fréquentes.',
        numeroOrdonnance: 'ORD-2026-002',
        statut: 'active',
      },
    }),
    prisma.ordonnance.upsert({
      where: { numeroOrdonnance: 'ORD-2026-003' },
      update: {},
      create: {
        enfantId: 'enfant-1',
        medecinId: 'personnel-4',
        medecinNom: 'Dr. Martin Dubois',
        dateOrdonnance: new Date('2026-07-10'),
        dateExpiration: new Date('2026-08-10'),
        diagnostic: 'Poussée dentaire',
        prescriptions: {
          medicaments: [
            {
              nom: 'Gel gingival Delabarre',
              dosage: 'Application locale',
              frequence: '3-4 fois par jour',
              duree: '1 mois',
            },
          ],
        },
        recommandations: 'Masser doucement les gencives. Donner des jouets de dentition réfrigérés.',
        numeroOrdonnance: 'ORD-2026-003',
        statut: 'expiree',
      },
    }),
  ]);

  console.log(`✅ ${ordonnances.length} ordonnances créées\n`);

  // Créer des diagnostics IA
  console.log('📌 Création des diagnostics IA...');

  const diagnostics = await Promise.all([
    prisma.diagnosticIA.upsert({
      where: { id: 'diagnostic-1' },
      update: {},
      create: {
        id: 'diagnostic-1',
        enfantId: 'enfant-2',
        auteurId: directeur.id,
        auteurNom: 'Marie Dupont',
        symptomes: {
          liste: ['Fièvre', 'Nez qui coule', 'Toux légère', 'Fatigue'],
        },
        temperature: 38.5,
        observations: 'Emma semble fatiguée et a peu mangé ce midi. Nez encombré.',
        resultatIA: {
          diagnostic_principal: 'Rhinopharyngite virale',
          confiance: 0.87,
        },
        probabilites: {
          rhinopharyngite: 0.87,
          grippe: 0.08,
          autre: 0.05,
        },
        recommandations: {
          actions: [
            'Surveiller la température',
            'Donner du paracétamol si fièvre > 38.5°C',
            'Nettoyer le nez régulièrement',
            'Assurer une bonne hydratation',
          ],
          surveillance: 'Surveiller pendant 24-48h',
        },
        urgence: 'surveiller',
        consulterMedecin: false,
      },
    }),
    prisma.diagnosticIA.upsert({
      where: { id: 'diagnostic-2' },
      update: {},
      create: {
        id: 'diagnostic-2',
        enfantId: 'enfant-3',
        auteurId: directeur.id,
        auteurNom: 'Marie Dupont',
        symptomes: {
          liste: ['Toux sèche', 'Difficulté respiratoire légère', 'Sifflements'],
        },
        temperature: 36.8,
        observations: 'Noah présente une toux sèche et quelques sifflements lors de la respiration.',
        resultatIA: {
          diagnostic_principal: 'Crise d\'asthme légère',
          confiance: 0.92,
        },
        probabilites: {
          asthme: 0.92,
          bronchite: 0.05,
          autre: 0.03,
        },
        recommandations: {
          actions: [
            'Administrer Ventoline selon ordonnance',
            'Placer l\'enfant au calme',
            'Surveiller la respiration',
            'Contacter les parents',
          ],
          surveillance: 'Surveillance rapprochée pendant 2h',
        },
        urgence: 'surveiller',
        consulterMedecin: false,
      },
    }),
    prisma.diagnosticIA.upsert({
      where: { id: 'diagnostic-3' },
      update: {},
      create: {
        id: 'diagnostic-3',
        enfantId: 'enfant-1',
        auteurId: directeur.id,
        auteurNom: 'Marie Dupont',
        symptomes: {
          liste: ['Pleurs inhabituels', 'Bave beaucoup', 'Gencives gonflées'],
        },
        temperature: 37.2,
        observations: 'Lucas pleure plus que d\'habitude et met tout à la bouche. Gencives rouges et gonflées.',
        resultatIA: {
          diagnostic_principal: 'Poussée dentaire',
          confiance: 0.95,
        },
        probabilites: {
          poussee_dentaire: 0.95,
          autre: 0.05,
        },
        recommandations: {
          actions: [
            'Donner des jouets de dentition réfrigérés',
            'Masser doucement les gencives',
            'Paracétamol si douleur importante',
            'Informer les parents',
          ],
          surveillance: 'Surveillance normale',
        },
        urgence: 'normal',
        consulterMedecin: false,
      },
    }),
  ]);

  console.log(`✅ ${diagnostics.length} diagnostics IA créés\n`);

  // Créer des tarifs
  console.log('📌 Création des tarifs...');

  const tarifs = await Promise.all([
    prisma.tarif.upsert({
      where: { plan: 'starter' },
      update: {},
      create: {
        plan: 'starter',
        nom: 'Starter',
        description: 'Idéal pour les petites structures jusqu\'à 20 enfants',
        prixMensuel: 49.99,
        prixAnnuel: 499.99,
        devises: 'EUR',
        fonctionnalites: {
          inclus: [
            'Gestion de 20 enfants maximum',
            'Cahier de liaison numérique',
            'Messagerie sécurisée',
            'Gestion des documents',
            'Support par email',
          ],
        },
        limites: {
          enfants: 20,
          stockage: '5 GB',
          utilisateurs: 5,
          diagnostics_ia: 50,
        },
        isActive: true,
      },
    }),
    prisma.tarif.upsert({
      where: { plan: 'essentiel' },
      update: {},
      create: {
        plan: 'essentiel',
        nom: 'Essentiel',
        description: 'Pour les structures moyennes jusqu\'à 60 enfants',
        prixMensuel: 99.99,
        prixAnnuel: 999.99,
        devises: 'EUR',
        fonctionnalites: {
          inclus: [
            'Gestion de 60 enfants maximum',
            'Cahier de liaison numérique',
            'Messagerie sécurisée',
            'Gestion des documents',
            'Gestion des médicaments',
            'Diagnostics IA',
            'Rapports et statistiques',
            'Support prioritaire',
          ],
        },
        limites: {
          enfants: 60,
          stockage: '20 GB',
          utilisateurs: 15,
          diagnostics_ia: 200,
        },
        isActive: true,
      },
    }),
    prisma.tarif.upsert({
      where: { plan: 'premium' },
      update: {},
      create: {
        plan: 'premium',
        nom: 'Premium',
        description: 'Solution complète pour grandes structures et réseaux',
        prixMensuel: 199.99,
        prixAnnuel: 1999.99,
        devises: 'EUR',
        fonctionnalites: {
          inclus: [
            'Enfants illimités',
            'Cahier de liaison numérique',
            'Messagerie sécurisée',
            'Gestion des documents',
            'Gestion des médicaments',
            'Diagnostics IA illimités',
            'Rapports et statistiques avancés',
            'API et intégrations',
            'Multi-établissements',
            'Support dédié 24/7',
            'Formation personnalisée',
          ],
        },
        limites: {
          enfants: -1,
          stockage: '100 GB',
          utilisateurs: -1,
          diagnostics_ia: -1,
        },
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ ${tarifs.length} tarifs créés\n`);

  // Créer un abonnement actif
  console.log('📌 Création de l\'abonnement...');

  const abonnement = await prisma.abonnement.upsert({
    where: { id: 'abonnement-1' },
    update: {},
    create: {
      id: 'abonnement-1',
      etablissementId: testEtablissement.id,
      plan: 'essentiel',
      statut: 'active',
      dateDebut: new Date('2026-01-01'),
      dateFin: new Date('2026-12-31'),
      prixMensuel: 99.99,
      devises: 'EUR',
      fonctionnalites: {
        inclus: [
          'Gestion de 60 enfants maximum',
          'Cahier de liaison numérique',
          'Messagerie sécurisée',
          'Gestion des documents',
          'Gestion des médicaments',
          'Diagnostics IA',
          'Rapports et statistiques',
          'Support prioritaire',
        ],
      },
      limites: {
        enfants: 60,
        stockage: '20 GB',
        utilisateurs: 15,
        diagnostics_ia: 200,
      },
    },
  });

  console.log(`✅ Abonnement créé pour ${testEtablissement.nom}\n`);

  // Créer des logs système
  console.log('📌 Création des logs système...');

  const logs = await Promise.all([
    prisma.logSysteme.create({
      data: {
        type: 'info',
        module: 'auth',
        action: 'login',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Connexion réussie',
        details: {
          role: 'admin_structure',
          etablissement: testEtablissement.nom,
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
    prisma.logSysteme.create({
      data: {
        type: 'info',
        module: 'enfant',
        action: 'create',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Création d\'un nouvel enfant',
        details: {
          enfantId: 'enfant-1',
          prenom: 'Lucas',
          nom: 'Martin',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
    prisma.logSysteme.create({
      data: {
        type: 'warning',
        module: 'document',
        action: 'relance',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Relance automatique pour document manquant',
        details: {
          documentType: 'certificat_medical',
          enfantId: 'enfant-2',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
    prisma.logSysteme.create({
      data: {
        type: 'info',
        module: 'diagnostic',
        action: 'create',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Diagnostic IA effectué',
        details: {
          diagnosticId: 'diagnostic-1',
          enfantId: 'enfant-2',
          urgence: 'surveiller',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
    prisma.logSysteme.create({
      data: {
        type: 'error',
        module: 'medicament',
        action: 'administration',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Erreur lors de l\'enregistrement d\'une administration',
        details: {
          error: 'Ordonnance expirée',
          medicamentId: 'med-123',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
    prisma.logSysteme.create({
      data: {
        type: 'info',
        module: 'abonnement',
        action: 'update',
        userId: directeur.id,
        userName: 'Marie Dupont',
        message: 'Renouvellement de l\'abonnement',
        details: {
          etablissementId: testEtablissement.id,
          plan: 'essentiel',
          ancienPlan: 'starter',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    }),
  ]);

  console.log(`✅ ${logs.length} logs système créés\n`);

  console.log('✅ Seeding terminé avec succès!\n');
  console.log('=' .repeat(60));
  console.log('RÉSUMÉ DES DONNÉES CRÉÉES:');
  console.log('=' .repeat(60));
  console.log('\n📧 COMPTES UTILISATEURS:');
  console.log('1. Super Admin:');
  console.log(`   Email: ${superAdminEmail}`);
  console.log(`   Mot de passe: ${superAdminPassword}`);
  console.log('2. Directeur:');
  console.log(`   Email: directeur@petitsloups.fr`);
  console.log(`   Mot de passe: ${directeurPassword}`);
  console.log('3. Parent:');
  console.log(`   Email: parent@test.fr`);
  console.log(`   Mot de passe: ${parentPassword}`);
  console.log('\n📊 DONNÉES DE TEST:');
  console.log(`   - Établissement: ${testEtablissement.nom}`);
  console.log(`   - Sections: ${sections.length}`);
  console.log(`   - Personnel: ${personnels.length}`);
  console.log(`   - Enfants: ${enfants.length}`);
  console.log(`   - Messages: ${messages.length}`);
  console.log(`   - Ordonnances: ${ordonnances.length}`);
  console.log(`   - Diagnostics IA: ${diagnostics.length}`);
  console.log(`   - Tarifs: ${tarifs.length}`);
  console.log(`   - Abonnement actif: ${abonnement.plan}`);
  console.log(`   - Logs système: ${logs.length}`);
  console.log('\n' + '=' .repeat(60));
  console.log('⚠️  Changez tous les mots de passe au premier login!');
  console.log('=' .repeat(60));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
