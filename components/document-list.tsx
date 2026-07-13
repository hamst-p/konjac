"use client";

import { Download, FileJson, Import, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { exportMarkdown } from "@/lib/markdown";
import { documentRepository } from "@/lib/repositories/document-repository";
import { downloadText, formatDateTime } from "@/lib/utils";
import { languageLabel, useDocumentStore } from "@/store/document-store";
import { SettingsModal } from "./settings-modal";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

function progress(document: { blocks: { status: string }[] }) {
  const reviewed = document.blocks.filter((block) => block.status === "reviewed").length;
  return { reviewed, total: document.blocks.length };
}

export function DocumentList() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { documents, hydrated, init, createEmptyDocument, importDocumentJson, deleteDocument } = useDocumentStore();
  const locale = useDocumentStore((state) => state.uiLocale);

  useEffect(() => {
    init();
  }, [init]);

  async function createDocument() {
    const document = await createEmptyDocument();
    router.push(`/doc/${document.id}/import`);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    const document = await importDocumentJson(await file.text());
    router.push(`/doc/${document.id}`);
  }

  async function exportJson(id: string) {
    const json = await documentRepository.exportJson(id);
    downloadText(`konjac-${id}.json`, json, "application/json");
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-medium text-slate-500">Konjac</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t(locale, "appTitle")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
            <SettingsModal />
            <Button onClick={() => inputRef.current?.click()}>
              <Import size={16} />
              {t(locale, "jsonImport")}
            </Button>
            <Button variant="primary" onClick={createDocument}>
              <Plus size={16} />
              {t(locale, "new")}
            </Button>
          </div>
        </header>

        {!hydrated ? <p className="text-sm text-slate-500">{t(locale, "loading")}</p> : null}

        {hydrated && documents.length === 0 ? (
          <section className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-300 bg-white">
            <div className="max-w-sm text-center">
              <h2 className="text-xl font-semibold">{t(locale, "emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t(locale, "emptyBody")}</p>
              <Button className="mt-5" variant="primary" onClick={createDocument}>
                <Plus size={16} />
                {t(locale, "newDocument")}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => {
            const itemProgress = progress(document);
            return (
              <article key={document.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/doc/${document.id}`} className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-6 hover:text-sky-700">{document.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {languageLabel(document.sourceLang, locale)} → {languageLabel(document.targetLang, locale)}
                    </p>
                  </Link>
                  <Badge tone={itemProgress.reviewed === itemProgress.total ? "green" : "amber"}>
                    {itemProgress.reviewed}/{itemProgress.total}
                  </Badge>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  {t(locale, "updated")} {formatDateTime(document.updatedAt)}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => router.push(`/doc/${document.id}/import`)}>
                    <FileJson size={14} />
                    {t(locale, "import")}
                  </Button>
                  <Button size="sm" onClick={() => exportJson(document.id)}>
                    <Download size={14} />
                    JSON
                  </Button>
                  <Button size="sm" onClick={() => downloadText(`${document.title}-target.md`, exportMarkdown(document, "target"), "text/markdown")}>
                    <Download size={14} />
                    Markdown
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteDocument(document.id)}>
                    <Trash2 size={14} />
                    {t(locale, "delete")}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
