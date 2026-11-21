# PhotoID Studio — Photos d'identité conformes

Application **web + mobile (PWA)** de création de photos d'identité aux normes officielles.
Interface blanc / bleu / gris, navigation par étapes, résultat de qualité studio.

> **Tout le traitement est local.** La détection du visage, le détourage du fond, le recadrage,
> la retouche et la génération des fichiers s'exécutent dans le navigateur (WebAssembly + Canvas).
> Aucune photo n'est envoyée à un serveur : l'application fonctionne même hors-ligne.

---

## 1. Fonctionnalités

| Domaine | Détail |
|---|---|
| **Import** | Galerie / fichiers (JPG, PNG, WebP), appareil photo (getUserMedia), glisser-déposer, collage Ctrl+V |
| **Détection du visage** | MediaPipe Face Landmarker (478 points) : crâne, menton, yeux, épaules |
| **Cadrage biométrique** | Hauteur de tête, ligne des yeux, centrage et redressement calculés automatiquement, puis ajustables (zoom, position, rotation) |
| **Arrière-plan** | Détourage automatique (MediaPipe Selfie Segmenter), remplacement par blanc, bleu clair, gris clair, gris moyen, bleu, couleur libre — ou export PNG à fond transparent |
| **Retouche** | Luminosité, contraste, saturation, netteté (masque flou), balance des blancs, réglage automatique — **aucune modification des traits, des yeux ni de l'identité** |
| **Formats** | 13 presets internationaux + dimensions personnalisées (voir tableau) |
| **Planches** | 10 × 15 cm, 13 × 18 cm, A5, A4 avec repères de découpe et gouttière réglable |
| **Export** | JPG 300/400/600 dpi, PNG détouré, planche JPG, planche **PDF aux dimensions réelles** |
| **Contrôles** | Hauteur de tête (mm), ligne des yeux (mm), marge du crâne, inclinaison, centrage, résolution source, yeux fermés / bouche ouverte / sourire (blendshapes) |
| **Plateformes** | Responsive Android / iOS / ordinateur, installable (PWA), mode hors-ligne (service worker) |

### Formats inclus

| Format | Dimensions | Tête (mm) | Fond |
|---|---|---|---|
| Passeport / CNIBE — Algérie | 35 × 45 mm | 32–36 | blanc |
| Passeport / CIN — UE / Schengen | 35 × 45 mm | 32–36 | blanc ou gris clair |
| Visa Schengen | 35 × 45 mm | 32–36 | clair |
| Permis de conduire | 35 × 45 mm | 30–36 | clair |
| Passeport / Visa — États-Unis | 51 × 51 mm | 32–35 | blanc |
| Passeport — Royaume-Uni | 35 × 45 mm | 29–34 | gris clair / crème |
| Passeport — Canada | 50 × 70 mm | 31–36 | blanc |
| Visa / Passeport — Chine | 33 × 48 mm | 28–33 | blanc |
| Passeport / Visa — Inde | 51 × 51 mm | 25–35 | blanc |
| Passeport — Japon | 35 × 45 mm | 32–36 | blanc |
| Passeport — Australie | 35 × 45 mm | 32–36 | blanc |
| Photo officielle (dossiers, CV) | 35 × 45 mm | 27–36 | blanc |
| Format personnalisé | libre | réglable | libre |

---

## 2. Démarrage

L'application est entièrement statique (aucun build, aucune dépendance externe au runtime).

```bash
cd idphoto
python3 -m http.server 8080        # ou : npx serve .
# puis ouvrir http://localhost:8080
```

Pour la caméra et l'installation PWA, le site doit être servi en **HTTPS**
(un simple serveur local en `http://localhost` fonctionne aussi pour la caméra).

### Déploiement

Copier le dossier `idphoto/` tel quel sur n'importe quel hébergement statique
(Netlify, Vercel, GitHub Pages, Nginx, Apache…). Aucune configuration particulière.
Ne pas oublier que les fichiers `.wasm` doivent être servis avec
`application/wasm` (comportement par défaut des serveurs modernes).

---

## 3. Structure

