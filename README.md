# PromptForge

PWA autonome pour transformer une demande en prompt structuré et économe en tokens.

## Fonctionnalités

- génération locale de prompts pour ChatGPT, Claude, Gemini et Cursor ;
- cadrage adapté aux projets PWA, APK Android et Electron ;
- modes **Compact** et **Expert** ;
- estimation indicative du volume de tokens et de l’écart avec le brouillon ;
- nettoyage des formulations répétitives, séparation objectif/contexte/contraintes/livrable ;
- copie, téléchargement Markdown et historique local ;
- installation PWA et fonctionnement hors ligne après la première ouverture.

## Lancer l’application

Le dossier `dist/` est un site statique autonome. Il doit être servi par un serveur HTTP (même local) pour activer le service worker et l’installation PWA.

Exemple avec Node :

```bash
npx serve dist
```

Puis ouvrir l’adresse indiquée dans le navigateur.

Les données de l’historique et le thème sont conservés uniquement dans le stockage local du navigateur.
