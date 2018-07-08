import _ = require("highland");

import { MapElement, applyMainPipeline, OutputRevision, outputFormatter } from "../src/Pipeline";
import { groupRevisions } from "../src/OSM/OSMIterator";
import { toPromise } from "../src/utils/StreamUtils";

import "mocha";
import { expect } from "chai";

function applyPipeline(elements: MapElement[]): Promise<OutputRevision[][]> {
  const tagsToExtract = ["amenity", "leisure", "shop"];
  const outStream: Highland.Stream<OutputRevision[]> = applyMainPipeline(tagsToExtract, groupRevisions(_(elements)));
  return toPromise(outStream);
}

describe("Main processing pipeline", () => {
  function el({visible, version, tags}): MapElement {
    return {
      type: "node",
      id: 42,
      ts: version,
      visible, version, tags,
    };
  }

  it(`should completely filter out histories with no relevant tags`, async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: {name: "a"}}),
      el({ version: 2, visible: true, tags: {name: "a"}}),
      el({ version: 3, visible: true, tags: {name: "a"}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    expect(result).to.deep.eq([]);
  });

  it(`should completely filter out histories where no relevant tags/deleted entries`, async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: {dummy1: "a"}}),
      el({ version: 2, visible: false, tags: {}}),
      el({ version: 3, visible: true, tags: {dummy2: "b"}}),
      el({ version: 4, visible: true, tags: {dummy3: "c"}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    expect(result).to.deep.eq([]);
  });

  it("should include elements with only one revision with relevant tag", async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: {amenity: "a"}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    const expected = { tid: "N42", ts: 1, version: 1, visible: true, tags: ["0:a"] };
    expect(result).to.deep.eq([[expected]]);
  });

  it("should completely filter out repeated visible entries with identical tags", async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: {amenity: "a"}}),
      el({ version: 2, visible: true, tags: {amenity: "a"}}),
      el({ version: 3, visible: true, tags: {amenity: "a"}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    const expected = { tid: "N42", ts: 1, version: 1, visible: true, tags: ["0:a"] };
    expect(result).to.deep.eq([[expected]]);
  });

  it("should filter repeated deleted entries", async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: {amenity: "a"}}),
      el({ version: 2, visible: false, tags: {}}),
      el({ version: 3, visible: false, tags: {}}),
      el({ version: 4, visible: true, tags: {dummy: "a"}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    const expected = [
      [
        { tid: "N42", version: 1, visible: true, ts: 1, tags: ["0:a"] },
        { tid: "N42", version: 2, visible: false, ts: 2, tags: [] },
        { tid: "N42", version: 4, visible: true, ts: 4, tags: [] },
      ],
    ];
    expect(result).to.deep.eq(expected);
  });

  it("should keep changes in (relevant tags) & (delete status)", async () => {
    const elementHistory = [
      el({ version: 1, visible: true, tags: { amenity: "a" }}),
      el({ version: 2, visible: true, tags: { amenity: "b" }}),
      el({ version: 3, visible: false, tags: {}}),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    const expected = [
      [
        { tid: "N42", version: 1, visible: true, ts: 1, tags: ["0:a"] },
        { tid: "N42", version: 2, visible: true, ts: 2, tags: ["0:b"] },
        { tid: "N42", version: 3, visible: false, ts: 3, tags: [] },
      ],
    ];
    expect(result).to.deep.eq(expected);
  });

  it("should not collapse empty tag revisions with visible=false->true->false", async () => {
    const elementHistory = [
      el({ visible: true, version: 1, tags: { amenity: "a" } }),
      el({ visible: false, version: 2, tags: {}}),
      el({ visible: true, version: 3, tags: { dummy_tag: "foo" } }),
      el({ visible: true, version: 4, tags: { dummy_tag: "foo", dummy: "bar" } }),
      el({ visible: false, version: 5, tags: {}}),
      el({ visible: true, version: 6, tags: { amenity: "a", shop: "b" } }),
    ];
    const result: OutputRevision[][] = await applyPipeline(elementHistory);
    const expected = [
      [
        { tid: "N42", version: 1, visible: true, ts: 1, tags: ["0:a"] },
        { tid: "N42", version: 2, visible: false, ts: 2, tags: [] },
        { tid: "N42", version: 3, visible: true, ts: 3, tags: [] },
        { tid: "N42", version: 5, visible: false, ts: 5, tags: [] },
        { tid: "N42", version: 6, visible: true, ts: 6, tags: ["0:a", "2:b"] },
      ],
    ];
    expect(result).to.deep.eq(expected);
  });

  it("should throw error if map elements appear out of order", async () => {
    const elementHistory = [
      el({ visible: true, version: 2, tags: {name: "a" }}),
      el({ visible: true, version: 1, tags: {name: "a" }}),
    ];
    try {
      await applyPipeline(elementHistory);
      throw new Error("failed");
    } catch (err) {
      expect(err.message).to.contain("Elements out of order:");
    }
  });

  // Check these (with real OSM data)
  // TODO: should fail if first element is deleted (?)
  // TODO: should fail if there are repeated deleted entries (?)
  // TODO: should fail if first element has version number > 1 (?)
});

describe("Pipeline.outputFormatter", () => {
  it("example I/O test", () => {
    const line = [
      {
        tid: "N99",
        version: 1,
        visible: true,
        ts: 10000,
        tags: ["0:a"],
      },
      {
        tid: "N99",
        version: 2,
        visible: true,
        ts: 10001,
        tags: ["0:b", "2:c"],
      },
      {
        tid: "N99",
        version: 10,
        visible: true,
        ts: 10002,
        tags: [],
      },
      {
        tid: "N99",
        version: 11,
        visible: false,
        ts: 10003,
        tags: [],
      },
    ];
    const expected = ["N99", [
      [10000, 1, 1, ["0:a"]],
      [10001, 2, 1, ["0:b", "2:c"]],
      [10002, 10, 1, []],
      [10003, 11, 0, []],
    ]];
    expect(outputFormatter(line)).to.deep.equal(expected);
  });
});
