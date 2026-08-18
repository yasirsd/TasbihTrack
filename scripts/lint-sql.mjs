import fs from "node:fs";
import path from "node:path";
import { parse } from "pgsql-parser";

const file = path.resolve(process.argv[2]);
const sql = fs.readFileSync(file, "utf8");

try {
  const ast = await parse(sql);
  const stmts = Array.isArray(ast) ? ast : (ast?.stmts ?? []);
  console.log(`parsed OK — ${stmts.length} statements`);
} catch (err) {
  console.error("PARSE ERROR");
  console.error(err?.message ?? err);
  process.exit(1);
}
