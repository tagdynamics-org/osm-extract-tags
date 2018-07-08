import "mocha";
import { arraysEqual, removeRepeated } from "../../src/utils/ArrayUtils";
import { expect } from "chai";

describe("ArrayUtils", () => {
  const equality = (x, y) => x === y;

  describe("removeRepeated", () => {
    it("should handle empty list", () => {
      expect(removeRepeated([], equality)).to.deep.equal([]);
    });

    it("should handle list with one entry", () => {
      expect(removeRepeated([1], equality)).to.deep.equal([1]);
    });

    it("should handle all unique case", () => {
      expect(removeRepeated([1, 2, 3, 4, 5], equality)).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("should handle repeats in beginning", () => {
      expect(removeRepeated([1, 1, 10, 20], equality)).to.deep.equal([1, 10, 20]);
    });

    it("should handle repeats in middle", () => {
      expect(removeRepeated([1, 2, 3, 1, 1, 13], equality)).to.deep.equal([1, 2, 3, 1, 13]);
    });

    it("should handle repeats in end", () => {
      expect(removeRepeated([1, 2, 3, 1, 1], equality)).to.deep.equal([1, 2, 3, 1]);
    });
  });

  describe("arraysEqual", () => {
    function areEQU(a1: string[]) {
      expect(arraysEqual(a1, a1)).to.eq(true);
      expect(arraysEqual(a1, JSON.parse(JSON.stringify(a1)))).to.eq(true);
    }
    function areNEQ(a1: string[], a2: string[]) {
      expect(arraysEqual(a1, a2)).to.eq(false);
      expect(arraysEqual(a2, a1)).to.eq(false);
    }

    it("should handle full arrays", () => {
      areEQU(["foo"]);
      areEQU(["foo", "bar"]);
      areEQU(["foo", "bar", "baz"]);

      areNEQ(["foo", "bar", "bazz"], ["foo", "bar", "baz"]);
      areNEQ(["foo", "baz", "bar"], ["foo", "bar", "baz"]);
    });

    it("should handle empty arrays", () => {
      areEQU([]);
      areNEQ([], ["foo", "bar", "baz"]);
    });
  });
});
