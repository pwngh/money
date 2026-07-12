PGDATABASE ?= postgres
export PGDATABASE

test:
	npm test

build:
	npm run build

check:
	npm run check

emit:
	npm run emit -- out

bench:
	node scripts/fold.bench.ts

sync:
	node scripts/sync.ts

prove-sql:
	npm run emit -- out
	psql -v ON_ERROR_STOP=1 -f out/money.sql
	psql -v ON_ERROR_STOP=1 -v vectors="$$(cat out/money.vectors.json)" -f db/prove.sql

install-mysql:
	npm run emit -- out
	mysql $(MYSQLFLAGS) < out/money.mysql.sql

prove-csharp:
	npm run emit -- out
	dotnet run --project carriers/csharp -- out/money.vectors.json

.PHONY: test build check emit bench sync prove-sql install-mysql prove-csharp
