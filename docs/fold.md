# The fold

`@pwngh/money/fold` sums i64 amounts in WebAssembly with overflow checked at
every step — an intermediate overflow traps even when the final total would fit,
because a balance that silently passed through an unrepresentable state is not
auditable. Traps surface as `RangeError`, matching the main entry.

```ts
import { createFold, foldRef } from '@pwngh/money/fold';

const folder = createFold();
const legs = new BigInt64Array([12_000n, -4_550n, 325n]);
folder.fold(legs); // 7775n — trap on any intermediate overflow
foldRef(legs); // 7775n — plain-bigint reference, identical semantics
```

The main entry never loads this; compose it in only where the workload earns it.

## No binary ships

The ~125-byte module is assembled at load time by a micro-assembler in the same
file, with a human-readable WAT mirror beside it — the reviewable TypeScript is
the audit target, never bytes. Assembly is deterministic and pinned by test.

## Zero-copy

`folder.view(count)` returns the module's linear memory as a `BigInt64Array`.
Build your column in place and `fold(view)` reads those exact bytes with no copy
— the column _is_ the buffer the kernel reads. A grow detaches earlier views, so
take the view after sizing. The self-test's 65,537-element cross-check (one past
a wasm page, forcing a grow) runs through this path, so zero-copy is
conformance-covered, not just fast.

## Numbers

`npm run bench` reproduces the floor on your hardware: parity-asserted, best of
seven warmed runs, rounded down. One machine's floor (Apple M1 Max, 1M elements):
bigint reference 39M elements/s, wasm copy-in 1.41B, wasm zero-copy 1.75B.

## Other hosts

The same module runs wherever WebAssembly does. `npm run emit -- out/` writes
`fold.wasm` for .NET or Unity via wasmtime; environments that load nothing (VRChat
Udon) reimplement against `fold.vectors.json` instead — see
[Carriers](carriers.md).
