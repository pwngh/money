// @pwngh/money
//
// Copyright (c) Preston Neal
//
// This source code is licensed under the MIT license found in the
// LICENSE.md file in the root directory of this source tree.
//
// The Udon fold carrier: a plain-C# reimplementation of the @pwngh/money balance
// fold for hosts that load no WebAssembly. It never reads the TypeScript; it is
// pinned by fold.vectors.json. No generics, no Int128, no exceptions in the hot
// path — overflow is detected with the same signed-overflow test the WASM kernel
// (src/fold.ts) uses, so a single `long` accumulator suffices on any runtime.

namespace Pwngh.Money
{
  /// <summary>
  /// Checked i64 balance folding. A left fold whose running sum is bounds-checked at
  /// every step, so an intermediate that leaves i64 range traps even when the final
  /// total would fit — order matters, exactly as in the reference fold. Traps are
  /// reported as a return of <c>false</c> (or an <c>overflowed</c> flag), never a
  /// thrown exception, so the carrier runs inside sandboxes that forbid them.
  /// </summary>
  public static class MoneyFold
  {
    /// <summary>
    /// Folds i64 values left to right. Returns the sum, or sets
    /// <paramref name="overflowed"/> and returns 0 when any step leaves i64 range.
    /// </summary>
    public static long Fold(long[] values, out bool overflowed)
    {
      long sum = 0;
      for (var i = 0; i < values.Length; i += 1)
      {
        var v = values[i];
        var s = sum + v;
        // Signed overflow of sum + v: both addends end up on the opposite side of the
        // sum's sign. The same test the WASM kernel traps on.
        if (((sum ^ s) & (v ^ s)) < 0)
        {
          overflowed = true;
          return 0;
        }
        sum = s;
      }
      overflowed = false;
      return sum;
    }

    /// <summary>
    /// Folds decimal i64 strings — the shape a fold vector carries. Returns false when a
    /// value is malformed, leaves i64 range, or a running sum overflows; that false is the
    /// vector's <c>throws</c> outcome.
    /// </summary>
    public static bool TryFold(string[] values, out long result)
    {
      long sum = 0;
      for (var i = 0; i < values.Length; i += 1)
      {
        if (!long.TryParse(values[i], out long v))
        {
          result = 0;
          return false;
        }
        var s = sum + v;
        if (((sum ^ s) & (v ^ s)) < 0)
        {
          result = 0;
          return false;
        }
        sum = s;
      }
      result = sum;
      return true;
    }
  }
}
