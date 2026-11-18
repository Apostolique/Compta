# Compta

Étude de la comptabilité: cartes de révision et synthèse des débits et crédits.

Le site a trois pages. **Réviser** présente les cartes (catégorie de comptes, débiteur ou créditeur, état financier) et garde la note de chaque carte dans le navigateur. **Synthèse** reprend CAR PPP, l'équation comptable, des exemples d'écritures et les trois états financiers, avec chaque compte relié à sa fiche. **Comptes** liste les 49 comptes avec leurs trois réponses et ta progression.

Toutes les cartes viennent d'une seule table de comptes dans `src/data.ts`. Pour ajouter un compte, tu ajoutes une ligne avec sa catégorie et ses trois cartes sont créées automatiquement.

## Développement

```sh
npm install
npm run dev
```

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui construit le site et le publie sur la branche `gh-pages`. Dans les paramètres du dépôt, sous Pages, la source doit être « Deploy from a branch » avec `gh-pages` et `/ (root)`.
