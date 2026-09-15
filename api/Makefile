.PHONY: dev health seed mongo-up mongo-down down prod-up prod-down prod-logs

mongo-up:
	@chmod +x scripts/mongo-up.sh
	@./scripts/mongo-up.sh

mongo-down:
	docker compose down

# Alias usado pelo Makefile da raiz (`make api-down`)
down: mongo-down

dev: mongo-up
	node src/server.js

health:
	curl -sS http://127.0.0.1:$${PORT:-3001}/health | tee /dev/stderr

seed:
	node src/v1/seed/casaDoTenis.js

prod-up:
	@test -f .env.prod || (echo "Crie .env.prod a partir de .env.prod.example" && exit 1)
	@test -d /volumes/worqera/mongodb && test -d /volumes/worqera/api/storage || ( \
		echo "Crie os dirs no host:"; \
		echo "  sudo mkdir -p /volumes/worqera/mongodb /volumes/worqera/api/storage"; \
		echo "  sudo chown -R 999:999 /volumes/worqera/mongodb"; \
		exit 1)
	chmod +x docker/mongo/init-replica-set.sh
	docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose --env-file .env.prod -f docker-compose.prod.yml down

prod-logs:
	docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f worqera-api
