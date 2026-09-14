.PHONY: help api-dev api-down api-seed api-health web-dev

help:
	@echo "Worqera monorepo"
	@echo "  make api-dev     - Mongo + API :3001"
	@echo "  make api-seed    - Seed Casa do Tênis"
	@echo "  make api-health  - GET /health"
	@echo "  make web-dev     - Next.js :3000"

api-dev:
	@$(MAKE) -C api dev

api-down:
	@$(MAKE) -C api down || true

api-seed:
	@$(MAKE) -C api seed

api-health:
	@$(MAKE) -C api health

web-dev:
	@npm --prefix web run dev
