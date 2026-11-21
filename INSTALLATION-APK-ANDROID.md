# Construire l'APK Android de PhotoID Studio

Ce ZIP est le projet web original, avec une configuration Capacitor ajoutée pour l'emballer dans une application Android hors-ligne. **Ce n'est pas encore un APK compilé.**

## Pré-requis sur un ordinateur
- Android Studio récent
- Node.js LTS et npm
- Connexion Internet pour installer les outils de compilation une première fois

## Étapes
1. Décompresser ce ZIP sur l'ordinateur.
2. Ouvrir un terminal dans le dossier `idphoto`.
3. Exécuter : `npm install`
4. Exécuter : `npx cap add android`
5. Exécuter : `npx cap sync android`
6. Exécuter : `npx cap open android` (ouvre Android Studio).
7. Dans Android Studio, attendre la synchronisation Gradle, puis menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
8. Quand Android Studio indique que le build est terminé, cliquer sur **Locate**. Le fichier APK se trouve normalement dans `android/app/build/outputs/apk/debug/app-debug.apk`.
9. Transférer `app-debug.apk` sur le téléphone Android, ouvrir le fichier et autoriser l'installation depuis cette source si Android le demande.

## APK de test vs APK à distribuer
- `app-debug.apk` : installation pour tester.
- Pour un APK de distribution, dans Android Studio choisir **Build > Generate Signed Bundle / APK > APK**, puis créer/conserver une clé de signature privée. Ne jamais partager la clé ni ses mots de passe.

## Important
- Les modèles MediaPipe et les fichiers WASM sont inclus dans le dossier `vendor`, donc l'application vise un traitement local/offline.
- Vérifier caméra, import galerie, export JPG/PNG/PDF et fonctionnement hors-ligne sur le téléphone après compilation.
- La caméra peut demander une autorisation Android lors du premier usage.
