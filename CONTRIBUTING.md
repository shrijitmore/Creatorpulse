# Contributing to Creatorpulse

## Before You Start

- Check [open issues](https://github.com/shrijitmore/Creatorpulse/issues) to avoid duplicate work
- For large features, open an issue first to discuss the approach
- Read [CLAUDE.md](./CLAUDE.md) — all coding rules are there

## Setup

```bash
git clone https://github.com/shrijitmore/Creatorpulse.git
cd Creatorpulse

# Backend
cd backend && npm install
cp .env.example .env   # fill in your keys

# Frontend
cd ../frontend && npm install
cp .env.example .env.local
```

## Workflow

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature` or `fix/your-bug`
3. Make changes — follow the coding rules in CLAUDE.md
4. Test locally (both frontend and backend)
5. Open a PR against `main`

## Branch naming

| Type | Pattern |
|------|---------|
| Feature | `feat/short-description` |
| Bug fix | `fix/short-description` |
| Docs | `docs/short-description` |
| Refactor | `refactor/short-description` |

## PR checklist

- [ ] No hardcoded values (use constants files)
- [ ] No duplicate components (checked `components/ui`)
- [ ] Loading, error, and empty states handled
- [ ] No `console.log` left in production code
- [ ] No secrets or API keys committed
- [ ] Backend routes are thin (logic in services)

## What we won't merge

- Features that bypass auth
- PRs that break existing functionality without fixing it
- Code that hardcodes values that belong in constants
- Business logic in route files

## Questions

Open a [GitHub Discussion](https://github.com/shrijitmore/Creatorpulse/discussions) or comment on the relevant issue.
