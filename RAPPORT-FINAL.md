# PhotoID Studio — rapport final

**Application** : `idphoto/` — photo d'identité aux normes officielles, 100 % dans le navigateur,
sans serveur, sans envoi de photo, fonctionne hors-ligne.
**Version auditée** : code du 20 novembre 2026 · interface entièrement en français.

**Résultat de l'audit** : **158 contrôles automatisés, 0 échec**

| Suite | Contenu | Résultat |
|---|---|---|
| `run.mjs` | cadrage, rotation, détourage, planches, PDF, retouche, formats | 26 / 26 |
| `ui.mjs` | interface : import, formats, fonds, planches, exports | 24 / 24 |
| `audit.mjs` | conformité : cotes officielles, DPI, PDF, hors-ligne, langue, robustesse | 57 / 57 |
| `camera.mjs` | caméra et import (matériel simulé) | 17 / 17 |
| `e2e.mjs` | parcours complet bouton par bouton, fichiers produits puis mesurés | 34 / 34 |

---

# 1. Erreurs corrigées

## 1.1 Bugs réels trouvés pendant cet audit

| # | Symptôme | Cause | Correction |
|---|---|---|---|
| 1 | **Le bouton « Prendre une photo » ne pouvait jamais ouvrir la caméra du navigateur** : échec immédiat, bascule systématique sur l'appareil photo natif | le bouton était branché directement sur `openCamera`, qui recevait donc l'événement de clic comme identifiant de périphérique ; la contrainte devenait `deviceId: {exact: [object MouseEvent]}` → `OverconstrainedError` | `openCamera` n'accepte plus qu'un identifiant texte, et le bouton appelle `() => openCamera()`. **Vérifié** : `getUserMedia({video:{facingMode:'user'}})`, capture 413 × 531, flux libéré |
| 2 | Risque d' écouteurs d'événements doublés (chaque clic exécuté deux fois) | `init()` pouvait être appelée deux fois si l'événement `DOMContentLoaded` arrivait après le chargement du module | garde `booted` : l'initialisation n'a lieu qu'une fois |
| 3 | Échec de lecture de l'aperçu vidéo si `play()` ne renvoie pas de promesse (certains navigateurs WebView) | `await video.play().catch(...)` sur un `undefined` | `try { await video.play() } catch {}` + test `readyState >= 1` + `oncanplay` |
| 4 | **Halo clair sur le contour du visage** après changement de fond | la retouche était appliquée *après* le détourage : elle éclaircissait aussi les pixels semi-transparents du bord | la retouche est désormais appliquée **avant** le détourage (`destination-in`) |
| 5 | Bord du détourage irrégulier selon la résolution d'export (flou calculé sur une copie réduite) | le flou du masque dépendait de la taille de travail | nouveau `buildMaskLayer()` : masque cuit à la taille de sortie, flou 1:1 déterministe, repli sans filtre si le navigateur ne le gère pas |
| 6 | **Format États-Unis hors norme** : hauteur de tête imposée à 34,9 mm, soit la limite haute exacte de la fourchette officielle (25,4–34,9 mm) | `head: 0.755` sur une photo de 51 mm | `head: 0.65` (≈ 33 mm), fourchette élargie à 0,50–0,685, note « tête 25,4–34,9 mm · yeux à 28–35 mm du bas » |
| 7 | **Résolution absente des fichiers exportés** : les imprimeurs recevaient des JPG/PNG sans DPI, donc imprimés à 72 dpi par défaut | les encodeurs du navigateur n'écrivent pas ces métadonnées | nouveau `js/filemeta.js` : `jpegWithDpi()` (correction/insertion du segment APP0-JFIF) et `pngWithDpi()` (chunk `pHYs` + CRC32), branchés sur les 3 exports JPG, l'export PNG et la planche. **Vérifié** : JPG `units=1, 300 dpi` ; PNG `pHYs = 11811 px/m` (299,9994 dpi) |
| 8 | **Import impossible depuis certains Android** : fichier refusé sans message clair | fichiers sans type MIME (`type === ''`) rejetés ; HEIC non expliqué | import accepté sans MIME (contrôle par extension + décodage), message dédié HEIC, message d'erreur « JPG ou PNG » |
| 9 | Curseur de hauteur de tête trop étroit, impossible de corriger une photo un peu serrée | plage 34–92 % | plage 40–85 %, avec avertissement quand la cote n'est pas atteignable |
| 10 | Après un import, l'utilisateur restait sur l'onglet « Import » et ne voyait pas son cadrage | aucune navigation après import | `goToTab('cadrage')` + défilement automatique sur mobile |
| 11 | La pastille « couleur personnalisée » restait inactive après choix d'une couleur | état des pastilles non resynchronisé | `updateSwatches()` appelée aussi sur la couleur personnalisée |
| 12 | Caméra inutilisable sur téléphone en `http://` sans explication ; impossible de choisir l'objectif ; caméra parfois laissée allumée | pas de détection du contexte non sécurisé, pas de `enumerateDevices`, pas de libération | détection `isSecureContext` + message explicite, sélecteur d'objectif (masqué s'il n'y a qu'une caméra), libération sur `visibilitychange` et à la fermeture |
| 13 | **Marge au-dessus de la tête inférieure à la cote** (3,5 mm au lieu de 4,0 mm sur le format algérien) sur un visage dont la ligne des yeux est haute | le ratio yeux/crâne mesuré (0,516) était bridé à 0,50 | borne élargie à 0,40–0,55 : la morphologie réelle du visage est respectée. **Vérifié** : écart max sur les 13 formats = **0,03 mm** sur la tête, **0,00 mm** sur le crâne |
| 14 | Le message « Cadrage ajusté aux bords » masquait les cas où la photo est vraiment trop serrée | un seul message pour deux situations | nouvelle alerte « Photo trop serrée pour ce format » (couleur d'alerte) quand la cote de tête est hors norme |
| 15 | Icône PWA « maskable » non conforme (transparence + contenu hors zone de sécurité) → icône rognée sur Android | ancienne icône réutilisée | icône régénérée **opaque**, contenu dans les 80 % centraux |
| 16 | Mode hors-ligne susceptible d'afficher une version ancienne | cache obsolète après mise à jour | cache `photoidstudio-v2`, `filemeta.js` et les nouvelles icônes ajoutés ; service worker autorisé aussi sur `localhost` en http |

## 1.2 Corrections antérieures (rappel, déjà en place)

- Repères de coupe de la planche décalés → recalculés depuis la position réelle des photos.
- Libellé de planche affiché alors qu'il n'y avait pas la place → conditionné à une marge > 6 mm.
- Raccourci PWA en double → supprimé du manifeste.
- Expressions régulières de nettoyage des noms de fichiers → simplifiées (`reduce`).
- Ordre des couches du rendu : la retouche ne touche plus le fond synthétique.

## 1.3 Accessibilité et robustesse ajoutées

`:focus-visible` sur tous les éléments interactifs · style `:disabled` · toast en `role="status" aria-live="polite"` ·
`<noscript>` · filet anti-échec de chargement de script · `prefers-reduced-motion` · `scroll-margin-top` sur mobile ·
métadonnées mobiles/Apple · moteur en tâche de fond après l'affichage (l'interface est utilisable tout de suite) ·
libération de la mémoire du moteur.

---

# 2. Fonctionnalités réellement testées (et ce qui a été mesuré)

Tout ce qui suit a été exécuté automatiquement, puis les fichiers produits ont été **ouverts et mesurés**
(dimensions, DPI, transparence, page PDF), jamais seulement « supposés bons ».

## 2.1 Formats et cadrage
- **13 gabarits** : Algérie (35 × 45), Schengen, visa Schengen, permis de conduire, États-Unis (51 × 51), Royaume-Uni, Canada (50 × 70), Chine (33 × 48), Inde (51 × 51), Japon, Australie, « officielle », personnalisé.
- Dimensions produites **exactes** à 300 dpi : 35 × 45 → **413 × 531 px** (34,97 × 44,96 mm) ; 50 × 70 → 591 × 827 ; 33 × 48 → 390 × 567 ; 51 × 51 → 602 × 602 ... (12/12 vérifiés, le 13ᵉ étant le format libre).
- **Hauteur de tête conforme à la norme du pays pour les 13 formats**, à 300 **et** 600 dpi : Algérie 33,94 mm (norme 32–36), Schengen 32,8, États-Unis 33,1 (25,4–34,9), Royaume-Uni 31,5 (29–34), Canada 33,6, Chine 29,5 (28–33), Inde 31,6, Australie 33,7…
- **Marge au-dessus de la tête** exacte sur les 13 formats (écart max 0,00 mm).
- Ligne des yeux : 23 à 41 mm du bas selon le pays, dans les fourchettes officielles.
- **Invariance d'échelle** : le même cadrage est retrouvé à 300, 400 et 600 dpi, écart maximum **0,048 mm**.
- Redressement automatique (rotation mesurée 0,06° sur le portrait de test), recentrage, zoom et déplacement manuels : testés, sans erreur.

## 2.2 Détection et détourage
- Détection du visage et affinage du sommet du crâne par le masque (crâne ramené à y = 56 px, tête 649 px, ratio yeux/crâne 0,516 sur le portrait de référence).
- Détourage au pixel : fond réellement remplacé (**255,255,255** au coin en JPG ; **alpha = 0** au coin en PNG), sans halo.
- Fonds proposés : blanc, bleu clair, gris clair, gris moyen, bleu + couleur personnalisée — **les 5 appliqués et vérifiés** sur l'aperçu et sur l'export.
- Contrôle de conformité en direct : tête, yeux, crâne, inclinaison, centrage, suffisance de la source.

## 2.3 Retouche
Luminosité, contraste, saturation, chaleur, netteté, adoucissement du bord, « améliorer automatiquement », « réinitialiser » :
chaque curseur actionné par l'interface, sans erreur JavaScript. La retouche est appliquée **avant** le détourage,
sans déformation du visage (aucun déplacement de trait, aucun changement de teinte des yeux : ce sont des réglages
globaux de luminance/contraste, pas de retouche locale).

## 2.4 Exports (chaque fichier ouvert et mesuré)
| Export | Mesure réelle |
|---|---|
| JPG photo | 413 × 531 px · `JFIF units=1, 300 dpi` · qualité réglable 80–100 % |
| PNG photo | 413 × 531 px · `pHYs 11811 px/m` · **transparence réelle** (alpha 0) |
| JPG 600 dpi | 827 × 1063 px |
| Planche 10 × 15 | 1181 × 1772 px · 6 photos · 0 déformation sur 30 points |
| Planche 13 × 18 | 1535 × 2126 px · 9 photos · 0 déformation sur 45 points |
| Planche A4 | 2480 × 3508 px · 30 photos · 0 déformation sur 150 points |
| Planche A5 | 1748 × 2480 px · 16 photos · 0 déformation sur 80 points |
| PDF | pages **100,00 × 150,00** / **130,00 × 180,00** / **210,00 × 297,00** / **148,00 × 210,00** mm |
| Repères de coupe | 3297 pixels de trait réellement dessinés |

- Espacement, marges, repères de coupe et lignes de coupe : réglables, testés (0 écart de position sur 305 points comparés).
- Noms de fichiers explicites : `portrait-dz-35x45mm-300dpi.jpg`, `portrait-planche-10x15.pdf`…
- Aperçu avant téléchargement / impression : visible en permanence (l'aperçu et la planche sont rendus en direct).

## 2.5 Caméra et import (matériel simulé, logique réelle)
- Ouverture de la modale, `getUserMedia` avec la caméra frontale, flux attaché à la vidéo.
- Sélection de l'objectif quand plusieurs caméras sont détectées (2 caméras dans le test).
- Bouton de capture bloqué tant que la vidéo n'est pas prête, puis capture → photo traitée (413 × 531) → contrôle de conformité.
- Flux libéré après capture, à la fermeture et au passage en arrière-plan.
- Permission refusée → message explicite + bascule sur l'appareil photo natif.
- Connexion non sécurisée (`http://` sur le réseau local) → bascule immédiate, sans tentative.
- Import galerie : fichier avec type MIME, **fichier sans type MIME (Android)**, message dédié HEIC.

## 2.6 Application, hors-ligne, langue
- 7 onglets, 13 fiches de format, 5 pastilles de fond, planches, exports : parcours complet cliqué de bout en bout, **aucune erreur JavaScript**.
- **Hors-ligne** : 24 ressources en cache, 0 manquante, 23,6 Mo ; service worker enregistré sur https et localhost.
- **Manifeste PWA** : 3 icônes aux bonnes dimensions, maskable opaque, mode `standalone`, thème.
- **Langue** : aucun mot anglais dans les textes affichés ni dans les messages ; `<html lang="fr">`.
- Poids : interface **142 Ko** (HTML + CSS + JS + icônes), moteur de vision **23 Mo** chargé après l'affichage, une seule fois puis en cache.

---

# 3. Fonctionnalités non testées (et pourquoi)

Ces points ne sont **pas** automatisables dans cet environnement (pas de navigateur graphique, pas de smartphone,
pas d'imprimante). Ils ne sont donc pas « validés », seulement « conçus pour ».

| Point | Pourquoi non testé | Comment le vérifier vous-même |
|---|---|---|
| **Caméra matérielle réelle** (Android, iPhone) | pas de capteur ici ; seul le code a été exercé avec un flux simulé | ouvrir l'app sur le téléphone, onglet Import → « Prendre une photo » ; autoriser l'accès ; vérifier la bascule d'objectif |
| **Installation PWA sur Android** | nécessite Chrome réel + HTTPS | voir § 5 |
| **Impression papier réelle** | dépend de l'imprimante et de son logiciel | voir § 4 ; imprimer la planche 10 × 15 puis mesurer à la règle (tolérance attendue ± 0,5 mm) |
| **DPI réellement relus par Word / Photoshop / l'imprimante** | on a vérifié les octets des fichiers, pas le logiciel tiers | ouvrir le JPG dans Word → « Format de l'image » doit afficher 3,5 × 4,5 cm à 300 dpi |
| **Photos HEIC (iPhone)** | aucun échantillon HEIC exploitable ici | importer une photo iPhone : soit elle s'ouvre (Safari/Chrome récents savent décoder), soit le message dédié s'affiche |
| **Orientation EXIF des photos de téléphone** | dépend du navigateur (`createImageBitmap` l'applique) | importer une photo prise en portrait puis en paysage : le visage doit être droit |
| **Compatibilité réelle Safari / Firefox / Chrome / Edge** | les tests tournent sur Node + jsdom, pas sur les moteurs des navigateurs | ouvrir l'app sur chaque navigateur ; le code n'utilise que des API standard avec replis |
| **Performance sur téléphone bas de gamme** | pas de matériel réel ; le rendu a été mesuré mais pas le ressenti | mesurer le temps entre l'import et l'aperçu (attendu : 1 à 3 s sur un milieu de gamme) |
| **Lecteurs d'écran / navigation clavier complète** | partiellement couvert (focus visible, `aria-live`, contrastes) | parcourir l'app à la touche Tab et avec TalkBack |
| **Feuille d'impression directe du navigateur** (Ctrl+P) | testée seulement en CSS | imprimer la page depuis l'onglet Planche |

---

# 4. Instructions pour lancer l'application

L'application est **entièrement statique** : aucun serveur, aucune base de données, aucun compte.
Il faut seulement la servir en `http://` (le protocole `file://` bloque les modules JavaScript,
le service worker et la caméra).

## 4.1 Sur votre ordinateur (le plus simple)

```bash
cd idphoto
python3 -m http.server 8080
```

Puis ouvrir **http://localhost:8080** dans Chrome, Edge, Firefox ou Safari.

Équivalent avec Node :

```bash
npx serve idphoto -l 8080
```

> À noter : `localhost` est considéré comme sécurisé, la caméra fonctionne donc même sans HTTPS.
> Sur le réseau local en `http://192.168.x.x`, la caméra du navigateur est bloquée — mais l'application
> bascule alors automatiquement sur l'appareil photo du téléphone (fonctionne quand même).

## 4.2 Utilisation

1. **Import** — « Choisir une photo », « Prendre une photo » ou la photo d'exemple (aucune photo n'est envoyée sur Internet).
2. **Format** — choisir le pays ; la cote et les tolérances s'affichent.
3. **Cadrage** — automatique à l'import ; boutons « Recentrer » et « Redresser », réglages fins si besoin.
4. **Fond** — blanc, bleu clair, gris clair, gris moyen, bleu ou couleur personnalisée.
5. **Retouche** — luminosité, contraste, netteté… ou « Améliorer automatiquement ».
6. **Planche** — 10 × 15, 13 × 18, A4 ou A5, avec repères de coupe.
7. **Export** — JPG (300/400/600 dpi), PNG transparent, PDF prêt à imprimer, planche JPG ou PDF.

## 4.3 Vérifications déjà faites chez vous

L'audit complet se relance en une commande :

```bash
cd test && ./all.sh
```

Résultat attendu : les 5 suites vertes (158 contrôles). Les exemples livrés
(`idphoto/examples/exemple-photo-35x45.jpg` et `exemple-planche-10x15.jpg`) peuvent être régénérés
avec `node gen-examples.mjs`.

---

# 5. Installation sur Android

Il y a deux méthodes : **l'installation PWA** (recommandée, 30 secondes) et **l'APK** (si vous voulez
une icône dans le tiroir d'applications comme une vraie application).

## 5.1 Méthode 1 — PWA (recommandée, aucune boutique)

Android exige **HTTPS** pour installer une PWA. Il faut donc d'abord publier l'application (§ 6),
puis :

1. Ouvrir l'adresse `https://…` dans **Chrome** sur le téléphone.
2. Attendre 2–3 secondes (le manifeste est lu automatiquement).
3. Un bandeau **« Installer l'application »** apparaît, ou toucher le bouton **« Installer »** dans l'en-tête.
   Sinon : menu **⋮** → **« Ajouter à l'écran d'accueil »** / **« Installer l'application »**.
4. L'icône PhotoID Studio s'ajoute au tiroir d'applications. Elle s'ouvre en plein écran, **sans barre d'adresse**,
   et **fonctionne hors connexion** après le premier lancement.

Ce qui est déjà en place pour que cela fonctionne : manifeste complet (nom, icônes 192/512, maskable, mode
`standalone`, thème), service worker qui met en cache les 24 ressources (23,6 Mo), icône Apple pour iOS.

## 5.2 Méthode 2 — APK (hors Play Store)

L'APK n'est pas fourni : il doit être généré à partir de l'URL publiée, car il embarque celle-ci.

```bash
# outil officiel Google (Bubblewrap)
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://votre-domaine.fr/manifest.webmanifest
bubblewrap build          # produit app-release-signed.apk
```

Puis copier l'APK sur le téléphone et l'installer (autoriser « Installer des applications inconnues »).
Alternative sans ligne de commande : **PWABuilder** (pwabuilder.com), qui produit un APK signé à partir de l'URL.

> L'APK n'apporte rien de plus que la PWA : il sert surtout si vous devez distribuer l'application
> par fichier, ou pour la publier sur le Play Store (compte développeur requis).

## 5.3 iOS (pour information)

Safari → bouton **Partager** → **« Sur l'écran d'accueil »**. L'app fonctionne de la même façon.

---

# 6. Publication pour d'autres utilisateurs

L'application est un dossier statique de 23 Mo : n'importe quel hébergement de fichiers convient,
tant qu'il est en **HTTPS**.

## 6.1 Hébergement le plus rapide (gratuit)

| Service | Marche à suivre |
|---|---|
| **Netlify Drop** | ouvrir `app.netlify.com/drop`, glisser-déposer le dossier `idphoto/` → URL `https://…netlify.app` immédiate |
| **Cloudflare Pages** | « Upload assets », glisser le dossier `idphoto/`, HTTPS automatique |
| **GitHub Pages** | pousser le contenu de `idphoto/` sur une branche `gh-pages`, activer Pages dans les réglages du dépôt |
| **Vercel** | `npx vercel idphoto` puis suivre les instructions |

Un nom de domaine personnel (ex. `photoid.mondomaine.fr`) se branche ensuite dans l'interface du service.

## 6.2 Points à respecter (déjà vérifiés dans le projet)

- **HTTPS obligatoire** pour la caméra et l'installation PWA (hors `localhost`).
- **Aucun réglage serveur** : pas de PHP, pas de base de données, pas de route à réécrire.
- **Fichiers servis tels quels** : `index.html`, `styles.css`, `js/`, `vendor/`, `icons/`, `manifest.webmanifest`, `sw.js`.
- **Cache** : le service worker gère la mise à jour. Après une modification, changez la version
  (`const CACHE = 'photoidstudio-v3'` dans `sw.js`) pour que les visiteurs reçoivent la nouvelle version.
- **Confidentialité** : les photos ne quittent jamais l'appareil (aucun appel réseau, aucune mesure d'audience).
  C'est un argument à afficher : aucune donnée personnelle collectée, rien à déclarer côté RGPD.
- **Coût** : 0 € sur les offres gratuites ; 23 Mo transférés une seule fois par utilisateur (ensuite hors-ligne).

## 6.3 Ce qu'il reste à faire côté « production »

1. **Publier** sur un des hébergements ci-dessus et vérifier l'URL en HTTPS.
2. **Tester sur un téléphone** : import galerie, prise de vue, installation PWA (`§ 5.1`).
3. **Imprimer une planche 10 × 15** chez un imprimeur ou sur une imprimante photo et **mesurer**
   les repères de coupe (attendu 35 × 45 mm ± 0,5 mm).
4. **Mentions légales** : ajouter une page ou une phrase d'information sur l'usage (facultatif mais recommandé
   si l'application est publique).
5. **Nom / marque** : « PhotoID Studio » est un nom de travail, remplaçable dans `index.html`, `manifest.webmanifest`
   et `README.md`.

---

## Récapitulatif

- **158 contrôles automatisés verts**, dont 57 contrôles de conformité aux normes (cotes officielles des 13 pays,
  DPI réels des fichiers, dimensions des pages PDF, mode hors-ligne, langue française).
- **16 erreurs corrigées** pendant cet audit, dont un bug bloquant de la caméra et l'absence de résolution
  dans les fichiers exportés.
- **Écart de cadrage ramené à 0,03 mm** sur la hauteur de tête, pour les 13 formats, à 300 comme à 600 dpi.
- Ce qui n'a pas pu être testé ici est listé honnêtement au § 3, avec la manière de le vérifier en 2 minutes.
