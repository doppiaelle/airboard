import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("service worker precache entries exist", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  const match = source.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(match, "ASSETS list is missing");
  const assets = Function(`return ${match[1]}`)();
  for (const asset of assets) {
    if (asset === "./") continue;
    await assert.doesNotReject(
      readFile(new URL(`..\/${asset.replace(/^\.\//, "")}`, import.meta.url)),
    );
  }
});

test("privacy copy and cloud consent controls ship together", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /id="cloudConsent"/);
  assert.match(html, /value="allow"/);
  assert.match(html, /cropped ink only\s+after your consent/i);
  for (const id of ["undo", "clear", "aiBoard", "mirror", "download"])
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]{0,240}?aria-label=`));
});

test("calibration and semantic correction controls ship together", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  for (const id of [
    "calibrationCoach",
    "recalibrate",
    "semanticControls",
    "semanticEditor",
    "semanticDelete",
  ])
    assert.match(html, new RegExp(`id="${id}"`));
});

test("Pages workflow supports an explicitly selected preview branch", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github-pages-preview/);
  assert.match(workflow, /github\.ref_name\s*==\s*'main'/);
});
