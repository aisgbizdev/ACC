# ACC – APUPPT Control Center
## Advanced Replit Agent Prompt – Build-Ready Version

You are a senior full-stack product engineer.

Build ACC system with:
- 5 PT (SGB, RFB, BPF, KPF, EWF)
- 1 APUPPT per PT
- roles: APUPPT, DK, DU, Owner

Core modules:
- Auth
- Dashboard (traffic light)
- Daily Activity
- Findings
- Reports
- PT Detail

Principles:
- simple
- fast
- no overengineering
- mobile friendly

Tech:
- React + Vite + Tailwind
- Node + Express
- PostgreSQL
- Drizzle ORM

Key Logic:
- Green = updated + no overdue finding
- Yellow = updated + pending
- Red = not updated OR overdue >3 days

Build order:
1. Auth
2. Dashboard
3. Activity
4. Findings
5. Reports

DO NOT:
- add AI
- add workflow approval
- add complex compliance system

Goal:
Executive compliance dashboard, not heavy system.
