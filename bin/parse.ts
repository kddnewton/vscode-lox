#!./node_modules/.bin/ts-node

import fs from "fs";
import parseSource from "../src/parseSource";
import printAST from "../src/printAST";

const source = fs.readFileSync(process.argv[2], "utf-8");
const { scope } = parseSource(source);

console.log(printAST(scope));
