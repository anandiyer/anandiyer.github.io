import { describe, it, expect } from "vitest";
import { DEFAULT_INPUTS } from "../model/defaults";
import { decodeWorkspace, encodeInputs, encodeWorkspace } from "./url";

const a = { ...DEFAULT_INPUTS, fundName: "Shots on goal" };
const b = { ...DEFAULT_INPUTS, fundName: "Concentrated", numInvestments: 12, reserveRatio: 0.5 };

describe("workspace URL hash", () => {
  it("round-trips A and B", () => {
    const ws = decodeWorkspace(encodeWorkspace({ a, b }));
    expect(ws?.a.fundName).toBe("Shots on goal");
    expect(ws?.b?.fundName).toBe("Concentrated");
    expect(ws?.b?.numInvestments).toBe(12);
  });

  it("round-trips A alone and keeps the original #s= format", () => {
    const hash = encodeWorkspace({ a, b: null });
    expect(hash).toBe(`#s=${encodeInputs(a)}`);
    expect(decodeWorkspace(hash)?.b).toBeNull();
  });

  it("still reads old single-scenario links", () => {
    const ws = decodeWorkspace(`#s=${encodeInputs(a)}`);
    expect(ws?.a.fundName).toBe("Shots on goal");
    expect(ws?.b).toBeNull();
  });

  it("drops a corrupt B without losing A", () => {
    const ws = decodeWorkspace(`#s=${encodeInputs(a)}&b=not-valid`);
    expect(ws?.a.fundName).toBe("Shots on goal");
    expect(ws?.b).toBeNull();
  });

  it("handles non-ASCII fund names", () => {
    const ws = decodeWorkspace(encodeWorkspace({ a: { ...a, fundName: "Fond I — Zürich" }, b }));
    expect(ws?.a.fundName).toBe("Fond I — Zürich");
  });

  it("returns null for a missing or bad A", () => {
    expect(decodeWorkspace("")).toBeNull();
    expect(decodeWorkspace("#b=abc")).toBeNull();
  });
});
