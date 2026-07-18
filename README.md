# Bookworm Hole UI

Frontend for [`bookworm-hole-api`](https://github.com/fedorkovolodymyr/bookworm-hole-api), built with Next.js (App Router). Delivered in progressive blocks, each covering one API domain end-to-end. See [`docs/specs/2026-07-13-ui-repo-design.md`](docs/specs/2026-07-13-ui-repo-design.md) for the full design and block plan.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query + axios
- pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev      # start dev server
pnpm build    # production build
pnpm start    # run production build
pnpm lint     # eslint
```

## Docs

- [`docs/specs/`](docs/specs) — design specs per block
- [`docs/superpowers/`](docs/superpowers) — plans and specs generated via the superpowers workflow
