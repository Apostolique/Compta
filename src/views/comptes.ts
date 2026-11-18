import { cartes, categorieParId, comptes, etatParId, familleDe, familles, paquets, soldeParId, type CategorieId } from '../data'
import { noteNom, notes, toutLeSuivi } from '../store'
import { couleurFamille, couleurNote, h, nomFamille, pointNote } from '../ui'

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function comptesHtml(): string {
  const suivi = toutLeSuivi()
  const vues = cartes.filter(c => suivi[c.id]).length
  const parNote = notes.map(n => ({ ...n, total: cartes.filter(c => suivi[c.id]?.note === n.id).length }))

  const groupes = familles
    .map(f => {
      const membres = comptes.filter(c => familleDe(c).id === f.id)
      const parCategorie = new Map<CategorieId, typeof membres>()
      for (const c of membres) parCategorie.set(c.categorie, [...(parCategorie.get(c.categorie) ?? []), c])

      const sousGroupes = [...parCategorie.entries()]
        .map(([catId, liste]) => {
          const cat = categorieParId[catId]
          const lignes = liste
            .map(c => {
              const recherche = sansAccents(`${c.nom} ${cat.nom} ${f.nom} ${etatParId[f.etat].nom}`)
              return `<li data-recherche="${h(recherche)}">
                <button type="button" data-action="fiche" data-id="${h(c.id)}" class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                  <span>${h(c.nom)}</span>
                  <span class="flex shrink-0 items-center gap-1">${paquets.map(p => pointNote(`${p.id}:${c.id}`)).join('')}</span>
                </button>
              </li>`
            })
            .join('')
          const titre = parCategorie.size > 1 || cat.nom !== f.nom ? `<p class="px-4 pt-3 text-sm text-neutral-500 dark:text-neutral-400">${h(cat.nom)}</p>` : ''
          return `<div data-sous-groupe>${titre}<ul>${lignes}</ul></div>`
        })
        .join('')

      return `<section data-groupe class="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
        <a href="#synthese/famille-${f.id}" class="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${couleurFamille[f.id].puce}">${h(f.lettre)}</span>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold">${nomFamille(f)}</span>
            <span class="block text-sm text-neutral-500 dark:text-neutral-400">${h(soldeParId[f.solde].nom)} · ${h(etatParId[f.etat].nom)}</span>
          </span>
        </a>
        ${sousGroupes}
      </section>`
    })
    .join('')

  return `<div class="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-10">
    <div>
      <h1 class="text-2xl font-bold">Comptes</h1>
      <p class="mt-2 text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-300">Touche un compte pour voir sa fiche.</p>
    </div>

    <input type="search" data-recherche-input placeholder="Chercher un compte" autocomplete="off"
      class="w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-neutral-300 outline-none focus:ring-2 focus:ring-boost dark:bg-neutral-900 dark:ring-neutral-700">

    <p class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      <span class="flex items-center gap-1">${pointNote('')}${pointNote('')}${pointNote('')}</span>
      Tes notes pour ${paquets.map(p => h(p.nom.toLowerCase().replace('?', ''))).join(', ')}
    </p>

    <div class="space-y-4">${groupes}</div>
    <p data-aucun class="hidden text-center text-neutral-500">Aucun compte trouvé.</p>

    <section id="progression" class="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-200 sm:p-5 dark:bg-neutral-900 dark:ring-neutral-800">
      <h2 class="text-lg font-bold">Ta progression</h2>
      <p class="text-[17px]"><strong class="tabular-nums">${vues}</strong> carte${vues > 1 ? 's' : ''} vue${vues > 1 ? 's' : ''} sur ${cartes.length}</p>
      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">${parNote
        .map(n => `<li class="flex items-center gap-1.5"><span class="size-2.5 rounded-full ${couleurNote[n.id].point}"></span>${h(noteNom[n.id])} <strong class="tabular-nums">${n.total}</strong></li>`)
        .join('')}</ul>
      <details class="group">
        <summary class="cursor-pointer text-[15px] font-semibold text-neutral-600 dark:text-neutral-300">Sauvegarde</summary>
        <div class="mt-3 space-y-3">
          <p class="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">La progression reste dans ce navigateur. Sur iPhone, Safari peut l’effacer après une semaine sans visite. Pour l’éviter, ajoute le site à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »), ou télécharge une sauvegarde de temps en temps.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="exporter" class="rounded-xl bg-boost px-4 py-2.5 font-semibold text-neutral-950 hover:bg-boost-fonce">Télécharger</button>
            <label class="cursor-pointer rounded-xl bg-neutral-100 px-4 py-2.5 font-semibold hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">
              Importer
              <input type="file" accept="application/json,.json" data-importer class="sr-only">
            </label>
            <button type="button" data-action="effacer" class="rounded-xl px-4 py-2.5 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-900 dark:hover:bg-red-950/40">Tout effacer</button>
          </div>
          <p data-message class="text-sm font-medium" role="status"></p>
        </div>
      </details>
    </section>
  </div>`
}

export function filtrerComptes(texte: string) {
  const q = sansAccents(texte.trim())
  let visibles = 0
  document.querySelectorAll<HTMLElement>('[data-groupe]').forEach(g => {
    let n = 0
    g.querySelectorAll<HTMLElement>('[data-sous-groupe]').forEach(sg => {
      let m = 0
      sg.querySelectorAll<HTMLElement>('li[data-recherche]').forEach(li => {
        const ok = !q || li.dataset.recherche!.includes(q)
        li.hidden = !ok
        if (ok) m++
      })
      sg.hidden = m === 0
      n += m
    })
    g.hidden = n === 0
    visibles += n
  })
  document.querySelector('[data-aucun]')?.classList.toggle('hidden', visibles > 0)
}
