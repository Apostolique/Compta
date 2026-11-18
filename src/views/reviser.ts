import { carteParId, categorieParId, familleDe, familleParId, familles, paquetParId, paquets, type FamilleId, type PaquetId } from '../data'
import {
  cartesPour,
  configParDefaut,
  filtreDe,
  lireConfig,
  lireSession,
  noteNom,
  noter,
  notes,
  nouvelleSession,
  sauverConfig,
  sauverSession,
  type Config,
  type Filtre,
  type Note,
  type Session,
} from '../store'
import { couleurFamille, couleurNote, h, puceBase, resume } from '../ui'

let session: Session | null = lireSession()
let config: Config = lireConfig()
let reglages = false

// Une carte notée « À revoir » revient quelques cartes plus loin, comme dans Anki.
const ECART_REVOIR = 4

export function demarrer(c: Config) {
  const ids = cartesPour(c)
  session = nouvelleSession(c, ids)
  reglages = false
  sauverSession(session)
}

export function demarrerFamille(id: FamilleId) {
  demarrer({ ...configParDefaut, melanger: config.melanger, ponderer: config.ponderer, familles: [id] })
}

export function demarrerDifficiles() {
  demarrer({ ...config, filtres: ['again', 'hard'] })
}

export function demarrerCompte(id: string) {
  demarrer({ ...configParDefaut, comptes: [id], melanger: false, ponderer: false })
}

export function afficherReglages() {
  reglages = true
}

function enCours(): boolean {
  return !!session && session.passages.length > 0 && session.pos < session.passages.length
}

// --- Actions ---

export function choisir(option: string) {
  const p = session?.passages[session.pos]
  if (!p || p.revele) return
  p.choix = option
  p.revele = true
  sauverSession(session)
}

export function reveler() {
  const p = session?.passages[session.pos]
  if (!p || p.revele) return
  p.revele = true
  sauverSession(session)
}

export function noterCourante(note: Note) {
  if (!session) return
  const p = session.passages[session.pos]
  if (!p || !p.revele) return
  noter(p.carte, note, p.note === undefined)
  p.note = note
  const plusLoin = session.passages.slice(session.pos + 1)
  if (note === 'good' || note === 'easy') {
    // Réussie: la copie bonus prévue plus loin n'est plus utile.
    session.passages = [
      ...session.passages.slice(0, session.pos + 1),
      ...plusLoin.filter(x => !(x.bonus && x.carte === p.carte && !x.revele)),
    ]
  } else if (note === 'again' && !p.remise && !plusLoin.some(x => x.carte === p.carte && !x.revele)) {
    p.remise = true
    const ou = Math.min(session.pos + 1 + ECART_REVOIR, session.passages.length)
    session.passages.splice(ou, 0, { carte: p.carte, revele: false })
  }
  session.pos++
  sauverSession(session)
}

export function precedent() {
  if (session && session.pos > 0) {
    session.pos--
    sauverSession(session)
  }
}

export function suivant() {
  if (!session) return
  const p = session.passages[session.pos]
  if (p?.note) {
    session.pos++
    sauverSession(session)
  }
}

export function terminer() {
  if (!session) return
  session.pos = session.passages.length
  sauverSession(session)
}

export function recommencer(seulementDifficiles: boolean) {
  if (!session) return
  const derniere = new Map<string, Note | undefined>()
  for (const p of session.passages) derniere.set(p.carte, p.note ?? derniere.get(p.carte))
  const ids = [...derniere.entries()]
    .filter(([, n]) => !seulementDifficiles || n === 'again' || n === 'hard')
    .map(([id]) => id)
  if (ids.length === 0) return
  session = nouvelleSession(session.config, ids)
  sauverSession(session)
}

function basculer<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter(v => v !== valeur) : [...liste, valeur]
}

export function basculerReglage(type: string, valeur: string) {
  if (type === 'paquet') config.paquets = basculer(config.paquets, valeur as PaquetId)
  if (type === 'filtre') config.filtres = basculer(config.filtres, valeur as Filtre)
  if (type === 'famille') config.familles = basculer(config.familles, valeur as FamilleId)
  if (type === 'melanger') config.melanger = !config.melanger
  if (type === 'ponderer') config.ponderer = !config.ponderer
  if (type === 'tout-familles')
    config.familles = config.familles.length === familles.length ? [] : familles.map(f => f.id)
  sauverConfig(config)
}

