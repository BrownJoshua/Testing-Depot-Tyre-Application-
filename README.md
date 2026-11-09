# MTC Depot Tyre Management ERP (demonstration)

React 19 + Vite + TypeScript + Tailwind 4 on Supabase (Postgres, Row Level Security). Five roles: HO, AM, Supervisor, Tyre IC, Tyre Man (phone only).

## Running and deploying

Run on your computer:

```bash
npm install
cp .env.example .env     # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AUTH_EMAIL_DOMAIN (public values only)
npm run dev              # http://localhost:5173
npm run build            # type check + production build into dist/
```

Database changes are SQL files in `supabase/migrations`, applied from the owner's computer with `node supabase/admin/run-sql.mjs migrate` (needs a personal access token in the git-ignored `.env.admin.local`). Tests in `supabase/tests` roll themselves back.

Deploying to Netlify, Supabase settings, passwords, the demo date, backup and the go-live checklist: see [documentation/deployment-guide.md](documentation/deployment-guide.md). Never put a secret key in a `VITE_*` variable.
