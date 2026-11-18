// Une seule table de comptes. Les trois paquets de cartes (catégorie, solde, état
// financier) en sont dérivés, donc les réponses restent toujours cohérentes entre elles.

export type FamilleId = 'charges' | 'actifs' | 'retraits' | 'passifs' | 'capitaux' | 'produits'
export type CategorieId =
  | 'actif-ct'
  | 'immobilisations'
  | 'passif-ct'
  | 'passif-lt'
  | 'capitaux-propres'
  | 'produits'
  | 'charges'
export type SoldeId = 'debiteur' | 'crediteur'
export type EtatId = 'bilan' | 'resultats' | 'capitaux'
export type PaquetId = 'categorie' | 'solde' | 'etat'

export interface Famille {
  id: FamilleId
  lettre: string
  // Position de la lettre dans le nom (le P de « Capitaux propres »).
  indexLettre?: number
  nom: string
  solde: SoldeId
  etat: EtatId
  role: 'Tiers' | 'Interne' | 'Propriétaire'
  description: string
}

// Ordre CAR puis PPP.
export const familles: Famille[] = [
  {
    id: 'charges',
    lettre: 'C',
    nom: 'Charges',
    solde: 'debiteur',
    etat: 'resultats',
    role: 'Tiers',
    description: "Ce que l’entreprise consomme pour gagner ses produits. La valeur part vers des tiers (employés, propriétaire de l’immeuble, Hydro).",
  },
  {
    id: 'actifs',
    lettre: 'A',
    nom: 'Actifs',
    solde: 'debiteur',
    etat: 'bilan',
    role: 'Interne',
    description: "Ce que l’entreprise possède ou ce qu’on lui doit. La valeur reste dans l’entreprise.",
  },
  {
    id: 'retraits',
    lettre: 'R',
    nom: 'Retraits',
    solde: 'debiteur',
    etat: 'capitaux',
    role: 'Propriétaire',
    description: "Ce que le propriétaire sort de l’entreprise pour lui-même. Ce n’est pas une charge: ça réduit les capitaux propres.",
  },
  {
    id: 'passifs',
    lettre: 'P',
    nom: 'Passifs',
    solde: 'crediteur',
    etat: 'bilan',
    role: 'Tiers',
    description: "Ce que l’entreprise doit à des tiers (banque, fournisseurs, gouvernement, clients qui ont payé d’avance).",
  },
  {
    id: 'capitaux',
    lettre: 'P',
    indexLettre: 9,
    nom: 'Capitaux propres',
    solde: 'crediteur',
    etat: 'capitaux',
    role: 'Propriétaire',
    description: "La part du propriétaire: ce qu’il a investi et les bénéfices qu’il a laissés dans l’entreprise.",
  },
  {
    id: 'produits',
    lettre: 'P',
    nom: 'Produits',
    solde: 'crediteur',
    etat: 'resultats',
    role: 'Interne',
    description: "Ce que l’entreprise gagne par ses activités (ventes, services rendus). La valeur est créée par l’entreprise elle-même.",
  },
]

export interface Categorie {
  id: CategorieId
  nom: string
  famille: FamilleId
  description: string
}

export const categories: Categorie[] = [
  {
    id: 'actif-ct',
    nom: 'Actif à court terme',
    famille: 'actifs',
    description: "Argent, ce qu’on va encaisser, ou ce qu’on va utiliser d’ici un an.",
  },
  {
    id: 'immobilisations',
    nom: 'Immobilisations',
    famille: 'actifs',
    description: "Les actifs à long terme. Des biens durables qu’on garde plus d’un an pour faire rouler l’entreprise.",
  },
  {
    id: 'passif-ct',
    nom: 'Passif à court terme',
    famille: 'passifs',
    description: "Dettes à régler d’ici un an.",
  },
  {
    id: 'passif-lt',
    nom: 'Passif à long terme',
    famille: 'passifs',
    description: 'Dettes remboursées sur plus d’un an.',
  },
  {
    id: 'capitaux-propres',
    nom: 'Capitaux propres',
    famille: 'capitaux',
    description: 'Les comptes du propriétaire: capital, apports et retraits.',
  },
  {
    id: 'produits',
    nom: 'Produits d’exploitation',
    famille: 'produits',
    description: 'Revenus gagnés par les activités normales.',
  },
  {
    id: 'charges',
    nom: 'Charges',
    famille: 'charges',
    description: 'Coûts consommés pendant la période.',
  },
]

