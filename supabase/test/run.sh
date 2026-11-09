#!/bin/sh
# Runs the RLS/RPC security tests on a throwaway local Postgres. Usage: sh supabase/test/run.sh
set -e
export LANG=C LC_ALL=C
D=$(mktemp -d); PORT=55439
initdb -D "$D" -U postgres -E UTF8 >/dev/null
pg_ctl -D "$D" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$D/log" -w start >/dev/null
trap 'pg_ctl -D "$D" stop -m fast >/dev/null; rm -rf "$D"' EXIT
p() { psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $PORT -U postgres -d postgres "$@"; }
HERE=$(dirname "$0")
p -f "$HERE/stub.sql"
p -f "$HERE/../schema.sql"
p -c "grant select, insert, update, delete on all tables in schema public to anon, authenticated; grant usage on all sequences in schema public to authenticated;"
p -f "$HERE/rls_test.sql" 2>&1 | grep -oE "(PASS|FAIL|ERROR).*"
