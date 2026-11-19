import {
  categorieParId,
  compteParId,
  comptes,
  ecritures,
  etats,
  familleDe,
  familleParId,
  familles,
  indices,
  colonneDe,
  colonnes,
  etapesCycle,
  lignesChiffrier,
  paquets,
  regularisations,
  soldeDe,
  type CategorieId,
  type ColonneId,
  type Ecriture,
  type EtatId,
  type Famille,
  type FamilleId,
} from '../data'
import { badgeSolde, couleurFamille, fondCote, h, montant, nomFamille, puceBase, puceCompte } from '../ui'

interface Chapitre {
  id: string
  titre: string
  sousTitre: string
  contenu: () => string
  // Page plus large pour un tableau. Le contenu centre lui-même son texte avec `texte`.
  large?: boolean
}

const lead = 'text-[17px] leading-relaxed'
const doux = 'text-neutral-600 dark:text-neutral-300'
const boite = 'rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800'

export function ecritureHtml(e: Ecriture & { calcul?: string }, focus?: string): string {
  const d = compteParId[e.debit.compte]
  const c = compteParId[e.credit.compte]
  const ligne = (compte: typeof d, m: number, cote: 'debit' | 'credit') => `
    <tr>
      <td class="py-1.5 ${cote === 'credit' ? 'pl-6' : ''}">${puceCompte(compte, focus === compte.id ? 'ring-2 ring-boost' : '')}</td>
      <td class="w-20 py-1.5 text-right tabular-nums">${cote === 'debit' ? montant(m) : ''}</td>
      <td class="w-20 py-1.5 text-right tabular-nums">${cote === 'credit' ? montant(m) : ''}</td>
    </tr>`
  return `<figure>
    <figcaption class="${lead} font-medium">${h(e.titre)}</figcaption>
    ${e.calcul ? `<p class="mt-2 inline-block rounded-lg bg-neutral-100 px-3 py-1 font-semibold tabular-nums dark:bg-neutral-800">${h(e.calcul)}</p>` : ''}
    <table class="mt-3 w-full text-sm">
      <thead class="text-xs text-neutral-500 dark:text-neutral-400">
        <tr><th class="text-left font-medium">Compte</th><th class="text-right font-medium">Débit</th><th class="text-right font-medium">Crédit</th></tr>
      </thead>
      <tbody>${ligne(d, e.debit.montant, 'debit')}${ligne(c, e.credit.montant, 'credit')}</tbody>
    </table>
    <p class="mt-3 text-[15px] leading-relaxed ${doux}">${h(e.pourquoi)}</p>
  </figure>`
}

// Le grand schéma CAR | PPP.
function schema(): string {
  const lettre = (id: FamilleId) =>
    `<a href="#synthese/famille-${id}" class="${couleurFamille[id].texte}">${h(familleParId[id].lettre)}</a>`
  const colonne = (ids: FamilleId[], solde: 'debiteur' | 'crediteur', fond: string, role: string, regle: string) => `
    <div class="${fond} px-3 py-5 sm:p-6">
      <p class="flex justify-center gap-3 text-4xl font-black sm:gap-4 sm:text-5xl">${ids.map(lettre).join('')}</p>
      <ul class="mt-3 space-y-0.5 text-[15px]">${ids.map(id => `<li>${nomFamille(familleParId[id])}</li>`).join('')}</ul>
      <p class="mt-3">${badgeSolde(solde)}</p>
      <p class="mt-3 text-sm ${doux}">${role}</p>
      <p class="mt-1 font-semibold">${regle}</p>
    </div>`
  return `<div class="grid grid-cols-2 overflow-hidden rounded-2xl text-center ring-1 ring-neutral-200 dark:ring-neutral-800">
    ${colonne(['charges', 'actifs', 'retraits'], 'debiteur', fondCote.debiteur, 'Où la valeur va', 'Débit ↑ Crédit ↓')}
    ${colonne(['passifs', 'capitaux', 'produits'], 'crediteur', `border-l border-neutral-200 dark:border-neutral-800 ${fondCote.crediteur}`, 'D’où la valeur vient', 'Débit ↓ Crédit ↑')}
  </div>`
}

const resumeRepliable = 'flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden'
const chevron = '<span aria-hidden="true" class="text-xl text-neutral-400 transition group-open:rotate-90">›</span>'

function familleRepliable(f: Famille): string {
  const membres = comptes.filter(c => familleDe(c).id === f.id)
  const parCategorie = new Map<CategorieId, typeof membres>()
  for (const c of membres) parCategorie.set(c.categorie, [...(parCategorie.get(c.categorie) ?? []), c])
  const col = couleurFamille[f.id]
  const groupes = [...parCategorie.entries()]
    .map(([catId, liste]) => {
      const cat = categorieParId[catId]
      return `<div>
        <p class="font-semibold">${h(cat.nom)}</p>
        <p class="text-sm ${doux}">${h(cat.description)}</p>
        <div class="mt-2 flex flex-wrap gap-2">${liste.map(c => puceCompte(c)).join('')}</div>
      </div>`
    })
    .join('')

  return `<details id="famille-${f.id}" class="group scroll-mt-20 ${boite}">
    <summary class="${resumeRepliable}">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${col.puce}">${h(f.lettre)}</span>
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">${nomFamille(f)}</span>
        <span class="block text-sm ${doux}">${f.solde === 'debiteur' ? 'Débiteur' : 'Créditeur'} · ${membres.length} compte${membres.length > 1 ? 's' : ''}</span>
      </span>
      ${chevron}
    </summary>
    <div class="space-y-5 border-t border-neutral-200 p-4 dark:border-neutral-800">
      <p class="${lead}">${h(f.description)}</p>
      ${f.id === 'retraits' ? `<p class="text-[15px] ${doux}">Classé dans la catégorie Capitaux propres, mais il les diminue. C’est pour ça qu’il est du côté débit.</p>` : ''}
      ${groupes}
      <a href="#reviser/famille/${f.id}" class="inline-block font-semibold underline underline-offset-4">Réviser ces ${membres.length * paquets.length} cartes</a>
    </div>
  </details>`
}

