import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("defines the repository abstraction and localStorage implementation", async () => {
  const repository = await source("lib/repositories/document-repository.ts");
  assert.match(repository, /export interface DocumentRepository/);
  assert.match(repository, /class LocalStorageDocumentRepository/);
  assert.match(repository, /konjac\.documents\.v1/);
});

test("keeps the 1:1 bilingual block model central", async () => {
  const types = await source("lib/types.ts");
  const store = await source("store/document-store.ts");
  assert.match(types, /source: string/);
  assert.match(types, /target: string/);
  assert.match(types, /status: BlockStatus/);
  assert.match(store, /splitBlock/);
  assert.match(store, /mergeBlockUp/);
});

test("ships import, AI, publish, share, and export surfaces", async () => {
  const editor = await source("components/editor.tsx");
  const importer = await source("components/importer.tsx");
  const i18n = await source("lib/i18n.ts");
  const translateRoute = await source("app/api/translate/route.ts");
  const publishRoute = await source("app/api/publish/route.ts");

  assert.match(importer, /t\(locale, "urlImport"\)/);
  assert.match(editor, /t\(locale, "translateMissing"\)/);
  assert.match(editor, /t\(locale, "publish"\)/);
  assert.match(editor, /t\(locale, "parallelMd"\)/);
  assert.match(i18n, /Bilingual Block Editor/);
  assert.match(i18n, /対訳ブロックエディタ/);
  assert.match(translateRoute, /streamText/);
  assert.match(publishRoute, /@vercel\/blob/);
});
