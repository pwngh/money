// @pwngh/money
//
// Copyright (c) Preston Neal
//
// This source code is licensed under the MIT license found in the
// LICENSE.md file in the root directory of this source tree.
//
// The reusable arithmetic core of the C# carrier, split out from the vector
// runner in Program.cs so the public surface is a set of documented, typed
// methods rather than closures inside a main. Int128 carries the intermediates
// the vectors deliberately push past 64 bits; BigInteger carries the untrusted
// parse path so out-of-range text is a null, never an overflow.

using System.Numerics;
using System.Text.RegularExpressions;

namespace Pwngh.Money;

/// <summary>
/// Minor-unit integer money on a checked i64: ISO 4217 exponents, strict parse and
/// canonical format, five rounding modes, rational conversion, largest-remainder
/// allocation, and the canonical wire codec. Every method is pure; the only I/O is
/// in the runner that drives these against the conformance vectors.
/// </summary>
public static class Money
{
  const long I64Min = long.MinValue;
  const long I64Max = long.MaxValue;

  static readonly Dictionary<string, int> Exponents = new()
  {
    ["BIF"] = 0, ["CLP"] = 0, ["DJF"] = 0, ["GNF"] = 0, ["ISK"] = 0, ["JPY"] = 0,
    ["KMF"] = 0, ["KRW"] = 0, ["PYG"] = 0, ["RWF"] = 0, ["UGX"] = 0, ["UYI"] = 0,
    ["VND"] = 0, ["VUV"] = 0, ["XAF"] = 0, ["XOF"] = 0, ["XPF"] = 0,
    ["BHD"] = 3, ["IQD"] = 3, ["JOD"] = 3, ["KWD"] = 3, ["LYD"] = 3, ["OMR"] = 3,
    ["TND"] = 3,
    ["CLF"] = 4, ["UYW"] = 4,
  };

  /// <summary>
  /// The ISO 4217 minor-unit exponent for a currency; 2 for anything unlisted.
  /// </summary>
  public static int Exponent(string currency) =>
    Exponents.TryGetValue(currency, out var e) ? e : 2;

  /// <summary>Narrows a 128-bit intermediate back into i64, throwing on overflow.</summary>
  public static long CheckI64(Int128 value) =>
    value < I64Min || value > I64Max ? throw new OverflowException("i64 overflow") : (long)value;

  /// <summary>Checked i64 addition.</summary>
  public static long Add(Int128 a, Int128 b) => CheckI64(a + b);

  /// <summary>Checked i64 multiplication.</summary>
  public static long Mul(Int128 a, Int128 b) => CheckI64(a * b);

  /// <summary>
  /// Divides <paramref name="num"/> by <paramref name="den"/> and rounds the result by
  /// <paramref name="mode"/> (trunc, floor, ceil, halfEven, halfUp), checked into i64.
  /// </summary>
  public static long DivRound(Int128 num, Int128 den, string mode)
  {
    if (den == 0) throw new ArgumentException("divRound: zero divisor");
    var q = num / den;
    var r = num % den;
    if (r == 0) return CheckI64(q);
    var negative = (num < 0) != (den < 0);
    switch (mode)
    {
      case "trunc": return CheckI64(q);
      case "floor": return CheckI64(negative ? q - 1 : q);
      case "ceil": return CheckI64(negative ? q : q + 1);
      case "halfEven":
      case "halfUp":
        var twice = 2 * Int128.Abs(r);
        var magnitude = Int128.Abs(den);
        Int128 step = negative ? -1 : 1;
        if (twice < magnitude) return CheckI64(q);
        if (twice > magnitude) return CheckI64(q + step);
        if (mode == "halfUp") return CheckI64(q + step);
        return CheckI64(q % 2 == 0 ? q : q + step);
      default: throw new ArgumentException($"divRound: unknown mode {mode}");
    }
  }

  /// <summary>Multiply then divide through a 128-bit intermediate, rounded by mode.</summary>
  public static long MulDiv(Int128 a, Int128 b, Int128 den, string mode) =>
    DivRound(a * b, den, mode);

  static Int128 Pow10(int exp)
  {
    Int128 result = 1;
    for (var i = 0; i < exp; i += 1) result *= 10;
    return result;
  }

  /// <summary>
  /// Converts <paramref name="minor"/> from one currency to another at the rate
  /// <paramref name="num"/>/<paramref name="den"/>, re-scaling for each side's exponent
  /// and rounding by <paramref name="mode"/>.
  /// </summary>
  public static long Convert(
    string from, Int128 minor, string to, Int128 num, Int128 den, string mode)
  {
    if (den <= 0) throw new ArgumentException("convert: non-positive rate denominator");
    if (num < 0) throw new ArgumentException("convert: negative rate numerator");
    return DivRound(minor * num * Pow10(Exponent(to)), den * Pow10(Exponent(from)), mode);
  }

