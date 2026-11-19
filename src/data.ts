// Une seule table de comptes. Les paquets de cartes (catégorie, solde, état financier,
// colonne du chiffrier) en sont dérivés, donc les réponses restent toujours cohérentes entre elles.

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
export type PaquetId = 'categorie' | 'solde' | 'etat' | 'chiffrier'

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
  // Contre-compte: classé avec sa famille, mais son solde est du côté opposé
  // (Amortissement cumulé est un actif au solde créditeur).
  contre?: boolean
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
    id: 'provision-clients',
    nom: 'Provision pour dépréciation – Clients',
    categorie: 'actif-ct',
    contre: true,
    note: "La partie des comptes clients qu’on ne pense pas encaisser. C’est un contre-actif: il est classé avec les actifs, mais son solde est créditeur parce qu’il diminue Clients. Au chiffrier, il va dans la colonne Bilan crédit.",
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
  {
    id: 'amortissement-cumule',
    nom: 'Amortissement cumulé',
    categorie: 'immobilisations',
    contre: true,
    note: "Toute l’usure accumulée depuis l’achat d’une immobilisation. C’est un contre-actif: il est classé avec les immobilisations, mais son solde est créditeur parce qu’il diminue leur valeur. On ne crédite jamais l’immobilisation elle-même. Au chiffrier, il va dans la colonne Bilan crédit.",
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
  {
    id: 'interets-payer',
    nom: 'Intérêts à payer',
    categorie: 'passif-ct',
    note: "Des intérêts sur un emprunt qui ont couru pendant la période, mais qu’on n’a pas encore payés. On les inscrit avec une régularisation. Intérêts débiteurs, c’est la charge.",
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
  {
    id: 'interets-crediteurs',
    nom: 'Intérêts créditeurs',
    categorie: 'produits',
    note: "Des intérêts que l’entreprise gagne, sur un placement par exemple. « Créditeurs » parce que c’est un produit, au solde créditeur.",
  },
  {
    id: 'rendus-rabais-ventes',
    nom: 'Rendus et rabais sur ventes',
    categorie: 'produits',
    contre: true,
    note: "La marchandise retournée par les clients ou les rabais qu’on leur accorde. C’est un contre-produit: il est classé avec les produits, mais son solde est débiteur parce qu’il diminue les ventes. Au chiffrier, il va dans la colonne Résultats débit.",
  },
  {
    id: 'escomptes-ventes',
    nom: 'Escomptes sur ventes',
    categorie: 'produits',
    contre: true,
    note: "Le rabais accordé aux clients qui paient vite. C’est un contre-produit: il est classé avec les produits, mais son solde est débiteur parce qu’il diminue les ventes. Au chiffrier, il va dans la colonne Résultats débit.",
  },

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
  {
    id: 'cmv',
    nom: 'Coût des marchandises vendues',
    categorie: 'charges',
    note: "Ce que nous ont coûté les marchandises qu’on a vendues. Stock de marchandise, c’est l’actif (ce qui n’est pas encore vendu).",
  },
  {
    id: 'fournitures-bureau-utilisees',
    nom: 'Fournitures de bureau utilisées',
    categorie: 'charges',
    note: "Les fournitures consommées pendant la période. On la calcule avec une régularisation: le solde de Fournitures de bureau moins ce qui reste à l’inventaire.",
  },
  {
    id: 'assurances',
    nom: 'Assurances',
    categorie: 'charges',
    note: "La partie de l’assurance qui est expirée. Assurance payée d’avance, c’est l’actif (la partie pas encore utilisée).",
  },
  {
    id: 'amortissement',
    nom: 'Amortissement',
    categorie: 'charges',
    note: "L’usure d’une immobilisation pendant la période. En linéaire: (coût − valeur résiduelle) ÷ durée de vie. La régularisation débite Amortissement et crédite Amortissement cumulé.",
  },
  {
    id: 'interets-debiteurs',
    nom: 'Intérêts débiteurs',
    categorie: 'charges',
    note: "Les intérêts que l’entreprise paie sur ses emprunts. « Débiteurs » parce que c’est une charge, au solde débiteur. Intérêts à payer, c’est le passif.",
  },
  {
    id: 'depreciation-clients',
    nom: 'Dépréciation des comptes clients',
    categorie: 'charges',
    note: "La perte estimée sur les clients qui ne paieront pas. La régularisation débite cette charge et crédite Provision pour dépréciation – Clients.",
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

export function soldeDe(c: Compte): SoldeId {
  const s = familleDe(c).solde
  if (!c.contre) return s
  return s === 'debiteur' ? 'crediteur' : 'debiteur'
}

// Le chiffrier à 10 colonnes n'a pas de colonnes pour l'état des capitaux propres:
// le capital et les retraits vont au bilan.
export type ColonneId = 'resultats-debiteur' | 'resultats-crediteur' | 'bilan-debiteur' | 'bilan-crediteur'

export const colonnes: { id: ColonneId; nom: string }[] = [
  { id: 'resultats-debiteur', nom: 'Résultats · Débit' },
  { id: 'resultats-crediteur', nom: 'Résultats · Crédit' },
  { id: 'bilan-debiteur', nom: 'Bilan · Débit' },
  { id: 'bilan-crediteur', nom: 'Bilan · Crédit' },
]

export const colonneParId = Object.fromEntries(colonnes.map(c => [c.id, c])) as Record<ColonneId, (typeof colonnes)[number]>

export function colonneDe(c: Compte): ColonneId {
  return `${familleDe(c).etat === 'resultats' ? 'resultats' : 'bilan'}-${soldeDe(c)}`
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
    reponse: c => soldeDe(c),
  },
  {
    id: 'etat',
    nom: 'États financiers',
    question: 'Dans quel état financier?',
    options: etats.map(e => ({ id: e.id, nom: e.nom })),
    reponse: c => familleDe(c).etat,
  },
  {
    id: 'chiffrier',
    nom: 'Colonne du chiffrier',
    question: 'Dans quelle colonne du chiffrier?',
    options: colonnes,
    reponse: c => colonneDe(c),
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

// --- Cycle comptable ---

export const etapesCycle: { nom: string; description: string; chiffrier?: boolean }[] = [
  {
    nom: 'Analyser les pièces justificatives',
    description: "Une facture, un reçu, un relevé de banque. Pour chaque transaction, on trouve les comptes touchés et lequel est débité ou crédité.",
  },
  {
    nom: 'Journaliser',
    description: "On inscrit chaque transaction au journal général, en ordre de date: le compte débité, le compte crédité, les montants et une courte explication.",
  },
  {
    nom: 'Reporter au grand livre',
    description: "Chaque montant du journal est copié dans son compte au grand livre. Le grand livre donne le solde de chaque compte.",
  },
  {
    nom: 'Balance de vérification',
    description: "La liste de tous les comptes avec leur solde. Le total des débits doit égaler le total des crédits.",
    chiffrier: true,
  },
  {
    nom: 'Régularisations',
    description: "À la fin de la période, on ajuste les comptes qui ne sont pas à jour: fournitures utilisées, assurance expirée, amortissement, intérêts courus, salaires courus.",
    chiffrier: true,
  },
  {
    nom: 'Balance de vérification régularisée',
    description: "Les soldes une fois les régularisations faites. C’est avec ces montants qu’on prépare les états financiers.",
    chiffrier: true,
  },
  {
    nom: 'États financiers',
    description: "État des résultats, état des capitaux propres, puis bilan, dans cet ordre.",
    chiffrier: true,
  },
  {
    nom: 'Écritures de clôture',
    description: "On remet à zéro les produits, les charges, les apports et les retraits. Le bénéfice net, les apports et les retraits passent dans le capital. La prochaine période repart de zéro.",
  },
  {
    nom: 'Balance de vérification après clôture',
    description: "Il ne reste que les comptes du bilan (actifs, passifs, capital). On vérifie une dernière fois que débits et crédits sont égaux.",
  },
]

// --- Régularisations ---

export interface Regularisation extends Ecriture {
  lettre: string
  nom: string
  calcul: string
}

// Les mêmes régularisations servent aux exemples et au chiffrier.
export const regularisations: Regularisation[] = [
  {
    lettre: 'a',
    nom: 'Fournitures utilisées',
    titre: 'Le compte Fournitures de bureau montre 900 $. L’inventaire du 31 décembre en compte 250 $.',
    calcul: '900 $ − 250 $ = 650 $ utilisées',
    debit: { compte: 'fournitures-bureau-utilisees', montant: 650 },
    credit: { compte: 'fournitures-bureau', montant: 650 },
    pourquoi: "L’inventaire donne ce qui reste, pas ce qui a été utilisé. On inscrit la partie consommée (charge ↑, débit) et on la sort de l’actif (actif ↓, crédit). Il reste 250 $ dans Fournitures de bureau.",
  },
  {
    lettre: 'b',
    nom: 'Assurance expirée',
    titre: 'Le 1er avril, on a payé 1 200 $ pour un an d’assurance. On est au 31 décembre.',
    calcul: 'D’avril à décembre: 9 mois. 1 200 $ × 9/12 = 900 $ expirés',
    debit: { compte: 'assurances', montant: 900 },
    credit: { compte: 'assurance-payee-avance', montant: 900 },
    pourquoi: "La partie expirée est consommée (charge ↑, débit). Elle n’est plus payée d’avance (actif ↓, crédit). Il reste 300 $ payés d’avance, pour janvier à mars. Le loyer et l’immatriculation payés d’avance suivent la même logique.",
  },
  {
    lettre: 'c',
    nom: 'Amortissement',
    titre: 'Le camion a coûté 30 000 $. On prévoit le garder 6 ans, puis le revendre 12 000 $. On l’amortit de façon linéaire.',
    calcul: '(30 000 $ − 12 000 $) ÷ 6 ans = 3 000 $ par année',
    debit: { compte: 'amortissement', montant: 3000 },
    credit: { compte: 'amortissement-cumule', montant: 3000 },
    pourquoi: "En linéaire, la charge est la même chaque année. On n’amortit pas la valeur résiduelle, puisqu’on va la récupérer à la revente. L’usure de l’année est une charge (débit). On ne touche pas au compte Matériel roulant: on crédite Amortissement cumulé, un contre-actif qui grossit chaque année. Après deux ans, il était à 6 000 $; il passe à 9 000 $.",
  },
  {
    lettre: 'd',
    nom: 'Intérêts courus',
    titre: 'Un effet à payer de 12 000 $ porte intérêt à 5 % par an. 3 mois d’intérêts ont couru, pas encore payés.',
    calcul: '12 000 $ × 5 % × 3/12 = 150 $',
    debit: { compte: 'interets-debiteurs', montant: 150 },
    credit: { compte: 'interets-payer', montant: 150 },
    pourquoi: "Les intérêts appartiennent à cette période même s’ils ne sont pas payés (charge ↑, débit). On les doit (passif ↑, crédit).",
  },
  {
    lettre: 'e',
    nom: 'Salaires courus',
    titre: 'Les employés ont travaillé les derniers jours de décembre. Ils seront payés en janvier: 800 $.',
    calcul: 'Montant donné',
    debit: { compte: 'salaires', montant: 800 },
    credit: { compte: 'salaires-payer', montant: 800 },
    pourquoi: "Le travail a été fait cette période (charge ↑, débit). On le doit encore aux employés (passif ↑, crédit).",
  },
  {
    lettre: 'f',
    nom: 'Dépréciation des clients',
    titre: 'On estime que 200 $ des comptes clients ne seront jamais encaissés.',
    calcul: 'Montant estimé, ou un % des clients',
    debit: { compte: 'depreciation-clients', montant: 200 },
    credit: { compte: 'provision-clients', montant: 200 },
    pourquoi: "La perte estimée est une charge (débit). On ne touche pas au compte Clients: on crédite la Provision, un contre-actif qui le diminue.",
  },
]

// --- Chiffrier d'exemple ---

export interface LigneChiffrier {
  compte: string
  // Nom affiché s'il est plus précis que celui du compte.
  nom?: string
  // Solde de la balance non régularisée, du côté naturel du compte.
  solde: number
}

export const lignesChiffrier: LigneChiffrier[] = [
  { compte: 'encaisse', solde: 16000 },
  { compte: 'clients', solde: 4000 },
  { compte: 'provision-clients', solde: 0 },
  { compte: 'fournitures-bureau', solde: 900 },
  { compte: 'assurance-payee-avance', solde: 1200 },
  { compte: 'materiel-roulant', solde: 30000 },
  { compte: 'amortissement-cumule', nom: 'Amortissement cumulé – Matériel roulant', solde: 6000 },
  { compte: 'fournisseurs', solde: 3500 },
  { compte: 'salaires-payer', solde: 0 },
  { compte: 'interets-payer', solde: 0 },
  { compte: 'effet-payer-lt', solde: 12000 },
  { compte: 'capital', solde: 20000 },
  { compte: 'retraits', solde: 6000 },
  { compte: 'services-rendus', solde: 42000 },
  { compte: 'salaires', solde: 18000 },
  { compte: 'loyer', solde: 6000 },
  { compte: 'electricite', solde: 1400 },
  { compte: 'fournitures-bureau-utilisees', solde: 0 },
  { compte: 'assurances', solde: 0 },
  { compte: 'amortissement', nom: 'Amortissement – Matériel roulant', solde: 0 },
  { compte: 'interets-debiteurs', solde: 0 },
  { compte: 'depreciation-clients', solde: 0 },
]
