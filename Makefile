.PHONY: help api-dev api-down api-seed api-health api-prod-up api-prod-down \
	web-dev web-install web-prod-up web-prod-down \
	cdt-extract cdt-import-dry cdt-import

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
