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
  type CategorieId,
  type Ecriture,
  type EtatId,
  type Famille,
  type FamilleId,
} from '../data'
import { badgeSolde, couleurFamille, h, montant, nomFamille, puceBase, puceCompte } from '../ui'

interface Chapitre {
  id: string
  titre: string
  sousTitre: string
  contenu: () => string
}

const lead = 'text-[17px] leading-relaxed'
const doux = 'text-slate-600 dark:text-slate-300'
const boite = 'rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

export function ecritureHtml(e: Ecriture, focus?: string): string {
  const d = compteParId[e.debit.compte]
  const c = compteParId[e.credit.compte]
  const ligne = (compte: typeof d, m: number, cote: 'debit' | 'credit') => `
    <tr>
      <td class="py-1.5 ${cote === 'credit' ? 'pl-6' : ''}">${puceCompte(compte, focus === compte.id ? 'ring-2 ring-slate-900 dark:ring-white' : '')}</td>
      <td class="w-20 py-1.5 text-right tabular-nums">${cote === 'debit' ? montant(m) : ''}</td>
      <td class="w-20 py-1.5 text-right tabular-nums">${cote === 'credit' ? montant(m) : ''}</td>
    </tr>`
  return `<figure>
    <figcaption class="${lead} font-medium">${h(e.titre)}</figcaption>
    <table class="mt-3 w-full text-sm">
      <thead class="text-xs text-slate-500 dark:text-slate-400">
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
  return `<div class="grid grid-cols-2 overflow-hidden rounded-2xl text-center ring-1 ring-slate-200 dark:ring-slate-800">
    ${colonne(['charges', 'actifs', 'retraits'], 'debiteur', 'bg-indigo-50 dark:bg-indigo-950/50', 'Où la valeur va', 'Débit ↑ Crédit ↓')}
    ${colonne(['passifs', 'capitaux', 'produits'], 'crediteur', 'border-l border-slate-200 bg-orange-50 dark:border-slate-800 dark:bg-orange-950/40', 'D’où la valeur vient', 'Débit ↓ Crédit ↑')}
  </div>`
}

const resumeRepliable = 'flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden'
const chevron = '<span aria-hidden="true" class="text-xl text-slate-400 transition group-open:rotate-90">›</span>'

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
    <div class="space-y-5 border-t border-slate-200 p-4 dark:border-slate-800">
      <p class="${lead}">${h(f.description)}</p>
      ${f.id === 'retraits' ? `<p class="text-[15px] ${doux}">Classé dans la catégorie Capitaux propres, mais il les diminue. C’est pour ça qu’il est du côté débit.</p>` : ''}
      ${groupes}
      <a href="#reviser/famille/${f.id}" class="inline-block font-semibold underline underline-offset-4">Réviser ces ${membres.length * 3} cartes</a>
    </div>
  </details>`
}

let exemple = 0

export function changerExemple(delta: number) {
  exemple = (exemple + delta + ecritures.length) % ecritures.length
}