export function demarrerReglagesOuReprendre(nouvelle: boolean) {
  if (nouvelle) demarrer(config)
  reglages = false
}

// --- Clavier ---

export function clavier(e: KeyboardEvent): boolean {
  if (!session || !enCours() || reglages) return false
  const p = session.passages[session.pos]
  const carte = carteParId[p.carte]
  if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
    precedent()
    return true
  }
  if (!p.revele) {
    const n = Number(e.key)
    if (n >= 1 && n <= carte.paquet.options.length) {
      choisir(carte.paquet.options[n - 1].id)
      return true
    }
    if (e.key === ' ' || e.key === 'Enter') {
      reveler()
      return true
    }
    return false
  }
  const note = notes.find(x => x.touche === e.key)
  if (note) {
    noterCourante(note.id)
    return true
  }
  if ((e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') && p.note) {
    suivant()
    return true
  }
  return false
}

// --- Rendu ---

const boutonBase = 'rounded-xl py-3 font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100'
const bouton = `${boutonBase} px-4`
const boutonSecondaire = `${bouton} bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`
const boutonPrincipal = `${bouton} bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200`
// Les boutons de la barre du bas ne rapetissent pas au toucher: sur iPhone, une barre fixe
// dont le contenu change pendant cette animation peut ne pas redessiner le texte.
const boutonBarre = 'rounded-xl py-3 font-semibold transition-colors'

export function reviserHtml(): string {
  if (!reglages && enCours()) return carteHtml(session!)
  if (!reglages && session && session.passages.length > 0 && session.pos >= session.passages.length) return finHtml(session)
  return reglagesHtml()
}

function puceBascule(actif: boolean, action: string, valeur: string, contenu: string): string {
  return `<button type="button" data-action="${action}" data-valeur="${h(valeur)}" aria-pressed="${actif}"
    class="${puceBase} px-3 py-1.5 ${actif ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white' : 'bg-white text-slate-500 ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700'}">${contenu}</button>`
}