export interface Etat {
  id: EtatId
  nom: string
  court: string
  description: string
  formule: string
}

export const etats: Etat[] = [
  {
    id: 'resultats',
    nom: 'État des résultats',
    court: 'Résultats',
    description: "Le film d’une période: ce que l’entreprise a gagné moins ce que ça lui a coûté.",
    formule: 'Produits − Charges = Bénéfice net',
  },
  {
    id: 'capitaux',
    nom: 'État des capitaux propres',
    court: 'Capitaux propres',
    description: 'Comment la part du propriétaire a changé pendant la période.',
    formule: 'Capital au début + Apports + Bénéfice net − Retraits = Capital à la fin',
  },
  {
    id: 'bilan',
    nom: 'Bilan',
    court: 'Bilan',
    description: "La photo à une date précise: ce que l’entreprise possède et qui le finance.",
    formule: 'Actifs = Passifs + Capitaux propres',
  },
]

export interface Solde {
  id: SoldeId
  nom: string
  cote: string
  regle: string
}

export const soldes: Solde[] = [
  {
    id: 'debiteur',
    nom: 'Débiteur',
    cote: 'gauche',
    regle: 'Augmente au débit, diminue au crédit.',
  },
  {
    id: 'crediteur',
    nom: 'Créditeur',
    cote: 'droite',
    regle: 'Augmente au crédit, diminue au débit.',
  },
]

export interface Compte {
  id: string
  nom: string
  categorie: CategorieId
  retrait?: boolean
  note?: string
}

const AVANCE_ACTIF =
  "On a payé d’avance, donc on a droit à quelque chose dans le futur: c’est un actif. Il devient une charge au fil des mois, à mesure qu’on l’utilise."
const TPS_RECEVOIR =
  'La taxe payée sur nos achats nous est remboursée par le gouvernement: à recevoir, donc un actif.'
const TPS_PAYER =
  'La taxe facturée sur nos ventes appartient au gouvernement: on la lui doit, donc un passif.'