let exemple = 0

export function changerExemple(delta: number) {
  exemple = (exemple + delta + ecritures.length) % ecritures.length
}

let regul = 0

export function changerRegul(delta: number) {
  regul = (regul + delta + regularisations.length) % regularisations.length
}

const navigation = (action: string, texte: string) => `<div class="flex items-center justify-between">
    <button type="button" data-action="${action}-prec" aria-label="Précédent" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">←</button>
    <span class="text-sm tabular-nums ${doux}">${texte}</span>
    <button type="button" data-action="${action}-suiv" aria-label="Suivant" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">→</button>
  </div>`

// --- Chiffrier d'exemple ---

type Paire = { d: number; c: number }
const zero = (): Paire => ({ d: 0, c: 0 })

interface LigneCalculee {
  id: string
  nom: string
  famille: FamilleId
  bv: Paire
  reg: Paire & { lettresD: string[]; lettresC: string[] }
  bvr: Paire
  res: Paire
  bil: Paire
}

function calculerChiffrier() {
  const lignes: LigneCalculee[] = lignesChiffrier.map(l => {
    const compte = compteParId[l.compte]
    const bv = soldeDe(compte) === 'debiteur' ? { d: l.solde, c: 0 } : { d: 0, c: l.solde }
    const rD = regularisations.filter(r => r.debit.compte === l.compte)
    const rC = regularisations.filter(r => r.credit.compte === l.compte)
    const reg = {
      d: rD.reduce((s, r) => s + r.debit.montant, 0),
      c: rC.reduce((s, r) => s + r.credit.montant, 0),
      lettresD: rD.map(r => r.lettre),
      lettresC: rC.map(r => r.lettre),
    }
    const net = bv.d + reg.d - bv.c - reg.c
    const bvr = { d: Math.max(net, 0), c: Math.max(-net, 0) }
    const versResultats = familleDe(compte).etat === 'resultats'
    return {
      id: compte.id,
      nom: l.nom ?? compte.nom,
      famille: familleDe(compte).id,
      bv,
      reg,
      bvr,
      res: versResultats ? bvr : zero(),
      bil: versResultats ? zero() : bvr,
    }
  })
  const total = (cle: 'bv' | 'reg' | 'bvr' | 'res' | 'bil'): Paire => ({
    d: lignes.reduce((s, l) => s + l[cle].d, 0),
    c: lignes.reduce((s, l) => s + l[cle].c, 0),
  })
  const totaux = { bv: total('bv'), reg: total('reg'), bvr: total('bvr'), res: total('res'), bil: total('bil') }
  const benefice = totaux.res.c - totaux.res.d

  // Les chiffres des états financiers, tirés des colonnes Bilan.
  let actifs = 0
  let passifs = 0
  let capital = 0
  let retraits = 0
  for (const l of lignes) {
    if (l.famille === 'actifs') actifs += l.bil.d - l.bil.c
    if (l.famille === 'passifs') passifs += l.bil.c
    if (l.famille === 'capitaux') capital += l.bil.c
    if (l.famille === 'retraits') retraits += l.bil.d
  }
  return { lignes, totaux, benefice, actifs, passifs, capital, retraits }
}

const nb = (n: number) => n.toLocaleString('fr-CA')

const etapesChiffrier: { nom: string; texte: (c: ReturnType<typeof calculerChiffrier>) => string }[] = [
  {
    nom: 'Balance non régularisée',
    texte: c =>
      `On recopie le solde de chaque compte du grand livre, du côté de son solde. Les comptes qui servent seulement aux régularisations ont une ligne vide pour l’instant. On additionne: les deux colonnes donnent <strong>${nb(c.totaux.bv.d)}</strong>.`,
  },
  {
    nom: 'Régularisations',
    texte: c =>
      `On inscrit les ${regularisations.length} <a href="#synthese/regularisations" class="underline underline-offset-2">régularisations</a>. La lettre à côté du montant relie chaque débit à son crédit. Les deux colonnes donnent <strong>${nb(c.totaux.reg.d)}</strong>.`,
  },
  {
    nom: 'Balance régularisée',
    texte: c =>
      `Ligne par ligne, on combine la balance et la régularisation. Du même côté, on additionne: Salaires 18 000 + 800 = 18 800 au débit. De côtés opposés, on soustrait: Fournitures de bureau 900 − 650 = 250 au débit. Les deux colonnes donnent <strong>${nb(c.totaux.bvr.d)}</strong>.`,
  },
  {
    nom: 'Classer',
    texte: () =>
      'Chaque montant de la balance régularisée est recopié une seule fois, <strong>du même côté</strong>. Les produits et les charges vont dans l’état des résultats. Tout le reste va au bilan, capital et retraits compris.',
  },
  {
    nom: 'Additionner',
    texte: c =>
      `On additionne les quatre colonnes. Elles ne balancent pas, et c’est normal: l’écart, c’est le bénéfice net. Résultats: ${nb(c.totaux.res.c)} − ${nb(c.totaux.res.d)} = <strong>${nb(c.benefice)}</strong>. Bilan: ${nb(c.totaux.bil.d)} − ${nb(c.totaux.bil.c)} = <strong>${nb(c.totaux.bil.d - c.totaux.bil.c)}</strong>. Les deux écarts doivent être pareils.`,
  },
  {
    nom: 'Bénéfice net',
    texte: c =>
      `On inscrit le bénéfice net de ${nb(c.benefice)} du côté le plus petit de chaque paire: au <strong>débit des résultats</strong> et au <strong>crédit du bilan</strong>, parce qu’il fait grossir le capital. Les colonnes balancent. Avec une perte nette, c’est l’inverse: crédit des résultats, débit du bilan.`,
  },
  {
    nom: 'États financiers',
    texte: () => 'Le chiffrier donne tous les chiffres des états financiers. Les contre-actifs sont soustraits de leur actif au bilan.',
  },
]

