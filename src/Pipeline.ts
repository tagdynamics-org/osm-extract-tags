import { removeRepeated, arraysEqual } from "./utils/ArrayUtils";
import { MapElement, tid } from "./OSM/OSMIterator";

function tagExtractor(tagsToExtract: string[], e: MapElement): OutputRevision {
  const hasAnyTags = Object.keys(e.tags).length > 0;

  const revisionTags = [];
  if (hasAnyTags) {
    tagsToExtract.forEach((k, idx) => {
      if (k in e.tags) {
        const prefix: string = idx.toString(16);
        revisionTags.push(prefix + ":" + e.tags[k]);
      }
    });
  }

  return {
    tid: tid(e),
    version: e.version,
    visible: e.visible,
    ts: e.ts,
    tags: revisionTags,
  };
}

interface OutputRevision {
  // Type+Id: "N1233" (for node), "W444121" (for way), "R12928" (for relation)
  tid: string;

  // element version
  version: number;

  visible: boolean;

  // unix epoch (seconds since 1.1.1970)
  ts: number;

  // Array with same list as `allowedTags` containing values for each tag.
  // If no tags are set (or if version is marked as deleted), empty list.
  tags: string[];
}

/** Compress OutputRevision[] into a final JSON object we stringify to the output file */
function outputFormatter(outLine: OutputRevision[]): any {
  const tid0: string = outLine[0].tid;

  if (outLine.length === 0) {
    throw new Error("Internal error: no output");
  }
  if (!outLine.every((r) => r.tid === tid0)) {
    throw new Error("History contains multiple tid:s");
  }
  return [tid0, outLine.map((r) => [r.ts, r.version, r.visible ? 1 : 0, r.tags])];
}

function compressRevision(rs: OutputRevision[]): OutputRevision[] | null {
  // Remove revisions that repeat (visible, tag)-state of previous revision.
  const summary = removeRepeated(rs, (x, y) => (x.visible === y.visible) && arraysEqual(x.tags, y.tags));

  if (summary.length === 0) {
    throw new Error(`Internal error: got empty compressed revision: ${JSON.stringify(rs)}`);
  } else if (summary.findIndex((r) => r.visible && r.tags.length > 0) === -1) {
    // Only include map elements that have at least one visible revision with at least one
    // of our selected tags.
    return null;
  }
  return summary;
}

/** The main processing pipeline for tracking key-value tag changes (among our selected tags) */
function applyMainPipeline(tagsToExtract: string[], inStream: Highland.Stream<MapElement[]>):
  Highland.Stream<OutputRevision[]> {
  return inStream
    .map((revisions) => revisions.map(((e) => tagExtractor(tagsToExtract, e)))) // stream of OutputRevision[]:s
    .map(compressRevision)
    .filter((rs) => rs !== null);
}

export {
  MapElement,
  OutputRevision,
  outputFormatter,
  compressRevision,
  tagExtractor,
  applyMainPipeline,
};
