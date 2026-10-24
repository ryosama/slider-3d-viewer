# Repository Guidelines

## Project Structure & Module Organization

Orbite is an offline Markdown presentation viewer. The browser player lives in `src/`: `core.js` parses Markdown, `app.js` handles the carousel, `style.css` defines appearance, and `template.html` provides the export layout. `export.go` embeds these sources and produces standalone HTML. `slides/`, `assets/`, and `config.md` define the demo. `index.html` and `src/demo.js` are generated files.

## Build, Test, and Development Commands

Use Go 1.22 or newer; no external Go modules are required. Run commands from the repository root:

- `go test ./...`: test export, CLI, and local file validation.
- `go vet ./...`: check Go code.
- `node tests/core.test.cjs`: test browser parsing utilities.
- `go run . --label "Démo intégrée" --output index.html --demo-js src/demo.js .`: regenerate the demo.
- `go run ./tools/release -version v0.1.0`: build Linux/Windows x64 executables and archives in `dist/`.

Open `index.html` directly to try the viewer. No server or runtime installation is required.

## Coding Style & Testing

Format Go with `gofmt`; use tabs in Go and two spaces in browser JavaScript. Keep browser code dependency-free and maintain offline operation. Add meaningful tests for parsing, export validation, and behavioral changes. Use Go's `TestName` convention in `*_test.go` and Node's built-in test runner in `tests/*.test.cjs`. No coverage threshold is imposed. Validate keyboard navigation and CSS 3D changes manually in a browser.

## Commits, Pull Requests & Releases

Use concise imperative commit subjects. Describe the change and validation in pull requests; include screenshots for visible changes and link issues when relevant. Regenerate HTML after editing player or demo sources. See `PUBLISHING.md` for GitHub Pages and draft releases. Never commit personal paths, credentials, caches, or release binaries. Build executables with path trimming and no VCS metadata; use a generic commit identity when preparing anonymous contributions.

## Instruction de developpement

Le projet consiste a faire une présentation en 3D de dispositive écrite en markdown et stocké dans des fichiers .md. Il existe un fichier config.md pour paramétrer l'affichage des diapos.

 - Le code est écrit en HTML/CSS/JS (surement three.js)
 - Il faut pouvoir se déplacer d'une diapo à une autre avec les fleches droite et gauche
 - La barre d'espace est identique à "fleche droite"
 - La touche "home" revient à la 1ere diapo
 - La touche "fin" va à la dernière diapo
 - Si on édite un ficheir .md, il faut que l'interface se remette a jour avec les modifications
 - On peut bien sur avoir des images dans les diapos
 - On peut avoir des liens externe cliquable
 - On peut avoir des liens entre les diapo pour passer de l'une a lautre très vite.
 
## Interface graphique

Les diapositives sont reliées entre elle par un "fil d'Arianne" (dont l'aspect est paramétrable avec les options "breadcrumb" dans config.md)
Chaque diapo est montée sur un carroussel dans un espace 3D. Quand on change de diapo, on se déplace dans le carroussel. 

## Le fichier config.md

- Il doit contenir une section "order" avec une liste du nom des diapos pour déterminer l'ordre
- Il doit contenir une section "theme" avec des paramètres d'apparence
   - slide-border-width (compatible avec la syntaxe css)
   - slide-border-color (compatible avec la syntaxe css)
   - slide-border-radius (compatible avec la syntaxe css)
   - slide-background-color (theme sombre par défaut)
   - slide-transparency (10% par défaut)
   - background-color (noir par défaut)
   - text-color (blanc par défaut)
   - font-face (arial par défaut)
   - breadcrumb-style (dotted|dashed|plain|none)
   - breadcrumb-color (rouge par defaut)
- On doit contenir une section "transition" qui décrit comment réagit l'interface au moment du changemnt de diapo avec quelques parametres :
  - when-slide-to-previous  : zoom-out-zoom-in|follow-breadcrumb
  - when-slide-to-next      : zoom-out-zoom-in|follow-breadcrumb
  - when-slide-to-another   : zoom-out-zoom-in|follow-breadcrumb
  - follow-breadcrumb-speed : avec une vitesse de déplacement configurable
  - zoom-out-ratio          : avec un niveau de zoom arriere
  - zoom-out-speed          : avec une vitesse de zoom arriere
  - zoom-in-speed           : avec une vitesse de zoom avant

## Tests

 - Pour les tests il faut avoir 10 diapositives sur le theme des logiciels environe ments de fenetre disponible sur linux (KDE, XFCE, Gnome, Afterstep...) Ca donnera des images, des liens externes et internes.