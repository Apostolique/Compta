// La simulation du cycle comptable: un mois d'une petite entreprise de services, généré au hasard.
// Chaque tâche doit être réussie (ou sa réponse affichée) avant la suivante, donc le grand livre
// et les soldes se calculent toujours à partir des bonnes réponses.

import { comptes, compteParId, familleDe, soldeDe, type FamilleId } from './data'
import { melanger } from './store'

export type Cote = 'd' | 'c'

export interface Ligne {
  compte: string
  cote: Cote
  montant: number
}

export interface Operation {
  // (3) pour une transaction, (b) pour une régularisation, (C1) pour une clôture.
  ref: string
  jour: number
  texte: string
  libelle: string
  lignes: Ligne[]
  idee: string
  calcul?: string
}

export type Longueur = 'courte' | 'complete'

export interface Scenario {
  entreprise: string
  // Premier mois de l'entreprise: le grand livre part de zéro.
  premierMois?: boolean
  proprio: string
  mois: number
  annee: number
  dernierJour: number
  plan: string[]
  ouverture: Ligne[]
  transactions: Operation[]
  regularisations: Operation[]
  cloture: Operation[]
}

// Débit positif, crédit négatif.
export type Soldes = Record<string, number>

export function appliquer(soldes: Soldes, lignes: Ligne[]): Soldes {
  for (const l of lignes) soldes[l.compte] = (soldes[l.compte] ?? 0) + (l.cote === 'd' ? l.montant : -l.montant)
  return soldes
}

const nomsMois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const nomMois = (m: number) => nomsMois[((m % 12) + 12) % 12]
// « d’avril », « de mai »
export const deMois = (m: number) => (/^[aeiou]/.test(nomMois(m)) ? `d’${nomMois(m)}` : `de ${nomMois(m)}`)
export const dateTexte = (jour: number, m: number) => `${jour === 1 ? '1er' : jour} ${nomMois(m)}`
export const nb = (n: number) => n.toLocaleString('fr-CA')
export const argent = (n: number) => `${nb(n)} $`

function entier(min: number, max: number, pas = 1): number {
  const n = Math.floor((max - min) / pas)
  return min + pas * Math.floor(Math.random() * (n + 1))
}

function un<T>(liste: readonly T[]): T {
  return liste[Math.floor(Math.random() * liste.length)]
}

const arrondir = (n: number, pas: number) => Math.round(n / pas) * pas
const D = (compte: string, montant: number): Ligne => ({ compte, cote: 'd', montant })
const C = (compte: string, montant: number): Ligne => ({ compte, cote: 'c', montant })

export function familleId(id: string): FamilleId {
  return familleDe(compteParId[id]).id
}

const nomsProprio: Record<string, string> = { capital: 'Capital', apports: 'Apports', retraits: 'Retraits' }

// Seul l'équipement est amorti dans la simulation: ses deux comptes d'amortissement portent son nom.
const nomsAmortissement: Record<string, string> = {
  amortissement: 'Amortissement – Équipement',
  'amortissement-cumule': 'Amortissement cumulé – Équipement',
}

export function nomCompte(sc: Scenario, id: string): string {
  if (nomsProprio[id]) return `${sc.proprio} – ${nomsProprio[id]}`
  return nomsAmortissement[id] ?? compteParId[id].nom
}

// --- Noms au hasard ---

const proprietaires = [
  'Camille Tremblay',
  'Samuel Gagnon',
  'Léa Roy',
  'Olivier Côté',
  'Rosalie Bouchard',
  'Thomas Gauthier',
  'Maude Lavoie',
  'Félix Pelletier',
  'Noémie Bélanger',
  'Gabriel Morin',
  'Jade Fortin',
  'Antoine Ouellet',
]
const activites = ['Graphisme', 'Paysagement', 'Informatique', 'Photo', 'Entretien', 'Rénovations', 'Traduction', 'Design']

// Avec l'article, pour écrire « au Garage Fortin » et « à la Clinique Bellevue ».
const clients = [
  'la Boulangerie Gauvin',
  'le Garage Fortin',
  'la Clinique Bellevue',
  'la Fromagerie Saint-Pierre',
  'le Dépanneur Morin',
  'la Pharmacie Lacroix',
  'le Restaurant Chez Lise',
  'l’École Les Pionniers',
  'la Caisse populaire du Lac',
  'le Club de golf Beaumont',
]
const fournisseurs = ['Papeterie Leclerc', 'Fournitures Dubé', 'Quincaillerie Martel', 'Bureautique Nadeau', 'Électro Simard']

const a = (nom: string) => (nom.startsWith('le ') ? `au ${nom.slice(3)}` : `à ${nom}`)
const de = (nom: string) => (nom.startsWith('le ') ? `du ${nom.slice(3)}` : `de ${nom}`)
const maj = (s: string) => s[0].toUpperCase() + s.slice(1)

// --- Transactions ---

interface Ctx {
  proprio: string
  mois: number
  dernier: number
  clients: string[]
  fournisseurs: string[]
  clientDu: string
  fournisseurDu: string
  ouvClients: number
  ouvFournisseurs: number
  paie: number
  // Premier mois: pas de soldes d'ouverture. Les clients et les fournisseurs paient alors des
  // factures du même mois, inscrites plus tôt.
  premier: boolean
  ventes: Source[]
  achats: Source[]
  equipement: { cout: number; apporte: boolean }
  assurance: { mois: number; mens: number }
  effet: { capital: number; taux: number }
  immo?: boolean
  loyerAvance?: { total: number; n: number }
  avance?: { total: number; n: number; client: string }
}

type Brouillon = Omit<Operation, 'ref'>
type Gabarit = (c: Ctx) => Brouillon | null
interface Source {
  qui: string
  montant: number
  b: Brouillon
}

// Garde la transaction comme source d'un paiement plus tard dans le mois.
function source(liste: Source[], qui: string, montant: number, b: Brouillon): Brouillon {
  liste.push({ qui, montant, b })
  return b
}

// Un paiement partiel d'une facture inscrite plus tôt dans le mois.
function partiel(c: Ctx, liste: Source[]): { s: Source; m: number; jour: number } | null {
  const s = liste.filter(x => x.b.jour <= c.dernier - 8).sort((x, y) => y.montant - x.montant)[0]
  if (!s) return null
  return { s, m: Math.min(arrondir(s.montant * (0.4 + Math.random() * 0.35), 50), s.montant - 50), jour: entier(s.b.jour + 5, c.dernier - 2) }
}

