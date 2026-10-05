# Kōlā — Frontend

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · TanStack Query · Zustand · Motion.

```bash
npm install
cp .env.example .env.local   # VITE_API_MODE=mock|http
npm run dev                  # http://localhost:5173
npm run build
```

## Organisation

```
src/
├── lib/api/          types.ts (contrat), http.ts (client réel), mock/ (API simulée), index.ts (sélection du mode)
├── lib/              format.ts (FCFA, libellés), whatsapp.ts, cn.ts
├── stores/           cart.ts (panier persistant), auth.ts (session), toast.ts
├── hooks/queries.ts  hooks TanStack Query
├── components/       layout/, ui/, product/
└── pages/            pages publiques + admin/
```

Le contrat d'API est documenté dans `../docs/API.md`.
