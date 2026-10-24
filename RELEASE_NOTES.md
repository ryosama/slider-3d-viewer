# Orbite v0.1.0

Première version du lecteur de présentations Markdown en carrousel 3D.

- Lecteur HTML autonome, utilisable hors connexion depuis une clé USB.
- Configuration Markdown, liens entre diapositives, images locales et transitions 3D.
- Navigation au clavier, au toucher et par accès direct.
- Dix diapositives de démonstration sur les bureaux Linux.
- Exporteur écrit en Go, avec le lecteur embarqué et sans dépendance à installer.

## Téléchargements

- **Windows x64** : archive `.zip` ou exécutable `orbite-export-windows-amd64.exe`.
- **Linux x64** : archive `.tar.gz` ou exécutable `orbite-export-linux-amd64`.
- **SHA256SUMS** : empreintes SHA-256 des exécutables et archives.

Chaque archive contient l’exécutable, la documentation, le lecteur autonome `index.html` et les sources Markdown et illustrations de la démonstration. Il n’est pas nécessaire d’installer Go pour utiliser l’exécutable.

Dans un terminal ouvert dans le dossier extrait :

```sh
# Linux
./orbite-export --output presentation.html .
```

```powershell
# Windows PowerShell
.\orbite-export.exe --output presentation.html .
```

Ouvrez ensuite `presentation.html` dans un navigateur récent. L’exécutable Windows est compilé pour Windows ; sa validation locale ne remplace pas une exécution sur ce système. Le workflow CI effectue les tests Go sur Windows et Linux.
