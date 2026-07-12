// @pwngh/money
//
// Copyright (c) Preston Neal
//
// This source code is licensed under the MIT license found in the
// LICENSE.md file in the root directory of this source tree.
//
// The C# vector runner: a second carrier of the money semantics, pinned by
// money.vectors.json (from `npm run emit`) and nothing else — it never reads the
// TypeScript. The arithmetic lives in Runtime/Money.cs; this file only loads the
// vectors, dispatches each to that surface, and exits with the failure count.

using System.Numerics;
using System.Text.Json;
using static Pwngh.Money.Money;

var path = args.Length > 0 ? args[0] : "out/money.vectors.json";
using var doc = JsonDocument.Parse(File.ReadAllText(path));
var failures = new List<string>();
var total = 0;

string S(JsonElement v, int i) =>
  v[i].GetString() ?? throw new InvalidDataException($"vector slot {i} not a string");
Int128 I(JsonElement v, int i) => Int128.Parse(S(v, i));
BigInteger B(JsonElement v, int i) => BigInteger.Parse(S(v, i));
int N(JsonElement v, int i) => v[i].GetInt32();
void Fail(JsonElement v, string got) => failures.Add($"{v.GetRawText()} got {got}");

void Expect(JsonElement v, string want, Func<string> run)
{
  string got;
  try
  {
    got = run();
  }
  catch
  {
    if (want != "throws") Fail(v, "throw");
    return;
  }
  if (want == "throws") Fail(v, $"no throw ({got})");
  else if (got != want) Fail(v, got);
}

foreach (var v in doc.RootElement.EnumerateArray())
{
  total += 1;
  var kind = S(v, 0);
  switch (kind)
  {
    case "exp":
      if (Exponent(S(v, 1)) != N(v, 2)) Fail(v, Exponent(S(v, 1)).ToString());
      break;
    case "parse":
    {
      var got = Parse(S(v, 1), N(v, 2));
      var want = v[3].ValueKind == JsonValueKind.Null ? null : S(v, 3);
      var gotText = got?.ToString();
      if (gotText != want) Fail(v, gotText ?? "null");
      break;
    }
    case "format":
    {
      var got = v.GetArrayLength() > 4
        ? Format(B(v, 1), N(v, 2), S(v[4], 0), S(v[4], 1))
        : Format(B(v, 1), N(v, 2));
      if (got != S(v, 3)) Fail(v, got);
      break;
    }
    case "add":
      Expect(v, S(v, 3), () => Add(I(v, 1), I(v, 2)).ToString());
      break;
    case "mul":
      Expect(v, S(v, 3), () => Mul(I(v, 1), I(v, 2)).ToString());
      break;
    case "div":
      Expect(v, S(v, 4), () => DivRound(I(v, 1), I(v, 2), S(v, 3)).ToString());
      break;
    case "muldiv":
      Expect(v, S(v, 5), () => MulDiv(I(v, 1), I(v, 2), I(v, 3), S(v, 4)).ToString());
      break;
    case "conv":
      Expect(v, S(v, 7), () =>
        Convert(S(v, 1), I(v, 2), S(v, 3), I(v, 4), I(v, 5), S(v, 6)).ToString());
      break;
    case "enc":
      Expect(v, S(v, 3), () => Encode(S(v, 1), B(v, 2)));
      break;
    case "dec":
    {
      var got = Decode(S(v, 1));
      var canonical = got is null ? null : Encode(got.Value.Currency, got.Value.Minor);
      var want = v[2].ValueKind == JsonValueKind.Null ? null : S(v, 2);
      if (canonical != want) Fail(v, canonical ?? "null");
      break;
    }
    case "alloc":
    {
      var weights = v[2].EnumerateArray()
        .Select(w => BigInteger.Parse(w.GetString() ?? "")).ToArray();
      if (v[3].ValueKind == JsonValueKind.String)
      {
        Expect(v, S(v, 3), () => string.Join(",", Allocate(B(v, 1), weights)));
        break;
      }
      try
      {
        var got = Allocate(B(v, 1), weights);
        var want = v[3].EnumerateArray()
          .Select(w => BigInteger.Parse(w.GetString() ?? "")).ToArray();
        if (!got.SequenceEqual(want)) Fail(v, string.Join(",", got));
        else if (got.Aggregate(BigInteger.Zero, (a, b) => a + b) != B(v, 1))
          Fail(v, "does not conserve");
      }
      catch
      {
        Fail(v, "throw");
      }
      break;
    }
    case "bps":
    {
      try
      {
        var bps = v[2].EnumerateArray().Select(b => b.GetInt32()).ToArray();
        var (shares, remainder) = SplitBps(B(v, 1), bps);
        var want = v[3].EnumerateArray()
          .Select(w => BigInteger.Parse(w.GetString() ?? "")).ToArray();
        if (!shares.SequenceEqual(want) || remainder != B(v, 4))
          Fail(v, $"{string.Join(",", shares)} r {remainder}");
        else if (shares.Aggregate(BigInteger.Zero, (a, b) => a + b) + remainder != B(v, 1))
          Fail(v, "does not conserve");
      }
      catch
      {
        Fail(v, "throw");
      }
      break;
    }
    default:
      Fail(v, $"unknown vector kind {kind}");
      break;
  }
}

foreach (var failure in failures) Console.WriteLine(failure);
Console.WriteLine($"{total} vectors, {failures.Count} failures");
return failures.Count;
