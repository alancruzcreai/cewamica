# Cewámica

A static website for **Cewámica** — wild-clay ceramics rooted in Todos Santos, Baja California Sur.

The site is a 4-slide hero (Wild Clay → Pit Fired → Pieces → Intuitive) with a glass-typography effect that lets the photograph behind read through the letters, plus a cursor-following spotlight that lights up the words as the visitor moves the mouse (or finger on touch).

Below the hero: About, Pieces (Quiet Companions, Valle Collection), Barro Contigo, The Medium, and Contact.

## Local preview

```sh
cd public
python3 -m http.server 5174
# open http://localhost:5174
```

## Project layout

```
public/
├── index.html       # markup, including the SVG glass titles
├── styles.css       # tokens, hero animation, sections
├── main.js          # carousel, spotlight, scroll progress, reveals
├── fonts/           # SFC Mehico (titles), Canela (display)
└── images/
    ├── hero/        # 4 hero photographs
    ├── about/  barro/  quiet/  valle/   # section photography
    └── logo/        # wordmark + icon (SVG)
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes `public/` to GitHub Pages.
