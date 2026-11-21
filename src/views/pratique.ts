import { categorieParId, compteParId } from '../data'
import {
  argent,
  champsEtat,
  chiffres,
  dateTexte,
  familleId,
  generer,
  lirePartie,
  nb,
  nomCompte,
  nomMois,
  nouvellePartie,
  phaseParId,
  phases,
  saisieVide,
  sauverPartie,
  sens,
  situation,
  taches,
  totalBalance,
  verifierChamps,
  verifierEcriture,
  verifierReport,
  verifierSolde,
  type Chiffres,
  type Champ,
  type Cote,
  type Depart,
  type EtatFin,
  type Longueur,
  type Operation,
  type Partie,
  type Scenario,
  type Situation,
  type Tache,
} from '../pratique'
import { couleurFamille, h } from '../ui'

const lead = 'text-[17px] leading-relaxed'
const doux = 'text-neutral-600 dark:text-neutral-300'
const pale = 'text-neutral-500 dark:text-neutral-400'
const boite = 'rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800'
const bouton = 'rounded-xl px-4 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-40'
const boutonPrincipal = `${bouton} bg-boost text-neutral-950 hover:bg-boost-fonce`
const boutonSecondaire = `${bouton} bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`
// 16 px minimum: en dessous, Safari sur iPhone zoome dans la page quand on touche le champ.
// La couleur du contour vient seulement de `statut`: deux couleurs de ring sur le même champ se battent.
const champ = (statut: string) =>
  `w-full rounded-lg bg-white px-3 py-2 text-base tabular-nums outline-none focus:ring-2 focus:ring-boost disabled:opacity-100 dark:bg-neutral-950 ${statut || 'ring-1 ring-neutral-300 dark:ring-neutral-700'}`
const champBon = 'ring-2 ring-green-600 dark:ring-green-500'
const champFaux = 'ring-2 ring-red-600 dark:ring-red-500'

let partie: Partie | null = lirePartie()
let vue: 'accueil' | 'partie' = partie ? 'partie' : 'accueil'
let longueur: Longueur = partie?.longueur ?? 'courte'
let depart: Depart = 'hasard'
// Les sections repliables que l'élève a ouvertes ou fermées pendant la tâche en cours.
let ouverts: Record<string, boolean> = {}

let cache: { sc: Scenario; ts: Tache[] } | null = null
function lesTaches(p: Partie): Tache[] {
  if (cache?.sc !== p.scenario) cache = { sc: p.scenario, ts: taches(p.scenario) }
  return cache.ts
}

function sauver() {
  sauverPartie(partie)
}

const enCours = () => !!partie && partie.fin === undefined

// --- Ce que chaque tâche attend ---

function attenduSolde(p: Partie, t: Tache & { type: 'solde' }): number {
  return situation(p.scenario, lesTaches(p), p.pos).soldes[t.compte] ?? 0
}

function champsDe(p: Partie, t: Tache): Champ[] {
  const sit = situation(p.scenario, lesTaches(p), p.pos)
  if (t.type === 'balance') return [{ id: 'total', nom: 'Total des débits et des crédits', attendu: totalBalance(sit.soldes) }]
  if (t.type === 'etat') return champsEtat(p.scenario, t.etat, chiffres(p.scenario, sit.soldes))
  return []
}

function indices(p: Partie, t: Tache): string[] {
  const sc = p.scenario
  if (t.type === 'ecriture') {
    const noms = [...new Set(t.op.lignes.map(l => nomCompte(sc, l.compte)))].sort((x, y) => x.localeCompare(y, 'fr'))
    return [
      t.op.idee,
      ...(t.op.calcul ? [`Le calcul: ${t.op.calcul}.`] : []),
      `Les comptes touchés: ${noms.join(', ')}.`,
      t.op.lignes.map(l => sens(sc, l)).join('\n'),
    ]
  }
  if (t.type === 'report')
    return ['Chaque montant garde son côté. Un montant au débit dans le journal va au débit de son compte, à gauche du T. Un montant au crédit va à droite.']
  if (t.type === 'solde') {
    const l = situation(sc, lesTaches(p), p.pos).grandLivre[t.compte] ?? []
    const d = l.filter(x => x.cote === 'd').reduce((s, x) => s + x.montant, 0)
    const c = l.filter(x => x.cote === 'c').reduce((s, x) => s + x.montant, 0)
    return [
      'Additionne chaque côté du T. Le solde, c’est la différence entre les deux, du côté le plus gros.',
      `Débits: ${nb(d)}. Crédits: ${nb(c)}.`,
    ]
  }
  if (t.type === 'balance')
    return ['Additionne la colonne Débit. La colonne Crédit doit donner le même total, sinon un solde est du mauvais côté.']
  const ch = chiffres(sc, situation(sc, lesTaches(p), p.pos).soldes)
  const liste = (l: { id: string }[]) => l.map(x => nomCompte(sc, x.id)).join(', ')
  if (t.etat === 'resultats')
    return [
      'Bénéfice net = total des produits − total des charges.',
      `Les produits: ${liste(ch.produits)}.\nLes charges: ${liste(ch.charges)}.`,
    ]
  if (t.etat === 'capitaux')
    return sc.premierMois
      ? [
          'Capital à la fin = capital au début + mise de fonds initiale + bénéfice net − retraits.',
          'L’entreprise commence ce mois-ci: le capital au début est 0. Le solde du compte Capital dans la balance, c’est la mise de fonds du propriétaire. Le bénéfice net vient de l’état des résultats.',
        ]
      : [
          'Capital à la fin = capital au début + apports + bénéfice net − retraits.',
          'Le capital au début, c’est le solde du compte Capital dans la balance: les transactions du mois ne le touchent pas. Le bénéfice net vient de l’état des résultats.',
        ]
  return [
    'Actif = passif + capitaux propres. Au bilan, les capitaux propres, c’est le capital à la fin de l’état des capitaux propres.',
    `Les actifs: ${liste(ch.actifs)}. Amortissement cumulé se soustrait.\nLes passifs: ${liste(ch.passifs)}.`,
  ]
}

function reponse(p: Partie, t: Tache): Partie['saisie'] {
  if (t.type === 'ecriture')
    return { lignes: t.op.lignes.map(l => ({ compte: l.compte, d: l.cote === 'd' ? nb(l.montant) : '', c: l.cote === 'c' ? nb(l.montant) : '' })) }
  if (t.type === 'report') return { cotes: t.op.lignes.map(l => l.cote) }
  if (t.type === 'solde') {
    const s = attenduSolde(p, t)
    return { montant: nb(Math.abs(s)), cote: s >= 0 ? 'd' : 'c' }
  }
  return { champs: Object.fromEntries(champsDe(p, t).map(c => [c.id, nb(c.attendu)])) }
}