const g = {
  servicesCredit: c => {
    const m = entier(2500, 6000, 50)
    const qui = c.clients.pop()!
    return source(c.ventes, qui, m, {
      jour: c.premier ? entier(3, 10) : 0,
      texte: `Services rendus ${a(qui)}, qui paiera dans 30 jours, ${argent(m)}.`,
      libelle: 'Services rendus à crédit',
      lignes: [D('clients', m), C('services-rendus', m)],
      idee: 'Le travail est fait, donc le produit est gagné ce mois-ci, même si l’argent arrive plus tard. D’ici là, le client nous doit ce montant.',
    })
  },
  servicesComptant: c => {
    const m = entier(1200, 3500, 50)
    return {
      jour: 0,
      texte: `Services rendus ${a(c.clients.pop()!)}, payés comptant, ${argent(m)}.`,
      libelle: 'Services rendus au comptant',
      lignes: [D('encaisse', m), C('services-rendus', m)],
      idee: 'Le travail est fait, donc le produit est gagné. L’argent entre tout de suite.',
    }
  },
  servicesMixte: c => {
    const total = entier(3000, 6000, 100)
    const part = arrondir(total * (0.2 + Math.random() * 0.2), 50)
    const qui = c.clients.pop()!
    return source(c.ventes, qui, total - part, {
      jour: 0,
      texte: `Services rendus ${a(qui)} pour ${argent(total)}. Le client paie ${argent(part)} tout de suite et le reste dans 30 jours.`,
      libelle: 'Services rendus, en partie à crédit',
      lignes: [D('encaisse', part), D('clients', total - part), C('services-rendus', total)],
      idee: 'Le produit est gagné au complet. Une partie de l’argent entre tout de suite, et le client nous doit le reste.',
    })
  },
  encaissementClient: c => {
    if (c.premier) {
      const p = partiel(c, c.ventes)
      if (!p) return null
      return {
        jour: p.jour,
        texte: `${maj(p.s.qui)} paie ${argent(p.m)}, une partie de sa facture du ${dateTexte(p.s.b.jour, c.mois)}.`,
        libelle: 'Encaissement d’un client',
        lignes: [D('encaisse', p.m), C('clients', p.m)],
        idee: 'Le produit a été inscrit le jour où le travail a été fait. Ici, on encaisse ce que le client nous devait: ce n’est pas un nouveau produit.',
      }
    }
    const m = Math.min(arrondir(c.ouvClients * (0.4 + Math.random() * 0.4), 50), c.ouvClients - 100)
    return {
      jour: 0,
      texte: `${maj(c.clientDu)} paie ${argent(m)}, une partie de sa facture du mois passé.`,
      libelle: 'Encaissement d’un client',
      lignes: [D('encaisse', m), C('clients', m)],
      idee: 'Le produit a été inscrit le mois passé, quand le travail a été fait. Ici, on encaisse ce que le client nous devait: ce n’est pas un nouveau produit.',
    }
  },
  paiementFournisseur: c => {
    if (c.premier) {
      const p = partiel(c, c.achats)
      if (!p) return null
      return {
        jour: p.jour,
        texte: `On paie ${argent(p.m)} à ${p.s.qui}, une partie de sa facture du ${dateTexte(p.s.b.jour, c.mois)}.`,
        libelle: 'Paiement d’un fournisseur',
        lignes: [D('fournisseurs', p.m), C('encaisse', p.m)],
        idee: 'L’achat a été inscrit quand la facture est arrivée. Ici, on règle une dette: ce n’est pas une nouvelle charge.',
      }
    }
    const m = Math.min(arrondir(c.ouvFournisseurs * (0.4 + Math.random() * 0.4), 50), c.ouvFournisseurs - 100)
    return {
      jour: 0,
      texte: `On paie ${argent(m)} à ${c.fournisseurDu}, une partie de sa facture du mois passé.`,
      libelle: 'Paiement d’un fournisseur',
      lignes: [D('fournisseurs', m), C('encaisse', m)],
      idee: 'L’achat a été inscrit quand la facture est arrivée. Ici, on règle une dette: ce n’est pas une nouvelle charge.',
    }
  },
  salaires: c => {
    c.paie = entier(1500, 3200, 50)
    return {
      jour: 15,
      texte: `Paie des employés du 1er au 15, ${argent(c.paie)}.`,
      libelle: 'Paie des employés',
      lignes: [D('salaires', c.paie), C('encaisse', c.paie)],
      idee: 'Le travail des employés est consommé ce mois-ci: c’est une charge. L’argent sort.',
    }
  },
  retrait: c => {
    const m = entier(500, 1500, 50)
    return {
      jour: 0,
      texte: `${c.proprio} retire ${argent(m)} du compte de l’entreprise pour ses dépenses personnelles.`,
      libelle: 'Retrait du propriétaire',
      lignes: [D('retraits', m), C('encaisse', m)],
      idee: 'L’argent sort pour le propriétaire, pas pour faire rouler l’entreprise: ce n’est pas une charge. Les retraits diminuent les capitaux propres.',
    }
  },
  apport: c => {
    const m = entier(2000, 8000, 500)
    return {
      jour: 0,
      texte: `${c.proprio} dépose ${argent(m)} de ses économies dans le compte de l’entreprise.`,
      libelle: 'Apport du propriétaire',
      lignes: [D('encaisse', m), C('apports', m)],
      idee: 'L’argent entre, mais il vient du propriétaire, pas d’un client: ce n’est pas un produit. La part du propriétaire augmente.',
    }
  },
  loyerMois: () => {
    const m = entier(900, 1800, 50)
    return {
      jour: 1,
      texte: `On paie le loyer du mois, ${argent(m)}.`,
      libelle: 'Loyer du mois',
      lignes: [D('loyer', m), C('encaisse', m)],
      idee: 'Le mois de loyer est utilisé ce mois-ci: c’est une charge.',
    }
  },
  loyerAvance: c => {
    const r = entier(800, 1500, 50)
    const n = entier(3, 5)
    c.loyerAvance = { total: r * n, n }
    return {
      jour: 1,
      texte: `On paie d’avance le loyer des ${n} prochains mois, ${deMois(c.mois)} à ${nomMois(c.mois + n - 1)}: ${argent(r * n)}.`,
      libelle: 'Loyer payé d’avance',
      lignes: [D('loyer-paye-avance', r * n), C('encaisse', r * n)],
      idee: 'Ces mois ne sont pas encore passés: on a payé pour s’en servir plus tard, donc c’est un actif. Il deviendra une charge un mois à la fois.',
    }
  },
  fournituresCredit: c => {
    const m = c.premier ? entier(400, 900, 10) : entier(150, 600, 10)
    const qui = c.fournisseurs.pop()!
    return source(c.achats, qui, m, {
      jour: c.premier ? entier(2, 8) : 0,
      texte: `Achat de fournitures de bureau à crédit chez ${qui}, ${argent(m)}.`,
      libelle: 'Fournitures à crédit',
      lignes: [D('fournitures-bureau', m), C('fournisseurs', m)],
      idee: 'Les fournitures sont encore en main, pas utilisées: c’est un actif. On les paiera plus tard, donc on doit ce montant au fournisseur.',
    })
  },
  electriciteCredit: c => {
    const m = entier(90, 280, 5)
    return {
      jour: entier(20, c.dernier - 3),
      texte: `La facture d’électricité du mois arrive, ${argent(m)}. On la paiera le mois prochain.`,
      libelle: 'Électricité à payer',
      lignes: [D('electricite', m), C('fournisseurs', m)],
      idee: 'L’électricité du mois est consommée: c’est une charge, même si elle n’est pas encore payée. D’ici là, on la doit au fournisseur.',
    }
  },
  telecom: () => {
    const m = entier(60, 180, 5)
    return {
      jour: 0,
      texte: `La facture de cellulaire du mois, ${argent(m)}, est payée par prélèvement automatique.`,
      libelle: 'Cellulaire',
      lignes: [D('telecommunication', m), C('encaisse', m)],
      idee: 'Le service du mois est consommé: c’est une charge. L’argent sort tout de suite.',
    }
  },
  publicite: () => {
    const m = entier(150, 600, 25)
    return {
      jour: 0,
      texte: `Publicité dans le journal local, ${argent(m)}, payée comptant.`,
      libelle: 'Publicité',
      lignes: [D('publicite', m), C('encaisse', m)],
      idee: 'La pub paraît ce mois-ci: c’est une charge. L’argent sort tout de suite.',
    }
  },
  entretienCredit: c => {
    const m = entier(120, 500, 10)
    const qui = c.fournisseurs.pop()!
    return source(c.achats, qui, m, {
      jour: 0,
      texte: `${qui} répare l’équipement et envoie une facture de ${argent(m)}, payable dans 30 jours.`,
      libelle: 'Réparation à crédit',
      lignes: [D('entretien-reparation', m), C('fournisseurs', m)],
      idee: 'Une réparation garde l’équipement en état sans lui ajouter de valeur: c’est une charge. On la paiera plus tard.',
    })
  },
  achatImmo: c => {
    const bien = un([
      { compte: 'ameublement-bureau', quoi: 'd’un bureau et de chaises' },
      { compte: 'materiel-informatique', quoi: 'de deux ordinateurs' },
      { compte: 'equipement-bureau', quoi: 'd’une imprimante laser' },
    ])
    const total = entier(2400, 6000, 100)
    const part = arrondir(total * (0.25 + Math.random() * 0.15), 100)
    c.immo = true
    const qui = c.fournisseurs.pop()!
    return source(c.achats, qui, total - part, {
      jour: 0,
      texte: `Achat ${bien.quoi} chez ${qui} pour ${argent(total)}. On paie ${argent(part)} comptant et le reste dans 30 jours.`,
      libelle: 'Achat d’une immobilisation',
      lignes: [D(bien.compte, total), C('encaisse', part), C('fournisseurs', total - part)],
      idee: 'Ces biens vont servir pendant des années: c’est une immobilisation, pas une charge. Une partie du prix sort de l’encaisse, et le reste devient une dette.',
    })
  },
  // Les quatre suivants servent seulement au premier mois.
  fondation: c => {
    const m = entier(12000, 25000, 1000)
    const { cout, apporte } = c.equipement
    return {
      jour: 1,
      texte: apporte
        ? `${c.proprio} lance son entreprise avec ${argent(m)} de ses économies, déposés dans le compte de l’entreprise, et de l’équipement d’une valeur de ${argent(cout)}.`
        : `${c.proprio} lance son entreprise et dépose ${argent(m)} de ses économies dans le compte de l’entreprise.`,
      libelle: 'Mise de fonds du propriétaire',
      lignes: [D('encaisse', m), ...(apporte ? [D('equipement', cout)] : []), C('capital', apporte ? m + cout : m)],
      idee: `La mise de fonds qui lance l’entreprise forme le capital du propriétaire: ce n’est pas un produit. Ce que l’entreprise reçoit${apporte ? ', l’argent et l’équipement,' : ''} est un actif.`,
    }
  },
  achatEquipement: c => {
    const { cout } = c.equipement
    const part = arrondir(cout * (0.3 + Math.random() * 0.15), 500)
    const qui = c.fournisseurs.pop()!
    return source(c.achats, qui, cout - part, {
      jour: 2,
      texte: `Achat de l’équipement chez ${qui} pour ${argent(cout)}. On paie ${argent(part)} comptant et le reste dans 30 jours.`,
      libelle: 'Achat de l’équipement',
      lignes: [D('equipement', cout), C('encaisse', part), C('fournisseurs', cout - part)],
      idee: 'L’équipement va servir pendant des années: c’est une immobilisation, pas une charge. Une partie du prix sort de l’encaisse, et le reste devient une dette.',
    })
  },
  emprunt: c => ({
    jour: 1,
    texte: `L’entreprise emprunte ${argent(c.effet.capital)} à la banque et signe un effet à payer de 3 ans, à ${c.effet.taux} % par année.`,
    libelle: 'Emprunt à la banque',
    lignes: [D('encaisse', c.effet.capital), C('effet-payer-lt', c.effet.capital)],
    idee: 'L’argent entre, mais il faudra le rembourser dans plus d’un an: c’est un passif à long terme, pas un produit. Les intérêts deviendront une charge au fil des mois.',
  }),
  assurancePolice: c => {
    const total = c.assurance.mois * c.assurance.mens
    return {
      jour: entier(1, 3),
      texte: `On paie ${argent(total)} pour une police d’assurance de 12 mois qui commence le 1er ${nomMois(c.mois)}.`,
      libelle: 'Assurance payée d’avance',
      lignes: [D('assurance-payee-avance', total), C('encaisse', total)],
      idee: 'La protection couvre les 12 prochains mois. Elle n’est pas encore utilisée, donc c’est un actif. Elle deviendra une charge un mois à la fois.',
    }
  },
  avanceClient: c => {
    const n = entier(3, 6)
    const r = entier(400, 900, 50)
    const client = c.clients.pop()!
    c.avance = { total: r * n, n, client }
    return {
      jour: entier(2, 5),
      texte: `${maj(client)} paie d’avance ${argent(r * n)} pour un contrat de ${n} mois qui commence ce mois-ci.`,
      libelle: 'Avance d’un client',
      lignes: [D('encaisse', r * n), C('produits-percus-avance', r * n)],
      idee: 'L’argent entre, mais le travail n’est pas encore fait. On doit encore le service au client: c’est un passif, pas un produit.',
    }
  },
} satisfies Record<string, Gabarit>

