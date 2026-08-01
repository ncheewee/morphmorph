import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished MorphMorph shell and product metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MorphMorph — No blueprint\. Only becoming\.<\/title>/i);
  assert.match(html, /one-of-a-kind generative lifeform/i);
  assert.match(html, /aria-label="Waking MorphMorph"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("contains the procedural evolution and device-local persistence loop", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function mulberry32/);
  assert.match(page, /function actionMutation/);
  assert.match(page, /function metamorphose/);
  assert.match(page, /historyHash/);
  assert.match(page, /phenotypeSignature/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /<canvas/);
  assert.match(page, /Codex Build 0\.1\.0/);
  assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(layout, /MorphMorph — No blueprint/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(css, /url\([^)]*generated_images/);
});

test("ships a self-contained Evolution Lab and deployment workflow", async () => {
  const [pagesHtml, workflow] = await Promise.all([
    readFile(new URL("../docs/index.html", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(pagesHtml, /<!doctype html>/i);
  assert.match(pagesHtml, /Thirty possible futures/);
  assert.match(pagesHtml, /morphmorph\.evolution-lab\.v2/);
  assert.match(pagesHtml, /founderDistance\(x,f\)>2\.15/);
  assert.match(pagesHtml, /for\(let g=0;g<10;g\+\+\)/);
  assert.match(pagesHtml, /Codex Build 0\.2\.1/);
  assert.match(pagesHtml, /Reject and regenerate below/);
  assert.match(pagesHtml, /FORMS=\['winglets','claws','antennae','halo','tailfan','crystal','frills','eyes'\]/);
  assert.match(pagesHtml, /github\.com\/ncheewee\/morphmorph\/issues\/new/);
  assert.match(pagesHtml, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(pagesHtml, /\[hidden\]\{display:none!important\}/);
  assert.match(pagesHtml, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
  assert.doesNotMatch(pagesHtml, /generated_images|https:\/\/morphmorph-life/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /path: docs/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
