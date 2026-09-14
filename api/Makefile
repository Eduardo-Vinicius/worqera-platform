.PHONY: dev health seed mongo-up mongo-down

mongo-up:
	docker compose up -d mongo

mongo-down:
	docker compose down

dev: mongo-up
	node src/server.js

health:
	curl -sS http://127.0.0.1:$${PORT:-3001}/health | tee /dev/stderr

seed:
	node src/v1/seed/casaDoTenis.js
