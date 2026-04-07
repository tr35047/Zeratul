# Zeratul - StarCraft Tavern PVP Prophecy Card Tool

## Project Overview

Zeratul (泽拉图的神秘妙妙猜牌工具) is a web-based reasoning tool for the StarCraft Tavern (星际酒馆) PVP game mode. It helps players identify "Prophecy Cards" (预言牌) based on game feedback using constraint propagation and Shannon entropy-based recommendations.

**Version:** 2.0.1

## Tech Stack

- **Frontend:** Pure vanilla HTML5, CSS3, JavaScript (no frameworks, no build tools)
- **Backend:** None — fully static client-side application
- **Data:** Card packs stored as `.js` files in `resource/data/`, loaded dynamically as `<script>` tags

## Project Layout

```
Zeratul/
├── index.html          # Main entry point
├── app.js              # Core business logic and UI
├── styles.css          # StarCraft-themed styles
├── assets/
│   └── favicon.ico
└── resource/
    └── data/           # Card pack data files
        ├── core.js     # Main 89-card set
        ├── pack1.js    # Armaments Race expansion
        ├── pack2-10.js # Other expansions
        └── packDuo1.js # Twin Dogs expansion
```

## Development Setup

This is a zero-dependency static site. No package manager or build step is required.

**Workflow:** `Start application`  
**Command:** `python3 -m http.server 5000 --bind 0.0.0.0`  
**Port:** 5000

## Deployment

Configured as a **static** deployment. The root directory (`.`) is the public directory.
