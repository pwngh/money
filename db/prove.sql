-- @pwngh/money
--
-- Loads money.vectors.json (passed as the psql variable :vectors) and asserts
-- conformance. Run via `make prove-sql`, which supplies the variable from
-- `npm run emit` output. Requires db/money.sql applied first.

truncate money.vectors;
insert into money.vectors select jsonb_array_elements(:'vectors'::jsonb);
select money.prove();