// --- Génération ---

type CleReg = 'fournitures' | 'assurance' | 'loyer' | 'amortissement' | 'interets' | 'salaires' | 'avance' | 'nonFacture'
const ordreRegs: CleReg[] = ['fournitures', 'assurance', 'loyer', 'amortissement', 'interets', 'salaires', 'avance', 'nonFacture']

// Comptes toujours au plan comptable, même s'ils ne servent pas: on doit choisir le bon parmi
// des voisins (Loyer ou Loyer payé d'avance, Salaires ou Salaires à payer).
const planDeBase = [
  'encaisse',
  'clients',
  'fournitures-bureau',
  'assurance-payee-avance',
  'loyer-paye-avance',
  'equipement',
  'amortissement-cumule',
  'fournisseurs',
  'salaires-payer',
  'interets-payer',
  'produits-percus-avance',
  'effet-payer-lt',
  'capital',
  'apports',
  'retraits',
  'services-rendus',
  'salaires',
  'loyer',
  'publicite',
  'electricite',
  'telecommunication',
  'entretien-reparation',
  'fournitures-bureau-utilisees',
  'assurances',
  'amortissement',
  'interets-debiteurs',
]

const rangCompte = Object.fromEntries(comptes.map((c, i) => [c.id, i])) as Record<string, number>

export function trier(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((x, y) => rangCompte[x] - rangCompte[y])
}

export type Depart = 'hasard' | 'premier' | 'existante'

