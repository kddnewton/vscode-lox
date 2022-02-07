#!./node_modules/.bin/ts-node

import fs from "fs";
import generateTokens, { Token } from "../src/generateTokens";

const source = fs.readFileSync(process.argv[2], "utf-8");

for (const token of generateTokens(source)) {
  process.stdout.write(`${Token[token.kind]} ${source.substring(token.start, token.end)} `);

  switch (token.kind) {
    case Token.STRING:
      console.log(token.value);
      break;
    case Token.NUMBER:
      console.log(Number.isInteger(token.value) ? `${token.value}.0` : token.value);
      break;
    case Token.ERROR:
      console.log(token.error);
      break;
    default:
      console.log("null");
      break;
  }
}
