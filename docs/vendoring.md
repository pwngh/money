# Vendoring

Take the file instead of the dependency. Every `src` file is a single-file
amalgamation with zero imports, so a repo that keeps zero runtime dependencies
copies it unchanged — from this repo, or straight out of the installed package,
which ships `src/` for exactly this:

```bash
cp node_modules/@pwngh/money/src/money.ts src/money.vendored.ts
```

`src/fold.ts` and `src/db.ts` vendor the same way. The files never import each
other, so each stands alone.

## The drift guard

A vendored copy cannot rot silently, because the conformance vectors travel
inside the file. Add one assertion to your suite:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { selfTest } from './money.vendored.ts';

test('vendored money is conformant', () => {
  assert.deepEqual(selfTest(), []);
});
```

Any edit that changes the semantics — yours or an upstream update applied
wrong — fails that test.

## The contract

Vendorability is spec guarantee 10 and machine-enforced in this repo: a release
that gives an amalgamation an import statement, or removes its `selfTest`, fails
this package's own suite before it ships. Updating a vendored copy is re-copying
the file; your selfTest tells you whether the new semantics landed intact.