export function generer(longueur: Longueur, depart: Depart = 'hasard'): Scenario {
  const premier = depart === 'premier' || (depart === 'hasard' && Math.random() < 0.4)
  for (let i = 0; i < 500; i++) {
    const sc = essayer(longueur, premier)
    if (sc) return sc
  }
  throw new Error('Impossible de générer une simulation.')
}

function essayer(longueur: Longueur, premier: boolean): Scenario | null {
  const courte = longueur === 'courte'
  const proprio = un(proprietaires)
  const mois = entier(0, 11)
  const annee = new Date().getFullYear()
  const dernier = new Date(annee, mois + 1, 0).getDate()
  const cl = melanger(clients)
  const fo = melanger(fournisseurs)
  const ctx: Ctx = {
    proprio,
    mois,
    dernier,
    clientDu: cl.pop()!,
    fournisseurDu: fo.pop()!,
    clients: cl,
    fournisseurs: fo,
    ouvClients: entier(2000, 5000, 100),
    ouvFournisseurs: entier(1200, 3000, 100),
    paie: 0,
    premier,
    ventes: [],
    achats: [],
    equipement: { cout: 0, apporte: courte || Math.random() < 0.5 },
    // Le premier mois, l'assurance est une police de 12 mois payée pendant le mois.
    assurance: { mois: premier ? 12 : entier(5, 11), mens: entier(60, 180, 5) },
    effet: { capital: un(premier ? [6000, 12000, 18000] : [6000, 12000]), taux: un([3, 4, 5, 6, 8]) },
  }
  const amort = { mens: un([100, 125, 150, 175, 200, 250]), ans: entier(3, 5), residuelle: entier(1000, 4000, 500), ecoules: premier ? 0 : entier(5, 30) }
  const cout = amort.residuelle + 12 * amort.ans * amort.mens
  ctx.equipement.cout = cout
  const { assurance, effet } = ctx

  const loyer = un([g.loyerMois, g.loyerAvance])
  const services = un([g.servicesComptant, g.servicesMixte])
  // Le premier mois, l'assurance et l'emprunt arrivent par une transaction plutôt que par un solde d'ouverture.
  const avecAssurance = premier && Math.random() < (courte ? 0.3 : 0.5)
  const avecEmprunt = premier && Math.random() < (courte ? 0.3 : 0.5)
  let base: Gabarit[]
  let extras: Gabarit[]
  if (premier) {
    base = [
      g.fondation,
      ...(ctx.equipement.apporte ? [] : [g.achatEquipement]),
      ...(avecEmprunt ? [g.emprunt] : []),
      ...(avecAssurance ? [g.assurancePolice] : []),
      g.fournituresCredit,
      g.servicesCredit,
      g.salaires,
      g.retrait,
      g.encaissementClient,
      ...(courte ? [] : [loyer, services, g.paiementFournisseur]),
    ]
    extras = melanger([g.electriciteCredit, g.telecom, g.publicite, g.entretienCredit, g.achatImmo, g.avanceClient, ...(courte ? [loyer, services] : [])])
  } else {
    base = courte
      ? [g.servicesCredit, g.encaissementClient, g.salaires, g.retrait]
      : [g.servicesCredit, services, g.encaissementClient, g.paiementFournisseur, g.fournituresCredit, loyer, g.salaires, g.retrait]
    extras = melanger([
      g.apport,
      g.electriciteCredit,
      g.telecom,
      g.publicite,
      g.entretienCredit,
      g.achatImmo,
      g.avanceClient,
      ...(courte ? [loyer, services, g.paiementFournisseur, g.fournituresCredit] : []),
    ])
  }
  const cible = premier ? (courte ? 8 : 12) : courte ? 6 : 10
  const choisis = [...base, ...extras.slice(0, Math.max(0, cible - base.length))]
  // Les paiements de factures passent en dernier: ils ont besoin du jour de leur facture.
  const dependants: Gabarit[] = [g.encaissementClient, g.paiementFournisseur]
  const brouillons: Brouillon[] = []
  for (const f of [...choisis.filter(f => !dependants.includes(f)), ...choisis.filter(f => dependants.includes(f))]) {
    const b = f(ctx)
    if (!b) return null
    if (!b.jour) b.jour = entier(premier ? 4 : 2, dernier - 2)
    brouillons.push(b)
  }
  brouillons.sort((x, y) => x.jour - y.jour)
  const transactions: Operation[] = brouillons.map((b, i) => ({ ...b, ref: String(i + 1) }))

  // Les régularisations liées à une transaction du mois sont obligatoires.
  const obligatoires: CleReg[] = ['fournitures', 'amortissement']
  if (ctx.loyerAvance) obligatoires.push('loyer')
  if (ctx.avance) obligatoires.push('avance')
  if (avecAssurance) obligatoires.push('assurance')
  if (avecEmprunt) obligatoires.push('interets')
  const optionnelles = melanger<CleReg>(premier ? ['salaires', 'nonFacture'] : ['assurance', 'interets', 'salaires', 'nonFacture'])
  const choisies = new Set([...obligatoires, ...optionnelles.slice(0, Math.max(0, (courte ? 3 : 4) - obligatoires.length))])
  const cles = ordreRegs.filter(k => choisies.has(k))

  // Soldes d'ouverture: le mois passé de la même entreprise, après clôture. Le premier mois, il n'y en a pas.
  const ouv: Soldes = premier ? { encaisse: 0 } : {
    encaisse: entier(6000, 12000, 500),
    clients: ctx.ouvClients,
    'fournitures-bureau': entier(200, 700, 10),
    equipement: cout,
    'amortissement-cumule': -amort.mens * amort.ecoules,
    fournisseurs: -ctx.ouvFournisseurs,
  }
  if (!premier && cles.includes('assurance')) ouv['assurance-payee-avance'] = assurance.mois * assurance.mens
  if (!premier && cles.includes('interets')) ouv['effet-payer-lt'] = -effet.capital

  // L'encaisse ne doit jamais passer sous zéro pendant le mois.
  let caisse = ouv.encaisse
  let min = premier ? Infinity : caisse
  for (const t of transactions)
    for (const l of t.lignes)
      if (l.compte === 'encaisse') {
        caisse += l.cote === 'd' ? l.montant : -l.montant
        min = Math.min(min, caisse)
      }
  if (min < 500) {
    if (premier) return null
    ouv.encaisse += Math.ceil((500 - min) / 1000) * 1000
  }
  if (!premier) {
    const net = Object.values(ouv).reduce((s, n) => s + n, 0)
    if (net < 5000) return null
    ouv.capital = -net
  }

  const apresTransactions = appliquer({ ...ouv }, transactions.flatMap(t => t.lignes))
  const fin = { jour: dernier }
  const moisSuivant = nomMois(mois + 1)

  const regs: Record<CleReg, () => Brouillon> = {
    fournitures: () => {
      const solde = apresTransactions['fournitures-bureau']
      let reste = entier(arrondir(solde * 0.25, 10), arrondir(solde * 0.6, 10), 10)
      if (reste * 2 === solde) reste += 10
      return {
        ...fin,
        texte: `Le décompte du ${dernier} ${nomMois(mois)} montre ${argent(reste)} de fournitures de bureau encore en main.`,
        libelle: 'Fournitures utilisées',
        calcul: `${nb(solde)} − ${nb(reste)} = ${argent(solde - reste)} utilisées`,
        lignes: [D('fournitures-bureau-utilisees', solde - reste), C('fournitures-bureau', solde - reste)],
        idee: 'Le décompte donne ce qui reste, pas ce qui a été utilisé. Ce qui a été utilisé, c’est le solde du compte moins ce qui reste. Cette partie devient une charge.',
      }
    },
    assurance: () => ({
      ...fin,
      texte: premier
        ? `La police d’assurance de 12 mois, payée ${argent(assurance.mois * assurance.mens)}, a commencé le 1er ${nomMois(mois)}.`
        : `Le solde d’ouverture d’Assurance payée d’avance, ${argent(assurance.mois * assurance.mens)}, couvre les ${assurance.mois} mois à partir du 1er ${nomMois(mois)}.`,
      libelle: 'Assurance expirée',
      calcul: `${nb(assurance.mois * assurance.mens)} ÷ ${assurance.mois} mois = ${argent(assurance.mens)} par mois`,
      lignes: [D('assurances', assurance.mens), C('assurance-payee-avance', assurance.mens)],
      idee: 'Un mois d’assurance est passé. Cette partie est consommée, donc elle devient une charge. Le reste est encore payé d’avance.',
    }),
    loyer: () => {
      const { total, n } = ctx.loyerAvance!
      return {
        ...fin,
        texte: `Le mois ${deMois(mois)} est passé: un des ${n} mois de loyer payés d’avance est utilisé.`,
        libelle: 'Loyer utilisé',
        calcul: `${nb(total)} ÷ ${n} mois = ${argent(total / n)}`,
        lignes: [D('loyer', total / n), C('loyer-paye-avance', total / n)],
        idee: 'Le mois passé est consommé: il devient une charge. Les autres mois restent payés d’avance.',
      }
    },
    amortissement: () => ({
      ...fin,
      texte: `${premier && ctx.equipement.apporte ? `L’équipement apporté par ${proprio} vaut ${argent(cout)}.` : `L’équipement a coûté ${argent(cout)}.`} On prévoit le garder ${amort.ans} ans, puis le revendre ${argent(amort.residuelle)}. On l’amortit de façon linéaire.${ctx.immo ? ' Les autres immobilisations achetées ce mois-ci seront amorties à partir du mois prochain.' : ''}`,
      libelle: 'Amortissement du mois',
      calcul: `(${nb(cout)} − ${nb(amort.residuelle)}) ÷ (${amort.ans} ans × 12 mois) = ${argent(amort.mens)} par mois`,
      lignes: [D('amortissement', amort.mens), C('amortissement-cumule', amort.mens)],
      idee: 'On amortit seulement ce qu’on ne récupérera pas à la revente, et seulement pour un mois. L’usure est une charge. On ne touche pas au compte Équipement: on crédite Amortissement cumulé – Équipement, un contre-actif.',
    }),
    interets: () => {
      const i = (effet.capital * effet.taux) / 1200
      return {
        ...fin,
        texte: `L’effet à payer de ${argent(effet.capital)} porte intérêt à ${effet.taux} % par année. Les intérêts du mois seront payés plus tard.`,
        libelle: 'Intérêts courus',
        calcul: `${nb(effet.capital)} × ${effet.taux} % × 1/12 = ${argent(i)}`,
        lignes: [D('interets-debiteurs', i), C('interets-payer', i)],
        idee: 'Les intérêts du mois sont une charge de ce mois-ci, même s’ils ne sont pas encore payés. On les doit: c’est un passif.',
      }
    },
    salaires: () => {
      let m = entier(1500, 3200, 50)
      if (m === ctx.paie) m += 50
      return {
        ...fin,
        texte: `Les employés ont travaillé du 16 au ${dernier}. Leur paie, ${argent(m)}, sera versée le ${dateTexte(entier(1, 5), mois + 1)}.`,
        libelle: 'Salaires courus',
        lignes: [D('salaires', m), C('salaires-payer', m)],
        idee: 'Le travail a été fait ce mois-ci, donc c’est une charge de ce mois-ci. On le doit encore aux employés: c’est un passif.',
      }
    },
    avance: () => {
      const { total, n, client } = ctx.avance!
      return {
        ...fin,
        texte: `Le premier des ${n} mois du contrat ${de(client)} est terminé.`,
        libelle: 'Produit perçu d’avance gagné',
        calcul: `${nb(total)} ÷ ${n} mois = ${argent(total / n)}`,
        lignes: [D('produits-percus-avance', total / n), C('services-rendus', total / n)],
        idee: 'Ce mois de travail est fait. La dette envers le client diminue, et cette partie devient un produit gagné.',
      }
    },
    nonFacture: () => {
      const m = entier(600, 1800, 50)
      return {
        ...fin,
        texte: `Le ${dernier}, on termine un travail pour ${ctx.clients.pop()!}. La facture de ${argent(m)} partira seulement en ${moisSuivant}.`,
        libelle: 'Services rendus non facturés',
        lignes: [D('clients', m), C('services-rendus', m)],
        idee: 'Le travail est fait ce mois-ci, donc le produit appartient à ce mois-ci, même si la facture part plus tard. Le client nous doit ce montant.',
      }
    },
  }
  const regularisations: Operation[] = cles.map((k, i) => ({ ...regs[k](), ref: String.fromCharCode(97 + i) }))
  const sa = appliquer({ ...apresTransactions }, regularisations.flatMap(r => r.lignes))

  const ids = trier(Object.keys(sa)).filter(id => sa[id] !== 0)
  const produits = ids.filter(id => familleId(id) === 'produits')
  const charges = ids.filter(id => familleId(id) === 'charges')
  const totalProduits = -produits.reduce((s, id) => s + sa[id], 0)
  const totalCharges = charges.reduce((s, id) => s + sa[id], 0)
  if (totalProduits - totalCharges < 500) return null

  const cloture: Brouillon[] = [
    {
      ...fin,
      texte: 'Remets les comptes de produits à zéro et verse leur total dans le capital.',
      libelle: 'Clôture des produits',
      calcul: produits.length > 1 ? `${produits.map(id => nb(-sa[id])).join(' + ')} = ${argent(totalProduits)}` : undefined,
      lignes: [...produits.map(id => D(id, -sa[id])), C('capital', totalProduits)],
      idee: 'Un produit a un solde créditeur. Pour le remettre à zéro, on le débite du même montant. Le total va au crédit du capital: les produits font grossir la part du propriétaire.',
    },
    {
      ...fin,
      texte: 'Remets les comptes de charges à zéro et retire leur total du capital.',
      libelle: 'Clôture des charges',
      calcul: `${charges.map(id => nb(sa[id])).join(' + ')} = ${argent(totalCharges)}`,
      lignes: [D('capital', totalCharges), ...charges.map(id => C(id, sa[id]))],
      idee: 'Une charge a un solde débiteur. Pour la remettre à zéro, on la crédite du même montant. Le total va au débit du capital: les charges diminuent la part du propriétaire.',
    },
  ]
  if (sa.apports) {
    cloture.push({
      ...fin,
      texte: 'Remets le compte Apports à zéro et verse son solde dans le capital.',
      libelle: 'Clôture des apports',
      lignes: [D('apports', -sa.apports), C('capital', -sa.apports)],
      idee: 'Apports a un solde créditeur. On le débite pour le remettre à zéro, et le capital augmente du même montant.',
    })
  }
  cloture.push({
    ...fin,
    texte: 'Remets le compte Retraits à zéro et retire son solde du capital.',
    libelle: 'Clôture des retraits',
    lignes: [D('capital', sa.retraits), C('retraits', sa.retraits)],
    idee: 'Retraits a un solde débiteur. On le crédite pour le remettre à zéro, et le capital diminue du même montant.',
  })

  const utilises = [...Object.keys(ouv), ...[...transactions, ...regularisations].flatMap(o => o.lignes.map(l => l.compte))]
  const plan = trier([...planDeBase, ...utilises])
  return {
    entreprise: `${un(activites)} ${proprio.split(' ').slice(1).join(' ')}`,
    proprio,
    premierMois: premier,
    mois,
    annee,
    dernierJour: dernier,
    plan,
    ouverture: plan.filter(id => ouv[id]).map(id => (ouv[id] > 0 ? D(id, ouv[id]) : C(id, -ouv[id]))),
    transactions,
    regularisations,
    cloture: cloture.map((c, i) => ({ ...c, ref: `C${i + 1}` })),
  }
}