export const comptes: Compte[] = [
  // Actif à court terme
  {
    id: 'encaisse',
    nom: 'Encaisse',
    categorie: 'actif-ct',
    note: "L’argent en banque. Pour la banque, ton compte est un passif (elle te doit cet argent) alors que pour toi c’est un actif. C’est pour ça que la banque « crédite » ton compte quand il augmente.",
  },
  {
    id: 'placements-ct',
    nom: 'Placements à court terme',
    categorie: 'actif-ct',
    note: "De l’argent placé qu’on peut récupérer d’ici un an.",
  },
  {
    id: 'clients',
    nom: 'Clients',
    categorie: 'actif-ct',
    note: "Les clients nous doivent de l’argent: c’est un compte à recevoir.",
  },
  {
    id: 'interets-recevoir',
    nom: 'Intérêts à recevoir',
    categorie: 'actif-ct',
    note: "Des intérêts gagnés mais pas encore encaissés. « À recevoir » = on a droit à de l’argent = actif.",
  },
  {
    id: 'taxes-consommation-recevoir',
    nom: 'Taxes de consommation à recevoir',
    categorie: 'actif-ct',
    note: TPS_RECEVOIR,
  },
  { id: 'tps-recevoir', nom: 'TPS à recevoir', categorie: 'actif-ct', note: TPS_RECEVOIR },
  { id: 'tvq-recevoir', nom: 'TVQ à recevoir', categorie: 'actif-ct', note: TPS_RECEVOIR },
  {
    id: 'stock-marchandise',
    nom: 'Stock de marchandise',
    categorie: 'actif-ct',
    note: "Les marchandises qu’on a en main pour les revendre dans l’année.",
  },
  {
    id: 'fournitures-bureau',
    nom: 'Fournitures de bureau',
    categorie: 'actif-ct',
    note: "Les fournitures encore en main sont un actif. Une fois utilisées, elles deviennent une charge (voir Frais de bureau).",
  },
  { id: 'assurance-payee-avance', nom: 'Assurance payée d’avance', categorie: 'actif-ct', note: AVANCE_ACTIF },
  { id: 'loyer-paye-avance', nom: 'Loyer payé d’avance', categorie: 'actif-ct', note: AVANCE_ACTIF },

  // Immobilisations
  { id: 'terrain', nom: 'Terrain', categorie: 'immobilisations' },
  { id: 'batiment', nom: 'Bâtiment', categorie: 'immobilisations' },
  { id: 'equipement', nom: 'Équipement', categorie: 'immobilisations' },
  { id: 'equipement-bureau', nom: 'Équipement de bureau', categorie: 'immobilisations' },
  { id: 'materiel-informatique', nom: 'Matériel informatique', categorie: 'immobilisations' },
  { id: 'ameublement-bureau', nom: 'Ameublement de bureau', categorie: 'immobilisations' },
  {
    id: 'materiel-roulant',
    nom: 'Matériel roulant',
    categorie: 'immobilisations',
    note: "Les véhicules de l’entreprise (camions, voitures).",
  },

  // Passif à court terme
  {
    id: 'emprunt-bancaire',
    nom: 'Emprunt bancaire (marge de crédit)',
    categorie: 'passif-ct',
    note: 'On doit cet argent à la banque, et une marge de crédit se rembourse à court terme.',
  },
  {
    id: 'fournisseurs',
    nom: 'Fournisseurs',
    categorie: 'passif-ct',
    note: "On doit de l’argent aux fournisseurs: c’est un compte à payer. C’est le miroir de Clients.",
  },
  {
    id: 'salaires-payer',
    nom: 'Salaires à payer',
    categorie: 'passif-ct',
    note: "Le travail est fait, mais les employés ne sont pas encore payés. « À payer » = on doit de l’argent = passif. Salaires tout court, c’est la charge.",
  },
  { id: 'tps-payer', nom: 'TPS à payer', categorie: 'passif-ct', note: TPS_PAYER },
  { id: 'tvq-payer', nom: 'TVQ à payer', categorie: 'passif-ct', note: TPS_PAYER },
  { id: 'impot-payer', nom: 'Impôt à payer', categorie: 'passif-ct' },
  {
    id: 'publicite-payer',
    nom: 'Publicité à payer',
    categorie: 'passif-ct',
    note: 'La pub a été faite, mais pas encore payée. Publicité tout court, c’est la charge.',
  },
  { id: 'autres-charges-payer', nom: 'Autres charges à payer', categorie: 'passif-ct' },
  {
    id: 'effet-payer-ct',
    nom: 'Effet à payer (court terme)',
    categorie: 'passif-ct',
    note: "Un effet à payer est une promesse écrite de payer. L’échéance est d’un an ou moins, donc c’est à court terme.",
  },
  {
    id: 'produits-percus-avance',
    nom: 'Produits perçus d’avance',
    categorie: 'passif-ct',
    note: "Le client a payé, mais on n’a pas encore rendu le service. On lui doit encore le service, donc c’est un passif et pas un produit. C’est le miroir de « payé d’avance ».",
  },

  // Passif à long terme
  {
    id: 'emprunt-hypothecaire',
    nom: 'Emprunt hypothécaire',
    categorie: 'passif-lt',
    note: "Un prêt pour un immeuble, remboursé sur plusieurs années.",
  },
  {
    id: 'effet-payer-lt',
    nom: 'Effet à payer long terme',
    categorie: 'passif-lt',
    note: "Une promesse écrite de payer dans plus d’un an.",
  },

  // Capitaux propres
  {
    id: 'capitaux-propres',
    nom: 'Capitaux propres',
    categorie: 'capitaux-propres',
  },
  {
    id: 'capital',
    nom: 'Nom du propriétaire – Capital',
    categorie: 'capitaux-propres',
    note: "Ce que l’entreprise « doit » à son propriétaire. Le capital à la fin, calculé dans l’état des capitaux propres, est ensuite reporté au bilan.",
  },
  {
    id: 'apports',
    nom: 'Nom du propriétaire – Apports',
    categorie: 'capitaux-propres',
    note: "Le propriétaire met de l’argent ou des biens dans l’entreprise: sa part augmente.",
  },
  {
    id: 'retraits',
    nom: 'Nom du propriétaire – Retraits',
    categorie: 'capitaux-propres',
    retrait: true,
    note: "Le propriétaire sort de l’argent pour lui-même. Le compte est classé dans les capitaux propres, mais il les diminue. C’est le R de CAR, donc son solde est débiteur, à l’inverse des autres comptes de capitaux propres.",
  },

  // Produits d'exploitation
  { id: 'ventes', nom: 'Ventes', categorie: 'produits' },
  { id: 'services-rendus', nom: 'Services rendus', categorie: 'produits' },
  { id: 'commissions-gagnees', nom: 'Commissions gagnées', categorie: 'produits' },
  { id: 'vente-billets', nom: 'Revenus de la vente de billets', categorie: 'produits' },

  // Charges
  {
    id: 'salaires',
    nom: 'Salaires',
    categorie: 'charges',
    note: 'Le coût du travail de la période. Salaires à payer, c’est le passif.',
  },
  { id: 'loyer', nom: 'Loyer', categorie: 'charges', note: "Le loyer du mois, consommé. Loyer payé d’avance, c’est l’actif." },
  { id: 'publicite', nom: 'Publicité', categorie: 'charges' },
  { id: 'electricite', nom: 'Électricité', categorie: 'charges' },
  { id: 'telecommunication', nom: 'Télécommunication', categorie: 'charges' },
  { id: 'essence', nom: 'Essence', categorie: 'charges' },
  { id: 'entretien-reparation', nom: 'Entretien et réparation', categorie: 'charges' },
  {
    id: 'taxes-municipales',
    nom: 'Taxes municipales',
    categorie: 'charges',
    note: "Une dépense que l’entreprise paie à la ville, pas une taxe qu’elle perçoit: c’est une charge.",
  },
  { id: 'frais-repas', nom: 'Frais de repas et de représentation', categorie: 'charges' },
  {
    id: 'frais-bureau',
    nom: 'Frais de bureau',
    categorie: 'charges',
    note: 'Des dépenses de bureau consommées. Fournitures de bureau, c’est l’actif (ce qui est encore en main).',
  },
  { id: 'autres-charges', nom: 'Autres charges', categorie: 'charges' },
]

