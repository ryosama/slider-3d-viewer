# Orbite — Slider 3D Viewer

Lecteur de diapositives Markdown dans un carrousel circulaire 3D, en HTML, CSS et JavaScript natifs. Aucune dépendance, aucun CDN, aucun serveur.

[Démo statique](https://ryosama.github.io/slider-3d-viewer/) · [Téléchargements](https://github.com/ryosama/slider-3d-viewer/releases) · [Dépôt GitHub](https://github.com/ryosama/slider-3d-viewer)

La démo statique présente dix bureaux Linux. Pour l’essayer hors connexion, ouvrez directement `index.html`. Les releases proposent les exécutables Windows et Linux.

## Ouvrir la présentation

Double-cliquez sur **`index.html`** : ce fichier autonome contient la présentation de démonstration, ses dix diapositives et ses illustrations. Vous pouvez le copier seul sur une clé USB.

La présentation occupe la fenêtre, sans bandeau de titre ni pied de page. Les diapositives s’agrandissent avec l’espace disponible ; une navigation compacte reste accessible sous la scène. Utilisez un navigateur récent prenant en charge CSS 3D, `inert` et `color-mix`.

## Charger et modifier vos fichiers

1. Créez un dossier contenant `config.md`, vos diapositives et vos images.
2. Appuyez sur **O** et sélectionnez ce dossier. La sélection autorise le navigateur à lire les fichiers ; rien n’est téléversé.
3. Après une modification, sélectionnez de nouveau le dossier pour actualiser la présentation.

Les navigateurs empêchent généralement une page `file://` de lire arbitrairement les fichiers voisins. Il n’y a donc ni chargement automatique des `.md` voisins ni surveillance des modifications. Un rechargement de la page rétablit la démo intégrée. Le glisser-déposer de fichiers est possible pour une présentation à plat ; utilisez la sélection de dossier pour préserver les sous-dossiers.

### Structure d’exemple

```text
ma-presentation/
  config.md
  slides/
    introduction.md
    conclusion.md
  assets/
    schema.svg
```

```markdown
## order
- slides/introduction.md
- slides/conclusion.md

## theme
- slide-background-color: #171a20
- slide-transparency: 10%
- text-color: white
- breadcrumb-style: dotted

## transition
- when-slide-to-next: follow-breadcrumb
```

`order` est obligatoire et contient les chemins relatifs à `config.md`. Les sections utilisent des titres Markdown (`## order`, `## theme`, `## transition`) et des listes `- clé: valeur`. Les autres paramètres ont des valeurs par défaut ; consultez le `config.md` fourni pour la liste complète. Les noms de fichiers et les chemins sont sensibles à la casse.

## Écrire une diapositive

```markdown
# Introduction

![Mon schéma](../assets/schema.svg)

Une phrase avec du **gras**, de l’*italique* et du `code`.

- Un premier point
- Un deuxième point

[Conclusion](conclusion.md) · [Documentation](https://example.org)
```

Syntaxe prise en charge : titres, paragraphes, listes simples ordonnées ou non, images, liens, gras, italique, citations, séparateurs et blocs de code délimités par trois accents graves. Ce lecteur ne prétend pas couvrir tout CommonMark : pas de tableaux, listes imbriquées ou HTML brut. Le HTML est échappé. Les ancres de section dans les liens ne sont pas parcourues : un lien `autre.md#section` ouvre la diapositive correspondante.

Les liens entre diapositives et les images sont relatifs au fichier `.md`. Utilisez des chemins sans espaces ou encodez les espaces avec `%20`. Les images doivent être locales (SVG, PNG, JPEG, GIF, WebP, AVIF) et sélectionnées avec le dossier ; les images distantes ne sont pas chargées. Les liens externes HTTP(S) s’ouvrent dans un nouvel onglet et nécessitent Internet.

## Navigation et apparence

- `←` / `→` : précédente / suivante ; `Espace` : suivante.
- `Home` / `End` : première / dernière. Aucune boucle aux extrémités.
- Les dix boutons numérotés permettent un accès direct ; balayage horizontal sur écran tactile.
- `O` : charger un dossier de présentation. Pour le plein écran, utilisez la commande de votre navigateur (généralement `F11`).

Le carrousel utilise les transformations CSS 3D pour garder du texte et des liens HTML interactifs. La diapositive active est de face ; les voisines restent visibles selon la largeur de l’écran. Les longs contenus défilent dans leur diapositive. Le fil d’Ariane relie les diapositives dans le plan 3D.

Les bordures, couleurs, arrondis et polices utilisent des valeurs CSS. `slide-transparency: 10%` signifie 90 % d’opacité pour le fond, sans atténuer le texte. `breadcrumb-style` accepte `dotted`, `dashed`, `plain` ou `none` ; sa couleur par défaut est rouge. La police par défaut est Arial ; le fond général est noir et le texte blanc.

Les paramètres `when-slide-to-previous`, `when-slide-to-next` et `when-slide-to-another` acceptent `follow-breadcrumb` (déplacement circulaire) ou `zoom-out-zoom-in` (recul, rotation, rapprochement). Les vitesses sont des multiplicateurs positifs : `1` est la vitesse normale, `2` deux fois plus rapide (bornes : 0,1 à 10). `zoom-out-ratio` est un facteur de recul de 1 à 5, par défaut 1,7. La préférence système de réduction des animations supprime les transitions.

## Exporter une présentation autonome

Téléchargez l’exécutable adapté à votre système dans les releases : **Linux x64** ou **Windows x64**. L’exécutable embarque le lecteur complet et utilise uniquement la bibliothèque standard de Go. Aucun interpréteur, Go, Node.js ou bibliothèque externe n’est nécessaire pour l’utiliser.

Dans les archives, l’exécutable est nommé `orbite-export` sous Linux et `orbite-export.exe` sous Windows. Les téléchargements individuels portent aussi le système et l’architecture dans leur nom.

Depuis un terminal, indiquez le dossier de présentation et le HTML à créer. Les chemins contenant des espaces doivent être placés entre guillemets.

```sh
# Linux, depuis le dossier extrait de l’archive
./orbite-export --output mon-diaporama.html ./ma-presentation
```

```powershell
# Windows PowerShell
.\orbite-export.exe --output mon-diaporama.html .\ma-presentation
```

Le dossier courant est utilisé si aucun dossier n’est indiqué ; le fichier de sortie par défaut est `presentation.html`. `--help` affiche les options et `--version` la version. L’option `--label "Mon titre"` définit le nom de la collection. Les options peuvent être placées avant ou après le dossier.

Le HTML exporté inclut les diapositives, la configuration et uniquement les images locales référencées. Les fichiers manquants, les doublons et les chemins sortant du dossier interrompent l’export. Le nom et le chemin absolu du dossier ne sont pas ajoutés au HTML. Régénérez le fichier après avoir modifié ses sources.

Pour vérifier les téléchargements sous Linux, depuis le dossier contenant les exécutables, les archives et `SHA256SUMS` :

```sh
sha256sum -c SHA256SUMS
```

Sous PowerShell, utilisez `Get-FileHash .\orbite-export-windows-amd64.exe -Algorithm SHA256` et comparez le résultat à l’entrée correspondante dans `SHA256SUMS`.

## Compiler et préparer une release

Seule la compilation nécessite **Go 1.22 ou ultérieur**. Aucune dépendance Go externe n’est utilisée. Depuis la racine du dépôt :

```sh
CGO_ENABLED=0 go build -trimpath -buildvcs=false -ldflags="-s -w -buildid= -X main.version=v0.1.0" -o tools/export .
go run . --label "Démo intégrée" --output index.html --demo-js src/demo.js .
go run ./tools/release -version v0.1.0
```

La commande de compilation ci-dessus utilise un shell Linux. Le programme local se lance avec `./tools/export` et n’est pas versionné. Dans PowerShell, définissez `$env:CGO_ENABLED="0"`, puis exécutez la même commande `go build` sans le préfixe `CGO_ENABLED=0` et avec `-o tools/export.exe`.

L’outil de release produit les exécutables Linux/Windows `amd64`, une archive `.tar.gz` pour Linux, une archive `.zip` pour Windows et `SHA256SUMS` dans `dist/v0.1.0/`. Chaque archive contient aussi la documentation et la démonstration complète. Les exécutables fonctionnent sans le dossier `src/` à côté. Le binaire Linux de release est issu du même programme que `tools/export`, avec les mêmes options de compilation ; Windows dispose de sa propre compilation.

Le workflow CI vérifie Linux et Windows. Un tag `vX.Y.Z` déclenche la création d’une release GitHub en brouillon. Le workflow Pages publie seulement le HTML autonome. Consultez [PUBLISHING.md](PUBLISHING.md) pour envoyer le dépôt et activer ces publications.

## Organisation et vérifications

`export.go` exporte la présentation et embarque les fichiers du lecteur avec `go:embed`. `tools/release/` fabrique les archives. `src/core.js` analyse Markdown et configuration ; `src/app.js` gère la scène et les interactions ; `src/style.css` définit l’apparence. `src/template.html` fournit la structure HTML de l’export. `src/demo.js` et `index.html` sont générés. `slides/` et `assets/` contiennent les sources de la démo. Les SVG sont des illustrations originales, et non des captures officielles ; chaque diapositive cite le site du projet concerné.

```sh
go test ./...
go vet ./...
node tests/core.test.cjs
node --check src/app.js
```

Les tests couvrent l’analyse de configuration, les valeurs de repli, le rendu Markdown, les liens, les images embarquées, les options CLI et la protection de l’export. Node.js est nécessaire uniquement pour exécuter les tests JavaScript. Vérifiez aussi manuellement les transitions, les extrémités, le clavier, les liens, le chargement d’un dossier et le plein écran dans votre navigateur cible. Aucun taux de couverture minimal n’est imposé.
