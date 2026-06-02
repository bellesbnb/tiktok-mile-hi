# the squad — mile hi city pickleball

Creator portal for the **Mile Hi City Pickleball** TikTok squad (Denver, CO).

Live site: **https://squad-mile-hi.vercel.app**

## What's here

- `index.html` + `app.js` — single-page portal, vanilla JS, Tailwind CDN, no build step
- `data.json` — all content (creators, weekly trends, top videos). Edit this and push to update the live site.
- `assets/` — logo, favicon, creator photos

## How it updates

- Push to `main` → Vercel auto-deploys (Git Integration).
- Every Monday at 7am MT, a scheduled Claude Code agent reads last week's performance, researches new Gen Z + competitor trends, regenerates `data.json`'s `thisWeek` array with 4 new trend ideas, and commits to `main`.

## Editing locally

```bash
cd site
python3 -m http.server 4321
# open http://localhost:4321
```

Edit `data.json` → save → reload. Then `git commit && git push` to deploy.

## Brand

Mile Hi City Pickleball brand kit colors and fonts:
- Denim `#096994`, Burnt Orange `#F05D38`, Butterscotch `#F39D34`, Aqua `#1982A6`, Navy `#003C78`, Magnolia `#FDFFEA`
- Fredoka (display, rounded lowercase) · Anton (impact caps) · DM Sans (body)

Built by Soul Belle for Tricia Houston / Mile Hi City Pickleball.
