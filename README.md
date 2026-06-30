# Plateforme Mairie — Prototype local V1.2

Prototype HTML / CSS / JavaScript natif pour tester l'interface en local avant passage à un backend.

## Contenu

- Agenda interne
  - multi-commissions
  - visibilité privé / restreint / public
  - favoris
  - création + modification + suppression
  - tri intelligent
- Notes personnelles
  - titre optionnel
  - commissions multiples
  - lien facultatif vers un événement
  - favoris
  - sauvegarde rapide

## Arborescence

```txt
projet-mairie-v1_2/
├── index.html
├── styles.css
├── main.js
├── README.md
└── modules/
    ├── agenda.js
    ├── groups.js
    ├── notes.js
    ├── storage.js
    └── utils.js
```

## Test local

1. Ouvrir le dossier dans VS Code
2. Utiliser l'extension Live Server
3. Lancer `index.html`
4. Vérifier la console navigateur (F12) si besoin

## LocalStorage

Clés utilisées :
- `mairie.events`
- `mairie.notes`
- `mairie.seeded.v1_2`

## Réinitialiser les données

Dans la console navigateur :

```js
localStorage.removeItem('mairie.events');
localStorage.removeItem('mairie.notes');
localStorage.removeItem('mairie.seeded.v1_2');
location.reload();
```
