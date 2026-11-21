# Compta

Étude de la comptabilité: cartes de révision et synthèse des débits et crédits.

Le site a quatre pages. **Réviser** présente les cartes (catégorie de comptes, débiteur ou créditeur, état financier, colonne du chiffrier) et garde la note de chaque carte dans le navigateur. **Synthèse** reprend CAR PPP, l'équation comptable, des exemples d'écritures et les trois états financiers, puis le cycle comptable, les régularisations et le chiffrier, avec un chiffrier rempli une étape à la fois. Chaque compte est relié à sa fiche. **Comptes** liste les 61 comptes avec leurs réponses et ta progression. **Pratique** fait passer par tout le cycle comptable avec un mois d’une petite entreprise de services: journal général, grand livre, balance de vérification, régularisations, états financiers et clôture. Chaque simulation est tirée au hasard: parfois le premier mois de l’entreprise, qui part de zéro avec la mise de fonds du propriétaire, parfois une entreprise qui roule déjà. Elle donne des indices quand on bloque et garde sa progression dans le navigateur.

La simulation vient de `src/pratique.ts`. Chaque transaction est un gabarit qui tire ses montants au hasard, et toutes les réponses (soldes, balances, états, clôture) sont calculées à partir des écritures.

Toutes les cartes viennent d'une seule table de comptes dans `src/data.ts`. Pour ajouter un compte, tu ajoutes une ligne avec sa catégorie. Ses quatre cartes sont créées à partir de cette ligne. Un contre-compte (Amortissement cumulé, par exemple) prend `contre: true`, ce qui inverse son solde.

## Développement

```sh
npm install
npm run dev
```

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui construit le site et le publie sur la branche `gh-pages`. Dans les paramètres du dépôt, sous Pages, la source doit être « Deploy from a branch » avec `gh-pages` et `/ (root)`.
