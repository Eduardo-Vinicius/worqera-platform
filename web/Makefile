.PHONY: prod-up prod-down prod-logs

# .env.prod opcional — sem arquivo usa defaults do compose (sharednet + API URL).
prod-up:
	@if [ -f .env.prod ]; then \
		echo "[web] usando .env.prod"; \
		docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build; \
	else \
		echo "[web] sem .env.prod — defaults (sharednet, NEXT_PUBLIC_API_URL=$${NEXT_PUBLIC_API_URL:-https://api.worqera.com})"; \
		echo "[web] override: NEXT_PUBLIC_API_URL=https://api.seudominio.com make prod-up"; \
		docker compose -f docker-compose.prod.yml up -d --build; \
	fi

prod-down:
	@if [ -f .env.prod ]; then \
		docker compose --env-file .env.prod -f docker-compose.prod.yml down; \
	else \
		docker compose -f docker-compose.prod.yml down; \
	fi

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f worqera-web