export const familleParId = Object.fromEntries(familles.map(f => [f.id, f])) as Record<FamilleId, Famille>
export const categorieParId = Object.fromEntries(categories.map(c => [c.id, c])) as Record<CategorieId, Categorie>
export const etatParId = Object.fromEntries(etats.map(e => [e.id, e])) as Record<EtatId, Etat>
export const soldeParId = Object.fromEntries(soldes.map(s => [s.id, s])) as Record<SoldeId, Solde>
export const compteParId = Object.fromEntries(comptes.map(c => [c.id, c])) as Record<string, Compte>

export function familleDe(c: Compte): Famille {
  return c.retrait ? familleParId.retraits : familleParId[categorieParId[c.categorie].famille]
}

export interface Paquet {
  id: PaquetId
  nom: string
  question: string
  options: { id: string; nom: string }[]
  reponse: (c: Compte) => string
}

export const paquets: Paquet[] = [
  {
    id: 'categorie',
    nom: 'Catégorie de comptes',
    question: 'Dans quelle catégorie?',
    options: categories.map(c => ({ id: c.id, nom: c.nom })),
    reponse: c => c.categorie,
  },
  {
    id: 'solde',
    nom: 'Débiteur ou créditeur?',
    question: 'Solde habituel?',
    options: soldes.map(s => ({ id: s.id, nom: s.nom })),
    reponse: c => familleDe(c).solde,
  },
  {
    id: 'etat',
    nom: 'États financiers',
    question: 'Dans quel état financier?',
    options: etats.map(e => ({ id: e.id, nom: e.nom })),
    reponse: c => familleDe(c).etat,
  },
]

export const paquetParId = Object.fromEntries(paquets.map(p => [p.id, p])) as Record<PaquetId, Paquet>

export interface Carte {
  id: string
  compte: Compte
  paquet: Paquet
}

export const cartes: Carte[] = paquets.flatMap(p =>
  comptes.map(c => ({ id: `${p.id}:${c.id}`, compte: c, paquet: p })),
)

export const carteParId = Object.fromEntries(cartes.map(c => [c.id, c])) as Record<string, Carte>

