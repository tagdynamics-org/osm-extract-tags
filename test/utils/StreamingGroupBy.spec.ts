import { streamingGroupBy } from "../../src/utils/StreamingGroupBy";
import "mocha";
import _ = require("highland");
import { expect } from "chai";

describe("streamingGroupBy", () => {
  const testCases = [
    {
      in: [],
      out: [],
      groupBy: (x) => x,
    },
    {
      in: [1],
      out: [[1]],
      groupBy: (x) => x,
    },
    {
      in: [1, 1],
      out: [[1, 1]],
      groupBy: (x) => x,
    },
    {
      in: [1, 1, 1],
      out: [[1, 1, 1]],
      groupBy: (x) => x,
    },
    {
      in: [1, 1, 2],
      out: [[1, 1], [2]],
      groupBy: (x) => x,
    },
    {
      in: [1, 2, 1],
      out: [[1], [2], [1]],
      groupBy: (x) => x,
    },
    {
      in: [1, 2, 2],
      out: [[1], [2, 2]],
      groupBy: (x) => x,
    },
    {
      in: [1, 2, 3, 4, 4],
      out: [[1], [2], [3], [4, 4]],
      groupBy: (x) => x,
    },
    {
      in: [1, 2, 3, 4, 4, 5],
      out: [[1], [2], [3], [4, 4], [5]],
      groupBy: (x) => x,
    },
    {
      in: [1, 1, 2, 3, 4, 4, 5],
      out: [[1, 1], [2], [3], [4, 4], [5]],
      groupBy: (x) => x,
    },
    {
      in: [0, undefined, null, "", []],
      out: [[0], [undefined], [null], [""], [[]]],
      groupBy: (x) => x,
    },
    {
      in: [{a: 1, b: 2}, {a: 1, b: 3}, {a: 2, b: 20}],
      out: [[{a: 1, b: 2}, {a: 1, b: 3}], [{a: 2, b: 20}]],
      groupBy: (x) => x.a,
    },
    {
      in: ["1A", "1B", "1C", "2D", "2E", "1E", "3F", "3G"],
      out: [["1A", "1B", "1C"], ["2D", "2E"], ["1E"], ["3F", "3G"]],
      groupBy: (x) => x.substring(0, 1),
    },
  ];

  testCases.forEach((testCase, idx) => {
    function checkInputOutput(inArray, expectedOutput, groupBy, done) {
      _(inArray).consume(streamingGroupBy(groupBy)).toArray(
        (arr) => {
          expect(arr).to.deep.eq(expectedOutput);
          done();
        });
    }

    it(`test case ${idx}`, (done) => {
      checkInputOutput(testCase.in, testCase.out, testCase.groupBy, done);
    });
  });

  it("should propagate errors thrown by f", () => {
    function groupBy(i) {
      if (i === 5) {
        throw new Error("Hit five!");
      }
    }
    expect(() => _([1, 4, 5]).consume(streamingGroupBy(groupBy)).toArray((arr) => null)).to.throw();
  });

  // it("should propagate errors from stream (TODO)", () => {
  // });
});