function reglagesHtml(): string {
  const total = cartesPour(config).length
  const base = cartesPour({ ...config, filtres: ['nouvelle', 'again', 'hard', 'good', 'easy'] })
  const compte = (f: Filtre) => base.filter(id => filtreDe(id) === f).length
  const difficiles = cartesPour({ ...config, filtres: ['again', 'hard'] }).length
  const repetees = config.ponderer ? cartesPour(config).filter(id => ['again', 'hard'].includes(filtreDe(id))).length : 0
  const filtres: { id: Filtre; nom: string }[] = [{ id: 'nouvelle', nom: 'Jamais vues' }, ...notes.map(n => ({ id: n.id, nom: n.nom }))]
  const nbParPaquet = (id: PaquetId) => cartesPour({ ...config, paquets: [id] }).length

  const reprendre =
    session && enCours()
      ? `<button type="button" data-action="reprendre" class="flex w-full items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:ring-amber-900 dark:hover:bg-amber-950/70">
          <span><span class="block font-semibold">Reprendre où tu étais</span><span class="block text-sm text-slate-600 dark:text-slate-300">Carte ${session.pos + 1} sur ${session.passages.length}</span></span>
          <span aria-hidden="true" class="text-xl">›</span>
        </button>`
      : ''

  const paquetsHtml = paquets
    .map(p => {
      const actif = config.paquets.includes(p.id)
      return `<button type="button" data-action="reglage-paquet" data-valeur="${p.id}" aria-pressed="${actif}"
        class="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition ${actif ? 'bg-white ring-2 ring-slate-900 dark:bg-slate-900 dark:ring-white' : 'bg-white/60 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-800'}">
        <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-sm ${actif ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'ring-2 ring-slate-300 dark:ring-slate-600'}">${actif ? '✓' : ''}</span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">${h(p.nom)}</span>
          <span class="block text-sm text-slate-600 dark:text-slate-400">${h(p.question)}</span>
        </span>
        <span class="text-sm tabular-nums text-slate-500 dark:text-slate-400">${nbParPaquet(p.id)}</span>
      </button>`
    })
    .join('')

  return `<div class="mx-auto max-w-xl space-y-6 px-4 py-6 sm:py-10">
    ${reprendre}
    <div>
      <h1 class="text-2xl font-bold">Réviser</h1>
      <p class="mt-2 text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">Choisis un paquet, ou plusieurs.</p>
    </div>

    <div class="space-y-3">${paquetsHtml}</div>

    <div class="space-y-3">
      <button type="button" data-action="demarrer" ${total === 0 ? 'disabled' : ''} class="${boutonPrincipal} w-full text-lg">
        ${total === 0 ? 'Aucune carte avec ces choix' : `Commencer · ${total} carte${total > 1 ? 's' : ''}`}
      </button>
      ${repetees ? `<p class="text-center text-sm text-slate-500 dark:text-slate-400">${repetees} carte${repetees > 1 ? 's' : ''} difficile${repetees > 1 ? 's' : ''} reviendr${repetees > 1 ? 'ont' : 'a'} une deuxième fois.</p>` : ''}
      ${difficiles ? `<button type="button" data-action="demarrer-difficiles" class="${boutonSecondaire} w-full">Revoir seulement les difficiles · ${difficiles}</button>` : ''}
    </div>

    <details class="group">
      <summary class="flex cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" class="transition group-open:rotate-90">›</span> Plus d’options
      </summary>
      <div class="mt-4 space-y-6">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold text-slate-600 dark:text-slate-300">Selon ta dernière note</legend>
          <div class="flex flex-wrap gap-2">${filtres
            .map(f =>
              puceBascule(
                config.filtres.includes(f.id),
                'reglage-filtre',
                f.id,
                `${f.id !== 'nouvelle' ? `<span class="size-2 rounded-full ${couleurNote[f.id].point}"></span>` : ''}${h(f.nom)} <span class="tabular-nums opacity-70">${compte(f.id)}</span>`,
              ),
            )
            .join('')}</div>
        </fieldset>

        <fieldset class="space-y-2">
          <legend class="flex w-full items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Familles</span>
            <button type="button" data-action="reglage-tout-familles" class="font-normal underline underline-offset-4">${config.familles.length === familles.length ? 'Aucune' : 'Toutes'}</button>
          </legend>
          <div class="flex flex-wrap gap-2">${familles
            .map(f =>
              puceBascule(
                config.familles.includes(f.id),
                'reglage-famille',
                f.id,
                `<span class="size-2 rounded-full ${couleurFamille[f.id].point}"></span>${h(f.nom)}`,
              ),
            )
            .join('')}</div>
        </fieldset>

        <label class="flex items-start gap-3 text-[15px]">
          <input type="checkbox" data-action="reglage-ponderer" ${config.ponderer ? 'checked' : ''} class="mt-0.5 size-5 shrink-0 accent-slate-900 dark:accent-white">
          <span>Montrer plus souvent les cartes difficiles
            <span class="block text-sm text-slate-500 dark:text-slate-400">Les cartes À revoir et Difficile reviennent une deuxième fois, et les faciles passent à la fin. Toutes les cartes sortent quand même au moins une fois.</span>
          </span>
        </label>

        <label class="flex items-center gap-3 text-[15px]">
          <input type="checkbox" data-action="reglage-melanger" ${config.melanger ? 'checked' : ''} class="size-5 shrink-0 accent-slate-900 dark:accent-white">
          Mélanger les cartes
        </label>
      </div>
    </details>
  </div>`
}

