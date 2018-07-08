import _ = require("highland");

import { MapElement, applyMainPipeline, OutputRevision, outputFormatter } from "../src/Pipeline";
import { osmStreamFrom, groupRevisions } from "../src/OSM/OSMIterator";
import { readJSONL, toPromise } from "../src/utils/StreamUtils";

import "mocha";
import { expect } from "chai";

function getInputData(): Promise<MapElement[]> {
  const inputXML = "./testdata/1-synth-osm-data.xml";
  const inputStream: Highland.Stream<MapElement> = _(osmStreamFrom(inputXML) as any);
  return toPromise(inputStream);
}

// create as:
//  npm run tag-extract --tags=k1,k2,k3 \
//                      --input-file=./testdata/1-synth-osm-data.xml \
//                      --output-file=./testdata/2-extracted-osm-metadata.jsonl
function getCachedOutput(): any[] {
  const outputSnapshot = "./testdata/2-extracted-osm-metadata.jsonl";
  return readJSONL(outputSnapshot);
}

describe("synthetically generated OSM history data", () => {
  it("should extract same metadata as cached on disk", async () => {
    const inputData: MapElement[] = await getInputData();
    expect(inputData.length).to.deep.eq(41107);

    const inputStream: Highland.Stream<MapElement> = _(inputData);

    const tagsToExtract: string[] = ["k1", "k2", "k3"];
    const outStream: Highland.Stream<OutputRevision[]> = applyMainPipeline(tagsToExtract, groupRevisions(inputStream));
    const outputRevisions: any[] = (await toPromise(outStream)).map(outputFormatter);

    expect(getCachedOutput()).to.deep.eq(outputRevisions);
  }).timeout(5000);
});
