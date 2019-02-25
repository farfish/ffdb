#!/bin/sh
set -eux

[ "${1-}" = "--recreate" ] && { DB_RECREATE="x"; shift; } || DB_RECREATE=""
[ "$#" -ge "3" ] || { echo "Usage: $0 [--recreate] (db_name) (db_user) (db_pass) [ro_user] . . ." 1>&2; exit 1; }
DB_NAME="$1" ; shift
DB_USER="$1" ; shift
DB_PASS="$1" ; shift
PSQL="psql -X --set ON_ERROR_STOP=1 --set AUTOCOMMIT=off"
DB_RO_USERS="$*"

# Drop and/or create database
if ${PSQL} -l | grep -q "${DB_NAME}"; then
    if [ -n "${DB_RECREATE}" ]; then
        echo "DROP DATABASE ${DB_NAME}" | ${PSQL} postgres
        createdb "${DB_NAME}"
    fi
else
    createdb "${DB_NAME}"
fi

# Run DB schemas
for s in "$(dirname $0)"/*.sql; do
    echo "=============== $s"
    ${PSQL} -a -f "$s" "${DB_NAME}"
done

# Make sure the DB user exists
echo "=============== Create DB user"
${PSQL} ${DB_NAME} -f - <<EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS (SELECT
                  FROM pg_catalog.pg_roles
                  WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
   END IF;
END
\$do\$;

GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};

GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA public
    TO ${DB_USER};

ALTER DEFAULT PRIVILEGES
    IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};

COMMIT;
EOF

for DB_RO_USER in $DB_RO_USERS; do
    echo "=============== Create read-only DB user $DB_RO_USER"
    ${PSQL} ${DB_NAME} -f - <<EOF
    DO
    \$do\$
    BEGIN
       IF NOT EXISTS (SELECT
                      FROM pg_catalog.pg_roles
                      WHERE rolname = '${DB_RO_USER}') THEN
          CREATE ROLE ${DB_RO_USER} WITH LOGIN;
       END IF;
    END
    \$do\$;

    GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_RO_USER};

    GRANT SELECT
        ON ALL TABLES IN SCHEMA public
        TO ${DB_RO_USER};

    ALTER DEFAULT PRIVILEGES
        IN SCHEMA public
        GRANT SELECT ON TABLES TO ${DB_RO_USER};

    COMMIT;
EOF
done
