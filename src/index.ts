const _ = require("highland");

import { writeJSONL } from "./utils/StreamUtils";
import { osmStreamFrom, groupRevisions, MapElement } from "./OSM/OSMIterator";
import { applyMainPipeline, outputFormatter } from "./Pipeline";

console.log(" *** Tool for extracting tag data from an OpenStreetMap data export ***");

const inputFile: string = process.env.npm_config_input_file;
const outputFile: string = process.env.npm_config_output_file;
const tags: string = process.env.npm_config_tags;

if (!inputFile || !outputFile || !tags) {
  console.log("Run as npm run tag-extract --tags=.. --input-file=.. --output-file=..");
  process.exit(1);
}

const tagsToExtract: string[] = tags.split(",").map((tag) => tag.trim());

console.log(` - Input file       : ${inputFile}`);
console.log(` - Output file      : ${outputFile}`);
console.log(` - Tags to extract  : ${tagsToExtract.map((x) => `"${x}"`).join(", ")}`);

const inputStream: Highland.Stream<MapElement> = _(osmStreamFrom(inputFile));

let lines = 0;
function logger() {
  lines += 1;
  if (lines % 1000 === 0) {
    console.log(` - Outputted ${lines} map elements ...`);
  }
}

const outputStream = applyMainPipeline(tagsToExtract, groupRevisions(inputStream))
  .map(outputFormatter)
  .on("end", () => { console.log(" - Done."); })
  .doto(logger);

writeJSONL(outputStream, outputFile);