let etape = 0

export function etapeChiffrier() {
  return etape
}

export function changerEtapeChiffrier(n: number) {
  etape = Math.min(Math.max(n, 0), etapesChiffrier.length - 1)
}

// Après un rendu, fait défiler le tableau jusqu'aux colonnes de l'étape.
export function centrerChiffrier() {
  const boite = document.querySelector<HTMLElement>('[data-chiffrier]')
  const cible = boite?.querySelector<HTMLElement>('[data-active]')
  if (!boite || !cible) return
  const premiere = boite.querySelector<HTMLElement>('th')!
  boite.scrollLeft = cible.offsetLeft - premiere.offsetWidth
}

function chiffrierHtml(): string {
  const c = calculerChiffrier()
  const e = etape
  const groupes = [
    { cle: 'bv', nom: 'Balance non régularisée', visible: e >= 0, active: e === 0 },
    { cle: 'reg', nom: 'Régularisations', visible: e >= 1, active: e === 1 },
    { cle: 'bvr', nom: 'Balance régularisée', visible: e >= 2, active: e === 2 },
    { cle: 'res', nom: 'État des résultats', visible: e >= 3, active: e >= 3 && e <= 5 },
    { cle: 'bil', nom: 'Bilan', visible: e >= 3, active: e >= 3 && e <= 5 },
  ] as const
  const fondActif = 'bg-orange-50 dark:bg-orange-500/10'
  const cellule = (g: (typeof groupes)[number], cote: 'd' | 'c', contenu: string, extra = '') =>
    `<td class="min-w-[5.5rem] px-2 py-1.5 text-right ${cote === 'd' ? 'border-l border-neutral-200 dark:border-neutral-700' : ''} ${g.active ? fondActif : ''} ${extra}">${contenu}</td>`
  const montantCase = (n: number, lettres: string[] = []) =>
    n ? `${lettres.length ? `<span class="mr-1 text-xs text-neutral-400">(${lettres.join(', ')})</span>` : ''}${nb(n)}` : ''
  const nomCase = 'sticky left-0 z-10 bg-white px-3 py-1.5 dark:bg-neutral-900'

  const lignes = c.lignes
    .map(l => {
      const cases = groupes
        .map(g => {
          if (!g.visible) return cellule(g, 'd', '') + cellule(g, 'c', '')
          if (g.cle === 'reg') return cellule(g, 'd', montantCase(l.reg.d, l.reg.lettresD)) + cellule(g, 'c', montantCase(l.reg.c, l.reg.lettresC))
          return cellule(g, 'd', montantCase(l[g.cle].d)) + cellule(g, 'c', montantCase(l[g.cle].c))
        })
        .join('')
      return `<tr class="border-t border-neutral-100 dark:border-neutral-800">
        <th scope="row" class="${nomCase} min-w-[10rem] max-w-[13rem] text-left font-normal">
          <button type="button" data-action="fiche" data-id="${h(l.id)}" class="flex items-start gap-2 text-left hover:underline"><span class="mt-[7px] size-2 shrink-0 rounded-full ${couleurFamille[l.famille].point}"></span>${h(l.nom)}</button>
        </th>${cases}</tr>`
    })
    .join('')

  const totalVisible = (g: (typeof groupes)[number]) => g.visible && (g.cle === 'bv' || g.cle === 'reg' || g.cle === 'bvr' || e >= 4)
  const ligneTotal = (titre: string, paire: (g: (typeof groupes)[number]) => Paire | null, gras = true) =>
    `<tr class="border-t-2 border-neutral-300 dark:border-neutral-600 ${gras ? 'font-semibold' : ''}">
      <th scope="row" class="${nomCase} text-left">${titre}</th>
      ${groupes
        .map(g => {
          const p = paire(g)
          return cellule(g, 'd', p ? montantCase(p.d) : '') + cellule(g, 'c', p ? montantCase(p.c) : '')
        })
        .join('')}
    </tr>`

  const benefice = c.benefice
  const lignesFin =
    e >= 5
      ? ligneTotal(benefice >= 0 ? 'Bénéfice net' : 'Perte nette', g =>
          g.cle === 'res'
            ? benefice >= 0 ? { d: benefice, c: 0 } : { d: 0, c: -benefice }
            : g.cle === 'bil'
              ? benefice >= 0 ? { d: 0, c: benefice } : { d: -benefice, c: 0 }
              : null,
        ) +
        ligneTotal('Total', g => {
          if (g.cle === 'res') return { d: Math.max(c.totaux.res.d, c.totaux.res.c), c: Math.max(c.totaux.res.d, c.totaux.res.c) }
          if (g.cle === 'bil') return { d: Math.max(c.totaux.bil.d, c.totaux.bil.c), c: Math.max(c.totaux.bil.d, c.totaux.bil.c) }
          return null
        })
      : ''

  const entete = groupes
    .map(
      g =>
        `<th colspan="2" ${g.active ? 'data-active' : ''} class="border-l border-neutral-200 px-2 py-2 text-center font-semibold dark:border-neutral-700 ${g.active ? fondActif : ''}">${h(g.nom)}</th>`,
    )
    .join('')
  const sousEntete = groupes
    .map(
      g =>
        `<th class="border-l border-neutral-200 px-2 pb-2 text-right font-medium dark:border-neutral-700 ${g.active ? fondActif : ''}">Débit</th><th class="px-2 pb-2 text-right font-medium ${g.active ? fondActif : ''}">Crédit</th>`,
    )
    .join('')

  const onglets = etapesChiffrier
    .map(
      (et, i) =>
        `<button type="button" data-action="chiffrier-etape" data-valeur="${i}" aria-pressed="${i === e}" class="rounded-lg px-3 py-1.5 text-sm font-semibold ${
          i === e ? 'bg-boost text-neutral-950' : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'
        }">${i + 1}. ${h(et.nom)}</button>`,
    )
    .join('')

  const etats =
    e === 6
      ? `<ul class="space-y-3">
          <li class="${boite} p-4"><p class="font-semibold">État des résultats</p><p class="tabular-nums ${doux}">Produits ${nb(c.totaux.res.c)} − Charges ${nb(c.totaux.res.d)} = Bénéfice net <strong>${nb(benefice)}</strong></p></li>
          <li class="${boite} p-4"><p class="font-semibold">État des capitaux propres</p><p class="tabular-nums ${doux}">Capital au début ${nb(c.capital)} + Bénéfice net ${nb(benefice)} − Retraits ${nb(c.retraits)} = Capital à la fin <strong>${nb(c.capital + benefice - c.retraits)}</strong></p></li>
          <li class="${boite} p-4"><p class="font-semibold">Bilan</p><p class="tabular-nums ${doux}">Actifs <strong>${nb(c.actifs)}</strong> = Passifs ${nb(c.passifs)} + Capital à la fin ${nb(c.capital + benefice - c.retraits)}</p></li>
        </ul>`
      : ''

  return `
    <div class="mx-auto max-w-2xl space-y-4">
      <p class="${lead}">Une petite entreprise de services au 31 décembre. Avance d’une étape à la fois. Touche un compte pour voir sa fiche.</p>
      <div class="flex flex-wrap gap-2">${onglets}</div>
      <div class="${boite} space-y-3 p-4">
        <p class="font-semibold">Étape ${e + 1}: ${h(etapesChiffrier[e].nom)}</p>
        <p class="text-[15px] leading-relaxed">${etapesChiffrier[e].texte(c)}</p>
      </div>
      ${etats}
      ${navigation('chiffrier', `Étape ${e + 1} sur ${etapesChiffrier.length}`)}
    </div>
    <div data-chiffrier class="mx-auto w-fit max-w-full overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <table class="border-collapse text-sm tabular-nums">
        <thead class="text-xs text-neutral-600 dark:text-neutral-300">
          <tr><th rowspan="2" class="${nomCase} text-left align-bottom font-semibold">Comptes</th>${entete}</tr>
          <tr>${sousEntete}</tr>
        </thead>
        <tbody>${lignes}</tbody>
        <tfoot>${ligneTotal('Total', g => (totalVisible(g) ? c.totaux[g.cle] : null))}${lignesFin}</tfoot>
      </table>
    </div>`
}

