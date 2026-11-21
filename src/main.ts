import './style.css'
import { compteParId, familleParId, type FamilleId } from './data'
import { effacerSuivi, exporterSuivi, importerSuivi, sauverSession, type Note } from './store'
import { comptesHtml, filtrerComptes } from './views/comptes'
import { fermerFiche, ficheOuverte, ouvrirFiche } from './views/fiche'
import { actionPratique, apresRenduPratique, basculerSection, calculerPratique, pratiqueHtml, saisirPratique, verifierPratique, type Suite } from './views/pratique'
import * as rev from './views/reviser'
import {
  centrerChiffrier,
  changerEtapeChiffrier,
  changerExemple,
  changerRegul,
  etapeChiffrier,
  syntheseHtml,
  trouverChapitre,
} from './views/synthese'

type Page = 'reviser' | 'synthese' | 'comptes' | 'pratique'

const main = document.getElementById('main')!
let pageActuelle: Page | null = null

function lireRoute(): { page: Page; reste: string[] } {
  const [page, ...reste] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (page === 'synthese' || page === 'comptes' || page === 'pratique') return { page, reste }
  return { page: 'reviser', reste }
}

function rendre() {
  const { page, reste } = lireRoute()

  if (page === 'reviser' && reste.length === 2) {
    if (reste[0] === 'famille' && reste[1] in familleParId) rev.demarrerFamille(reste[1] as FamilleId)
    if (reste[0] === 'compte' && compteParId[reste[1]]) rev.demarrerCompte(reste[1])
    history.replaceState(null, '', '#reviser')
  }

  fermerFiche()
  pageActuelle = page

  let ancre: string | undefined
  if (page === 'reviser') main.innerHTML = rev.reviserHtml()
  else if (page === 'synthese') {
    const cible = trouverChapitre(reste[0] ?? '')
    main.innerHTML = syntheseHtml(cible.chapitre)
    centrerChiffrier()
    ancre = cible.ancre
  } else if (page === 'pratique') {
    main.innerHTML = pratiqueHtml()
    apresRenduPratique()
  } else main.innerHTML = comptesHtml()

  document.querySelectorAll<HTMLAnchorElement>('[data-onglet]').forEach(a => {
    a.setAttribute('aria-current', a.dataset.onglet === page ? 'page' : 'false')
  })
  document.title = { reviser: 'Réviser', synthese: 'Synthèse', comptes: 'Comptes', pratique: 'Pratique' }[page] + ' · Compta'

  if (ancre) defiler(ancre)
  else window.scrollTo(0, 0)
}

function defiler(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (el instanceof HTMLDetailsElement) el.open = true
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'start' })
    el.classList.add('surbrillance')
    setTimeout(() => el.classList.remove('surbrillance'), 1500)
  })
}

// Les actions de révision changent seulement le contenu de la page. Sur téléphone, la carte défile
// dans sa propre zone: on garde sa position tant qu'on reste sur la même carte.
function rendreReviser() {
  const avant = main.querySelector<HTMLElement>('[data-defilement]')
  main.innerHTML = rev.reviserHtml()
  const apres = main.querySelector<HTMLElement>('[data-defilement]')
  if (avant && apres && avant.dataset.defilement === apres.dataset.defilement) apres.scrollTop = avant.scrollTop
}

// Garde la position de la page, sauf quand on passe à une autre tâche.
function rendrePratique(suite: Suite) {
  if (!suite) return
  main.innerHTML = pratiqueHtml()
  apresRenduPratique()
  if (suite === 'haut') {
    const tache = main.querySelector('[data-tache]')
    if (tache && tache.getBoundingClientRect().top < 0) tache.scrollIntoView({ block: 'start' })
    else if (!tache) window.scrollTo(0, 0)
  }
}

let confirmationEffacer = false