function verifier(p: Partie, t: Tache) {
  const s = p.saisie
  const r =
    t.type === 'ecriture'
      ? verifierEcriture(p.scenario, t.op, s)
      : t.type === 'report'
        ? verifierReport(t.op, s)
        : t.type === 'solde'
          ? verifierSolde(attenduSolde(p, t), s)
          : verifierChamps(champsDe(p, t), s)
  p.retour = r
  // Une réponse incomplète n'est pas comptée comme un essai raté.
  if (r.ok) p.resolu = true
  else if (r.lignes || r.champs) p.stats[p.pos].essais++
}

// --- Actions ---

export type Suite = false | 'rendre' | 'haut'

function confirmer(el: HTMLElement, texte: string): boolean {
  if (el.dataset.confirme) return true
  const avant = el.textContent
  el.dataset.confirme = '1'
  el.textContent = texte
  setTimeout(() => {
    if (!el.isConnected) return
    delete el.dataset.confirme
    el.textContent = avant
  }, 4000)
  return false
}

function demarrer(p: Partie) {
  partie = p
  vue = 'partie'
  ouverts = {}
  sauver()
}

export function actionPratique(action: string, el: HTMLElement): Suite {
  const valeur = el.dataset.valeur ?? ''
  if (action === 'pr-longueur') {
    longueur = valeur as Longueur
    return 'rendre'
  }
  if (action === 'pr-depart') {
    depart = valeur as Depart
    return 'rendre'
  }
  if (action === 'pr-nouvelle') {
    if (enCours() && !confirmer(el, 'Touche encore pour remplacer ta simulation')) return false
    demarrer(nouvellePartie(generer(longueur, depart), longueur))
    return 'haut'
  }
  if (action === 'pr-refaire') {
    if (!partie || (enCours() && !confirmer(el, 'Touche encore pour tout reprendre du début'))) return false
    demarrer(nouvellePartie(partie.scenario, partie.longueur))
    return 'haut'
  }
  if (action === 'pr-menu') {
    vue = 'accueil'
    return 'haut'
  }
  if (action === 'pr-reprendre') {
    vue = 'partie'
    return 'haut'
  }

  const p = partie
  if (!p) return false
  const ts = lesTaches(p)
  const t = ts[p.pos]
  if (!t) return false
  const s = p.saisie

  switch (action) {
    case 'pr-ajouter':
      s.lignes?.push({ compte: '', d: '', c: '' })
      break
    case 'pr-retirer':
      if (s.lignes && s.lignes.length > 1) {
        s.lignes.splice(Number(valeur), 1)
        if (p.retour?.lignes) p.retour = null
      }
      break
    case 'pr-cote':
      if (s.cotes) s.cotes[Number(el.dataset.ligne)] = valeur as Cote
      break
    case 'pr-cote-solde':
      s.cote = valeur as Cote
      break
    case 'pr-indice':
      if (p.stats[p.pos].indices < indices(p, t).length) p.stats[p.pos].indices++
      break
    case 'pr-reponse':
      p.saisie = reponse(p, t)
      p.stats[p.pos].revele = true
      p.resolu = true
      p.retour = null
      break
    case 'pr-continuer':
      if (!p.resolu) return false
      p.pos++
      p.resolu = false
      p.retour = null
      ouverts = {}
      if (p.pos >= ts.length) p.fin = Date.now()
      else p.saisie = saisieVide(ts[p.pos])
      sauver()
      return 'haut'
    default:
      return false
  }
  sauver()
  return 'rendre'
}

export function verifierPratique(): Suite {
  const p = partie
  if (!p || p.resolu) return false
  const t = lesTaches(p)[p.pos]
  if (!t) return false
  verifier(p, t)
  sauver()
  return 'rendre'
}

// Une frappe met à jour la saisie sans redessiner la page, pour garder le clavier ouvert.
export function saisirPratique(el: HTMLInputElement | HTMLSelectElement) {
  const s = partie?.saisie
  if (!s || partie!.resolu) return
  const quoi = el.dataset.prChamp ?? ''
  const i = Number(el.dataset.ligne)
  if ((quoi === 'compte' || quoi === 'd' || quoi === 'c') && s.lignes?.[i]) {
    s.lignes[i][quoi] = el.value
    // Un montant tapé au débit vide le crédit de la même ligne, et l'inverse.
    if ((quoi === 'd' || quoi === 'c') && el.value.trim()) {
      const autre = quoi === 'd' ? 'c' : 'd'
      if (s.lignes[i][autre]) {
        s.lignes[i][autre] = ''
        const voisin = document.querySelector<HTMLInputElement>(`[data-pr-champ="${autre}"][data-ligne="${i}"]`)
        if (voisin) voisin.value = ''
      }
    }
    majTotaux()
  } else if (quoi === 'montant') s.montant = el.value
  else if (quoi.startsWith('champ:')) (s.champs ??= {})[quoi.slice(6)] = el.value
  sauver()
}

export function basculerSection(el: HTMLDetailsElement) {
  const cle = el.dataset.section
  if (cle) ouverts[cle] = el.open
}

function majTotaux() {
  const el = document.querySelector('[data-pr-totaux]')
  if (el && partie?.saisie.lignes) el.innerHTML = totauxHtml(partie.saisie.lignes)
}

function totauxHtml(lignes: { d: string; c: string }[]): string {
  const somme = (k: 'd' | 'c') => lignes.reduce((s, l) => s + (Number(lireNombre(l[k])) || 0), 0)
  const d = somme('d')
  const c = somme('c')
  const egal = d === c && d > 0
  return `<span>Débits <strong>${argent(d)}</strong></span><span>Crédits <strong>${argent(c)}</strong></span>${
    egal ? '<span class="font-semibold text-green-700 dark:text-green-400">Égaux</span>' : ''
  }`
}

