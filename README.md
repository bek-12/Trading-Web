# TradeOS — Personal Trading Journal

A fully client-side trading journal and accountability system. No backend, no database — all data lives in your browser's localStorage.

## Features

- Daily check-in with emotional state tracking
- Pre-trade checklist and rule enforcement
- Trade log with permanent violation flags
- Punishment system for rule breaks
- AI Mentor (rule-based, no API key needed)
- Multi-account support
- P&L calendar heatmap
- Mobile responsive

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click **Deploy**

No environment variables needed.

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview locally with:

```bash
npm run preview
```
