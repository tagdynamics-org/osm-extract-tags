import "mocha";
import { expect } from "chai";
import { canProceed, LoopState } from "../../src/OSM/OrderGuard";
import arrayCartesianProduct = require("array-cartesian-product");

/** Helper function to create `LoopState`:s for testing */
function s(id: number, version: number, type: string): LoopState {
  return { id, type, version } as LoopState;
}

describe("canProceed", () => {
  const types = ["node", "way", "relation"];

  it("should handle validity check of first element", () => {
    types.forEach((t) => {
      expect(canProceed(null, s(10, 42, "node"))).to.eq(true);
      expect(canProceed(null, s(1, 1, "way"))).to.eq(false);
      expect(canProceed(null, s(1, 1, "relation"))).to.eq(false);
    });
  });

  it("should handle OK increments (same type)", () => {
    types.forEach((t) => {
      expect(canProceed(s(1, 1, t), s(1, 2, t))).to.eq(true);
      expect(canProceed(s(1, 1, t), s(2, 2, t))).to.eq(true);
      expect(canProceed(s(1, 1, t), s(2, 1, t))).to.eq(true);
      expect(canProceed(s(1, 2, t), s(2, 2, t))).to.eq(true);
    });
  });

  it("should detect invalid increments (same type)", () => {
    types.forEach((t) => {
      // version must increase for same id
      expect(canProceed(s(1, 1, t), s(1, 1, t))).to.eq(false);
      expect(canProceed(s(1, 2, t), s(1, 1, t))).to.eq(false);
      // id can not decrease
      expect(canProceed(s(2, 1, t), s(1, 1, t))).to.eq(false);
      expect(canProceed(s(2, 1, t), s(1, 10, t))).to.eq(false);
      expect(canProceed(s(2, 10, t), s(1, 1, t))).to.eq(false);
    });
  });

  it("should detect valid/invalid changes in element type", () => {
    const rnds = [1, 2, 3, 4, 5];

    arrayCartesianProduct([rnds, rnds, rnds, rnds]).forEach(
      ([id0, version0, id1, version1]) => {
        // None of these tests should depend on the id/version number.
        //
        // Allowed jumps:
        //   node -> way
        //   way -> relation
        expect(canProceed(s(id0, version0, "node"), s(id1, version1, "way"))).to.eq(true);
        expect(canProceed(s(id0, version0, "way"), s(id1, version1, "relation"))).to.eq(true);

        // Forbidden jumps:
        //   node -> relation (would imply the file has no ways)
        //   relation -> way
        //   relation -> node
        //   way -> node
        expect(canProceed(s(id0, version0, "node"), s(id1, version1, "relation"))).to.eq(false);
        expect(canProceed(s(id0, version0, "relation"), s(id1, version1, "way"))).to.eq(false);
        expect(canProceed(s(id0, version0, "relation"), s(id1, version1, "node"))).to.eq(false);
        expect(canProceed(s(id0, version0, "way"), s(id1, version1, "node"))).to.eq(false);
    });
  });
});
