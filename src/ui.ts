import {
  categorieParId,
  colonneDe,
  colonneParId,
  etatParId,
  familleDe,
  familleParId,
  familles,
  soldeDe,
  soldeParId,
  type Compte,
  type Famille,
  type FamilleId,
  type PaquetId,
  type SoldeId,
} from './data'
import { noteNom, suiviDe, type Note } from './store'

export function h(texte: string | number): string {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Chaque famille garde la même couleur partout dans le site. Les classes sont écrites au complet
// pour que Tailwind les trouve.
export const couleurFamille: Record<FamilleId, { puce: string; bord: string; texte: string; fond: string; point: string }> = {
  charges: {
    puce: 'bg-pink-100 text-pink-900 ring-pink-400 dark:bg-pink-500/20 dark:text-pink-200 dark:ring-pink-400/60',
    bord: 'border-pink-500 dark:border-pink-400',
    texte: 'text-pink-600 dark:text-pink-400',
    fond: 'bg-pink-50 dark:bg-pink-500/15',
    point: 'bg-pink-500 dark:bg-pink-400',
  },
  actifs: {
    puce: 'bg-cyan-100 text-cyan-900 ring-cyan-400 dark:bg-cyan-500/20 dark:text-cyan-200 dark:ring-cyan-400/60',
    bord: 'border-cyan-500 dark:border-cyan-400',
    texte: 'text-cyan-600 dark:text-cyan-400',
    fond: 'bg-cyan-50 dark:bg-cyan-500/15',
    point: 'bg-cyan-500 dark:bg-cyan-400',
  },
  retraits: {
    puce: 'bg-purple-100 text-purple-900 ring-purple-400 dark:bg-purple-500/20 dark:text-purple-200 dark:ring-purple-400/60',
    bord: 'border-purple-500 dark:border-purple-400',
    texte: 'text-purple-600 dark:text-purple-400',
    fond: 'bg-purple-50 dark:bg-purple-500/15',
    point: 'bg-purple-500 dark:bg-purple-400',
  },
  passifs: {
    puce: 'bg-yellow-100 text-yellow-900 ring-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-200 dark:ring-yellow-400/60',
    bord: 'border-yellow-500 dark:border-yellow-400',
    texte: 'text-yellow-600 dark:text-yellow-400',
    fond: 'bg-yellow-50 dark:bg-yellow-500/15',
    point: 'bg-yellow-500 dark:bg-yellow-400',
  },
  capitaux: {
    puce: 'bg-green-100 text-green-900 ring-green-400 dark:bg-green-500/20 dark:text-green-200 dark:ring-green-400/60',
    bord: 'border-green-500 dark:border-green-400',
    texte: 'text-green-600 dark:text-green-400',
    fond: 'bg-green-50 dark:bg-green-500/15',
    point: 'bg-green-500 dark:bg-green-400',
  },
  produits: {
    puce: 'bg-lime-100 text-lime-900 ring-lime-400 dark:bg-lime-500/20 dark:text-lime-200 dark:ring-lime-400/60',
    bord: 'border-lime-500 dark:border-lime-400',
    texte: 'text-lime-600 dark:text-lime-400',
    fond: 'bg-lime-50 dark:bg-lime-500/15',
    point: 'bg-lime-500 dark:bg-lime-400',
  },
}

export const couleurSolde: Record<SoldeId, string> = {
  debiteur: 'bg-teal-600 text-white',
  crediteur: 'bg-orange-600 text-white',
}

export const couleurNote: Record<Note, { bouton: string; point: string; texte: string }> = {
  again: {
    bouton: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    point: 'bg-red-500',
    texte: 'text-red-700 dark:text-red-400',
  },
  hard: {
    bouton: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700',
    point: 'bg-amber-500',
    texte: 'text-amber-700 dark:text-amber-400',
  },
  good: {
    bouton: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    point: 'bg-green-500',
    texte: 'text-green-700 dark:text-green-400',
  },
  easy: {
    bouton: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    point: 'bg-blue-500',
    texte: 'text-blue-700 dark:text-blue-400',
  },
}

export const puceBase = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset'

// Pastille neutre avec un point de la couleur de la famille. Plus calme qu'une pastille colorée.
export function puceCompte(c: Compte, extra = ''): string {
  const f = familleDe(c)
  return `<button type="button" data-action="fiche" data-id="${h(c.id)}" class="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-left text-[15px] ring-1 ring-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 dark:bg-neutral-900 dark:ring-neutral-700 dark:hover:bg-neutral-800 ${extra}"><span class="size-2 shrink-0 rounded-full ${couleurFamille[f.id].point}"></span>${h(c.nom)}</button>`
}

// Le nom de la famille avec sa lettre CAR/PPP en évidence: Charges, Capitaux Propres.
export function nomFamille(f: Famille): string {
  const i = f.indexLettre ?? 0
  return `${h(f.nom.slice(0, i))}<span class="font-black ${couleurFamille[f.id].texte}">${h(f.lettre)}</span>${h(f.nom.slice(i + 1))}`
}

export function badgeSolde(id: SoldeId, petit = false): string {
  const s = soldeParId[id]
  const fleche = id === 'debiteur' ? '← ' : ''
  const flecheD = id === 'crediteur' ? ' →' : ''
  return `<span class="inline-flex items-center rounded-md ${petit ? 'px-1.5 text-xs' : 'px-2 py-0.5 text-sm'} font-semibold ${couleurSolde[id]}">${fleche}${h(s.nom)}${flecheD}</span>`
}

// Petit schéma C A R | P P P avec la lettre du compte allumée.
export function miniCarPpp(actif: FamilleId): string {
  const case_ = (id: FamilleId) => {
    const f = familleParId[id]
    const on = id === actif
    return `<a href="#synthese/famille-${id}" title="${h(f.nom)}" class="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm font-bold ${
      on ? `${couleurFamille[id].puce} ring-2` : 'text-neutral-400 dark:text-neutral-600'
    }">${h(f.lettre)}</a>`
  }
  const gauche = familles.filter(f => f.solde === 'debiteur').map(f => case_(f.id)).join('')
  const droite = familles.filter(f => f.solde === 'crediteur').map(f => case_(f.id)).join('')
  return `<div class="inline-flex items-center gap-0.5 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">${gauche}<span class="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-600"></span>${droite}</div>`
}

// Une ligne qui relie les réponses d'un compte:
// catégorie · lettre CAR/PPP · solde habituel · état financier (· colonne du chiffrier).
export function resume(c: Compte, focus?: PaquetId): string {
  const f = familleDe(c)
  const cat = categorieParId[c.categorie]
  const etat = etatParId[f.etat]
  const solde = soldeDe(c)
  const seg = (p: PaquetId | null, href: string, contenu: string) =>
    `<a href="${href}" class="${
      focus === p
        ? 'font-semibold text-neutral-900 underline decoration-boost decoration-2 underline-offset-4 dark:text-white'
        : 'text-neutral-600 hover:underline dark:text-neutral-300'
    }">${contenu}</a>`
  const sep = '<span aria-hidden="true" class="text-neutral-300 dark:text-neutral-600">·</span>'
  return `<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-relaxed">
    ${seg('categorie', `#synthese/cat-${cat.id}`, h(cat.nom))} ${sep}
    ${seg(null, c.contre ? '#synthese/contre-comptes' : `#synthese/famille-${f.id}`, `${c.contre ? 'Contre-' : ''}<span class="font-bold ${couleurFamille[f.id].texte}">${h(f.lettre)}</span> de ${f.solde === 'debiteur' ? 'CAR' : 'PPP'}`)} ${sep}
    ${seg('solde', c.contre ? '#synthese/contre-comptes' : '#synthese/car-pcp', h(soldeParId[solde].nom))} ${sep}
    ${seg('etat', `#synthese/etat-${etat.id}`, h(etat.nom))}
    ${focus === 'chiffrier' ? `${sep} ${seg('chiffrier', '#synthese/colonnes-chiffrier', `Chiffrier: ${h(colonneParId[colonneDe(c)].nom)}`)}` : ''}
  </p>`
}

export function pointNote(carteId: string): string {
  const s = suiviDe(carteId)
  if (!s) return `<span title="Jamais vue" class="inline-block size-2.5 rounded-full ring-1 ring-neutral-300 dark:ring-neutral-600"></span>`
  return `<span title="${h(noteNom[s.note])}" class="inline-block size-2.5 rounded-full ${couleurNote[s.note].point}"></span>`
}

export function montant(n: number): string {
  return `${n.toLocaleString('fr-CA')} $`
}