// --- Tâches ---

export type PhaseId = 'journal' | 'grand-livre' | 'balance' | 'regularisations' | 'balance-reg' | 'etats' | 'cloture' | 'apres-cloture'
export type EtatFin = 'resultats' | 'capitaux' | 'bilan'

export const phases: { id: PhaseId; nom: string; court: string; description: string; aide: [string, string][] }[] = [
  {
    id: 'journal',
    nom: 'Journal général',
    court: 'Journal',
    description: 'Pour chaque transaction, trouve les comptes touchés, puis inscris le débit et le crédit au journal.',
    aide: [
      ['CAR PPP', 'car-pcp'],
      ['Des exemples d’écritures', 'ecritures'],
      ['Indices dans le nom', 'indices'],
    ],
  },
  {
    id: 'grand-livre',
    nom: 'Grand livre',
    court: 'Grand livre',
    description: 'Chaque montant du journal est copié dans son compte, du même côté. Ensuite, on calcule le solde de chaque compte.',
    aide: [['Débit et crédit', 'debit-credit']],
  },
  {
    id: 'balance',
    nom: 'Balance de vérification',
    court: 'Balance',
    description: 'La liste des soldes du grand livre. Le total des débits doit égaler le total des crédits.',
    aide: [['Le cycle comptable', 'cycle']],
  },
  {
    id: 'regularisations',
    nom: 'Régularisations',
    court: 'Régularisations',
    description: 'À la fin du mois, on met à jour les comptes qui ne le sont plus. On les inscrit au journal, puis on les reporte au grand livre.',
    aide: [
      ['Les régularisations', 'regularisations'],
      ['Les pièges fréquents', 'pieges'],
    ],
  },
  {
    id: 'balance-reg',
    nom: 'Balance régularisée',
    court: 'Balance régularisée',
    description: 'Les soldes après les régularisations. Ce sont eux qui servent aux états financiers.',
    aide: [['Le cycle comptable', 'cycle']],
  },
  {
    id: 'etats',
    nom: 'États financiers',
    court: 'États',
    description: 'L’état des résultats, l’état des capitaux propres, puis le bilan. Chacun donne un chiffre au suivant.',
    aide: [
      ['Les états financiers', 'etats'],
      ['Les contre-comptes', 'contre-comptes'],
    ],
  },
  {
    id: 'cloture',
    nom: 'Écritures de clôture',
    court: 'Clôture',
    description: 'On remet à zéro les produits, les charges, les apports et les retraits. Leur effet passe dans le capital.',
    aide: [['Le cycle comptable', 'cycle']],
  },
  {
    id: 'apres-cloture',
    nom: 'Balance après clôture',
    court: 'Après clôture',
    description: 'Il ne reste que les comptes du bilan. C’est la dernière vérification avant le mois suivant.',
    aide: [['Le cycle comptable', 'cycle']],
  },
]

