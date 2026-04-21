# Changelog

## [0.1.0] — 2026-04-17

### Ajouté
- Noyau headless `EditableDocument` : parsing par offset, round-trip byte-identique garanti
- `CSSTokenExtractor` : extraction de tokens éditables (Dimension, Number, Percentage, HexColor/Hash, Function rgb/rgba/hsl/hsla)
- `ControlInference` : inférence automatique du contrôle UI adapté à chaque propriété CSS
- `History` : undo/redo illimité (command pattern)
- Interface Electron avec Vite + React 18 + TypeScript + Tailwind CSS
- Sidebar : arbre des sélecteurs CSS avec badges de comptage et indicateurs de modification
- ControlsPanel : sliders numériques, color pickers, step-selects
- PreviewPane : iframe sandbox avec mise à jour incrémentale des styles (pas de rechargement DOM complet)
- Topbar : ouvrir, enregistrer, enregistrer sous, export PDF, undo/redo, recherche, bascule thème
- Mode Inspect : survol et clic dans le preview → sélection du sélecteur CSS correspondant
- SearchBar : filtrage temps réel sur sélecteurs et propriétés
- DropZone : glisser-déposer d'un fichier HTML
- Panneaux redimensionnables (drag)
- Thème clair / sombre
- 46 tests unitaires (round-trip, extraction, inférence des contrôles)

### Limitations connues (V1)
- Styles inline (`style="..."`) non supportés
- Couleurs nommées (`red`, `white`) non éditables via color picker
- `1fr` et autres unités CSS Grid non-standard intentionnellement ignorées
- L'auto-save et les presets sont prévus pour V2
