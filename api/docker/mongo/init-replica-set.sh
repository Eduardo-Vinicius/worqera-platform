#!/usr/bin/env bash
set -euo pipefail

MONGO_HOST="${MONGO_HOST:-mongo}"
MONGO_PORT="${MONGO_PORT:-27017}"
REPLICA_SET="${REPLICA_SET:-rs0}"
# Hostname que o membro do replica set anuncia (dentro da rede Docker = nome do serviço).
REPLICA_MEMBER_HOST="${REPLICA_MEMBER_HOST:-127.0.0.1}"
REPLICA_MEMBER="${REPLICA_MEMBER_HOST}:${MONGO_PORT}"

echo "Waiting for MongoDB at ${MONGO_HOST}:${MONGO_PORT}..."
until mongosh --host "${MONGO_HOST}" --port "${MONGO_PORT}" --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; do
  sleep 1
done

echo "Ensuring replica set '${REPLICA_SET}' uses member '${REPLICA_MEMBER}'..."
mongosh --host "${MONGO_HOST}" --port "${MONGO_PORT}" --quiet --eval "
  const targetHost = '${REPLICA_MEMBER}';
  const replicaSetName = '${REPLICA_SET}';

  function needsReconfig(cfg) {
    return !cfg.members || cfg.members.length !== 1 || cfg.members[0].host !== targetHost;
  }

  try {
    const status = rs.status();
    if (status.ok === 1) {
      const cfg = rs.conf();
      if (needsReconfig(cfg)) {
        print('Reconfiguring replica set member to ' + targetHost + '...');
        cfg.members[0].host = targetHost;
        rs.reconfig(cfg, { force: true });
      } else {
        print('Replica set already configured.');
      }
      quit(0);
    }
  } catch (error) {
    print('Replica set not initialized yet.');
  }

  rs.initiate({
    _id: replicaSetName,
    members: [{ _id: 0, host: targetHost }]
  });
"

echo "Waiting for primary election..."
for _ in $(seq 1 30); do
  if mongosh --host "${MONGO_HOST}" --port "${MONGO_PORT}" --quiet --eval "rs.isMaster().ismaster" | grep -qi true; then
    echo "Replica set '${REPLICA_SET}' is ready (member ${REPLICA_MEMBER})."
    exit 0
  fi
  sleep 1
done

echo "Replica set election timed out." >&2
exit 1
