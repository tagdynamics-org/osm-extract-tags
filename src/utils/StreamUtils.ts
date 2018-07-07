const fs = require("fs");

/** Serialize a Highland stream of objects to a JSONL file */
function writeJSONL<A>(stream: Highland.Stream<A>, outputFilename: string) {
  const outputFileStream = fs.createWriteStream(outputFilename);
  return stream.map((out) => JSON.stringify(out) + "\n")
               .pipe(outputFileStream);
}

/** Deserialize a JSONL file to an array */
function readJSONL(inputFilename: string): any[] {
  const lines = fs.readFileSync(inputFilename).toString().split("\n");
  return lines.map((line: string) => line.trim())
              .filter((x) => x.length > 0) // skip "" after last newline
              .map(JSON.parse);
}

/**
 * `toPromise` on a Highland stream returns a PromiseLike, not a Promise. This
 * limitation seems to arise since Highland supports not just native Promises, but
 * also other promise libraries (eg. bluebird).
 */
function toPromise<A>(stream: Highland.Stream<A>): Promise<A[]> {
  return new Promise<A[]>((resolve, reject) => {
    stream
      .on("error", (err) => reject(err))
      .toArray((array) => resolve(array));
  });
}

export { writeJSONL, readJSONL, toPromise };
