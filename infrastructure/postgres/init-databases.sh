#!/usr/bin/env bash
set -euo pipefail

services=(identity catalog procurement inventory organization assignment inspection maintenance notification reporting audit)

for service in "${services[@]}"; do
  db_name="${service}_db"
  db_role="${service}_app"
  password_var="${service^^}_DB_PASSWORD"
  if [[ -z "${!password_var:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$password_var" >&2
    exit 1
  fi
  db_password="${!password_var}"

  psql \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 \
    --set=db_name="$db_name" \
    --set=db_role="$db_role" \
    --set=db_password="$db_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_role', :'db_password')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'db_role'
)
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_role')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_database WHERE datname = :'db_name'
)
\gexec
SQL
done