export const phaseParId = Object.fromEntries(phases.map(p => [p.id, p])) as Record<PhaseId, (typeof phases)[number]>

export type Tache =
  | { type: 'ecriture'; phase: PhaseId; op: Operation }
  | { type: 'report'; phase: PhaseId; op: Operation }
  | { type: 'solde'; phase: PhaseId; compte: string }
  | { type: 'balance'; phase: PhaseId }
  | { type: 'etat'; phase: PhaseId; etat: EtatFin }

export function taches(sc: Scenario): Tache[] {
  const t: Tache[] = []
  const groupe = (ops: Operation[], phaseEcriture: PhaseId, phaseReport: PhaseId, soldes: string[]) => {
    for (const op of ops) t.push({ type: 'ecriture', phase: phaseEcriture, op })
    for (const op of ops) t.push({ type: 'report', phase: phaseReport, op })
    for (const compte of soldes) t.push({ type: 'solde', phase: phaseReport, compte })
  }
  const touches = (ops: Operation[]) => trier(ops.flatMap(o => o.lignes.map(l => l.compte)))
  groupe(sc.transactions, 'journal', 'grand-livre', touches(sc.transactions))
  t.push({ type: 'balance', phase: 'balance' })
  groupe(sc.regularisations, 'regularisations', 'regularisations', touches(sc.regularisations))
  t.push({ type: 'balance', phase: 'balance-reg' })
  for (const etat of ['resultats', 'capitaux', 'bilan'] as const) t.push({ type: 'etat', phase: 'etats', etat })
  // Après la clôture, les comptes temporaires sont à zéro: seul le capital a un nouveau solde à calculer.
  groupe(sc.cloture, 'cloture', 'cloture', ['capital'])
  t.push({ type: 'balance', phase: 'apres-cloture' })
  return t
}

export interface Inscription {
  ref: string
  cote: Cote
  montant: number
}

export interface Situation {
  soldes: Soldes
  grandLivre: Record<string, Inscription[]>
  // Index de la dernière tâche de report qui a touché le compte (-1 pour l'ouverture).
  dernierReport: Record<string, number>
}

// Le grand livre après les tâches 0 à `jusqua - 1`.
export function situation(sc: Scenario, ts: Tache[], jusqua: number): Situation {
  const soldes = appliquer({}, sc.ouverture)
  const grandLivre: Record<string, Inscription[]> = {}
  const dernierReport: Record<string, number> = {}
  for (const l of sc.ouverture) {
    grandLivre[l.compte] = [{ ref: 'Ouv.', cote: l.cote, montant: l.montant }]
    dernierReport[l.compte] = -1
  }
  for (let i = 0; i < Math.min(jusqua, ts.length); i++) {
    const t = ts[i]
    if (t.type !== 'report') continue
    appliquer(soldes, t.op.lignes)
    for (const l of t.op.lignes) {
      ;(grandLivre[l.compte] ??= []).push({ ref: t.op.ref, cote: l.cote, montant: l.montant })
      dernierReport[l.compte] = i
    }
  }
  return { soldes, grandLivre, dernierReport }
}

