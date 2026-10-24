# Préparer l’envoi sur GitHub

Le dépôt cible est `https://github.com/ryosama/slider-3d-viewer.git`. Les étapes ci-dessous s’exécutent depuis la racine du dépôt Git préparé.

## Envoyer les sources

Créez, si nécessaire, un dépôt GitHub vide nommé `ryosama/slider-3d-viewer`, sans README ni commit initial. Le remote `origin` et la branche `main` sont déjà préparés localement. Utilisez votre authentification Git habituelle ; n’insérez aucun jeton dans l’URL du remote.

```sh
git remote -v
git status
git push -u origin main
```

## Activer la démo

Dans GitHub : **Settings → Pages → Build and deployment → Source → GitHub Actions**. Le workflow `Démo statique` publie uniquement le HTML exporté ; il n’envoie pas les sources Go, les métadonnées Git ou les fichiers de configuration du dépôt sur le site.

Lancez le workflow manuellement si le premier push a précédé l’activation de Pages. Adresse attendue après déploiement : [https://ryosama.github.io/slider-3d-viewer/](https://ryosama.github.io/slider-3d-viewer/).

## Envoyer la release

Le tag local `v0.1.0` est préparé. Son envoi lance la compilation des exécutables et crée une release GitHub **en brouillon** avec les archives et les empreintes SHA-256 :

```sh
git push origin v0.1.0
```

Vérifiez le résultat du workflow, puis ouvrez **Releases** pour publier le brouillon. Les exécutables Linux et Windows sont ciblés en x64 (`amd64`). Pour fabriquer localement les mêmes catégories de fichiers :

```sh
go run ./tools/release -version v0.1.0
```

Les fichiers sont écrits dans `dist/v0.1.0/`, volontairement exclu de Git. Le workflow recompile depuis les sources du tag, avec le Go stable disponible sur GitHub ; les empreintes locales et distantes peuvent donc différer selon la version du compilateur.

`tools/export` est le même programme que l’exécutable Linux distribué. Pour disposer à cet emplacement d’une compilation locale avec les options de release :

```sh
CGO_ENABLED=0 go build -trimpath -buildvcs=false -ldflags="-s -w -buildid= -X main.version=v0.1.0" -o tools/export .
./tools/export --version
```

L’outil `tools/release` recompile les deux plateformes depuis les sources afin de garantir la version et les options de compilation. Il ne reprend pas aveuglément un exécutable local : une compilation ordinaire peut contenir des chemins personnels, et un exécutable Linux ne fonctionne pas sur Windows.

## Confidentialité

Les exécutables sont compilés avec `-trimpath`, sans informations VCS, symboles de débogage ni identifiant de build. Les archives ne contiennent pas les propriétaires et chemins locaux. Seules les images référencées par les diapositives sont embarquées dans un export HTML. Relisez vos propres contenus avant de les publier : l’outil ne supprime pas les informations personnelles écrites volontairement dans une diapositive, un SVG ou les métadonnées d’une photo.

Le commit initial utilise une identité collective générique. Les dossiers d’outils locaux, caches, clés et fichiers d’environnement sont ignorés et exclus du dépôt préparé.
