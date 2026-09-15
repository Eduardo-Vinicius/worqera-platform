#!/usr/bin/env bash
# Sobe o Mongo de dev sem falhar no "port already allocated" (race ao reiniciar).
set -euo pipefail

cd "$(dirname "$0")/.."

ping_mongo() {
  docker compose exec -T mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1
}

wait_ping() {
  local n="${1:-20}"
  local i
  for i in $(seq 1 "$n"); do
    if ping_mongo; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# Já rodando → ok
if docker compose ps --status running --services 2>/dev/null | grep -qx mongo; then
  if wait_ping 6; then
    echo "[mongo] já no ar"
    exit 0
  fi
fi

# Container existente parado → start (não recria publish)
if docker inspect worqera-mongo >/dev/null 2>&1; then
  if docker start worqera-mongo >/dev/null 2>&1; then
    if wait_ping 30; then
      echo "[mongo] reiniciado (worqera-mongo)"
      exit 0
    fi
  fi
fi

# Compose up — retry se a porta ainda não liberou do stop anterior
attempt=1
max=8
while [ "$attempt" -le "$max" ]; do
  err="$(docker compose up -d --no-recreate mongo 2>&1)" && {
    if wait_ping 30; then
      echo "[mongo] ok"
      exit 0
    fi
    echo "[mongo] container up, ping lento — segue"
    exit 0
  }

  # Sem --no-recreate se o container ainda não existe
  if echo "$err" | grep -qi 'no such\|not found\|does not exist'; then
    err="$(docker compose up -d mongo 2>&1)" && {
      if wait_ping 30; then
        echo "[mongo] ok"
        exit 0
      fi
      echo "[mongo] container up, ping lento — segue"
      exit 0
    }
  fi

  if echo "$err" | grep -qi 'port is already allocated\|address already in use'; then
    echo "[mongo] :27017 ainda ocupada (tentativa $attempt/$max) — aguardando…"
    sleep 2
    # Tenta só start de novo (outro processo pode ter sido o nosso proxy)
    docker start worqera-mongo >/dev/null 2>&1 || true
    if wait_ping 6; then
      echo "[mongo] ok após espera"
      exit 0
    fi
    attempt=$((attempt + 1))
    continue
  fi

  echo "$err"
  exit 1
done

echo "[mongo] não subiu. Quem usa a porta?"
echo "  lsof -nP -iTCP:27017 -sTCP:LISTEN"
echo "  docker ps -a --filter publish=27017"
exit 1
