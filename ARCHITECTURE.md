# DocFlow — Architecture

> Classeur numérique local, minimaliste et sans cloud.
> Expo **SDK 57** · React Native **0.86** · React **19.2** · expo-router (racine `src/app/`)

---

## 1. Contraintes SDK 57 (vérifiées dans la doc versionnée)

| Besoin du pitch | État SDK 57 | Décision |
|---|---|---|
| Capture photo + flash | ✅ `expo-camera` (`CameraView`, `useCameraPermissions`, `takePictureAsync({ quality })`, prop `flash` / `enableTorch`). Fonctionne dans Expo Go. | Utilisé tel quel |
| Détection des bords + correction de perspective | ❌ `expo-camera` ne fait que les codes-barres. Aucun module Expo officiel. | `react-native-document-scanner-plugin` (natif, ML Kit / VisionKit) → **dev build obligatoire**. Repli : UI de recadrage à 4 coins + Skia |
| Filtres N&B / contraste / luminosité | ❌ `expo-image-manipulator` (57) = crop / rotate / resize / flip / compress uniquement. Pas d'opérations couleur. | Filtre N&B fourni par le plugin scanner ; sinon `@shopify/react-native-skia` `ColorMatrix` |
| Recadrage / redimensionnement / compression | ✅ `ImageManipulator.manipulate(uri).crop().resize().renderAsync()` → `.saveAsync({ format, compress })` | Utilisé tel quel |
| Arborescence de fichiers / cache / stockage persistant | ✅ **Nouvelle API OO** : `File`, `Directory`, `Paths` — surtout synchrone (`dir.create()`, `file.write()`, `file.textSync()`, `directory.list()`, `file.exists`, `file.size`, `await file.move()/copy()`). API legacy sur `expo-file-system/legacy`. | Encapsulé dans `services/files.ts` |
| Import de n'importe quel fichier | ✅ `DocumentPicker.getDocumentAsync({ type, multiple, copyToCacheDirectory })` → `{ canceled, assets:[{ uri, name, mimeType, size }] }` | Utilisé tel quel |
| Partage via la feuille native | ✅ `Sharing.shareAsync(localUri, { mimeType, UTI, dialogTitle })` — URIs locales uniquement sur natif | Utilisé tel quel |
| Note → PDF | ✅ `Print.printToFileAsync({ html })` → `{ uri, numberOfPages }`. **iOS : images en base64 dans le HTML** | Utilisé tel quel |
| Lecture `.docx` / `.xlsx` / `.pptx` | ❌ Rien en natif. Les visionneuses en ligne (Google / MS) exigent une URL publique → incompatible « Zéro Cloud » et avec un fichier local. | Parsing local JS : `mammoth` (docx→HTML), SheetJS `xlsx` (xlsx→table HTML), rendu dans `react-native-webview`. `.pptx` : Phase 4 ou ouverture externe |
| Lecture PDF | ❌ Aucun module Expo | `react-native-pdf` (dev build) — repli : `pdf.js` embarqué dans une WebView (100 % hors-ligne) |
| Recherche plein-texte | ✅ `expo-sqlite` FTS5 | Table virtuelle FTS sur notes + titres + tags |

**Conséquence structurante :** dès l'ajout du plugin scanner / Skia / `react-native-pdf`, l'app ne tourne plus dans Expo Go → **client de développement personnalisé** (`expo-dev-client` + `npx expo run:android` / build EAS). On s'engage dessus dès le départ.

---

## 2. Décisions par défaut (Phase 0)

1. **Dev build** assumé (pas Expo Go).
2. **Scanner** : `react-native-document-scanner-plugin` (meilleure UX) — compat RN 0.86 à valider en Phase 1.
3. **Visionneuse PDF** : `react-native-pdf` ; repli `pdf.js`.
4. **`.pptx`** : ouverture externe en MVP, viewer best-effort en Phase 4.
5. **Métadonnées** : `expo-sqlite` (nécessaire pour la recherche FTS5).