const chapitres: Chapitre[] = [
  {
    id: 'debit-credit',
    titre: 'Débit et crédit',
    sousTitre: 'Deux côtés, gauche et droite',
    contenu: () => `
      <p class="${lead}">Chaque transaction touche au moins deux comptes. On inscrit un montant au <strong>débit</strong> d’un compte et le même montant au <strong>crédit</strong> d’un autre.</p>
      <div class="grid grid-cols-2 overflow-hidden rounded-2xl text-center ring-1 ring-slate-200 dark:ring-slate-800">
        <div class="bg-indigo-50 p-5 dark:bg-indigo-950/50"><p class="text-2xl font-bold">Débit</p><p class="${doux}">à gauche</p></div>
        <div class="border-l border-slate-200 bg-orange-50 p-5 dark:border-slate-800 dark:bg-orange-950/40"><p class="text-2xl font-bold">Crédit</p><p class="${doux}">à droite</p></div>
      </div>
      <ul class="list-disc space-y-3 pl-5 ${lead}">
        <li>Ce ne sont que des côtés. Rien de plus.</li>
        <li>Un crédit n’est pas une bonne nouvelle, un débit n’est pas une mauvaise nouvelle.</li>
        <li>Ce ne sont pas des + et des −. Un débit fait monter certains comptes et descendre d’autres. Le prochain chapitre explique lesquels.</li>
      </ul>
      <details id="banque" class="group scroll-mt-20 ${boite}">
        <summary class="${resumeRepliable}"><span class="flex-1 font-semibold">Pourquoi la banque dit le contraire?</span>${chevron}</summary>
        <div class="space-y-3 border-t border-slate-200 p-4 text-[15px] leading-relaxed dark:border-slate-800">
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
      <p class="${lead}">Les capitaux propres grossissent avec les produits et rapetissent avec les charges et les retraits. On remplace les capitaux propres par leurs morceaux, puis on fait passer ce qui est soustrait de l’autre côté.</p>
      <p class="${boite} p-4 text-center text-lg font-semibold">Charges + Actifs + Retraits<br>= Passifs + Capital + Produits</p>
      <p class="text-center text-4xl font-black tracking-wide">${l('charges')}${l('actifs')}${l('retraits')} = ${l('passifs')} ${l('capitaux')} ${l('produits')}</p>
      <p class="${lead}">C’est pour ça que le total des débits égale toujours le total des crédits.</p>`
    },
  },
  {
    id: 'ecritures',
    titre: 'Des exemples',
    sousTitre: 'Six écritures, une à la fois',
    contenu: () => `
      <p class="${lead}">Le compte débité est inscrit en premier. Le compte crédité est décalé vers la droite.</p>
      <div class="${boite} p-4 sm:p-5">${ecritureHtml(ecritures[exemple])}</div>
      <div class="flex items-center justify-between">
        <button type="button" data-action="exemple-prec" aria-label="Exemple précédent" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">←</button>
        <span class="text-sm tabular-nums ${doux}">Exemple ${exemple + 1} sur ${ecritures.length}</span>
        <button type="button" data-action="exemple-suiv" aria-label="Exemple suivant" class="rounded-xl px-5 py-2.5 text-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">→</button>
      </div>`,
  },
  {
    id: 'etats',
    titre: 'Les états financiers',
    sousTitre: 'Trois rapports, dans cet ordre',
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
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white dark:bg-white dark:text-slate-900">${i + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">${h(e.nom)}</span>
                  <span class="block text-[15px] ${doux}">${h(e.formule)}</span>
                </span>
                ${chevron}
              </summary>
              <div class="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800">
                <p class="${lead}">${h(e.description)}</p>
                <div class="flex flex-wrap gap-2">${fams
                  .map(f => `<a href="#synthese/famille-${f.id}" class="${puceBase} bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">${nomFamille(f)}</a>`)
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
      <ul class="divide-y divide-slate-200 ${boite} dark:divide-slate-800">${indices
        .map(i => {
          const cat = categorieParId[i.categorie]
          const fam = familleParId[cat.famille]
          return `<li class="p-4">
            <p class="font-semibold">${h(i.motif)} <span class="text-slate-400">→</span> <a href="#synthese/famille-${fam.id}" class="${couleurFamille[fam.id].texte}">${h(cat.nom)}</a></p>
            <p class="mt-1 text-[15px] leading-relaxed ${doux}">${h(i.explication)} Par exemple ${i.exemples
              .map(id => `<button type="button" data-action="fiche" data-id="${h(id)}" class="underline underline-offset-2">${h(compteParId[id].nom)}</button>`)
              .join(', ')}.</p>
          </li>`
        })
        .join('')}</ul>`,
  },
]

// Les liens internes (famille-x, cat-x, etat-x) pointent vers un chapitre et un élément à ouvrir.
export function trouverChapitre(cible: string): { chapitre: string; ancre?: string } {
  if (chapitres.some(c => c.id === cible)) return { chapitre: cible }
  if (cible === 'banque') return { chapitre: 'debit-credit', ancre: 'banque' }
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
    <ol class="divide-y divide-slate-200 ${boite} dark:divide-slate-800">${chapitres
      .map(
        (c, i) => `<li><a href="#synthese/${c.id}" class="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold dark:bg-slate-800">${i + 1}</span>
          <span class="min-w-0 flex-1"><span class="block font-semibold">${h(c.titre)}</span><span class="block text-[15px] ${doux}">${h(c.sousTitre)}</span></span>
          <span aria-hidden="true" class="text-xl text-slate-400">›</span>
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
      ? `<a href="#synthese/${ch.id}" class="block ${boite} p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${sens === 'suiv' ? 'col-start-2 text-right' : ''}">
          <span class="block text-sm ${doux}">${sens === 'prec' ? '← Précédent' : 'Suivant →'}</span>
          <span class="block font-semibold">${h(ch.titre)}</span>
        </a>`
      : ''
  return `<div class="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-10">
    <div class="flex items-center justify-between text-sm">
      <a href="#synthese" class="font-semibold ${doux} hover:underline">← Synthèse</a>
      <span class="tabular-nums ${doux}">${i + 1} / ${chapitres.length}</span>
    </div>
    <h1 class="text-2xl font-bold">${h(c.titre)}</h1>
    ${c.contenu()}
    <nav class="grid grid-cols-2 gap-3 pt-4">${lienNav(chapitres[i - 1], 'prec')}${lienNav(chapitres[i + 1], 'suiv')}</nav>
  </div>`
}