```
idphoto/
├── index.html                 Interface (7 onglets : Import, Format, Cadrage, Fond, Retouche, Planche, Export)
├── styles.css                 Design blanc / bleu / gris, responsive, impression
├── manifest.webmanifest       Installation PWA
├── sw.js                      Cache hors-ligne
├── js/
│   ├── app.js                 État, interface, orchestration, exports
│   ├── engine.js              MediaPipe : landmarks du visage + masque de segmentation
│   ├── render.js              Cadrage biométrique + composition (fond, masque, retouche)
│   ├── enhance.js             Retouche photométrique (LUT, saturation, unsharp mask)
│   ├── formats.js             Catalogue des formats et cotes officielles
│   ├── sheet.js               Disposition des planches + repères de découpe
│   └── pdf.js                 Générateur PDF (JPEG embarqué, dimensions exactes)
├── vendor/
│   ├── mediapipe/             tasks-vision (bundle ESM + WASM, ~19 Mo)
│   └── models/                face_landmarker.task, selfie_segmenter.tflite
├── assets/demo.jpg            Portrait d'exemple
├── icons/                     Icônes PWA
└── examples/                  Exemples de sortie (photo 35 × 45, planche 10 × 15)
```

---

## 4. Normes appliquées (ICAO Doc 9303)

* **Hauteur de tête** : 70–80 % de la hauteur de la photo (32–36 mm sur un 35 × 45 mm).
  Mesurée sur le contour réel de la personne (cheveux compris) grâce au masque de segmentation.
* **Ligne des yeux** : 50–60 % de la hauteur depuis le bas (≈ 25 mm sur 45 mm).
* **Marges** : sommet du crâne à ≈ 4 mm du bord supérieur, épaules visibles.
* **Tête droite** : redressement automatique (tolérance d'inclinaison 3°).
* **Visage centré** sur l'axe vertical.
* **Résolution** : 300 dpi minimum (413 × 531 px pour 35 × 45 mm), alerte si la source est insuffisante.
* **Fond** : uni, sans ombre, couleur imposée par le pays.

Le cadrage est **exact au pixel** : la transformation (échelle + rotation autour de la ligne des yeux)
est calculée pour que la tête mesure exactement la cote cible. Si la photo source ne laisse pas assez
de place, le cadre est décalé (jamais extrapolé) et l'application l'indique.

---

## 5. Tests

Les tests tournent dans `../test/` (Node + canvas natif + jsdom, aucun navigateur requis) :

```bash
cd ../test
./all.sh              # tout ; ou test par test :
./prepare.sh          # synchronise les modules de production (copies .mjs)
node run.mjs          # 26 tests : cadrage, rotation, détourage, planches, PDF, retouche, formats
node ui.mjs           # 24 tests d'interface : import, formats, fonds, planches, exports
node audit.mjs        # 57 contrôles de conformité (cotes officielles, DPI, PDF, hors-ligne, langue)
node camera.mjs       # 17 tests caméra / import (matériel simulé) : capture, replis, permissions
node e2e.mjs          # 34 tests : parcours complet bouton par bouton, fichiers produits et mesurés
node gen-examples.mjs # régénère idphoto/examples/ (photo 35 × 45 et planche 10 × 15)
node render-real.mjs  # rendu réel (landmarks + masque mesurés sur un portrait)
node sheet-real.mjs   # planches réelles 10 × 15 et A4
```

Résultat actuel : **158 contrôles automatisés, tous verts** (26 + 24 + 57 + 17 + 34), plus les deux
rendus réels. Seuls le matériel photo réel, l'installation PWA et l'impression papier ne sont pas
automatisables ici (voir `../RAPPORT-FINAL.md`).

---

## 6. Conseils pour un résultat de studio

1. Se placer face à une fenêtre ou une lumière douce, à ~40 cm de l'objectif.
2. Fond uni (mur clair), sans ombre portée derrière la tête.
3. Regard à l'objectif, expression neutre, bouche fermée, épaules visibles.
4. Sans lunettes, tête découverte (sauf motif religieux laissant le visage entièrement visible).
5. Vérifier les pastilles de conformité sous l'aperçu avant d'exporter.
6. Imprimer la planche en **100 % / taille réelle**, sur papier photo.
