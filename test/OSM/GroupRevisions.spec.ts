import _ = require("highland");

import { MapElement, groupRevisions } from "../../src/OSM/OSMIterator";

import "mocha";
import { expect } from "chai";

describe("groupRevisions", () => {
  function el({visible, version, tags}): MapElement {
    return {
      type: "node",
      id: 42,
      ts: version, // set timestamp = version
      visible,
      version,
      tags,
    };
  }

  it("should throw error if map elements appear out of order", async () => {
    const elementHistory = [
      el({ visible: true, version: 2, tags: { name: "a" }}),
      el({ visible: true, version: 1, tags: { name: "a" }}),
    ];

    try {
      await groupRevisions(_(elementHistory)).collect().toPromise(Promise);
      throw new Error("Failed");
    } catch (err) {
      expect(err.message).to.contain("Elements out of order");
    }
  });
});
