.PHONY: help api-dev api-down api-seed api-health api-prod-up api-prod-down \
	web-dev web-install web-prod-up web-prod-down \
	cdt-extract cdt-import-dry cdt-import cdt-inc-dry cdt-inc

help:
	@echo "Worqera monorepo"
	@echo "  make api-dev          - Mongo local + API :3001"
	@echo "  make api-seed         - Seed Casa do Tênis"
	@echo "  make api-health       - GET /health"
	@echo "  make api-prod-up      - API + Mongo prod (Oracle / sharednet)"
	@echo "  make api-prod-down    - Derruba stack API prod"
	@echo "  make web-dev          - Next.js :3000"
	@echo "  make web-prod-up      - Front prod (sharednet, sem ports)"
	@echo "  make web-prod-down    - Derruba stack web prod"
	@echo "  make cdt-extract / cdt-import-dry / cdt-import"
	@echo "  make cdt-inc-dry      - Incremental 14/09→hoje (PDFs 2+3) dry-run"
	@echo "  make cdt-inc          - Incremental apply no Mongo local/PRD (URI no .env)"

api-dev:
	@$(MAKE) -C api dev

api-down:
	@$(MAKE) -C api down || $(MAKE) -C api mongo-down || true

api-seed:
	@$(MAKE) -C api seed

api-health:
	@$(MAKE) -C api health

api-prod-up:
	@$(MAKE) -C api prod-up

api-prod-down:
	@$(MAKE) -C api prod-down

web-dev:
	@test -d web/node_modules || npm --prefix web install
	@npm --prefix web run dev

web-install:
	@npm --prefix web install

web-prod-up:
	@$(MAKE) -C web prod-up

web-prod-down:
	@$(MAKE) -C web prod-down

cdt-extract:
	@python3 api/scripts/extract-cdt-report001.py

cdt-import-dry:
	@cd api && node scripts/import-cdt-report001.js

cdt-import:
	@cd api && node scripts/import-cdt-report001.js --apply

# Incremental: report001 (2).pdf + (3).pdf · desde 2026-09-14 · até hoje · skip codes já no Mongo
cdt-inc-dry:
	@node api/scripts/import-cdt-report001-incremental.js

cdt-inc:
	@node api/scripts/import-cdt-report001-incremental.js --apply