// --- Où va chaque compte au chiffrier ---

function colonnesHtml(): string {
  const contenu: Record<ColonneId, string[]> = {
    'resultats-debiteur': [],
    'resultats-crediteur': [],
    'bilan-debiteur': [],
    'bilan-crediteur': [],
  }
  for (const f of familles) {
    const normal = comptes.find(c => familleDe(c).id === f.id && !c.contre)
    if (normal) contenu[colonneDe(normal)].push(`<a href="#synthese/famille-${f.id}" class="font-semibold ${couleurFamille[f.id].texte}">${h(f.nom)}</a>`)
  }
  for (const f of familles) {
    const contres = comptes.filter(c => familleDe(c).id === f.id && c.contre)
    if (contres.length) {
      const nom = f.id === 'actifs' ? 'Contre-actifs' : f.id === 'produits' ? 'Contre-produits' : `Contre-${f.nom.toLowerCase()}`
      contenu[colonneDe(contres[0])].push(
        `<a href="#synthese/contre-comptes" class="font-semibold ${couleurFamille[f.id].texte}">${h(nom)}</a> <span class="text-sm ${doux}">(${contres.map(x => h(x.nom)).join(', ')})</span>`,
      )
    }
  }
  return `<div class="grid grid-cols-2 overflow-hidden rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800">${colonnes
    .map((col, i) => {
      const fond = col.id.endsWith('debiteur') ? fondCote.debiteur : `border-l border-neutral-200 dark:border-neutral-800 ${fondCote.crediteur}`
      return `<div class="${fond} ${i >= 2 ? 'border-t border-neutral-200 dark:border-neutral-800' : ''} p-4">
        <p class="text-sm font-semibold ${doux}">${h(col.nom)}</p>
        <ul class="mt-2 space-y-1">${contenu[col.id].map(x => `<li>${x}</li>`).join('')}</ul>
      </div>`
    })
    .join('')}</div>`
}

