.PHONY: prod-up prod-down prod-logs

prod-up:
	@test -f .env.prod || (echo "Crie .env.prod a partir de .env.prod.example" && exit 1)
	docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose --env-file .env.prod -f docker-compose.prod.yml down

prod-logs:
	docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f worqera-web
