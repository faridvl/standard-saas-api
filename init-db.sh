set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE saas_identity;
    CREATE DATABASE saas_medical_records;
EOSQL