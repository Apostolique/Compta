import {
  categorieParId,
  etatParId,
  familleDe,
  familleParId,
  familles,
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

// Chaque famille garde la même couleur partout dans le site. Les classes sont écrites au
// complet pour que Tailwind les trouve.
export const couleurFamille: Record<FamilleId, { puce: string; bord: string; texte: string; fond: string; point: string }> = {
  charges: {
    puce: 'bg-rose-100 text-rose-900 ring-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800',
    bord: 'border-rose-400 dark:border-rose-700',
    texte: 'text-rose-700 dark:text-rose-300',
    fond: 'bg-rose-50 dark:bg-rose-950/40',
    point: 'bg-rose-500',
  },
  actifs: {
    puce: 'bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800',
    bord: 'border-sky-400 dark:border-sky-700',
    texte: 'text-sky-700 dark:text-sky-300',
    fond: 'bg-sky-50 dark:bg-sky-950/40',
    point: 'bg-sky-500',
  },
  retraits: {
    puce: 'bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-800',
    bord: 'border-violet-400 dark:border-violet-700',
    texte: 'text-violet-700 dark:text-violet-300',
    fond: 'bg-violet-50 dark:bg-violet-950/40',
    point: 'bg-violet-500',
  },
  passifs: {
    puce: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800',
    bord: 'border-amber-400 dark:border-amber-700',
    texte: 'text-amber-700 dark:text-amber-300',
    fond: 'bg-amber-50 dark:bg-amber-950/40',
    point: 'bg-amber-500',
  },
  capitaux: {
    puce: 'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800',
    bord: 'border-emerald-400 dark:border-emerald-700',
    texte: 'text-emerald-700 dark:text-emerald-300',
    fond: 'bg-emerald-50 dark:bg-emerald-950/40',
    point: 'bg-emerald-500',
  },
  produits: {
    puce: 'bg-lime-100 text-lime-900 ring-lime-300 dark:bg-lime-950 dark:text-lime-200 dark:ring-lime-800',
    bord: 'border-lime-500 dark:border-lime-700',
    texte: 'text-lime-700 dark:text-lime-300',
    fond: 'bg-lime-50 dark:bg-lime-950/40',
    point: 'bg-lime-500',
  },
}

export const couleurSolde: Record<SoldeId, string> = {
  debiteur: 'bg-indigo-600 text-white dark:bg-indigo-500',
  crediteur: 'bg-orange-600 text-white dark:bg-orange-500',
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
  return `<button type="button" data-action="fiche" data-id="${h(c.id)}" class="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-left text-[15px] ring-1 ring-slate-200 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800 ${extra}"><span class="size-2 shrink-0 rounded-full ${couleurFamille[f.id].point}"></span>${h(c.nom)}</button>`
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
      on ? `${couleurFamille[id].puce} ring-2` : 'text-slate-400 dark:text-slate-600'
    }">${h(f.lettre)}</a>`
  }
  const gauche = familles.filter(f => f.solde === 'debiteur').map(f => case_(f.id)).join('')
  const droite = familles.filter(f => f.solde === 'crediteur').map(f => case_(f.id)).join('')
  return `<div class="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">${gauche}<span class="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-600"></span>${droite}</div>`
}

// Une ligne qui relie les trois réponses d'un compte:
// catégorie · lettre CAR/PPP · solde habituel · état financier.
export function resume(c: Compte, focus?: PaquetId): string {
  const f = familleDe(c)
  const cat = categorieParId[c.categorie]
  const etat = etatParId[f.etat]
  const seg = (p: PaquetId | null, href: string, contenu: string) =>
    `<a href="${href}" class="${
      focus === p
        ? 'font-semibold text-slate-900 underline decoration-2 underline-offset-4 dark:text-white'
        : 'text-slate-600 hover:underline dark:text-slate-300'
    }">${contenu}</a>`
  const sep = '<span aria-hidden="true" class="text-slate-300 dark:text-slate-600">·</span>'
  return `<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-relaxed">
    ${seg('categorie', `#synthese/cat-${cat.id}`, h(cat.nom))} ${sep}
    ${seg(null, `#synthese/famille-${f.id}`, `<span class="font-bold ${couleurFamille[f.id].texte}">${h(f.lettre)}</span> de ${f.solde === 'debiteur' ? 'CAR' : 'PPP'}`)} ${sep}
    ${seg('solde', '#synthese/car-pcp', h(soldeParId[f.solde].nom))} ${sep}
    ${seg('etat', `#synthese/etat-${etat.id}`, h(etat.nom))}
  </p>`
}

export function pointNote(carteId: string): string {
  const s = suiviDe(carteId)
  if (!s) return `<span title="Jamais vue" class="inline-block size-2.5 rounded-full ring-1 ring-slate-300 dark:ring-slate-600"></span>`
  return `<span title="${h(noteNom[s.note])}" class="inline-block size-2.5 rounded-full ${couleurNote[s.note].point}"></span>`
}

export function montant(n: number): string {
  return `${n.toLocaleString('fr-CA')} $`
}