---

## 3. Dépendances

```bash
# Alignées SDK (npx expo install choisit la bonne version 57)
npx expo install expo-camera expo-image-manipulator expo-file-system \
  expo-document-picker expo-sharing expo-print expo-sqlite expo-haptics \
  expo-crypto expo-dev-client react-native-webview \
  @shopify/react-native-skia expo-build-properties

# JS pur (non versionné par Expo)
npm i mammoth xlsx
# Natif — Phase 1, config plugin, dev build uniquement
npm i react-native-document-scanner-plugin
```

`app.json` → plugins à ajouter : `expo-camera` (textes de permission), `react-native-document-scanner-plugin`, `expo-build-properties`. On garde `expo-router` + `expo-splash-screen`.

---

## 4. Arborescence

```
src/
  app/
    _layout.tsx              # Stack racine + providers (SafeArea, GestureHandler, Theme, SQLiteProvider)
    (tabs)/
      _layout.tsx            # barre d'onglets : Documents · Numériser · Notes · Réglages
      index.tsx              # bibliothèque de documents (recherche, chips catégories, liste)
      scan.tsx               # lance le scanner → redirige vers la revue
      notes.tsx              # liste des notes
      settings.tsx           # thème, stockage, gestion des catégories
    document/[id].tsx        # détail : métadonnées, notes liées, actions
    viewer/[id].tsx          # lecteur universel (aiguille selon le type de fichier)
    note/[id].tsx            # éditeur de note
    scan/review.tsx          # recadrage + filtre + multi-pages + enregistrement
    modal/category-picker.tsx
    modal/export.tsx
  components/                # themed-* (repris) + doc-card, page-thumb, filter-bar, empty-state
  services/
    db.ts                   # ouverture expo-sqlite + migrations (PRAGMA user_version)
    files.ts                # wrappers File / Directory / Paths
    scanner.ts              # capture + pipeline manipulate
    export.ts               # imagesToPdf, noteToPdf, noteToTxt, share
    readers/                # pdf.ts, docx.ts, xlsx.ts, text.ts, image.ts
  models/                   # types TS : Document, Category, Tag, Note
  hooks/                    # use-documents, use-note, use-storage-usage (+ hooks thème repris)
  constants/theme.ts        # étendu (accent, couleurs sémantiques, palette catégories)
```

---

## 5. Modèle de données

**Métadonnées → `expo-sqlite`.** Les fichiers restent sur le disque ; la BDD ne stocke que des **chemins relatifs** (le conteneur absolu change entre installs / MAJ OS). Résolution à la lecture : `new File(Paths.document, 'DocFlow', relPath)`.

```sql
categories(id, name, color, icon, sort_order)
tags(id, name UNIQUE)
documents(
  id TEXT PK, title, category_id FK NULL, rel_path,
  file_type TEXT,            -- 'pdf' | 'image' | 'docx' | 'xlsx' | 'pptx' | 'txt'
  source TEXT,               -- 'scan' | 'import'
  page_count INT, size_bytes INT, created_at INT, updated_at INT)
document_pages(id, document_id FK, rel_path, sort_order)   -- scans multi-pages
document_tags(document_id FK, tag_id FK, PRIMARY KEY(document_id, tag_id))
notes(id TEXT PK, title, body TEXT, document_id FK NULL, created_at INT, updated_at INT)
search(...)  -- table virtuelle FTS5 : notes.body + documents.title + noms de tags
```

Versioning des migrations via `PRAGMA user_version` dans le `onInit` de `SQLiteProvider`.

**Disque :**
```
<Paths.document>/DocFlow/
  documents/<id>/original.pdf | page-01.jpg …
  imports/<id>/<nomOriginal>.docx
<Paths.cache>/DocFlow/
  thumbnails/<id>.jpg
  exports/<id>.pdf            # transitoire, régénéré à la demande
```

---

## 6. Modules