  /// <summary>
  /// Parses a decimal string into minor units, or null when it is malformed, carries more
  /// fraction digits than the exponent allows, or lands outside i64.
  /// </summary>
  public static BigInteger? Parse(string text, int exp)
  {
    var m = Regex.Match(text, @"^(-?)(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$");
    if (!m.Success) return null;
    string? fraction = m.Groups[3].Success ? m.Groups[3].Value : null;
    if (fraction != null && (exp == 0 || fraction.Length > exp)) return null;
    var whole = m.Groups[2].Value.Replace(",", "");
    var scaled = BigInteger.Parse(whole + (fraction ?? "").PadRight(exp, '0'));
    var minor = m.Groups[1].Value == "-" ? -scaled : scaled;
    return minor < I64Min || minor > I64Max ? null : minor;
  }

  /// <summary>Formats minor units back into a grouped decimal string.</summary>
  public static string Format(BigInteger minor, int exp, string group = ",", string dec = ".")
  {
    var sign = minor < 0 ? "-" : "";
    var digits = BigInteger.Abs(minor).ToString().PadLeft(exp + 1, '0');
    var whole = exp == 0 ? digits : digits[..^exp];
    var grouped = Regex.Replace(whole, @"\B(?=(\d{3})+(?!\d))", _ => group);
    return exp == 0 ? sign + grouped : sign + grouped + dec + digits[^exp..];
  }

  /// <summary>Encodes to the canonical <c>CUR:minor</c> wire string.</summary>
  public static string Encode(string currency, BigInteger minor)
  {
    if (!Regex.IsMatch(currency, "^[A-Z]{3,12}$"))
      throw new ArgumentException($"encode: bad currency {currency}");
    if (minor < I64Min || minor > I64Max) throw new OverflowException("i64 overflow");
    return $"{currency}:{minor}";
  }

  /// <summary>Decodes the canonical wire string, or null when it is not well-formed.</summary>
  public static (string Currency, BigInteger Minor)? Decode(string text)
  {
    var m = Regex.Match(text, "^([A-Z]{3,12}):(0|-?[1-9][0-9]*)$");
    if (!m.Success) return null;
    var minor = BigInteger.Parse(m.Groups[2].Value);
    if (minor < I64Min || minor > I64Max) return null;
    return (m.Groups[1].Value, minor);
  }

  /// <summary>
  /// Largest-remainder allocation of <paramref name="minor"/> across integer weights: the
  /// shares sum back to the input exactly, with leftover units going to the largest
  /// fractional parts, ties broken by index.
  /// </summary>
  public static BigInteger[] Allocate(BigInteger minor, BigInteger[] weights)
  {
    if (weights.Length == 0) throw new ArgumentException("allocate: no weights");
    BigInteger total = 0;
    foreach (var w in weights)
    {
      if (w < 0) throw new ArgumentException("allocate: negative weight");
      total += w;
    }
    if (total == 0) throw new ArgumentException("allocate: zero total weight");
    if (minor < 0) return Allocate(-minor, weights).Select(s => -s).ToArray();
    var shares = weights.Select(w => minor * w / total).ToArray();
    var remainder = minor - shares.Aggregate(BigInteger.Zero, (a, b) => a + b);
    var order = Enumerable.Range(0, weights.Length)
      .Select(i => (Index: i, Frac: minor * weights[i] % total))
      .OrderByDescending(x => x.Frac)
      .ThenBy(x => x.Index);
    foreach (var slot in order)
    {
      if (remainder == 0) break;
      shares[slot.Index] += 1;
      remainder -= 1;
    }
    return shares;
  }

  /// <summary>
  /// Splits <paramref name="minor"/> by basis points, truncating each share toward zero and
  /// returning the shares plus the unallocated remainder.
  /// </summary>
  public static (BigInteger[] Shares, BigInteger Remainder) SplitBps(BigInteger minor, int[] bps)
  {
    var totalBps = 0;
    foreach (var share in bps)
    {
      if (share < 0) throw new ArgumentException("splitBps: bad bps");
      totalBps += share;
    }
    if (totalBps > 10_000) throw new ArgumentException("splitBps: bps exceed 10000");
    var shares = bps.Select(b => minor * b / 10_000).ToArray();
    var remainder = minor - shares.Aggregate(BigInteger.Zero, (a, b) => a + b);
    return (shares, remainder);
  }
}