const chapitres: Chapitre[] = [
  {
    id: 'debit-credit',
    titre: 'Débit et crédit',
    sousTitre: 'Le débit à gauche, le crédit à droite',
    contenu: () => `
      <p class="${lead}">Chaque transaction touche au moins deux comptes. On inscrit un montant au <strong>débit</strong> d’un compte et le même montant au <strong>crédit</strong> d’un autre.</p>
      <div class="grid grid-cols-2 overflow-hidden rounded-2xl text-center ring-1 ring-neutral-200 dark:ring-neutral-800">
        <div class="${fondCote.debiteur} p-5"><p class="text-2xl font-bold">Débit</p><p class="${doux}">à gauche</p></div>
        <div class="border-l border-neutral-200 dark:border-neutral-800 ${fondCote.crediteur} p-5"><p class="text-2xl font-bold">Crédit</p><p class="${doux}">à droite</p></div>
      </div>
      <ul class="list-disc space-y-3 pl-5 ${lead}">
        <li>Ce ne sont que des côtés. Rien de plus.</li>
        <li>Un crédit n’est pas une bonne nouvelle, un débit n’est pas une mauvaise nouvelle.</li>
        <li>Ce ne sont pas des + et des −. Un débit fait monter certains comptes et descendre d’autres. Le prochain chapitre explique lesquels.</li>
      </ul>
      <details id="banque" class="group scroll-mt-20 ${boite}">
        <summary class="${resumeRepliable}"><span class="flex-1 font-semibold">Pourquoi la banque dit le contraire?</span>${chevron}</summary>
        <div class="space-y-3 border-t border-neutral-200 p-4 text-[15px] leading-relaxed dark:border-neutral-800">
          <p>Pour la banque, ton compte-chèque est de l’argent qu’elle te doit. C’est un <strong>passif</strong> pour elle, alors quand il augmente, elle le <strong>crédite</strong>.</p>
          <p>Pour toi, ce même argent est un <strong>actif</strong> (${puceCompte(compteParId.encaisse)}). Quand il augmente, tu le <strong>débites</strong>.</p>
        </div>
      </details>`,
  },
  {
    id: 'car-pcp',
    titre: 'CAR PPP',
    sousTitre: 'Le côté naturel de chaque compte',
    contenu: () => `
      <p class="${lead}">Les comptes de <strong>CAR</strong> vivent à gauche. Ceux de <strong>PPP</strong> vivent à droite. Un compte <strong>augmente</strong> quand on l’inscrit de son propre côté.</p>
      ${schema()}
      <p class="text-[15px] ${doux}">Touche une famille pour voir ses comptes.</p>
      <div class="space-y-3">${familles.map(familleRepliable).join('')}</div>`,
  },
  {
    id: 'equation',
    titre: 'L’équation comptable',
    sousTitre: 'D’où vient CAR = PPP',
    contenu: () => {
      const l = (id: FamilleId) => `<span class="${couleurFamille[id].texte}">${h(familleParId[id].lettre)}</span>`
      return `
      <p class="${lead}">Tout part de l’équation du bilan.</p>
      <p class="${boite} p-4 text-center text-lg font-semibold">Actifs = Passifs + Capitaux propres</p>
      <p class="${lead}">Les capitaux propres grossissent avec les produits alors qu’ils rapetissent avec les charges et les retraits. On remplace les capitaux propres par leurs morceaux, puis on fait passer ce qui est soustrait de l’autre côté.</p>
      <p class="${boite} p-4 text-center text-lg font-semibold">Charges + Actifs + Retraits<br>= Passifs + Capital + Produits</p>
      <p class="text-center text-4xl font-black tracking-wide">${l('charges')}${l('actifs')}${l('retraits')} = ${l('passifs')} ${l('capitaux')} ${l('produits')}</p>
      <p class="${lead}">C’est pour ça que le total des débits égale toujours le total des crédits.</p>`
    },
  },
  {
    id: 'ecritures',
    titre: 'Des exemples',
    sousTitre: 'Six écritures à voir une à la fois',
    contenu: () => `
      <p class="${lead}">Le compte débité est inscrit en premier. Le compte crédité est décalé vers la droite.</p>
      <div class="${boite} p-4 sm:p-5">${ecritureHtml(ecritures[exemple])}</div>
      <div class="flex items-center justify-between">
        <button type="button" data-action="exemple-prec" aria-label="Exemple précédent" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">←</button>
        <span class="text-sm tabular-nums ${doux}">Exemple ${exemple + 1} sur ${ecritures.length}</span>
        <button type="button" data-action="exemple-suiv" aria-label="Exemple suivant" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">→</button>
      </div>`,
  },
  {
    id: 'etats',
    titre: 'Les états financiers',
    sousTitre: 'Trois rapports à préparer dans l’ordre',
    contenu: () => `
      <p class="${lead}">On les prépare dans cet ordre, parce que chacun donne un chiffre au suivant.</p>
      <div>${etats
        .map((e, i) => {
          const fams = familles.filter(f => f.etat === e.id)
          const membres = comptes.filter(c => fams.some(f => f.id === familleDe(c).id))
          const fleche =
            i < etats.length - 1
              ? `<p class="py-2 text-center text-sm font-semibold ${doux}">↓ ${i === 0 ? 'le bénéfice net' : 'le capital à la fin'}</p>`
              : ''
          return `<details id="etat-${e.id}" class="group scroll-mt-20 ${boite}">
              <summary class="${resumeRepliable}">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-boost font-bold text-neutral-950">${i + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">${h(e.nom)}</span>
                  <span class="block text-[15px] ${doux}">${h(e.formule)}</span>
                </span>
                ${chevron}
              </summary>
              <div class="space-y-4 border-t border-neutral-200 p-4 dark:border-neutral-800">
                <p class="${lead}">${h(e.description)}</p>
                <div class="flex flex-wrap gap-2">${fams
                  .map(f => `<a href="#synthese/famille-${f.id}" class="${puceBase} bg-white ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">${nomFamille(f)}</a>`)
                  .join('')}</div>
                <div class="flex flex-wrap gap-2">${membres.map(c => puceCompte(c)).join('')}</div>
              </div>
            </details>${fleche}`
        })
        .join('')}</div>
      <p class="text-[15px] leading-relaxed ${doux}">Les comptes du propriétaire (capital, apports, retraits) vont dans l’état des capitaux propres. Le capital à la fin qui en sort est ensuite inscrit au bilan.</p>`,
  },
  {
    id: 'indices',
    titre: 'Indices dans le nom',
    sousTitre: 'Deviner la catégorie à partir des mots',
    contenu: () => `
      <p class="${lead}">Souvent, le nom du compte donne la réponse.</p>
      <ul class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${indices
        .map(i => {
          const cat = categorieParId[i.categorie]
          const fam = familleParId[cat.famille]
          return `<li class="p-4">
            <p class="font-semibold">${h(i.motif)} <span class="text-neutral-400">→</span> <a href="#synthese/famille-${fam.id}" class="${couleurFamille[fam.id].texte}">${h(cat.nom)}</a></p>
            <p class="mt-1 text-[15px] leading-relaxed ${doux}">${h(i.explication)} Par exemple ${i.exemples
              .map(id => `<button type="button" data-action="fiche" data-id="${h(id)}" class="underline underline-offset-2">${h(compteParId[id].nom)}</button>`)
              .join(', ')}.</p>
          </li>`
        })
        .join('')}</ul>`,
  },
  {
    id: 'cycle',
    titre: 'Le cycle comptable',
    sousTitre: 'Les étapes de chaque période, dans l’ordre',
    contenu: () => {
      const numeros = etapesCycle.flatMap((e, i) => (e.chiffrier ? [i + 1] : []))
      const premiere = numeros[0]
      const derniere = numeros[numeros.length - 1]
      return `
      <p class="${lead}">Le cycle comptable recommence à chaque période (un mois, un an). Les trois premières étapes se font pendant la période, à chaque transaction. Les autres se font à la fin.</p>
      <ol class="space-y-2">${etapesCycle
        .map(
          (e, i) => `<li class="flex gap-4 rounded-2xl p-4 ${e.chiffrier ? 'bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:ring-orange-500/30' : boite}">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full ${e.chiffrier ? 'bg-boost text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800'} font-bold">${i + 1}</span>
            <span class="min-w-0 flex-1">
              <span class="block font-semibold">${h(e.nom)}${e.chiffrier ? ` <span class="ml-1 rounded-md bg-boost/20 px-1.5 py-0.5 text-xs font-semibold">Chiffrier</span>` : ''}</span>
              <span class="mt-1 block text-[15px] leading-relaxed ${doux}">${h(e.description)}</span>
            </span>
          </li>`,
        )
        .join('')}</ol>
      <p class="${lead}">Le <a href="#synthese/chiffrier" class="font-semibold underline underline-offset-4">chiffrier</a> regroupe les étapes ${premiere} à ${derniere} sur une seule feuille. On y part de la balance de vérification et on arrive aux chiffres des états financiers.</p>
      <details class="group ${boite}">
        <summary class="${resumeRepliable}"><span class="flex-1 font-semibold">Comptes permanents et temporaires</span>${chevron}</summary>
        <div class="space-y-3 border-t border-neutral-200 p-4 text-[15px] leading-relaxed dark:border-neutral-800">
          <p>Les comptes du <strong>bilan</strong> (actifs, passifs, capital) sont <strong>permanents</strong>. Leur solde passe d’une période à l’autre: l’argent en banque le 31 décembre est encore là le 1er janvier.</p>
          <p>Les <strong>produits</strong>, les <strong>charges</strong> et les <strong>retraits</strong> sont <strong>temporaires</strong>. Ils mesurent une seule période, alors les écritures de clôture les remettent à zéro et versent leur effet dans le capital.</p>
        </div>
      </details>`
    },
  },
  {
    id: 'regularisations',
    titre: 'Les régularisations',
    sousTitre: 'Mettre les comptes à jour à la fin de la période',
    contenu: () => {
      const r = regularisations[regul]
      return `
      <p class="${lead}">À la fin de la période, certains soldes ne sont plus vrais. Les fournitures ont été utilisées, l’assurance a expiré, le camion s’est usé. Une régularisation corrige ça avant de préparer les états financiers.</p>
      <ul class="list-disc space-y-2 pl-5 ${lead}">
        <li>Chacune touche un compte de l’<strong>état des résultats</strong> et un compte du <strong>bilan</strong>.</li>
        <li>Aucune ne touche l’encaisse: aucun argent ne bouge.</li>
      </ul>
      <ul class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">
        <li class="p-4"><p class="font-semibold">Payé d’avance, puis consommé</p><p class="text-[15px] ${doux}">Charge ↑ au débit, actif ↓ au crédit. Fournitures, assurance, loyer, immatriculation.</p></li>
        <li class="p-4"><p class="font-semibold">Couru, mais pas encore payé</p><p class="text-[15px] ${doux}">Charge ↑ au débit, passif « à payer » ↑ au crédit. Intérêts, salaires.</p></li>
        <li class="p-4"><p class="font-semibold">Estimations</p><p class="text-[15px] ${doux}">Charge ↑ au débit, <a href="#synthese/contre-comptes" class="underline underline-offset-2">contre-actif</a> ↑ au crédit. Amortissement, dépréciation des clients.</p></li>
      </ul>
      <div class="${boite} space-y-3 p-4 sm:p-5">
        <p class="font-semibold text-boost-fonce">(${h(r.lettre)}) ${h(r.nom)}</p>
        ${ecritureHtml(r)}
      </div>
      ${navigation('regul', `Régularisation ${regul + 1} sur ${regularisations.length}`)}
      <p class="text-[15px] leading-relaxed ${doux}">Ce sont les mêmes que dans le <a href="#synthese/chiffrier-exemple" class="underline underline-offset-2">chiffrier pas à pas</a>, avec la même lettre.</p>`
    },
  },
  {
    id: 'chiffrier',
    titre: 'Le chiffrier',
    sousTitre: 'Dix colonnes, et où va chaque compte',
    contenu: () => `
      <p class="${lead}">Le chiffrier est une grande feuille de travail. On y part de la balance de vérification et on arrive aux chiffres des états financiers. Ce n’est pas un état financier: c’est le brouillon du comptable.</p>
      <ol class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${[
        ['Balance de vérification non régularisée', 'Les soldes du grand livre.'],
        ['Régularisations', 'Les ajustements de fin de période.'],
        ['Balance de vérification régularisée', 'Les deux premières paires combinées.'],
        ['État des résultats', 'Les produits et les charges.'],
        ['Bilan', 'Les actifs, les passifs, le capital et les retraits.'],
      ]
        .map(
          ([nom, desc], i) => `<li class="flex gap-4 p-4">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold dark:bg-neutral-800">${i + 1}</span>
            <span><span class="block font-semibold">${nom}</span><span class="block text-[15px] ${doux}">${desc}</span></span>
          </li>`,
        )
        .join('')}</ol>
      <p class="${lead}">Chaque paire a une colonne <strong>Débit</strong> et une colonne <strong>Crédit</strong>, donc dix colonnes en tout.</p>
      <h2 id="colonnes-chiffrier" class="scroll-mt-20 pt-2 text-xl font-bold">Où va chaque compte</h2>
      <p class="${lead}">Le côté ne change jamais: un solde débiteur reste au débit, un solde créditeur reste au crédit. La seule question, c’est résultats ou bilan.</p>
      ${colonnesHtml()}
      <p class="${lead}">Il n’y a pas de colonnes pour l’état des capitaux propres. Le capital et les retraits vont au bilan. On prépare ensuite l’état des capitaux propres avec ces deux lignes et le bénéfice net.</p>
      <p class="text-[15px] ${doux}">Le paquet <a href="#reviser" class="underline underline-offset-2">Colonne du chiffrier</a> pratique ça pour chaque compte.</p>
      <details id="contre-comptes" class="group scroll-mt-20 ${boite}">
        <summary class="${resumeRepliable}"><span class="flex-1 font-semibold">Les contre-comptes</span>${chevron}</summary>
        <div class="space-y-3 border-t border-neutral-200 p-4 text-[15px] leading-relaxed dark:border-neutral-800">
          <p>Un contre-compte est classé avec une famille, mais il la <strong>diminue</strong>. Son solde est donc du côté opposé.</p>
          <p><strong>Amortissement cumulé</strong> est une immobilisation au solde créditeur: il va au <strong>bilan crédit</strong>, même si c’est un actif. Au bilan, on le soustrait de l’immobilisation. Provision pour dépréciation fait la même chose avec Clients.</p>
          <p><strong>Escomptes sur ventes</strong> est un produit au solde débiteur: il va aux <strong>résultats débit</strong>.</p>
          <div class="flex flex-wrap gap-2">${comptes
            .filter(c => c.contre)
            .map(c => puceCompte(c))
            .join('')}</div>
        </div>
      </details>`,
  },
  {
    id: 'chiffrier-exemple',
    titre: 'Un chiffrier pas à pas',
    sousTitre: 'Un exemple rempli une étape à la fois',
    large: true,
    contenu: chiffrierHtml,
  },
  {
    id: 'pieges',
    titre: 'Les pièges à l’examen',
    sousTitre: 'Les erreurs fréquentes au chiffrier',
    contenu: () => `
      <ul class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${[
        ['L’inventaire donne ce qui reste', 'La régularisation des fournitures, c’est ce qui a été utilisé: le solde du compte moins l’inventaire.'],
        ['Les contre-actifs vont au bilan crédit', 'Amortissement cumulé et Provision pour dépréciation sont des actifs, mais leur solde est créditeur.'],
        ['Les retraits vont au bilan débit', 'Ce n’est pas une charge. Ils ne touchent pas l’état des résultats.'],
        ['Le bénéfice net va du côté le plus petit', 'Au débit des résultats et au crédit du bilan. Une perte nette fait l’inverse.'],
        ['Les deux écarts doivent être pareils', 'L’écart des résultats et l’écart du bilan donnent le même montant. Sinon, un compte est dans la mauvaise colonne.'],
        ['Un seul montant par ligne', 'Dans la balance régularisée, chaque compte a un seul montant. Il va dans une seule des quatre dernières colonnes, du même côté.'],
        ['Les nouveaux comptes ont leur ligne', 'Amortissement, Intérêts à payer, Fournitures utilisées: ils naissent avec les régularisations et doivent se rendre jusqu’aux états.'],
        ['Jamais l’encaisse dans une régularisation', 'Une régularisation touche un compte de résultats et un compte de bilan. Si l’encaisse bouge, c’est une transaction, pas une régularisation.'],
      ]
        .map(([titre, texte]) => `<li class="p-4"><p class="font-semibold">${titre}</p><p class="mt-1 text-[15px] leading-relaxed ${doux}">${texte}</p></li>`)
        .join('')}</ul>
      <details class="group ${boite}">
        <summary class="${resumeRepliable}"><span class="flex-1 font-semibold">Les totaux ne balancent pas?</span>${chevron}</summary>
        <div class="space-y-3 border-t border-neutral-200 p-4 text-[15px] leading-relaxed dark:border-neutral-800">
          <p>Calcule l’écart entre le débit et le crédit, puis regarde:</p>
          <ul class="list-disc space-y-2 pl-5">
            <li>L’écart est égal à un montant du chiffrier: ce montant a été <strong>oublié</strong>.</li>
            <li>La moitié de l’écart est égale à un montant: ce montant est <strong>du mauvais côté</strong>.</li>
            <li>L’écart se divise par 9: deux chiffres sont probablement <strong>inversés</strong> (540 écrit 450 donne un écart de 90).</li>
          </ul>
        </div>
      </details>`,
  },
]