export function totalBalance(soldes: Soldes): number {
  return Object.values(soldes).reduce((s, n) => s + Math.max(n, 0), 0)
}

export interface Chiffres {
  produits: { id: string; montant: number }[]
  charges: { id: string; montant: number }[]
  actifs: { id: string; montant: number }[]
  passifs: { id: string; montant: number }[]
  totalProduits: number
  totalCharges: number
  benefice: number
  debut: number
  // Le premier mois, la mise de fonds qui lance l'entreprise va au crédit du capital.
  miseDeFonds: number
  apports: number
  retraits: number
  fin: number
  totalActifs: number
  totalPassifs: number
}

// Les chiffres des états financiers, tirés de la balance régularisée.
export function chiffres(sc: Scenario, soldes: Soldes): Chiffres {
  const ids = sc.plan.filter(id => soldes[id])
  const de = (f: FamilleId, signe: number) => ids.filter(id => familleId(id) === f).map(id => ({ id, montant: signe * soldes[id] }))
  const produits = de('produits', -1)
  const charges = de('charges', 1)
  const actifs = de('actifs', 1)
  const passifs = de('passifs', -1)
  const somme = (l: { montant: number }[]) => l.reduce((s, x) => s + x.montant, 0)
  const totalProduits = somme(produits)
  const totalCharges = somme(charges)
  const benefice = totalProduits - totalCharges
  const capital = soldes.capital ? -soldes.capital : 0
  const debut = sc.premierMois ? 0 : capital
  const miseDeFonds = sc.premierMois ? capital : 0
  const apports = soldes.apports ? -soldes.apports : 0
  const retraits = soldes.retraits ?? 0
  return {
    produits,
    charges,
    actifs,
    passifs,
    totalProduits,
    totalCharges,
    benefice,
    debut,
    miseDeFonds,
    apports,
    retraits,
    fin: debut + miseDeFonds + apports + benefice - retraits,
    totalActifs: somme(actifs),
    totalPassifs: somme(passifs),
  }
}

export interface Champ {
  id: string
  nom: string
  attendu: number
}

export function champsEtat(sc: Scenario, etat: EtatFin, ch: Chiffres): Champ[] {
  const m = nomMois(sc.mois)
  if (etat === 'resultats')
    return [
      { id: 'produits', nom: 'Total des produits', attendu: ch.totalProduits },
      { id: 'charges', nom: 'Total des charges', attendu: ch.totalCharges },
      { id: 'benefice', nom: 'Bénéfice net', attendu: ch.benefice },
    ]
  if (etat === 'capitaux')
    return [
      { id: 'debut', nom: `Capital au 1er ${m}`, attendu: ch.debut },
      ...(ch.miseDeFonds ? [{ id: 'mise', nom: 'Plus: mise de fonds initiale', attendu: ch.miseDeFonds }] : []),
      ...(ch.apports ? [{ id: 'apports', nom: 'Plus: apports', attendu: ch.apports }] : []),
      { id: 'benefice', nom: 'Plus: bénéfice net', attendu: ch.benefice },
      { id: 'retraits', nom: 'Moins: retraits', attendu: ch.retraits },
      { id: 'fin', nom: `Capital au ${sc.dernierJour} ${m}`, attendu: ch.fin },
    ]
  return [
    { id: 'actifs', nom: 'Total de l’actif', attendu: ch.totalActifs },
    { id: 'passifs', nom: 'Total du passif', attendu: ch.totalPassifs },
    { id: 'total', nom: 'Total du passif et des capitaux propres', attendu: ch.totalPassifs + ch.fin },
  ]
}

// --- Saisie et vérification ---

export interface LigneSaisie {
  compte: string
  d: string
  c: string
}

export interface Saisie {
  lignes?: LigneSaisie[]
  cotes?: (Cote | null)[]
  montant?: string
  cote?: Cote | null
  champs?: Record<string, string>
}

export interface Retour {
  ok: boolean
  messages: string[]
  // Une case par ligne ou par champ: vrai si bon, faux si mauvais, absent si vide.
  lignes?: (boolean | null)[]
  champs?: Record<string, boolean>
}

export function saisieVide(t: Tache): Saisie {
  if (t.type === 'ecriture') return { lignes: [0, 1].map(() => ({ compte: '', d: '', c: '' })) }
  if (t.type === 'report') return { cotes: t.op.lignes.map(() => null) }
  if (t.type === 'solde') return { montant: '', cote: null }
  return { champs: {} }
}

// Lit un nombre: « 1500 », « 1 500 », « 1,500 », « 1 500,00 », « 0,05 », « 1.14975 ».
// Une virgule ou un point suivi d'exactement trois chiffres sépare les milliers.
function lireNombre(t: string): number {
  const virgule = t.includes(',')
  const point = t.includes('.')
  if (virgule && point) {
    // Le dernier des deux est la décimale: « 1,500.50 » ou « 1.500,50 ».
    const dec = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.'
    const [ent, frac, ...reste] = t.split(dec)
    if (reste.length || !/^\d{1,3}([.,]\d{3})*$/.test(ent)) return NaN
    return Number(`${ent.replace(/[.,]/g, '')}.${frac}`)
  }
  if (/^[1-9]\d{0,2}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ''))
  if (/^\d*([.,]\d+)?$/.test(t) && /\d/.test(t)) return Number(t.replace(',', '.'))
  return NaN
}

