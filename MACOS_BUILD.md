# Build macOS — Guide

Ce projet utilise GitHub Actions pour produire les fichiers `.dmg` et `.zip` macOS, car la signature et le packaging Apple nécessitent un runner macOS.

---

## Déclencher un build manuel

1. Aller sur le repo GitHub : **https://github.com/Debierre-Florian/cv-visual-editor**
2. Cliquer sur l'onglet **Actions** (barre du haut).
3. Dans la colonne de gauche, cliquer sur **Build macOS**.
4. Cliquer sur le bouton **Run workflow** (bouton gris à droite).
5. Laisser la branche sur `main`, puis cliquer sur **Run workflow** (bouton vert).

Le build démarre immédiatement. Deux jobs parallèles s'exécutent : `x64` (Intel) et `arm64` (Apple Silicon).

**Durée estimée : 5 à 10 minutes.**

---

## Télécharger les artefacts

1. Une fois le workflow terminé (icône verte), cliquer sur le run dans la liste.
2. En bas de la page, section **Artifacts**, deux archives apparaissent :
   - `mac-x64` — contient le `.dmg` et le `.zip` pour Intel
   - `mac-arm64` — contient le `.dmg` et le `.zip` pour Apple Silicon
3. Cliquer sur le nom de l'archive pour la télécharger (format `.zip` contenant les fichiers).

> Les artefacts sont conservés **90 jours** par défaut sur GitHub.

---

## Installer l'app sur macOS (app non signée)

L'app n'est pas signée par Apple. Il faut contourner Gatekeeper manuellement.

### Méthode recommandée (clic droit)

1. Télécharger le `.dmg`, double-cliquer pour l'ouvrir.
2. Glisser **CV Visual Editor** dans le dossier **Applications**.
3. **Ne pas double-cliquer** pour lancer l'app la première fois.
4. Dans le Finder, aller dans `/Applications/`.
5. **Clic droit** sur `CV Visual Editor.app` → **Ouvrir**.
6. Dans la boîte de dialogue d'avertissement, cliquer sur **Ouvrir**.

L'app est maintenant autorisée — les lancements suivants fonctionnent normalement par double-clic.

### Méthode alternative (terminal)

Si la méthode clic droit ne fonctionne pas, retirer l'attribut de quarantaine :

```bash
xattr -cr /Applications/CV\ Visual\ Editor.app
```

Puis relancer l'app normalement.

---

## Pour signer officiellement l'app plus tard

La signature Apple (notarisation) élimine l'avertissement Gatekeeper pour les utilisateurs finaux. Voici ce qu'il faudrait ajouter :

### Prérequis

- Un compte **Apple Developer** (99 $/an)
- Un certificat **Developer ID Application** exporté en `.p12`

### Secrets GitHub à configurer

Dans **Settings → Secrets and variables → Actions** du repo, ajouter :

| Secret | Description |
|---|---|
| `APPLE_ID` | Ton email Apple Developer |
| `APPLE_APP_PASSWORD` | Mot de passe d'app généré sur appleid.apple.com |
| `APPLE_TEAM_ID` | L'identifiant d'équipe Apple (10 caractères) |
| `CSC_LINK` | Certificat `.p12` encodé en base64 |
| `CSC_KEY_PASSWORD` | Mot de passe du certificat `.p12` |

### Modifications du workflow

Dans `.github/workflows/build-macos.yml`, remplacer la variable d'environnement `CSC_IDENTITY_AUTO_DISCOVERY: false` par :

```yaml
env:
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
```

Et dans `electron-builder.yml`, supprimer les lignes `identity: null` et `gatekeeperAssess: false`, puis ajouter :

```yaml
mac:
  notarize:
    teamId: <APPLE_TEAM_ID>
```
