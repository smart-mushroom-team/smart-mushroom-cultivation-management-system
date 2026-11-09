SMART MUSHROOM - OPERATOR READ-ONLY + PAGINATION (5 rooms/page)
Copy clients/web/src/ files into project, overwrite matching files.
This patch is based on latest supplied ZIP + previous admin core/room statistics patches.
Commands: cd clients/web; npm run typecheck; npm run dev
Security: frontend hides mutations, but backend must independently enforce ADMIN on POST/PATCH/DELETE endpoints.

Backend included: rooms/trays writes ADMIN-only; GET trays Operator+Admin; GET packages/all Operator+Admin; package writes remain ADMIN-only.
Restart: docker compose up -d --build core
Backend patch retains one-tray-per-slot constraints and fixes optional UUID null cast.