document.addEventListener('click', e => {
  const cible = e.target as HTMLElement
  const lien = cible.closest<HTMLAnchorElement>('a[href^="#"]')
  if (lien) {
    // Un lien vers la section déjà affichée ne déclenche pas « hashchange ».
    if (lien.getAttribute('href') === location.hash) {
      e.preventDefault()
      fermerFiche()
      const route = lireRoute()
      const ancre = route.page === 'synthese' ? trouverChapitre(route.reste[0] ?? '').ancre : undefined
      if (ancre) defiler(ancre)
    }
    return
  }

  const el = cible.closest<HTMLElement>('[data-action]')
  if (!el) {
    if (cible.closest('[data-fond]')) fermerFiche()
    return
  }
  const action = el.dataset.action!
  const valeur = el.dataset.valeur ?? ''

  if (action.startsWith('pr-')) {
    rendrePratique(actionPratique(action, el))
    return
  }

  switch (action) {
    case 'fiche':
      ouvrirFiche(el.dataset.id!)
      return
    case 'fermer':
      fermerFiche()
      return
    case 'choisir':
      rev.choisir(valeur)
      break
    case 'reveler':
      rev.reveler()
      break
    case 'noter':
      rev.noterCourante(valeur as Note)
      break
    case 'precedent':
      rev.precedent()
      break
    case 'suivant':
      rev.suivant()
      break
    case 'terminer':
      rev.terminer()
      break
    case 'recommencer':
      rev.recommencer(false)
      break
    case 'recommencer-difficiles':
      rev.recommencer(true)
      break
    case 'reglages':
      rev.afficherReglages()
      break
    case 'reprendre':
      rev.demarrerReglagesOuReprendre(false)
      break
    case 'demarrer':
      rev.demarrerReglagesOuReprendre(true)
      break
    case 'demarrer-difficiles':
      rev.demarrerDifficiles()
      break
    case 'exemple-prec':
    case 'exemple-suiv':
      changerExemple(action === 'exemple-prec' ? -1 : 1)
      main.innerHTML = syntheseHtml('ecritures')
      return
    case 'regul-prec':
    case 'regul-suiv':
      changerRegul(action === 'regul-prec' ? -1 : 1)
      main.innerHTML = syntheseHtml('regularisations')
      return
    case 'chiffrier-prec':
    case 'chiffrier-suiv':
    case 'chiffrier-etape':
      changerEtapeChiffrier(
        action === 'chiffrier-etape' ? Number(valeur) : etapeChiffrier() + (action === 'chiffrier-prec' ? -1 : 1),
      )
      main.innerHTML = syntheseHtml('chiffrier-exemple')
      centrerChiffrier()
      return
    case 'reglage-paquet':
    case 'reglage-filtre':
    case 'reglage-famille':
    case 'reglage-melanger':
    case 'reglage-ponderer':
    case 'reglage-tout-familles':
      rev.basculerReglage(action.replace('reglage-', ''), valeur)
      break
    case 'exporter':
      exporter()
      return
    case 'effacer':
      if (!confirmationEffacer) {
        confirmationEffacer = true
        el.textContent = 'Touche encore pour tout effacer'
        setTimeout(() => {
          confirmationEffacer = false
          if (el.isConnected) el.textContent = 'Tout effacer'
        }, 4000)
        return
      }
      confirmationEffacer = false
      effacerSuivi()
      sauverSession(null)
      rendre()
      return
    default:
      return
  }
  rendreReviser()
  if (['noter', 'precedent', 'suivant', 'demarrer', 'demarrer-difficiles', 'recommencer', 'recommencer-difficiles', 'reprendre', 'reglages', 'terminer'].includes(action)) {
    window.scrollTo(0, 0)
  }
})

function exporter() {
  const blob = new Blob([exporterSuivi()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `compta-progression-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

document.addEventListener('change', async e => {
  const input = e.target as HTMLInputElement
  if (input.matches('input[data-pr-champ]')) calculerPratique(input)
  if (!input.matches('[data-importer]') || !input.files?.[0]) return
  try {
    const n = importerSuivi(await input.files[0].text())
    rendre()
    message(`Sauvegarde importée: ${n} carte${n > 1 ? 's' : ''} mise${n > 1 ? 's' : ''} à jour.`, false)
  } catch (err) {
    message(err instanceof Error ? err.message : 'Fichier illisible.', true)
  }
})

function message(texte: string, erreur: boolean) {
  const el = document.querySelector<HTMLElement>('[data-message]')
  if (!el) return
  const repli = el.closest('details')
  if (repli) repli.open = true
  el.scrollIntoView({ block: 'center' })
  el.textContent = texte
  el.className = `text-sm font-medium ${erreur ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`
}

document.addEventListener('input', e => {
  const input = e.target as HTMLInputElement
  if (input.matches('[data-recherche-input]')) filtrerComptes(input.value)
  if (input.matches('[data-pr-champ]')) saisirPratique(input)
})

document.addEventListener('submit', e => {
  const form = e.target as HTMLElement
  if (!form.matches('[data-pr-form]')) return
  e.preventDefault()
  rendrePratique(verifierPratique())
})

// « toggle » ne remonte pas jusqu'au document: on l'écoute à la descente.
document.addEventListener(
  'toggle',
  e => {
    if (e.target instanceof HTMLDetailsElement && e.target.dataset.section) basculerSection(e.target)
  },
  true,
)

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === 'Escape' && ficheOuverte()) {
    fermerFiche()
    return
  }
  if (ficheOuverte() || pageActuelle !== 'reviser') return
  if ((e.target as HTMLElement).closest('input, textarea, select')) return
  if (rev.clavier(e)) {
    e.preventDefault()
    rendreReviser()
  }
})

window.addEventListener('hashchange', rendre)

// Demande au navigateur de ne pas effacer le stockage de lui-même (quand il le permet).
navigator.storage?.persist?.().catch(() => {})

rendre()
