"use client";

import { ArrowLeft, FileText, Globe2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { parseMarkdownToBlocks } from "@/lib/markdown";
import { nowIso } from "@/lib/utils";
import { useDocumentStore } from "@/store/document-store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type Props = {
  id: string;
};

const sampleMarkdown = `# Article title

Paste Markdown here, or import a Medium URL.

> Quotes, lists, code blocks, images and dividers become aligned blocks.

- One item
- Another item`;

export function Importer({ id }: Props) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const store = useDocumentStore();
  const document = useDocumentStore((state) => state.documents.find((item) => item.id === id));
  const locale = useDocumentStore((state) => state.uiLocale);

  useEffect(() => {
    useDocumentStore.getState().init();
  }, []);

  async function importMarkdown() {
    if (!document) return;
    const blocks = parseMarkdownToBlocks(markdown);
    if (!blocks.length) {
      setMessage(t(locale, "noImportableBlocks"));
      return;
    }
    const title = blocks.find((block) => block.type === "h1")?.source.replace(/^#\s+/, "") || document.title;
    await store.saveDocument({ ...document, title, blocks, updatedAt: nowIso() });
    router.push(`/doc/${document.id}`);
  }

  async function importUrl() {
    setMessage(t(locale, "fetchingUrl"));
    try {
      const response = await fetch("/api/import-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { title: string; markdown: string };
      setMarkdown(result.markdown);
      setMessage(`${t(locale, "fetched")}: ${result.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(locale, "urlImportFailed"));
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => router.push(document ? `/doc/${document.id}` : "/")}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <p className="text-sm font-medium text-slate-500">Import</p>
              <h1 className="text-2xl font-semibold">{t(locale, "importTitle")}</h1>
            </div>
          </div>
          <Button variant="primary" onClick={importMarkdown}>
            <Save size={16} />
            {t(locale, "saveBlocks")}
          </Button>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input placeholder="Medium article URL" value={url} onChange={(event) => setUrl(event.target.value)} />
            <Button onClick={importUrl} disabled={!url.trim()}>
              <Globe2 size={16} />
              {t(locale, "urlImport")}
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-slate-500">{message}</p> : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={16} />
            <h2 className="font-semibold">{t(locale, "markdownPaste")}</h2>
          </div>
          <Textarea className="min-h-[520px] font-mono text-sm" value={markdown} onChange={(event) => setMarkdown(event.target.value)} />
        </section>
      </div>
    </main>
  );
}
