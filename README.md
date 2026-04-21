# CV Visual Editor

Éditeur desktop cross-platform (Windows/macOS) pour modifier visuellement les valeurs CSS d'un fichier HTML de CV, avec preview live et **préservation stricte du HTML source**.

## Captures d'écran

> Lancer `npm run dev` puis ouvrir un fichier `.html` pour voir l'interface complète.

Layout : **Sidebar** (sélecteurs CSS) | **ControlsPanel** (contrôles adaptatifs) | **Preview** (iframe live)

---

## Comment fonctionne la préservation du HTML

**Contrainte absolue :** le fichier de sortie ne doit différer du fichier d'entrée que sur les valeurs numériques ou couleurs explicitement modifiées par l'utilisateur. Pas de reformatage, pas de commentaire ajouté, pas d'indentation changée.

### Algorithme d'édition par offset

1. **Chargement** : le fichier HTML est lu comme une chaîne UTF-8 brute (`originalSource`).
2. **Localisation des blocs `<style>`** : `parse5` avec `sourceCodeLocationInfo: true` fournit les offsets absolus (`startOffset`, `endOffset`) de chaque bloc `<style>` dans la chaîne source.
3. **Extraction des tokens** : chaque bloc CSS est parsé par `css-tree` avec `positions: true`. Pour chaque node éditable (Dimension, Number, Percentage, Hash/couleur, Function rgb/rgba/hsl/hsla), on calcule :
   ```
   absoluteStart = styleBlock.startOffset + node.loc.start.offset
   absoluteEnd   = styleBlock.startOffset + node.loc.end.offset
   ```
4. **Édition non-destructive** : les modifications sont stockées dans un `Map<tokenId, newText>`. Rien n'est changé dans `originalSource`.
5. **Rendu** : `render()` part de `originalSource`, trie les modifications par `absoluteStart` **décroissant** (pour ne pas invalider les offsets suivants), et applique chaque remplacement par découpage de chaîne :
   ```ts
   result = result.slice(0, start) + newText + result.slice(end)
   ```
6. **Sans modifications** : `render()` retourne `originalSource` tel quel — **byte-identique** à l'entrée.

### Test d'acceptation

```ts
const doc = new EditableDocument(src);
expect(doc.render()).toBe(src);  // aucune modification → sortie identique
```

Ce test passe à chaque CI run.

---

## Installation (utilisateur final)

### Windows
1. Télécharger `CV Visual Editor-0.1.0-setup.exe` depuis les releases.
2. Lancer l'installateur (NSIS), choisir le répertoire.
3. Lancer **CV Visual Editor** depuis le Bureau ou le menu Démarrer.

### macOS (non signé)
1. Télécharger `CV Visual Editor-0.1.0.dmg`.
2. Monter le DMG, glisser l'app dans `/Applications`.
3. Premier lancement : clic droit → **Ouvrir** (Gatekeeper bloque les apps non signées au double-clic).

---

## Développement

### Prérequis
- Node.js ≥ 18
- npm ≥ 9

### Lancer en dev
```bash
cd cv-visual-editor
npm install
npm run dev
```

L'app Electron s'ouvre avec HMR actif sur le renderer.

### Lancer les tests
```bash
npm test
```

46 tests unitaires couvrant :
- `EditableDocument` : round-trip byte-identique, extraction de tokens, offsets corrects
- `ControlInference` : inférence des contrôles UI pour chaque type de propriété CSS

### Build de distribution
```bash
npm run build:win   # → release/CV Visual Editor-x.x.x-setup.exe
npm run build:mac   # → release/CV Visual Editor-x.x.x.dmg
```

---

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Ctrl/Cmd + O` | Ouvrir |
| `Ctrl/Cmd + S` | Enregistrer |
| `Ctrl/Cmd + Shift + S` | Enregistrer sous |
| `Ctrl/Cmd + E` | Exporter PDF |
| `Ctrl/Cmd + Z` | Annuler |
| `Ctrl/Cmd + Shift + Z` | Rétablir |
| `Ctrl/Cmd + F` | Rechercher |
| `Ctrl/Cmd + I` | Mode Inspect |
| `Glisser label` | Ajuster valeur (Shift = ×10, Alt = ×0.1) |
| `Double-clic label` | Réinitialiser valeur |

---

## Limitations connues (V1)

- **Styles inline** (`style="..."`) : non supportés, uniquement les blocs `<style>`.
- **Couleurs nommées** (`red`, `white`, etc.) : non éditables via color picker (leur remplacement changerait la forme du texte, violant la contrainte de préservation).
- **`1fr` et unités CSS Grid** (`fr`) : intentionnellement ignorés (pas des valeurs numériques pures).
- **`calc()`** : les valeurs numériques à l'intérieur sont éditables, mais les opérateurs sont préservés.
- **Auto-save** et **presets** prévus pour V2.
- **Styles dans des `<link>` externes** : non éditables (seuls les `<style>` inline sont supportés).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Shell desktop | Electron 35 |
| UI | React 18 + TypeScript |
| Bundler | Vite / electron-vite |
| State | Zustand |
| Parsing CSS | css-tree (positions exactes) |
| Parsing HTML | parse5 (sourceCodeLocationInfo) |
| Color picker | react-colorful |
| Icônes | lucide-react |
| Styles app | Tailwind CSS |
| Tests | Vitest |
| Distribution | electron-builder |
