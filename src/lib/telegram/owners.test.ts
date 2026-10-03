import { describe, expect, it } from "vitest";
import { parseOwnerIds } from "./owners";

describe("parseOwnerIds", () => {
  it("reads one or several ids", () => {
    expect(parseOwnerIds("123")).toEqual(["123"]);
    expect(parseOwnerIds("123,987654321")).toEqual(["123", "987654321"]);
  });
  it("trims spaces, drops empties and anything that is not a number, and removes duplicates", () => {
    expect(parseOwnerIds(" 123 , ,abc, 123 ,456 ")).toEqual(["123", "456"]);
  });
  it("is empty when unset", () => {
    expect(parseOwnerIds(undefined)).toEqual([]);
    expect(parseOwnerIds("")).toEqual([]);
  });
});
