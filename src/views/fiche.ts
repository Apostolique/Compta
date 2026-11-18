import { categorieParId, compteParId, comptes, ecritures, familleDe, paquets, type Compte } from '../data'
import { noteNom, suiviDe } from '../store'
import { couleurNote, h, miniCarPpp, nomFamille, puceCompte, resume } from '../ui'
import { ecritureHtml } from './synthese'

const repliable = 'group rounded-2xl bg-neutral-50 dark:bg-neutral-800/50'
const resumeRepliable =
  'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden'
const chevron = '<span aria-hidden="true" class="text-xl text-neutral-400 transition group-open:rotate-90">›</span>'

export function ficheHtml(c: Compte): string {
  const f = familleDe(c)
  const cat = categorieParId[c.categorie]
  const voisins = comptes.filter(x => x.categorie === c.categorie && x.id !== c.id)
  const exemples = ecritures.filter(e => e.debit.compte === c.id || e.credit.compte === c.id)

  const progression = paquets
    .map(p => {
      const s = suiviDe(`${p.id}:${c.id}`)
      const etiquette = s
        ? `<span class="font-semibold ${couleurNote[s.note].texte}">${h(noteNom[s.note])}</span>`
        : '<span class="text-neutral-500 dark:text-neutral-400">Jamais vue</span>'
      return `<li class="flex items-center justify-between gap-2 py-2"><span>${h(p.nom)}</span>${etiquette}</li>`
    })
    .join('')

  return `
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">${nomFamille(f)}</p>
      <h2 class="text-2xl font-bold leading-tight">${h(c.nom)}</h2>
    </div>
    <button type="button" data-action="fermer" aria-label="Fermer" class="-mr-2 -mt-1 rounded-full p-2 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">×</button>
  </div>

  <div class="mt-4">${miniCarPpp(f.id)}</div>
  <div class="mt-3">${resume(c)}</div>

  <p class="mt-4 text-[17px] leading-relaxed">${h(c.note ?? cat.description)}</p>

  <div class="mt-5 space-y-2">
    ${
      exemples.length
        ? `<details class="${repliable}">
            <summary class="${resumeRepliable}">Dans une écriture ${chevron}</summary>
            <div class="space-y-6 px-4 pb-4">${exemples.map(e => ecritureHtml(e, c.id)).join('')}</div>
          </details>`
        : ''
    }
    ${
      voisins.length
        ? `<details class="${repliable}">
            <summary class="${resumeRepliable}">Autres comptes de la catégorie ${h(cat.nom)} ${chevron}</summary>
            <div class="flex flex-wrap gap-2 px-4 pb-4">${voisins.map(v => puceCompte(v)).join('')}</div>
          </details>`
        : ''
    }
    <details class="${repliable}">
      <summary class="${resumeRepliable}">Tes cartes pour ce compte ${chevron}</summary>
      <ul class="divide-y divide-neutral-200 px-4 pb-2 text-[15px] dark:divide-neutral-700">${progression}</ul>
    </details>
  </div>

  <a href="#reviser/compte/${h(c.id)}" class="mt-5 block rounded-xl bg-boost px-4 py-3 text-center font-semibold text-neutral-950 hover:bg-boost-fonce">Réviser ce compte</a>
  `
}

let ouverte = false

export function ouvrirFiche(id: string) {
  const c = compteParId[id]
  if (!c) return
  const racine = document.getElementById('fiche')!
  const panneau = racine.querySelector<HTMLElement>('[data-panneau]')!
  panneau.innerHTML = ficheHtml(c)
  panneau.scrollTop = 0
  racine.classList.remove('hidden')
  document.documentElement.classList.add('overflow-hidden')
  ouverte = true
}

export function fermerFiche() {
  if (!ouverte) return
  document.getElementById('fiche')!.classList.add('hidden')
  document.documentElement.classList.remove('overflow-hidden')
  ouverte = false
}

export function ficheOuverte() {
  return ouverte
}