// Lit un montant, qui peut être un calcul: « 500 + 700 », « 500 * 0,05 », « 1000 / 1,14975 ».
// Le résultat est arrondi au cent. Vide donne null, et ce qui ne se lit pas donne NaN.
export function lireMontant(texte: string): number | null {
  const t = texte.replace(/[\s  $]/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
  if (!t) return null
  const jetons = t.match(/[\d.,]+|[-+*/()]|./g) ?? []
  let i = 0
  const somme = (): number => {
    let v = produit()
    while (jetons[i] === '+' || jetons[i] === '-') v = jetons[i++] === '+' ? v + produit() : v - produit()
    return v
  }
  const produit = (): number => {
    let v = facteur()
    while (jetons[i] === '*' || jetons[i] === '/') {
      const op = jetons[i++]
      const w = facteur()
      v = op === '*' ? v * w : w === 0 ? NaN : v / w
    }
    return v
  }
  const facteur = (): number => {
    const j = jetons[i++]
    if (j === '-') return -facteur()
    if (j === '+') return facteur()
    if (j === '(') {
      const v = somme()
      return jetons[i++] === ')' ? v : NaN
    }
    return j === undefined ? NaN : lireNombre(j)
  }
  const v = somme()
  if (i < jetons.length || !Number.isFinite(v)) return NaN
  return Math.round(v * 100) / 100
}

const sansDoublons = (l: string[]) => [...new Set(l)]

export function verifierEcriture(sc: Scenario, op: Operation, s: Saisie): Retour {
  const lignes = s.lignes ?? []
  const vides = lignes.map(l => !l.compte && !l.d.trim() && !l.c.trim())
  if (vides.every(Boolean)) return { ok: false, messages: ['Inscris au moins une ligne.'] }

  const incomplet: string[] = []
  const lues = lignes.map((l, i) => {
    if (vides[i]) return null
    const d = lireMontant(l.d)
    const c = lireMontant(l.c)
    if (!l.compte) incomplet.push('Choisis un compte sur chaque ligne.')
    if (Number.isNaN(d) || Number.isNaN(c)) incomplet.push('Écris les montants avec des chiffres, genre 1500 ou 500 + 700.')
    else if (d && c) incomplet.push('Une ligne va au débit ou au crédit, pas les deux.')
    else if (!d && !c) incomplet.push('Chaque ligne a besoin d’un montant.')
    return d ? { compte: l.compte, cote: 'd' as Cote, montant: d } : { compte: l.compte, cote: 'c' as Cote, montant: c ?? 0 }
  })
  if (incomplet.length) return { ok: false, messages: sansDoublons(incomplet) }

  const cle = (compte: string, cote: Cote) => `${compte}:${cote}`
  const attendu = new Map<string, number>()
  for (const l of op.lignes) attendu.set(cle(l.compte, l.cote), (attendu.get(cle(l.compte, l.cote)) ?? 0) + l.montant)
  const donne = new Map<string, number>()
  for (const l of lues) if (l) donne.set(cle(l.compte, l.cote), (donne.get(cle(l.compte, l.cote)) ?? 0) + l.montant)

  const messages: string[] = []
  for (const [k, m] of donne) {
    const [compte, cote] = k.split(':') as [string, Cote]
    const nom = nomCompte(sc, compte)
    if (!attendu.has(k)) {
      if (attendu.has(cle(compte, cote === 'd' ? 'c' : 'd'))) messages.push(`${nom} est du mauvais côté.`)
      else messages.push(`${nom} ne change pas dans cette opération.`)
    } else if (attendu.get(k) !== m) messages.push(`Le montant de ${nom} n’est pas bon.`)
  }
  const presents = new Set(lues.flatMap(l => (l ? [l.compte] : [])))
  const manquants = new Set(op.lignes.map(l => l.compte).filter(c => !presents.has(c))).size
  if (manquants) messages.push(manquants === 1 ? 'Il manque un compte.' : `Il manque ${manquants} comptes.`)
  const totD = lues.reduce((s, l) => s + (l?.cote === 'd' ? l.montant : 0), 0)
  const totC = lues.reduce((s, l) => s + (l?.cote === 'c' ? l.montant : 0), 0)
  if (Math.abs(totD - totC) > 0.001) messages.push(`Les débits (${argent(totD)}) n’égalent pas les crédits (${argent(totC)}).`)

  return {
    ok: messages.length === 0,
    messages,
    lignes: lues.map(l => (l ? attendu.get(cle(l.compte, l.cote)) === donne.get(cle(l.compte, l.cote)) : null)),
  }
}

export function verifierReport(op: Operation, s: Saisie): Retour {
  const cotes = s.cotes ?? []
  if (cotes.some(c => !c)) return { ok: false, messages: ['Place chaque montant dans son compte.'] }
  const lignes = op.lignes.map((l, i) => cotes[i] === l.cote)
  const faux = lignes.filter(x => !x).length
  return {
    ok: faux === 0,
    messages: faux === 0 ? [] : [faux === 1 ? 'Un montant est du mauvais côté.' : `${faux} montants sont du mauvais côté.`],
    lignes,
  }
}

export function verifierSolde(solde: number, s: Saisie): Retour {
  const m = lireMontant(s.montant ?? '')
  if (m === null) return { ok: false, messages: ['Écris le solde.'] }
  if (Number.isNaN(m)) return { ok: false, messages: ['Écris le montant avec des chiffres, genre 1500 ou 500 + 700.'] }
  if (m !== 0 && !s.cote) return { ok: false, messages: ['Choisis si le solde est débiteur ou créditeur.'] }
  const bonMontant = m === Math.abs(solde)
  const bonCote = solde === 0 || s.cote === (solde > 0 ? 'd' : 'c')
  const messages: string[] = []
  if (!bonMontant) messages.push('Le montant n’est pas bon.')
  if (!bonCote) messages.push('Le solde est du côté où le total est le plus gros.')
  return { ok: bonMontant && bonCote, messages, champs: { montant: bonMontant, cote: bonCote } }
}

export function verifierChamps(champs: Champ[], s: Saisie): Retour {
  const valeurs = champs.map(c => lireMontant(s.champs?.[c.id] ?? ''))
  if (valeurs.some(v => v === null)) return { ok: false, messages: [champs.length > 1 ? 'Remplis chaque case.' : 'Écris le total.'] }
  if (valeurs.some(v => Number.isNaN(v))) return { ok: false, messages: ['Écris les montants avec des chiffres, genre 1500 ou 500 + 700.'] }
  const bons = Object.fromEntries(champs.map((c, i) => [c.id, valeurs[i] === c.attendu]))
  const faux = champs.filter(c => !bons[c.id]).length
  return {
    ok: faux === 0,
    messages: faux === 0 ? [] : [champs.length === 1 ? 'Ce n’est pas le bon total.' : faux === 1 ? 'Un montant n’est pas bon.' : `${faux} montants ne sont pas bons.`],
    champs: bons,
  }
}

// Pourquoi chaque ligne est au débit ou au crédit.
const genre: Record<FamilleId, string> = {
  actifs: 'un actif',
  passifs: 'un passif',
  capitaux: 'un compte de capitaux propres',
  produits: 'un produit',
  charges: 'une charge',
  retraits: 'le R de CAR',
}

export function sens(sc: Scenario, l: Ligne): string {
  const c = compteParId[l.compte]
  const augmente = (l.cote === 'd') === (soldeDe(c) === 'debiteur')
  const quoi = c.contre ? 'un contre-actif' : genre[familleDe(c).id]
  return `${nomCompte(sc, l.compte)} ${augmente ? 'augmente' : 'diminue'}. C’est ${quoi}, donc ${l.cote === 'd' ? 'au débit' : 'au crédit'}.`
}

// --- Partie sauvegardée ---

export interface Stat {
  essais: number
  indices: number
  revele: boolean
}

export interface Partie {
  version: 1
  longueur: Longueur
  scenario: Scenario
  pos: number
  stats: Stat[]
  saisie: Saisie
  resolu: boolean
  retour: Retour | null
  debut: number
  fin?: number
}

const CLE = 'compta.pratique.v1'

export function nouvellePartie(sc: Scenario, longueur: Longueur): Partie {
  const ts = taches(sc)
  return {
    version: 1,
    longueur,
    scenario: sc,
    pos: 0,
    stats: ts.map(() => ({ essais: 0, indices: 0, revele: false })),
    saisie: saisieVide(ts[0]),
    resolu: false,
    retour: null,
    debut: Date.now(),
  }
}

export function lirePartie(): Partie | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Partie | null
    if (!p || p.version !== 1 || !p.scenario?.transactions || !Array.isArray(p.stats)) return null
    if (p.stats.length !== taches(p.scenario).length) return null
    return p
  } catch {
    return null
  }
}

export function sauverPartie(p: Partie | null) {
  try {
    if (p) localStorage.setItem(CLE, JSON.stringify(p))
    else localStorage.removeItem(CLE)
  } catch {
    // Navigation privée ou stockage plein: la partie continue sans être gardée.
  }
}