function carteHtml(s: Session): string {
  const p = s.passages[s.pos]
  const carte = carteParId[p.carte]
  const { compte, paquet } = carte
  const bonne = paquet.reponse(compte)
  const f = familleDe(compte)
  const progression = Math.round((s.pos / s.passages.length) * 100)

  // Une fois la réponse affichée, on garde seulement la bonne réponse et le mauvais choix.
  // Les longues listes passent sur deux colonnes pour tenir dans l'écran d'un téléphone.
  const deuxColonnes = !p.revele && paquet.options.length > 4
  const options = paquet.options
    .filter(o => !p.revele || o.id === bonne || o.id === p.choix)
    .map(o => {
      const i = paquet.options.indexOf(o)
      let style = 'bg-white ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800'
      let marque = `<span class="hidden text-xs text-slate-400 sm:inline">${i + 1}</span>`
      if (p.revele) {
        if (o.id === bonne) {
          style = 'bg-green-50 ring-green-600 ring-2 text-green-900 dark:bg-green-950/60 dark:text-green-100 dark:ring-green-500'
          marque = '<span aria-hidden="true">✓</span>'
        } else {
          style = 'bg-red-50 ring-red-600 ring-2 text-red-900 line-through decoration-red-400 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-500'
          marque = '<span aria-hidden="true">✗</span>'
        }
      }
      const taille = deuxColonnes ? 'px-3 py-2.5 text-[15px] leading-snug sm:px-4 sm:py-3 sm:text-[17px]' : 'px-4 py-3 text-[17px]'
      return `<button type="button" data-action="choisir" data-valeur="${h(o.id)}" ${p.revele ? 'disabled' : ''}
        class="flex w-full items-center justify-between gap-2 rounded-xl text-left font-medium ring-1 transition active:scale-[0.99] ${taille} ${style}">
        <span>${h(o.nom)}</span>${marque}
      </button>`
    })
    .join('')

  let verdict = ''
  if (p.revele && p.choix) {
    verdict =
      p.choix === bonne
        ? '<p class="font-semibold text-green-700 sm:text-lg dark:text-green-400">Bonne réponse!</p>'
        : '<p class="font-semibold text-red-700 sm:text-lg dark:text-red-400">Pas tout à fait.</p>'
  }

  const verso = p.revele
    ? `<div class="mt-4 space-y-2.5 sm:mt-6 sm:space-y-4">
        ${verdict}
        ${resume(compte, paquet.id)}
        <p class="leading-normal text-slate-700 sm:text-[17px] sm:leading-relaxed dark:text-slate-200">${h(compte.note ?? categorieParId[compte.categorie].description)}</p>
        <button type="button" data-action="fiche" data-id="${h(compte.id)}" class="text-[15px] font-semibold underline underline-offset-4">Voir la fiche du compte</button>
      </div>`
    : ''

  const actions = !p.revele
    ? `<button type="button" data-action="reveler" class="${boutonBarre} w-full bg-slate-100 px-4 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Afficher la réponse</button>`
    : `<div class="grid grid-cols-4 gap-2">${notes
        .map(
          n => `<button type="button" data-action="noter" data-valeur="${n.id}"
            class="${boutonBarre} whitespace-nowrap px-1 text-[15px] ${couleurNote[n.id].bouton} ${p.note && p.note !== n.id ? 'opacity-50' : ''} ${p.note === n.id ? 'ring-4 ring-offset-2 ring-slate-400 ring-offset-white dark:ring-offset-slate-950' : ''}">
            ${h(n.nom)}<span class="hidden text-xs font-normal opacity-80 sm:block">${n.touche}</span>
          </button>`,
        )
        .join('')}</div>`

  return `<div class="mx-auto max-w-xl px-4 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pt-8 sm:pb-8">
    <div class="flex items-center justify-between gap-2 text-sm">
      <button type="button" data-action="precedent" ${s.pos === 0 ? 'disabled' : ''} class="rounded-lg px-2 py-1.5 font-semibold hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">← Précédente</button>
      <span class="tabular-nums text-slate-500 dark:text-slate-400">${s.pos + 1} / ${s.passages.length}</span>
      ${
        p.note
          ? `<button type="button" data-action="suivant" class="rounded-lg px-2 py-1.5 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Suivante →</button>`
          : `<button type="button" data-action="terminer" class="rounded-lg px-2 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">Terminer</button>`
      }
    </div>
    <div class="mt-1 h-1 overflow-hidden sm:mt-2 rounded-full bg-slate-200 dark:bg-slate-800">
      <div class="h-full rounded-full bg-slate-900 transition-all dark:bg-white" style="width:${progression}%"></div>
    </div>

    <article class="mt-3 rounded-2xl border-t-4 ${couleurFamille[f.id].bord} bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:mt-5 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <p class="text-sm text-slate-500 dark:text-slate-400">${h(paquet.nom)}</p>
      <h2 class="mt-1 text-2xl font-bold leading-tight sm:text-3xl">${h(compte.nom)}</h2>
      <p class="mt-1 text-slate-600 sm:mt-2 sm:text-[17px] dark:text-slate-300">${h(paquet.question)}</p>
      <div class="mt-4 sm:mt-5 ${deuxColonnes ? 'grid grid-cols-2 gap-2' : 'space-y-2'}">${options}</div>
      ${verso}
    </article>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0 dark:border-slate-800 dark:bg-slate-950 sm:dark:bg-transparent">
      <div class="mx-auto max-w-xl">${actions}</div>
    </div>
  </div>`
}

function finHtml(s: Session): string {
  const derniere = new Map<string, Note>()
  for (const p of s.passages) if (p.note) derniere.set(p.carte, p.note)
  const total = new Set(s.passages.map(p => p.carte)).size
  const compte = (n: Note) => [...derniere.values()].filter(x => x === n).length
  const difficiles = compte('again') + compte('hard')
  const parFamille = new Map<FamilleId, number>()
  for (const [id, n] of derniere) {
    if (n !== 'again' && n !== 'hard') continue
    const fam = familleDe(carteParId[id].compte).id
    parFamille.set(fam, (parFamille.get(fam) ?? 0) + 1)
  }
  const aRevoir = [...derniere.entries()]
    .filter(([, n]) => n === 'again' || n === 'hard')
    .map(([id]) => carteParId[id])

  return `<div class="mx-auto max-w-xl space-y-6 px-4 py-6 sm:py-8">
    <div>
      <h1 class="text-2xl font-bold">Session terminée</h1>
      <p class="mt-1 text-[15px] text-slate-600 dark:text-slate-300">${derniere.size} carte${derniere.size > 1 ? 's' : ''} révisée${derniere.size > 1 ? 's' : ''}.</p>
    </div>
    <dl class="grid grid-cols-4 gap-2 text-center">${notes
      .map(
        n => `<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <dt class="whitespace-nowrap text-xs font-semibold ${couleurNote[n.id].texte}">${h(noteNom[n.id])}</dt>
          <dd class="text-2xl font-bold tabular-nums">${compte(n.id)}</dd>
        </div>`,
      )
      .join('')}</dl>

    ${
      aRevoir.length
        ? `<div class="space-y-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">À retravailler</h2>
            <div class="flex flex-wrap gap-2">${[...parFamille.entries()]
              .map(([fam, n]) => `<a href="#synthese/famille-${fam}" class="${puceBase} ${couleurFamille[fam].puce}">${h(familleParId[fam].nom)} · ${n}</a>`)
              .join('')}</div>
            <ul class="divide-y divide-slate-200 rounded-xl bg-white text-[15px] ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">${aRevoir
              .map(
                c => `<li><button type="button" data-action="fiche" data-id="${h(c.compte.id)}" class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span class="font-medium">${h(c.compte.nom)}</span>
                  <span class="text-sm text-slate-500 dark:text-slate-400">${h(paquetParId[c.paquet.id].nom)}</span>
                </button></li>`,
              )
              .join('')}</ul>
          </div>`
        : ''
    }

    <div class="grid gap-2">
      ${difficiles ? `<button type="button" data-action="recommencer-difficiles" class="${boutonPrincipal}">Recommencer les difficiles · ${difficiles}</button>` : ''}
      <button type="button" data-action="recommencer" class="${difficiles ? boutonSecondaire : boutonPrincipal}">Recommencer les mêmes cartes · ${total}</button>
      <button type="button" data-action="precedent" class="${boutonSecondaire}">← Revenir à la dernière carte</button>
      <button type="button" data-action="reglages" class="${boutonSecondaire}">Choisir d’autres cartes</button>
    </div>
  </div>`
}
