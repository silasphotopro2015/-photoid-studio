# Générer l'APK depuis un téléphone Android (sans PC)

Cette méthode utilise GitHub Actions (compilation dans le cloud). Il faut un compte GitHub.

1. Crée un compte ou connecte-toi sur https://github.com
2. Crée un dépôt (Repository) neuf, par exemple `photoid-studio`, et laisse-le Public pour la méthode la plus simple.
3. Décompresse le ZIP sur ton téléphone (Files/Gestionnaire de fichiers).
4. Dans le dépôt GitHub, utilise **Add file > Upload files** et téléverse le contenu du dossier `idphoto` décompressé (y compris le dossier `.github`). Si le navigateur mobile n'affiche pas les fichiers cachés, téléverse au minimum les fichiers ordinaires, puis ajoute le workflow séparément via **Add file > Create new file**, chemin `.github/workflows/build-apk.yml`, et colle le contenu du workflow fourni.
5. Valide (**Commit changes**) sur la branche `main`.
6. Va à l'onglet **Actions** du dépôt. Choisis **Build PhotoID Studio APK** et, si nécessaire, **Run workflow**. Attends que l'exécution soit verte.
7. Ouvre l'exécution réussie, descends à **Artifacts**, puis télécharge `PhotoID-Studio-debug-apk`.
8. Décompresse l'Artifact ZIP et ouvre `app-debug.apk`. Android peut demander d'autoriser l'installation depuis cette source (Chrome ou Files). N'autorise que pour ce téléchargement, puis installe.

Important : la compilation APK n'a pas été exécutée ici. Vérifie l'application après installation, notamment caméra, import galerie, traitement IA et export. Pour installer une PWA sans APK, il est plus simple de publier le site en HTTPS puis Chrome > ⋮ > Installer.