function lireNombre(t: string): number {
  const n = Number(t.replace(/[\s  $]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function apresRenduPratique() {
  const liste = document.querySelector<HTMLElement>('[data-etapes]')
  const actif = liste?.querySelector<HTMLElement>('[data-actif]')
  if (liste && actif) liste.scrollLeft = actif.offsetLeft - (liste.clientWidth - actif.offsetWidth) / 2
}

// --- Rendu: morceaux ---

function point(id: string): string {
  return `<span class="size-2 shrink-0 rounded-full ${couleurFamille[familleDe(id)].point}"></span>`
}

const familleDe = (id: string) => familleId(id)

const refTexte = (op: Operation) => `(${op.ref})`

function ecritureJournal(sc: Scenario, op: Operation, surligne = false): string {
  const lignes = op.lignes
    .map(
      l => `<tr>
        <td class="py-0.5 pr-2 ${l.cote === 'c' ? 'pl-5' : ''}">${h(nomCompte(sc, l.compte))}</td>
        <td class="w-[4.75rem] py-0.5 text-right align-top">${l.cote === 'd' ? nb(l.montant) : ''}</td>
        <td class="w-[4.75rem] py-0.5 text-right align-top">${l.cote === 'c' ? nb(l.montant) : ''}</td>
      </tr>`,
    )
    .join('')
  return `<div class="py-2.5 ${surligne ? '-mx-2 rounded-lg bg-orange-50 px-2 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:ring-orange-500/30' : ''}">
    <p class="flex justify-between text-xs font-semibold ${pale}"><span>${h(dateTexte(op.jour, sc.mois))}</span><span>${h(refTexte(op))}</span></p>
    <table class="mt-0.5 w-full text-sm tabular-nums"><tbody>${lignes}</tbody></table>
    <p class="mt-0.5 text-xs italic ${pale}">${h(op.libelle)}</p>
  </div>`
}

function enteteJournal(): string {
  return `<div class="flex text-xs font-semibold ${pale}"><span class="flex-1">Compte</span><span class="w-[4.75rem] text-right">Débit</span><span class="w-[4.75rem] text-right">Crédit</span></div>`
}

function rangeeT(ref: string, montant: number, extra = ''): string {
  return `<div class="flex items-baseline justify-between gap-1 ${extra}"><span class="text-[11px] ${pale}">${h(ref)}</span><span>${nb(montant)}</span></div>`
}

function compteT(sc: Scenario, id: string, gauche: string, droite: string, pied = '', extra = ''): string {
  return `<div class="rounded-xl bg-white p-3 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 ${extra}">
    <button type="button" data-action="fiche" data-id="${h(id)}" class="mx-auto flex items-center gap-2 text-center text-[15px] font-semibold leading-snug hover:underline">${point(id)}${h(nomCompte(sc, id))}</button>
    <div class="mt-1.5 grid grid-cols-2 border-t-2 border-neutral-700 text-sm tabular-nums dark:border-neutral-400">
      <div class="min-h-7 space-y-0.5 border-r-2 border-neutral-700 py-1 pr-2 dark:border-neutral-400">${gauche}</div>
      <div class="min-h-7 space-y-0.5 py-1 pl-2">${droite}</div>
    </div>
    ${pied}
  </div>`
}

function soldeT(solde: number): string {
  const cote = solde > 0 ? 'débiteur' : solde < 0 ? 'créditeur' : ''
  return `<p class="mt-1 border-t border-neutral-200 pt-1 text-center text-sm dark:border-neutral-700">Solde ${cote} <strong class="tabular-nums">${nb(Math.abs(solde))}</strong></p>`
}

// Le solde s'affiche sous le T une fois calculé, tant qu'aucun nouveau montant n'y a été reporté.
function soldeConnu(p: Partie, sit: Situation, id: string, limite: number): boolean {
  const ts = lesTaches(p)
  const dernier = sit.dernierReport[id]
  if (dernier === undefined) return false
  if (dernier === -1) return true
  for (let i = dernier + 1; i < limite; i++) {
    const t = ts[i]
    if (t.type === 'solde' && t.compte === id) return true
  }
  // Les comptes fermés à la clôture sont à zéro.
  return ts[dernier].phase === 'cloture' && sit.soldes[id] === 0 && limite > dernier
}

function grandLivreHtml(p: Partie, sit: Situation, limite: number, surligne?: string): string {
  const sc = p.scenario
  const ids = sc.plan.filter(id => sit.grandLivre[id]?.length)
  return `<div class="grid gap-3 sm:grid-cols-2">${ids
    .map(id => {
      const l = sit.grandLivre[id]
      const cote = (c: Cote) => l.filter(x => x.cote === c).map(x => rangeeT(x.ref === 'Ouv.' ? x.ref : `(${x.ref})`, x.montant)).join('')
      const pied = soldeConnu(p, sit, id, limite) ? soldeT(sit.soldes[id] ?? 0) : ''
      return compteT(sc, id, cote('d'), cote('c'), pied, surligne === id ? 'ring-2 !ring-boost' : '')
    })
    .join('')}</div>`
}

function balanceHtml(sc: Scenario, soldes: Record<string, number>, total: boolean): string {
  const ids = sc.plan.filter(id => soldes[id])
  const t = totalBalance(soldes)
  return `<table class="w-full text-sm tabular-nums">
    <thead class="text-xs ${pale}"><tr><th class="pb-1 text-left font-semibold">Compte</th><th class="w-[5.25rem] pb-1 text-right font-semibold">Débit</th><th class="w-[5.25rem] pb-1 text-right font-semibold">Crédit</th></tr></thead>
    <tbody>${ids
      .map(
        id => `<tr class="border-t border-neutral-100 dark:border-neutral-800">
          <td class="py-1 pr-2"><span class="flex items-start gap-2"><span class="mt-[7px] flex">${point(id)}</span>${h(nomCompte(sc, id))}</span></td>
          <td class="py-1 text-right align-top">${soldes[id] > 0 ? nb(soldes[id]) : ''}</td>
          <td class="py-1 text-right align-top">${soldes[id] < 0 ? nb(-soldes[id]) : ''}</td>
        </tr>`,
      )
      .join('')}</tbody>
    ${total ? `<tfoot><tr class="border-t-2 border-neutral-300 font-semibold dark:border-neutral-600"><td class="py-1.5">Total</td><td class="py-1.5 text-right">${nb(t)}</td><td class="py-1.5 text-right">${nb(t)}</td></tr></tfoot>` : ''}
  </table>`
}

// Un état financier complet, une fois ses totaux trouvés.
function etatHtml(sc: Scenario, etat: EtatFin, ch: Chiffres): string {
  const m = nomMois(sc.mois)
  type Rang = { nom: string; montant?: number; retrait?: boolean; gras?: boolean; titre?: boolean; total?: boolean }
  const rangs: Rang[] = []
  let titre = ''
  if (etat === 'resultats') {
    titre = `État des résultats pour le mois terminé le ${sc.dernierJour} ${m} ${sc.annee}`
    rangs.push({ nom: 'Produits', titre: true })
    for (const x of ch.produits) rangs.push({ nom: nomCompte(sc, x.id), montant: x.montant, retrait: true })
    if (ch.produits.length > 1) rangs.push({ nom: 'Total des produits', montant: ch.totalProduits, total: true })
    rangs.push({ nom: 'Charges', titre: true })
    for (const x of ch.charges) rangs.push({ nom: nomCompte(sc, x.id), montant: x.montant, retrait: true })
    rangs.push({ nom: 'Total des charges', montant: ch.totalCharges, total: true })
    rangs.push({ nom: 'Bénéfice net', montant: ch.benefice, gras: true, total: true })
  } else if (etat === 'capitaux') {
    titre = `État des capitaux propres pour le mois terminé le ${sc.dernierJour} ${m} ${sc.annee}`
    rangs.push({ nom: `Capital au 1er ${m}`, montant: ch.debut })
    if (ch.miseDeFonds) rangs.push({ nom: 'Plus: mise de fonds initiale', montant: ch.miseDeFonds, retrait: true })
    if (ch.apports) rangs.push({ nom: 'Plus: apports', montant: ch.apports, retrait: true })
    rangs.push({ nom: 'Plus: bénéfice net', montant: ch.benefice, retrait: true })
    rangs.push({ nom: 'Moins: retraits', montant: -ch.retraits, retrait: true })
    rangs.push({ nom: `Capital au ${sc.dernierJour} ${m}`, montant: ch.fin, gras: true, total: true })
  } else {
    titre = `Bilan au ${sc.dernierJour} ${m} ${sc.annee}`
    rangs.push({ nom: 'Actif', titre: true })
    let categorie = ''
    for (const x of ch.actifs) {
      const cat = categorieParId[compteParId[x.id].categorie].nom
      if (cat !== categorie) {
        categorie = cat
        rangs.push({ nom: cat, titre: true, retrait: true })
      }
      rangs.push({ nom: nomCompte(sc, x.id), montant: x.montant, retrait: true })
    }
    rangs.push({ nom: 'Total de l’actif', montant: ch.totalActifs, gras: true, total: true })
    rangs.push({ nom: 'Passif', titre: true })
    for (const x of ch.passifs) rangs.push({ nom: nomCompte(sc, x.id), montant: x.montant, retrait: true })
    rangs.push({ nom: 'Total du passif', montant: ch.totalPassifs, total: true })
    rangs.push({ nom: 'Capitaux propres', titre: true })
    rangs.push({ nom: `${sc.proprio} – Capital au ${sc.dernierJour} ${m}`, montant: ch.fin, retrait: true })
    rangs.push({ nom: 'Total du passif et des capitaux propres', montant: ch.totalPassifs + ch.fin, gras: true, total: true })
  }
  return `<div>
    <p class="text-center text-sm font-semibold">${h(sc.entreprise)}</p>
    <p class="text-center text-sm ${doux}">${h(titre)}</p>
    <table class="mt-2 w-full text-sm tabular-nums"><tbody>${rangs
      .map(
        r => `<tr class="${r.total ? 'border-t border-neutral-300 dark:border-neutral-600' : ''} ${r.gras ? 'font-bold' : ''}">
          <td class="py-0.5 pr-2 ${r.retrait ? 'pl-4' : ''} ${r.titre ? `pt-2 font-semibold ${r.retrait ? pale : ''}` : ''}">${h(r.nom)}</td>
          <td class="w-24 py-0.5 text-right align-top">${r.montant === undefined ? '' : r.montant < 0 ? `(${nb(-r.montant)})` : nb(r.montant)}</td>
        </tr>`,
      )
      .join('')}</tbody></table>
  </div>`
}

function section(cle: string, titre: string, contenu: string, ouvertParDefaut: boolean): string {
  const ouvert = ouverts[cle] ?? ouvertParDefaut
  return `<details data-section="${cle}" ${ouvert ? 'open' : ''} class="group ${boite}">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold [&::-webkit-details-marker]:hidden">${h(titre)}<span aria-hidden="true" class="text-xl text-neutral-400 transition group-open:rotate-90">›</span></summary>
    <div class="border-t border-neutral-200 p-4 dark:border-neutral-800">${contenu}</div>
  </details>`
}

// --- Rendu: la tâche en cours ---

function consigne(p: Partie, t: Tache): { titre: string; compteur: string } {
  const ts = lesTaches(p)
  const memes = ts.filter(x => x.type === t.type && x.phase === t.phase)
  const k = memes.indexOf(t) + 1
  const sur = memes.length > 1 ? `${k} sur ${memes.length}` : ''
  switch (t.type) {
    case 'ecriture':
      if (t.phase === 'journal') return { titre: 'Inscris cette transaction au journal général.', compteur: `Transaction ${sur}` }
      if (t.phase === 'regularisations') return { titre: 'Inscris cette régularisation au journal général.', compteur: `Régularisation ${sur}` }
      return { titre: 'Inscris cette écriture de clôture au journal général.', compteur: `Écriture de clôture ${sur}` }
    case 'report':
      return { titre: `Reporte l’écriture ${refTexte(t.op)} au grand livre.`, compteur: `Report ${sur}` }
    case 'solde':
      return { titre: `Calcule le solde du compte ${nomCompte(p.scenario, t.compte)}.`, compteur: memes.length > 1 ? `Solde ${sur}` : 'Solde' }
    case 'balance':
      return { titre: 'Additionne la balance.', compteur: phaseParId[t.phase].nom }
    case 'etat':
      return {
        titre: { resultats: 'Prépare l’état des résultats.', capitaux: 'Prépare l’état des capitaux propres.', bilan: 'Prépare le bilan.' }[t.etat],
        compteur: `État ${sur}`,
      }
  }
}

function enonce(p: Partie, t: Tache): string {
  const sc = p.scenario
  if (t.type === 'ecriture') {
    const note =
      t.phase === 'cloture'
        ? `<p class="mt-2 text-[15px] ${doux}">Les soldes sont dans la balance régularisée, plus bas.</p>`
        : t.phase === 'regularisations'
          ? `<p class="mt-2 text-[15px] ${doux}">Les soldes avant régularisation sont dans la balance de vérification, plus bas.</p>`
          : ''
    return `<div class="mt-3 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/60">
      <p class="text-sm font-semibold ${pale}">${h(dateTexte(t.op.jour, sc.mois))} ${h(refTexte(t.op))}</p>
      <p class="mt-1 ${lead}">${h(t.op.texte)}</p>
      ${note}
    </div>`
  }
  if (t.type === 'report') return `<div class="mt-3 rounded-xl bg-neutral-50 px-4 py-1.5 dark:bg-neutral-800/60">${ecritureJournal(sc, t.op)}</div>`
  if (t.type === 'balance') {
    const sit = situation(sc, lesTaches(p), p.pos)
    return `<div class="mt-3">${balanceHtml(sc, sit.soldes, false)}</div>`
  }
  if (t.type === 'etat') {
    const titres = { resultats: 'pour le mois terminé le', capitaux: 'pour le mois terminé le', bilan: 'au' }
    return `<p class="mt-1 text-[15px] ${doux}">${h(sc.entreprise)}, ${titres[t.etat]} ${sc.dernierJour} ${h(nomMois(sc.mois))} ${sc.annee}. Les montants viennent de la balance régularisée, plus bas.</p>`
  }
  return ''
}

function optionsComptes(sc: Scenario, choisi: string): string {
  let html = `<option value="">Choisis un compte</option>`
  let groupe = ''
  for (const id of sc.plan) {
    const cat = categorieParId[compteParId[id].categorie].nom
    if (cat !== groupe) {
      html += `${groupe ? '</optgroup>' : ''}<optgroup label="${h(cat)}">`
      groupe = cat
    }
    html += `<option value="${h(id)}" ${id === choisi ? 'selected' : ''}>${h(nomCompte(sc, id))}</option>`
  }
  return html + '</optgroup>'
}

function formulaire(p: Partie, t: Tache): string {
  const sc = p.scenario
  const s = p.saisie
  const r = p.retour
  const fige = p.resolu ? 'disabled' : ''
  const etat = (bon: boolean | null | undefined) => (p.resolu ? champBon : bon === true ? champBon : bon === false ? champFaux : '')

  if (t.type === 'ecriture') {
    const lignes = (s.lignes ?? [])
      .map((l, i) => {
        const statut = etat(r?.lignes?.[i])
        return `<div class="rounded-xl bg-neutral-50 p-2.5 @lg:grid @lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_2.5rem] @lg:items-end @lg:gap-2 dark:bg-neutral-800/50">
          <label class="block min-w-0"><span class="mb-1 block text-xs font-semibold ${pale}">Compte</span>
            <select data-pr-champ="compte" data-ligne="${i}" ${fige} class="${champ(statut)} ${l.c.trim() ? '@lg:pl-6' : ''}">${optionsComptes(sc, l.compte)}</select>
          </label>
          <div class="mt-2 grid grid-cols-[1fr_1fr_2.5rem] items-end gap-2 @lg:contents">
            <label class="block"><span class="mb-1 block text-xs font-semibold ${pale}">Débit</span>
              <input data-pr-champ="d" data-ligne="${i}" value="${h(l.d)}" ${fige} inputmode="decimal" autocomplete="off" class="${champ(statut)} text-right"></label>
            <label class="block"><span class="mb-1 block text-xs font-semibold ${pale}">Crédit</span>
              <input data-pr-champ="c" data-ligne="${i}" value="${h(l.c)}" ${fige} inputmode="decimal" autocomplete="off" class="${champ(statut)} text-right"></label>
            ${
              p.resolu || (s.lignes ?? []).length <= 1
                ? '<span></span>'
                : `<button type="button" data-action="pr-retirer" data-valeur="${i}" aria-label="Retirer la ligne" class="flex h-[42px] items-center justify-center rounded-lg text-xl text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200">×</button>`
            }
          </div>
        </div>`
      })
      .join('')
    return `<div class="@container space-y-2">${lignes}</div>
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        ${p.resolu ? '<span></span>' : `<button type="button" data-action="pr-ajouter" class="rounded-lg px-2 py-1.5 font-semibold text-boost-fonce hover:bg-orange-50 dark:text-boost dark:hover:bg-orange-500/10">+ Ajouter une ligne</button>`}
        <p data-pr-totaux class="flex flex-wrap gap-x-3 text-sm tabular-nums ${doux}">${totauxHtml(s.lignes ?? [])}</p>
      </div>`
  }

  if (t.type === 'report') {
    const sit = situation(sc, lesTaches(p), p.pos)
    return `<div class="grid gap-3 sm:grid-cols-2">${t.op.lignes
      .map((l, i) => {
        const choisi = s.cotes?.[i]
        const bon = p.resolu ? true : r?.lignes?.[i]
        const case_ = (cote: Cote) => {
          const ici = choisi === cote
          const style = ici
            ? bon === true
              ? 'bg-green-600 text-white'
              : bon === false
                ? 'bg-red-600 text-white'
                : 'bg-boost text-neutral-950'
            : 'border border-dashed border-neutral-300 text-neutral-400 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800'
          return `<button type="button" data-action="pr-cote" data-ligne="${i}" data-valeur="${cote}" ${fige} class="mt-1 flex w-full items-baseline justify-between gap-1 rounded-lg px-2 py-2 text-sm font-semibold ${style}">
            <span class="text-[11px] font-normal">${ici ? h(refTexte(t.op)) : cote === 'd' ? 'Débit?' : 'Crédit?'}</span><span>${nb(l.montant)}</span></button>`
        }
        const avant = (c: Cote) => (sit.grandLivre[l.compte] ?? []).filter(x => x.cote === c).map(x => rangeeT(x.ref === 'Ouv.' ? x.ref : `(${x.ref})`, x.montant)).join('')
        return compteT(sc, l.compte, avant('d') + case_('d'), avant('c') + case_('c'))
      })
      .join('')}</div>
      <p class="text-[15px] ${doux}">Touche le côté du T où va chaque montant.</p>`
  }

  if (t.type === 'solde') {
    const sit = situation(sc, lesTaches(p), p.pos)
    const l = sit.grandLivre[t.compte] ?? []
    const cote = (c: Cote) => l.filter(x => x.cote === c).map(x => rangeeT(x.ref === 'Ouv.' ? x.ref : `(${x.ref})`, x.montant)).join('')
    const bascule = (c: Cote, nom: string) => {
      const actif = s.cote === c
      const statut = actif && (p.resolu || r?.champs?.cote === true) ? 'ring-green-600' : actif && r?.champs?.cote === false ? 'ring-red-600' : actif ? 'ring-boost' : 'ring-neutral-300 dark:ring-neutral-700'
      return `<button type="button" data-action="pr-cote-solde" data-valeur="${c}" aria-pressed="${actif}" ${fige} class="flex-1 rounded-lg px-3 py-2 font-semibold ring-1 ${actif ? `ring-2 ${statut} bg-orange-50 dark:bg-orange-500/10` : statut}">${nom}</button>`
    }
    return `<div class="mx-auto max-w-sm">${compteT(sc, t.compte, cote('d'), cote('c'))}</div>
      <div class="mx-auto grid max-w-sm gap-3">
        <label class="block"><span class="mb-1 block text-sm font-semibold">Solde</span>
          <input data-pr-champ="montant" value="${h(s.montant ?? '')}" ${fige} inputmode="decimal" autocomplete="off" class="${champ(etat(r?.champs?.montant))} text-right"></label>
        <div class="flex gap-2">${bascule('d', 'Débiteur')}${bascule('c', 'Créditeur')}</div>
      </div>`
  }

  const champs = champsDe(p, t)
  return `<div class="grid gap-3">${champs
    .map(
      c => `<label class="flex items-center justify-between gap-3">
        <span class="text-[15px] font-medium">${h(c.nom)}</span>
        <input data-pr-champ="champ:${c.id}" value="${h(s.champs?.[c.id] ?? '')}" ${fige} inputmode="decimal" autocomplete="off" class="${champ(etat(r?.champs?.[c.id]))} max-w-[9rem] shrink-0 text-right">
      </label>`,
    )
    .join('')}</div>`
}

function explication(p: Partie, t: Tache): string {
  const sc = p.scenario
  const revele = p.stats[p.pos].revele
  const titre = revele ? 'Voici la réponse.' : un(['Bravo!', 'Exact!', 'C’est ça!', 'Bien joué!'], p.pos)
  let corps = ''
  if (t.type === 'ecriture') {
    corps = `<p>${h(t.op.idee)}</p>
      ${t.op.calcul ? `<p class="inline-block rounded-lg bg-white/70 px-2 py-0.5 font-semibold tabular-nums dark:bg-neutral-900/60">${h(t.op.calcul)}</p>` : ''}
      <ul class="list-disc space-y-0.5 pl-5">${t.op.lignes.map(l => `<li>${h(sens(sc, l))}</li>`).join('')}</ul>`
  } else if (t.type === 'report') {
    corps = '<p>Chaque montant garde le côté qu’il avait au journal. Le numéro entre parenthèses relie le grand livre à l’écriture du journal.</p>'
  } else if (t.type === 'solde') {
    const l = situation(sc, lesTaches(p), p.pos).grandLivre[t.compte] ?? []
    const d = l.filter(x => x.cote === 'd').reduce((s, x) => s + x.montant, 0)
    const c = l.filter(x => x.cote === 'c').reduce((s, x) => s + x.montant, 0)
    corps =
      d === c
        ? `<p>Débits ${nb(d)} = crédits ${nb(c)}: le solde est à zéro.</p>`
        : `<p class="tabular-nums">${d > c ? `Débits ${nb(d)} − crédits ${nb(c)}` : `Crédits ${nb(c)} − débits ${nb(d)}`} = solde ${d > c ? 'débiteur' : 'créditeur'} de ${nb(Math.abs(d - c))}.</p>`
  } else if (t.type === 'balance') {
    const notes: Record<string, string> = {
      balance: 'Les débits égalent les crédits, donc rien n’a été oublié ou inscrit du mauvais côté. Prochaine étape: les régularisations.',
      'balance-reg': 'Les régularisations balancent elles aussi. Ces soldes servent maintenant à préparer les états financiers.',
      'apres-cloture': 'Il ne reste que les comptes du bilan. Les produits, les charges, les apports et les retraits sont à zéro, prêts pour le mois prochain.',
    }
    corps = `<p>${h(notes[t.phase])}</p>`
  } else {
    const ch = chiffres(sc, situation(sc, lesTaches(p), p.pos).soldes)
    const suite = { resultats: 'Le bénéfice net passe à l’état des capitaux propres.', capitaux: 'Le capital à la fin passe au bilan.', bilan: 'L’actif égale le passif plus les capitaux propres.' }
    corps = `<p>${suite[t.etat]}</p><div class="rounded-xl bg-white p-3 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">${etatHtml(sc, t.etat, ch)}</div>`
  }
  return `<div class="space-y-2 rounded-xl p-4 text-[15px] leading-relaxed ${revele ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-green-50 text-green-950 dark:bg-green-950/40 dark:text-green-50'}">
    <p class="text-lg font-bold ${revele ? '' : 'text-green-700 dark:text-green-400'}">${titre}</p>
    ${corps}
  </div>`
}

// Choix déterministe, pour que le même message reste affiché quand la page se redessine.
function un<T>(liste: T[], graine: number): T {
  return liste[graine % liste.length]
}

function aideHtml(p: Partie, t: Tache): string {
  const stat = p.stats[p.pos]
  const tous = indices(p, t)
  const vus = p.resolu ? [] : tous.slice(0, stat.indices)
  const liste = vus
    .map(
      (x, i) => `<div class="rounded-xl bg-amber-50 p-3 text-[15px] leading-relaxed ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Indice ${i + 1}</p>
        ${x
          .split('\n')
          .map(ligne => `<p class="mt-1">${h(ligne)}</p>`)
          .join('')}
      </div>`,
    )
    .join('')
  const reste = tous.length - stat.indices
  const boutons = p.resolu
    ? ''
    : `<div class="flex flex-wrap gap-2">
        ${reste > 0 ? `<button type="button" data-action="pr-indice" class="${boutonSecondaire} py-2.5">${stat.indices ? 'Un autre indice' : 'Un indice'} <span class="font-normal ${pale}">· ${reste}</span></button>` : ''}
        <button type="button" data-action="pr-reponse" class="rounded-xl px-4 py-2.5 font-semibold ${doux} hover:bg-neutral-100 dark:hover:bg-neutral-800">Voir la réponse</button>
      </div>`
  const liens = phaseParId[t.phase].aide
    .map(([nom, id]) => `<a href="#synthese/${id}" class="underline underline-offset-2">${h(nom)}</a>`)
    .join(' · ')
  return `${liste ? `<div class="space-y-2">${liste}</div>` : ''}
    ${boutons}
    <p class="text-sm ${pale}">Revoir: ${liens}</p>`
}

function tacheHtml(p: Partie, t: Tache): string {
  const { titre, compteur } = consigne(p, t)
  const r = p.retour
  const messages =
    r && !r.ok && r.messages.length
      ? `<div role="status" class="rounded-xl bg-red-50 p-3 text-[15px] text-red-900 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900">
          <ul class="space-y-1">${r.messages.map(m => `<li>${h(m)}</li>`).join('')}</ul>
        </div>`
      : ''
  const action = p.resolu
    ? `<button type="button" data-action="pr-continuer" class="${boutonPrincipal} w-full text-lg">Continuer →</button>`
    : `<button type="submit" class="${boutonPrincipal} w-full text-lg">Vérifier</button>`
  return `<section data-tache class="scroll-mt-20 space-y-4 ${boite} p-4 sm:p-5">
    <div>
      <p class="text-sm font-semibold text-boost-fonce dark:text-boost">${h(compteur)}</p>
      <h2 class="mt-0.5 text-xl font-bold leading-snug">${h(titre)}</h2>
      ${enonce(p, t)}
    </div>
    <form data-pr-form class="space-y-4" novalidate>
      ${formulaire(p, t)}
      ${messages}
      ${p.resolu ? explication(p, t) : ''}
      ${action}
    </form>
    ${aideHtml(p, t)}
  </section>`
}

function contexteHtml(p: Partie, t: Tache): string {
  const sc = p.scenario
  const ts = lesTaches(p)
  const limite = p.pos + (p.resolu ? 1 : 0)
  const sit = situation(sc, ts, limite)
  const index = (phase: string) => ts.findIndex(x => x.type === 'balance' && x.phase === phase)

  const ecritures = ts.slice(0, limite).flatMap(x => (x.type === 'ecriture' ? [x] : []))
  const groupes: [string, typeof ecritures][] = [
    ['Transactions du mois', ecritures.filter(x => x.phase === 'journal')],
    ['Régularisations', ecritures.filter(x => x.phase === 'regularisations')],
    ['Écritures de clôture', ecritures.filter(x => x.phase === 'cloture')],
  ]
  const journal = ecritures.length
    ? `${enteteJournal()}${groupes
        .filter(([, l]) => l.length)
        .map(
          ([nom, l]) => `<p class="mt-3 text-sm font-bold">${h(nom)}</p>
            <div class="divide-y divide-neutral-200 dark:divide-neutral-800">${l.map(x => ecritureJournal(sc, x.op, t.type === 'report' && x.op === t.op)).join('')}</div>`,
        )
        .join('')}`
    : `<p class="text-[15px] ${doux}">Le journal est vide pour l’instant. Chaque écriture réussie s’ajoute ici.</p>`

  const blocs: string[] = []
  const ouvrirJournal = t.type === 'ecriture' && t.phase === 'journal'
  blocs.push(section('journal', 'Journal général', journal, ouvrirJournal))
  blocs.push(section('grand-livre', 'Grand livre', grandLivreHtml(p, sit, limite), false))

  const bv = index('balance')
  const bvr = index('balance-reg')
  if (limite > bv) {
    const soldes = situation(sc, ts, bv).soldes
    blocs.push(section('balance', 'Balance de vérification', balanceHtml(sc, soldes, true), t.phase === 'regularisations' && t.type === 'ecriture'))
  }
  if (limite > bvr) {
    const soldes = situation(sc, ts, bvr).soldes
    blocs.push(section('balance-reg', 'Balance régularisée', balanceHtml(sc, soldes, true), t.phase === 'etats' || (t.phase === 'cloture' && t.type === 'ecriture')))
    const faits = ts.slice(0, limite).flatMap(x => (x.type === 'etat' ? [x.etat] : []))
    if (faits.length) {
      const ch = chiffres(sc, soldes)
      blocs.push(section('etats', 'États financiers', `<div class="space-y-6">${faits.map(e => etatHtml(sc, e, ch)).join('')}</div>`, false))
    }
  }
  return blocs.join('')
}

function etapesHtml(actuelle: number): string {
  return `<ol data-etapes class="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${phases
    .map((ph, i) => {
      const style =
        i === actuelle
          ? 'bg-boost text-neutral-950'
          : i < actuelle
            ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
            : 'text-neutral-400 ring-1 ring-inset ring-neutral-200 dark:text-neutral-500 dark:ring-neutral-800'
      return `<li ${i === actuelle ? 'data-actif aria-current="step"' : ''} class="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${style}">${i < actuelle ? '✓' : `${i + 1}.`} ${h(ph.court)}</li>`
    })
    .join('')}</ol>`
}

function partieHtml(p: Partie): string {
  const ts = lesTaches(p)
  const t = ts[p.pos]
  const sc = p.scenario
  const phase = phases.findIndex(ph => ph.id === t.phase)
  const debutPhase = ts.findIndex(x => x.phase === t.phase) === p.pos
  const progression = Math.round((p.pos / ts.length) * 100)
  return `<div class="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:py-8">
    <div class="flex items-center justify-between gap-3 text-sm">
      <button type="button" data-action="pr-menu" class="-ml-2 rounded-lg px-2 py-1.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">← Menu</button>
      <span class="truncate ${pale}">${h(sc.entreprise)} · ${h(nomMois(sc.mois))} ${sc.annee}</span>
    </div>
    ${etapesHtml(phase)}
    <div class="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div class="h-full rounded-full bg-boost transition-all" style="width:${progression}%"></div></div>
    <div class="${debutPhase ? 'rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:ring-orange-500/30' : ''}">
      <p class="font-semibold">Étape ${phase + 1}: ${h(phaseParId[t.phase].nom)}</p>
      <p class="text-[15px] leading-relaxed ${doux}">${h(phaseParId[t.phase].description)}</p>
      ${
        t.phase === 'journal'
          ? `<p class="mt-1 text-[15px] leading-relaxed ${doux}">${
              sc.premierMois
                ? `C’est le premier mois de ${h(sc.entreprise)}: le grand livre part de zéro.`
                : `${h(sc.entreprise)} existe déjà: le grand livre part des soldes de la fin du mois passé.`
            }</p>`
          : ''
      }
    </div>
    <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
      ${tacheHtml(p, t)}
      <div class="space-y-3">${contexteHtml(p, t)}</div>
    </div>
  </div>`
}

// --- Rendu: accueil et fin ---

function accueilHtml(): string {
  const p = partie
  const reprendre =
    p && enCours()
      ? `<button type="button" data-action="pr-reprendre" class="flex w-full items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:ring-amber-900 dark:hover:bg-amber-950/70">
          <span><span class="block font-semibold">Reprendre où tu étais</span><span class="block text-sm ${doux}">${h(p.scenario.entreprise)} · étape ${phases.findIndex(ph => ph.id === lesTaches(p)[p.pos].phase) + 1} sur ${phases.length}, ${phaseParId[lesTaches(p)[p.pos].phase].nom.toLowerCase()}</span></span>
          <span aria-hidden="true" class="text-xl">›</span>
        </button>`
      : p
        ? `<button type="button" data-action="pr-reprendre" class="flex w-full items-center justify-between gap-3 ${boite} p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
            <span><span class="block font-semibold">Revoir ta dernière simulation</span><span class="block text-sm ${doux}">${h(p.scenario.entreprise)} · terminée</span></span>
            <span aria-hidden="true" class="text-xl">›</span>
          </button>`
        : ''
  const choix = (id: Longueur, nom: string, desc: string) => {
    const actif = longueur === id
    return `<button type="button" data-action="pr-longueur" data-valeur="${id}" aria-pressed="${actif}" class="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition ${actif ? 'bg-white ring-2 ring-boost dark:bg-neutral-900' : 'bg-white/60 ring-1 ring-neutral-200 dark:bg-neutral-900/50 dark:ring-neutral-800'}">
      <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-sm ${actif ? 'bg-boost text-neutral-950' : 'ring-2 ring-neutral-300 dark:ring-neutral-600'}">${actif ? '✓' : ''}</span>
      <span><span class="block font-semibold">${nom}</span><span class="block text-sm ${doux}">${desc}</span></span>
    </button>`
  }
  return `<div class="mx-auto max-w-xl space-y-6 px-4 py-6 sm:py-10">
    ${reprendre}
    <div>
      <h1 class="text-2xl font-bold">Pratique</h1>
      <p class="mt-2 ${lead} ${doux}">Une petite entreprise de services vit un mois. Tu inscris ses transactions au journal général, tu les reportes au grand livre, puis tu suis le cycle comptable jusqu’à la balance après clôture.</p>
    </div>
    <ol class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${phases
      .map(
        (ph, i) => `<li class="flex gap-3 px-4 py-3">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold dark:bg-neutral-800">${i + 1}</span>
          <span><span class="block font-semibold">${h(ph.nom)}</span><span class="block text-sm ${doux}">${h(ph.description)}</span></span>
        </li>`,
      )
      .join('')}</ol>
    <div class="space-y-3">
      ${choix('courte', 'Courte', '6 à 8 transactions et 3 ou 4 régularisations.')}
      ${choix('complete', 'Complète', '10 à 12 transactions et 4 régularisations ou plus.')}
    </div>
    <fieldset class="space-y-2">
      <legend class="text-sm font-semibold ${doux}">Le mois simulé</legend>
      <div class="flex flex-wrap gap-2">${(
        [
          ['hasard', 'Au hasard'],
          ['premier', 'Premier mois'],
          ['existante', 'Entreprise existante'],
        ] as const
      )
        .map(
          ([id, nom]) =>
            `<button type="button" data-action="pr-depart" data-valeur="${id}" aria-pressed="${depart === id}" class="rounded-full px-3 py-1.5 text-[15px] font-medium ring-1 ring-inset ${
              depart === id ? 'bg-boost text-neutral-950 ring-boost' : 'bg-white text-neutral-600 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700'
            }">${nom}</button>`,
        )
        .join('')}</div>
      <p class="text-sm ${pale}">${
        depart === 'premier'
          ? 'L’entreprise commence: le propriétaire y met son argent, et le grand livre part de zéro.'
          : depart === 'existante'
            ? 'L’entreprise roule déjà: le grand livre part des soldes de la fin du mois passé.'
            : 'Parfois le premier mois de l’entreprise, parfois une entreprise qui roule déjà.'
      }</p>
    </fieldset>
    <div class="grid gap-2">
      <button type="button" data-action="pr-nouvelle" class="${boutonPrincipal} text-lg">${p ? 'Nouvelle simulation' : 'Commencer'}</button>
      ${p ? `<button type="button" data-action="pr-refaire" class="${boutonSecondaire}">Refaire la même du début</button>` : ''}
    </div>
    <ul class="list-disc space-y-2 pl-5 text-[15px] leading-relaxed ${doux}">
      <li>Chaque simulation est différente: l’entreprise, les transactions et les montants changent.</li>
      <li>Bloqué? Le bouton Indice donne un coup de pouce, un peu plus gros à chaque fois. Tu peux aussi voir la réponse et continuer.</li>
      <li>Ta progression reste dans ce navigateur. Tu peux fermer la page et revenir plus tard.</li>
    </ul>
  </div>`
}

function finHtml(p: Partie): string {
  const ts = lesTaches(p)
  const sc = p.scenario
  const total = (f: (s: (typeof p.stats)[number]) => number) => p.stats.reduce((n, s) => n + f(s), 0)
  const premierCoup = p.stats.filter(s => !s.essais && !s.indices && !s.revele).length
  const cases = [
    ['Du premier coup', `${premierCoup} / ${ts.length}`],
    ['Essais ratés', String(total(s => s.essais))],
    ['Indices', String(total(s => s.indices))],
    ['Réponses vues', String(total(s => (s.revele ? 1 : 0)))],
  ]
  const nomTache = (t: Tache) =>
    t.type === 'ecriture'
      ? `${t.op.libelle} ${refTexte(t.op)}`
      : t.type === 'report'
        ? `Report de ${refTexte(t.op)}`
        : t.type === 'solde'
          ? `Solde du compte ${nomCompte(sc, t.compte)}`
          : t.type === 'balance'
            ? phaseParId[t.phase].nom
            : { resultats: 'État des résultats', capitaux: 'État des capitaux propres', bilan: 'Bilan' }[t.etat]
  const difficiles = ts.map((t, i) => ({ t, s: p.stats[i] })).filter(x => x.s.revele || x.s.essais >= 2 || x.s.indices >= 2)
  const parPhase = phases
    .map(ph => ({ ph, liste: difficiles.filter(x => x.t.phase === ph.id) }))
    .filter(x => x.liste.length)
    .map(
      ({ ph, liste }) => `<li class="p-4">
        <p class="font-semibold">${h(ph.nom)}</p>
        <ul class="mt-1 space-y-0.5 text-[15px] ${doux}">${liste
          .map(x => `<li>${h(nomTache(x.t))} <span class="${pale}">· ${x.s.revele ? 'réponse vue' : `${x.s.essais} essai${x.s.essais > 1 ? 's' : ''} raté${x.s.essais > 1 ? 's' : ''}, ${x.s.indices} indice${x.s.indices > 1 ? 's' : ''}`}</span></li>`)
          .join('')}</ul>
        <p class="mt-2 text-sm">${ph.aide.map(([nom, id]) => `<a href="#synthese/${id}" class="font-semibold underline underline-offset-2">${h(nom)}</a>`).join(' · ')}</p>
      </li>`,
    )
    .join('')
  const minutes = p.fin ? Math.max(1, Math.round((p.fin - p.debut) / 60000)) : 0
  const bvr = ts.findIndex(x => x.type === 'balance' && x.phase === 'balance-reg')
  const ch = chiffres(sc, situation(sc, ts, bvr).soldes)
  const sit = situation(sc, ts, ts.length)

  return `<div class="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-10">
    <div>
      <h1 class="text-2xl font-bold">Cycle terminé</h1>
      <p class="mt-1 ${lead} ${doux}">${h(sc.entreprise)}, ${h(nomMois(sc.mois))} ${sc.annee}. Bénéfice net de ${argent(ch.benefice)}. Tu as fait les ${phases.length} étapes du cycle${minutes > 1 && minutes < 600 ? `, en environ ${minutes} minutes de session` : ''}.</p>
    </div>
    <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">${cases
      .map(([nom, n]) => `<div class="${boite} p-3 text-center"><dt class="text-xs font-semibold ${pale}">${nom}</dt><dd class="text-2xl font-bold tabular-nums">${n}</dd></div>`)
      .join('')}</dl>
    ${
      parPhase
        ? `<div class="space-y-2"><h2 class="text-sm font-semibold uppercase tracking-wide ${pale}">À retravailler</h2><ul class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${parPhase}</ul></div>`
        : `<p class="${lead}">Rien à retravailler: aucune tâche n’a demandé plus d’un essai raté ou d’un indice.</p>`
    }
    <div class="grid gap-2">
      <button type="button" data-action="pr-nouvelle" class="${boutonPrincipal} text-lg">Nouvelle simulation</button>
      <button type="button" data-action="pr-refaire" class="${boutonSecondaire}">Refaire la même du début</button>
    </div>
    <div class="space-y-3">
      ${section('fin-journal', 'Journal général', `${enteteJournal()}<div class="divide-y divide-neutral-200 dark:divide-neutral-800">${[...sc.transactions, ...sc.regularisations, ...sc.cloture].map(op => ecritureJournal(sc, op)).join('')}</div>`, false)}
      ${section('fin-grand-livre', 'Grand livre', grandLivreHtml(p, sit, ts.length), false)}
      ${section('fin-etats', 'États financiers', `<div class="space-y-6">${(['resultats', 'capitaux', 'bilan'] as const).map(e => etatHtml(sc, e, ch)).join('')}</div>`, false)}
      ${section('fin-bac', 'Balance après clôture', balanceHtml(sc, sit.soldes, true), false)}
    </div>
  </div>`
}

export function pratiqueHtml(): string {
  const p = partie
  if (!p || vue === 'accueil') return accueilHtml()
  if (p.pos >= lesTaches(p).length) return finHtml(p)
  return partieHtml(p)
}
