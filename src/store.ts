import { cartes, familleDe, type FamilleId, type PaquetId } from './data'

export type Note = 'again' | 'hard' | 'good' | 'easy'
export type Filtre = Note | 'nouvelle'

export const notes: { id: Note; nom: string; touche: string }[] = [
  { id: 'again', nom: 'À revoir', touche: '1' },
  { id: 'hard', nom: 'Difficile', touche: '2' },
  { id: 'good', nom: 'Bien', touche: '3' },
  { id: 'easy', nom: 'Facile', touche: '4' },
]

export const noteNom = Object.fromEntries(notes.map(n => [n.id, n.nom])) as Record<Note, string>

export interface Suivi {
  note: Note
  vues: number
  date: number
}

const CLE_SUIVI = 'compta.suivi.v1'
const CLE_SESSION = 'compta.session.v1'
const CLE_CONFIG = 'compta.config.v1'

function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle)
    return brut ? (JSON.parse(brut) as T) : defaut
  } catch {
    return defaut
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    if (valeur === null) localStorage.removeItem(cle)
    else localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    // Navigation privée ou stockage plein: l'app marche quand même, sans mémoire.
  }
}

// --- Suivi des notes par carte ---

let suivi: Record<string, Suivi> = lire(CLE_SUIVI, {})

export function suiviDe(carteId: string): Suivi | undefined {
  return suivi[carteId]
}

export function noter(carteId: string, note: Note, nouvelleVue: boolean) {
  const ancien = suivi[carteId]
  suivi[carteId] = {
    note,
    vues: (ancien?.vues ?? 0) + (nouvelleVue ? 1 : 0),
    date: Date.now(),
  }
  ecrire(CLE_SUIVI, suivi)
}

export function effacerSuivi() {
  suivi = {}
  ecrire(CLE_SUIVI, suivi)
}

export function filtreDe(carteId: string): Filtre {
  return suivi[carteId]?.note ?? 'nouvelle'
}

// --- Configuration d'une session ---

export interface Config {
  paquets: PaquetId[]
  filtres: Filtre[]
  familles: FamilleId[]
  comptes?: string[]
  melanger: boolean
  ponderer: boolean
}

export const configParDefaut: Config = {
  paquets: ['categorie', 'solde', 'etat', 'chiffrier'],
  filtres: ['nouvelle', 'again', 'hard', 'good', 'easy'],
  familles: ['charges', 'actifs', 'retraits', 'passifs', 'capitaux', 'produits'],
  melanger: true,
  ponderer: true,
}

export function lireConfig(): Config {
  return { ...configParDefaut, ...lire<Partial<Config>>(CLE_CONFIG, {}), comptes: undefined }
}

export function sauverConfig(config: Config) {
  ecrire(CLE_CONFIG, { ...config, comptes: undefined })
}

export function cartesPour(config: Config): string[] {
  return cartes
    .filter(
      c =>
        config.paquets.includes(c.paquet.id) &&
        config.familles.includes(familleDe(c.compte).id) &&
        config.filtres.includes(filtreDe(c.id)) &&
        (!config.comptes || config.comptes.includes(c.compte.id)),
    )
    .map(c => c.id)
}

// --- Session en cours ---

export interface Passage {
  carte: string
  choix?: string
  revele: boolean
  note?: Note
  remise?: boolean
  // Copie ajoutée parce que la carte était difficile. Retirée si la carte est réussie avant.
  bonus?: boolean
}

export interface Session {
  passages: Passage[]
  pos: number
  config: Config
}

export function melanger<T>(liste: T[]): T[] {
  const copie = [...liste]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

// Plus le poids est grand, plus la carte a de chances de sortir tôt.
const poids: Record<Filtre, number> = { again: 8, nouvelle: 4, hard: 4, good: 2, easy: 1 }
const rang: Record<Filtre, number> = { again: 0, nouvelle: 1, hard: 2, good: 3, easy: 4 }
// Une copie bonus arrive au moins ce nombre de cartes après la première.
const ECART_BONUS = 5

// Chaque carte choisie sort au moins une fois. La pondération change seulement l'ordre
// et ajoute une deuxième copie des cartes À revoir et Difficile.
export function ordonner(ids: string[], melangerOrdre: boolean, ponderer: boolean): Passage[] {
  let ordre: string[]
  if (!ponderer) ordre = melangerOrdre ? melanger(ids) : [...ids]
  else if (melangerOrdre) {
    // Mélange pondéré: chaque carte reçoit une clé aléatoire tirée vers le haut par son poids.
    ordre = ids
      .map(id => ({ id, cle: Math.random() ** (1 / poids[filtreDe(id)]) }))
      .sort((a, b) => b.cle - a.cle)
      .map(x => x.id)
  } else ordre = [...ids].sort((a, b) => rang[filtreDe(a)] - rang[filtreDe(b)])

  const passages: Passage[] = ordre.map(carte => ({ carte, revele: false }))
  if (!ponderer) return passages

  for (const id of ordre) {
    const f = filtreDe(id)
    if (f !== 'again' && f !== 'hard') continue
    const premier = passages.findIndex(p => p.carte === id)
    const min = Math.min(premier + 1 + ECART_BONUS, passages.length)
    const ou = melangerOrdre ? min + Math.floor(Math.random() * (passages.length - min + 1)) : passages.length
    passages.splice(ou, 0, { carte: id, revele: false, bonus: true })
  }
  return passages
}

export function nouvelleSession(config: Config, ids = cartesPour(config), ponderer = config.ponderer): Session {
  return { passages: ordonner(ids, config.melanger, ponderer), pos: 0, config }
}

export function lireSession(): Session | null {
  const s = lire<Session | null>(CLE_SESSION, null)
  if (!s || !Array.isArray(s.passages)) return null
  return s
}

export function sauverSession(s: Session | null) {
  ecrire(CLE_SESSION, s)
}

// --- Sauvegarde ---

export function exporterSuivi(): string {
  return JSON.stringify({ app: 'compta', version: 1, date: new Date().toISOString(), suivi }, null, 1)
}

// Fusionne une sauvegarde: pour chaque carte, la note la plus récente gagne.
export function importerSuivi(texte: string): number {
  const donnees = JSON.parse(texte) as { app?: string; suivi?: Record<string, Suivi> }
  if (donnees.app !== 'compta' || typeof donnees.suivi !== 'object' || !donnees.suivi) {
    throw new Error('Ce fichier ne vient pas de ce site.')
  }
  let n = 0
  for (const [id, s] of Object.entries(donnees.suivi)) {
    if (!s || !notes.some(x => x.id === s.note)) continue
    if (!suivi[id] || suivi[id].date < s.date) {
      suivi[id] = { note: s.note, vues: Number(s.vues) || 1, date: Number(s.date) || Date.now() }
      n++
    }
  }
  ecrire(CLE_SUIVI, suivi)
  return n
}

export function toutLeSuivi(): Record<string, Suivi> {
  return suivi
}
