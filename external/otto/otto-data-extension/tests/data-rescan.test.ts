import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runDataRescan } from "../src/data-rescan.js";

test("runDataRescan counts files in a directory", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "otto-data-ext-"));
  fs.writeFileSync(path.join(tempRoot, "a.txt"), "hello");
  fs.writeFileSync(path.join(tempRoot, "b.txt"), "world");

  const result = runDataRescan(tempRoot);

  assert.equal(result.entryCount, 2);
  assert.equal(result.scannedPath, tempRoot);
  assert.ok(result.generatedAt);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
