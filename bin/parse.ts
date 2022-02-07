#!./node_modules/.bin/ts-node

import fs from "fs";
import parseTree from "../src/parseTree";

const source = fs.readFileSync(process.argv[2], "utf-8");
const { scope } = parseTree(source);

console.log(JSON.stringify(scope, null, 2));
