const rs = require("readable-stream");

import osmium = require("osmium");
import { guardMap } from "./OrderGuard";
import { streamingGroupBy } from "../utils/StreamingGroupBy";

interface Iterator<A> {
  getNext(): A | null; // null = end of stream
}

/** Dummy interface for keeping track of types of node's ReadableStream:s */
// tslint:disable-next-line: no-empty-interface
interface TypedStream<A> extends ReadableStream { }

/**
 * Convert an Iterator into a node ReadableStream
 *
 * Note: This automatically implements backpressure. Eg., we will not run out of
 * memory since the data arrive faster than we can process it.
 */
function streamify<A>(iterator: Iterator<A>): TypedStream<A> {
  const stream = rs.Readable( { objectMode: true } );
  stream._read = (n) => stream.push(iterator.getNext());
  return stream;
}

/**
 * Return an iterator with map revisions in an OSM input file.
 *
 * See:
 *  - https://github.com/geopipes/osmium-stream
 *  - https://github.com/osmcode/node-osmium/blob/master/lib/osmium.js
 *  - https://github.com/osmcode/node-osmium/blob/master/src/basic_reader_wrap.cpp
 */
function osmIterator<A>(filename: string, parser: (_: any) => A): Iterator<A> {
  const file = new osmium.File(filename);

  let buffer: any;
  const reader: any = new osmium.BasicReader(file);

  const refreshBuffer = () => {
    buffer = reader.read();
  };

  refreshBuffer();

  function getNext(): A | null {
    if (buffer !== undefined) {
      const obj = buffer.next(0);
      if (obj !== undefined) {
        // Note: The value returned by next() is allocated/released by
        // the libosmium C++ library. Hence, we have no/little control
        // when the value is released or overwritten. when next() is
        // called again.
        // Hence we parse/extract the fields before any subsequent next().
        return parser(obj);
      } else {
        refreshBuffer();
        return getNext();
      }
    } else {
      return null; // no more entries
    }
  }

  return { getNext };
}

interface MapElement {
  type: "node" | "way" | "relation";
  id: number;
  version: number;
  ts: number;       // unix epoch (seconds since 1.1.1970)
  visible: boolean;
  tags: { [_: string]: string };
}

/** Create stream of parsed JS-object from an OSM export file */
function osmStreamFrom(filename: string): TypedStream<MapElement> {
  function parseOsmObject(osm): MapElement {
    // TODO: Which clone:s are really needed? See getNext() above.
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const id: number = clone(osm.id);
    const type = clone(osm.type);
    return {
      id, type,
      version: clone(osm.version),
      ts: clone(osm.timestamp_seconds_since_epoch),
      visible: clone(osm.visible),
      tags: clone(osm.tags()),
    };
  }

  const it: Iterator<MapElement> = osmIterator(filename, parseOsmObject);
  return streamify(it);
}

/** Eg. { type: "node", id: 123, ... } -> "N123" */
function tid(e: MapElement): string {
  return e.type.substring(0, 1).toUpperCase() + e.id.toString();
}

/**
 * Assert that map elements appear in order, and group together revisions
 * of the same map element
 */
function groupRevisions(inStream: Highland.Stream<MapElement>): Highland.Stream<MapElement[]> {
  // TODO: fail if deleted entry has listed tags?
  return inStream.doto(guardMap()).consume(streamingGroupBy(tid));
}

export { Iterator, TypedStream, MapElement, tid, streamify, osmStreamFrom, groupRevisions };