// Les liens internes (famille-x, cat-x, etat-x) pointent vers un chapitre et un élément à ouvrir.
export function trouverChapitre(cible: string): { chapitre: string; ancre?: string } {
  if (chapitres.some(c => c.id === cible)) return { chapitre: cible }
  if (cible === 'banque') return { chapitre: 'debit-credit', ancre: 'banque' }
  if (cible === 'contre-comptes' || cible === 'colonnes-chiffrier') return { chapitre: 'chiffrier', ancre: cible }
  if (cible.startsWith('famille-')) return { chapitre: 'car-pcp', ancre: cible }
  if (cible.startsWith('cat-')) {
    const cat = categorieParId[cible.slice(4) as CategorieId]
    return { chapitre: 'car-pcp', ancre: cat ? `famille-${cat.famille}` : undefined }
  }
  if (cible.startsWith('etat-') && etats.some(e => e.id === (cible.slice(5) as EtatId))) return { chapitre: 'etats', ancre: cible }
  return { chapitre: '' }
}

function apercuHtml(): string {
  return `<div class="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:py-10">
    <div>
      <h1 class="text-2xl font-bold">Synthèse</h1>
      <p class="mt-2 ${lead} ${doux}">Tout tient dans ce schéma. Les chapitres l’expliquent un morceau à la fois.</p>
    </div>
    ${schema()}
    <ol class="divide-y divide-neutral-200 ${boite} dark:divide-neutral-800">${chapitres
      .map(
        (c, i) => `<li><a href="#synthese/${c.id}" class="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold dark:bg-neutral-800">${i + 1}</span>
          <span class="min-w-0 flex-1"><span class="block font-semibold">${h(c.titre)}</span><span class="block text-[15px] ${doux}">${h(c.sousTitre)}</span></span>
          <span aria-hidden="true" class="text-xl text-neutral-400">›</span>
        </a></li>`,
      )
      .join('')}</ol>
  </div>`
}