### Numérisation
1. `scan.tsx` → `DocumentScanner.scanDocument()` (recadrage + perspective + N&B natifs).
2. `scan/review.tsx` : réordonner / supprimer les pages, bascule de filtre (Original / N&B / Niveaux de gris). Sans le filtre du plugin : `ColorMatrix` Skia (N&B = matrice de luminance ; contraste/luminosité = gain + offset), `makeImageSnapshot()` → base64 → `File.write`.
3. Compression : `ImageManipulator.manipulate(uri).resize({ width: 2000 }).renderAsync()` → `saveAsync({ format: JPEG, compress: 0.7 })`.
4. Enregistrement : **pages en JPEG** (`document_pages`), PDF généré à l'export via `Print.printToFileAsync`.
5. Titre + catégorie, écriture BDD, génération de la miniature.

### Hub de lecture — `viewer/[id].tsx`
Aiguillage selon `file_type` :
- **image** → `expo-image` + pinch-zoom
- **txt** → `file.textSync()` dans un `ScrollView`
- **pdf** → `react-native-pdf` (repli : WebView `pdf.js`)
- **docx** → `mammoth.convertToHtml({ arrayBuffer })` → WebView thémée
- **xlsx** → SheetJS `read()` → onglets + `sheet_to_html` par feuille dans la WebView
- **pptx** → Phase 4 : MVP = ouverture externe via `Sharing.shareAsync`

**Recherche globale** : FTS5 (corps de notes, titres, tags). Recherche intra-document là où le texte existe (txt / docx / xlsx, et pdf via l'API pdf.js).

### Notes — `note/[id].tsx`
- `TextInput` multiligne (titre + corps), autosave débouncé.
- « Associer à un document » → `document_id` ; le détail du document liste ses notes.
- Export : **PDF** (`Print.printToFileAsync`, gabarit HTML), **TXT** (`File.write`), puis `Sharing.shareAsync`.

### Classement & Export
- Chips catégories + filtre tags + tri (date / nom / taille) sur la bibliothèque.
- `modal/export.tsx` : document → « Exporter en PDF » / « Partager l'original » / « Enregistrer dans Fichiers » — tout passe par `Sharing.shareAsync`.
- Réglages : usage du stockage via `Directory.list()` récursif (somme des `file.size`) ; gestion des catégories.

---

## 7. Transverse

- **Thème** : `constants/theme.ts` + `use-color-scheme` / `use-theme` repris ; CSS de la WebView piloté par le thème actif (docx/xlsx en sombre aussi). `userInterfaceStyle` déjà `automatic`.
- **Init BDD** dans le `_layout.tsx` racine avant `SplashScreen.hideAsync()` ; migrations idempotentes.
- **Permissions** : demande caméra à la première numérisation ; état « refusé » → lien vers les réglages système.
- **`reactCompiler` + `typedRoutes`** déjà activés — composants compatibles compilateur (pas de mutation de props/refs au rendu).
- **Error boundaries** autour de chaque lecteur (un `.xlsx` corrompu ne doit pas planter l'app).

---

## 8. Ordre de construction

| Phase | Livrable |
|---|---|
| **0 — Squelette** | Dev client, dépendances, plugins `app.json`, navigation à onglets, thème, `db.ts` + migrations, `files.ts`, écrans vides. **Exécutable.** |
| **1 — Numérisation → Bibliothèque** | Plugin scanner → revue (filtre / compression) → enregistrement multi-pages → miniatures → liste bibliothèque → affectation catégorie. Export PDF groupé. |
| **2 — Hub de lecture** | image → txt → pdf → docx (mammoth) → xlsx (SheetJS). Coquille WebView thémée. |
| **3 — Notes** | Éditeur + autosave, liste, association document, export PDF/TXT, recherche FTS5. |
| **4 — Finitions** | Tags & filtres & tri, feuille d'export, `.pptx` (in-app ou externe), passe mode sombre, états vides / erreurs, écran d'usage du stockage. |

---

## 9. État d'avancement

- [x] Phase 0 — squelette (en cours)
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
