import _ = require("highland");

/**
 * A streaming groupBy
 *
 * Create a new stream by grouping together consequetive elements with the same key.
 * The key of an input entry `x` is given by the function `groupBy(x)`.
 *
 * Note: The operation is completely streaming and stores in-memory only the elements
 * in the current group. Once the group changes in the input stream, the current group is
 * sent to the output stream. This is thus most useful for input streams where elements
 * are already ordered by group. Such a key could eg. be day for a stream of log events.
 *
 * This is only the same as `source.groupBy(x => f(x))` (pseudocode) if the input stream
 * is ordered so all elements in one group appear consequtively in the stream.
 *
 * Example:
 *   const inStream = _(["1A", "1B", "1C", "2D", "2E", "1E", "3F", "3G"])
 *
 *     inStream.consume(streamingGroupBy((x) => x.substring(0, 1)))
 *             .toArray((result) => ...)
 *
 *   gives [["1A", "1B", "1C"], ["2D", "2E"], ["1E"], ["3F", "3G"]]
 *
 * TODO: things could be sped up by supporting an includeFromStart: do not add entries
 * to an empty group as long as this returns false.
 */
function streamingGroupBy<A, B>(groupBy: (_: A) => B) {
  let seenFirstEntry = false;
  let currentKey: null | B = null;
  let buffer: A[] = [];

  function consumer(err, x: A | Highland.Nil, push, next) {
    if (err) {
      // pass errors along the stream and consume next value
      // Calling next() follows example in http://highlandjs.org/#consume
      push(err);
      next();
    } else if (_.isNil(x)) {
      if (seenFirstEntry) {
        push(null, buffer);
      }
      // Send nil (end-of-stream event) to output stream
      push(null, x);
    } else {
      if (seenFirstEntry) {
        if (groupBy(x) === currentKey) {
          buffer.push(x);
        } else {
          push(null, buffer);
          buffer = [x];
          currentKey = groupBy(x);
        }
      } else {
        seenFirstEntry = true;
        currentKey = groupBy(x);
        buffer.push(x);
      }
      next();
    }
  }
  return consumer;
}

export { streamingGroupBy };