export function syntheseHtml(chapitreId: string): string {
  const i = chapitres.findIndex(c => c.id === chapitreId)
  if (i < 0) return apercuHtml()
  const c = chapitres[i]
  const lienNav = (ch: Chapitre | undefined, sens: 'prec' | 'suiv') =>
    ch
      ? `<a href="#synthese/${ch.id}" class="block ${boite} p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${sens === 'suiv' ? 'col-start-2 text-right' : ''}">
          <span class="block text-sm ${doux}">${sens === 'prec' ? '← Précédent' : 'Suivant →'}</span>
          <span class="block font-semibold">${h(ch.titre)}</span>
        </a>`
      : ''
  // Un chapitre large garde le texte à la largeur normale et laisse seulement le tableau s'étendre.
  const etroit = c.large ? 'mx-auto max-w-2xl' : ''
  return `<div class="mx-auto ${c.large ? 'max-w-7xl' : 'max-w-2xl'} space-y-6 px-4 py-6 sm:py-10">
    <div class="${etroit} flex items-center justify-between text-sm">
      <a href="#synthese" class="font-semibold ${doux} hover:underline">← Synthèse</a>
      <span class="tabular-nums ${doux}">${i + 1} / ${chapitres.length}</span>
    </div>
    <h1 class="${etroit} text-2xl font-bold">${h(c.titre)}</h1>
    ${c.contenu()}
    <nav class="${etroit} grid grid-cols-2 gap-3 pt-4">${lienNav(chapitres[i - 1], 'prec')}${lienNav(chapitres[i + 1], 'suiv')}</nav>
  </div>`
}