export interface Ecriture {
  titre: string
  debit: { compte: string; montant: number }
  credit: { compte: string; montant: number }
  pourquoi: string
}

export const ecritures: Ecriture[] = [
  {
    titre: 'Le propriétaire investit 10 000 $ dans son entreprise.',
    debit: { compte: 'encaisse', montant: 10000 },
    credit: { compte: 'apports', montant: 10000 },
    pourquoi: "L’argent arrive dans l’entreprise (actif ↑, débit). Il vient du propriétaire (capitaux propres ↑, crédit).",
  },
  {
    titre: 'Achat d’un bureau à crédit, 2 000 $.',
    debit: { compte: 'ameublement-bureau', montant: 2000 },
    credit: { compte: 'fournisseurs', montant: 2000 },
    pourquoi: "Le bureau entre dans l’entreprise (actif ↑, débit). C’est le fournisseur qui le finance pour l’instant (passif ↑, crédit).",
  },
  {
    titre: 'Services rendus à un client qui paiera le mois prochain, 1 500 $.',
    debit: { compte: 'clients', montant: 1500 },
    credit: { compte: 'services-rendus', montant: 1500 },
    pourquoi: 'On a maintenant droit à cet argent (actif ↑, débit). La source de la valeur, c’est notre travail (produit ↑, crédit).',
  },
  {
    titre: 'Paiement du loyer du mois, 800 $.',
    debit: { compte: 'loyer', montant: 800 },
    credit: { compte: 'encaisse', montant: 800 },
    pourquoi: "Le mois de loyer est consommé (charge ↑, débit). L’argent sort du compte de banque (actif ↓, crédit).",
  },
  {
    titre: 'On paie le fournisseur du bureau, 2 000 $.',
    debit: { compte: 'fournisseurs', montant: 2000 },
    credit: { compte: 'encaisse', montant: 2000 },
    pourquoi: "La dette disparaît (passif ↓, débit). L’argent sort (actif ↓, crédit). Un débit n’est pas toujours une augmentation: ça dépend du côté naturel du compte.",
  },
  {
    titre: 'Le propriétaire se retire 500 $ pour ses dépenses personnelles.',
    debit: { compte: 'retraits', montant: 500 },
    credit: { compte: 'encaisse', montant: 500 },
    pourquoi: "Le retrait augmente (R de CAR ↑, débit). L’argent sort (actif ↓, crédit). Ce n’est pas une charge: ça ne passe pas par l’état des résultats.",
  },
]

export const indices: { motif: string; categorie: CategorieId; explication: string; exemples: string[] }[] = [
  {
    motif: '… à recevoir',
    categorie: 'actif-ct',
    explication: "Quelqu’un nous doit de l’argent.",
    exemples: ['interets-recevoir', 'tps-recevoir', 'clients'],
  },
  {
    motif: '… payé d’avance',
    categorie: 'actif-ct',
    explication: 'On a payé pour un service futur, donc on y a droit.',
    exemples: ['loyer-paye-avance', 'assurance-payee-avance'],
  },
  {
    motif: '… à payer',
    categorie: 'passif-ct',
    explication: "On doit de l’argent à quelqu’un.",
    exemples: ['salaires-payer', 'tps-payer', 'fournisseurs'],
  },
  {
    motif: '… perçu d’avance',
    categorie: 'passif-ct',
    explication: "On a reçu l’argent, mais on doit encore le service.",
    exemples: ['produits-percus-avance'],
  },
  {
    motif: 'Nom du propriétaire – …',
    categorie: 'capitaux-propres',
    explication: 'Un compte qui appartient au propriétaire.',
    exemples: ['capital', 'apports', 'retraits'],
  },
  {
    motif: 'Un bien qui dure des années',
    categorie: 'immobilisations',
    explication: "C’est un actif à long terme. On l’utilise pour faire rouler l’entreprise, pas pour le revendre.",
    exemples: ['batiment', 'materiel-roulant', 'equipement'],
  },
  {
    motif: 'Une dépense déjà consommée',
    categorie: 'charges',
    explication: 'Le nom tout seul, sans « à payer » ni « d’avance ».',
    exemples: ['salaires', 'loyer', 'publicite'],
  },
]
