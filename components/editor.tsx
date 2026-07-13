"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Combine,
  Download,
  FileCode2,
  Languages,
  Link2,
  Plus,
  Scissors,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { statusLabel, t } from "@/lib/i18n";
import { exportHtml, exportMarkdown, renderBlockText } from "@/lib/markdown";
import { deleteLocalShare, saveLocalShare } from "@/lib/repositories/share-repository";
import type { Block, BlockStatus, Document } from "@/lib/types";
import { cn, downloadText } from "@/lib/utils";
import { languageLabel, nextStatus, useDocumentStore } from "@/store/document-store";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { SettingsModal } from "./settings-modal";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  id: string;
};

const statusTone: Record<BlockStatus, "slate" | "amber" | "green"> = {
  untranslated: "slate",
  ai_draft: "amber",
  reviewed: "green",
};

function typeLabel(type: Block["type"]) {
  return {
    h1: "H1",
    h2: "H2",
    h3: "H3",
    paragraph: "P",
    quote: "Quote",
    bulletList: "List",
    numberedList: "1. List",
    image: "Image",
    code: "Code",
    divider: "Divider",
  }[type];
}

function Progress({ document, label }: { document: Document; label: string }) {
  const reviewed = document.blocks.filter((block) => block.status === "reviewed").length;
  const total = document.blocks.length;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500">
        {label} {reviewed}/{total}
      </span>
      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-emerald-500" style={{ width: `${total ? (reviewed / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export function Editor({ id }: Props) {
  const router = useRouter();
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);
  const selectionRef = useRef<HTMLTextAreaElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BlockStatus | "all">("all");
  const [syncScroll, setSyncScroll] = useState(true);
  const [busyBlockId, setBusyBlockId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const store = useDocumentStore();
  const document = useDocumentStore((state) => state.documents.find((item) => item.id === id));
  const locale = useDocumentStore((state) => state.uiLocale);

  useEffect(() => {
    useDocumentStore.getState().init();
  }, []);

  const filteredBlocks = useMemo(() => {
    if (!document) return [];
    if (statusFilter === "all") return document.blocks;
    return document.blocks.filter((block) => block.status === statusFilter);
  }, [document, statusFilter]);

  if (!document) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 p-6">
        <div className="text-center">
          <p className="text-sm text-slate-500">{t(locale, "documentLoading")}</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            {t(locale, "backToList")}
          </Button>
        </div>
      </main>
    );
  }

  const currentDocument = document;

  function syncScrollFrom(source: "left" | "right") {
    if (!syncScroll || syncingRef.current) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const from = source === "left" ? left : right;
    const to = source === "left" ? right : left;
    const ratio = from.scrollTop / Math.max(from.scrollHeight - from.clientHeight, 1);
    syncingRef.current = true;
    to.scrollTop = ratio * Math.max(to.scrollHeight - to.clientHeight, 1);
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  function activeClass(blockId: string) {
    return hoveredId === blockId || selectedId === blockId ? "border-sky-300 bg-sky-50/80 shadow-sm" : "border-slate-200 bg-white";
  }

  async function translateBlock(block: Block) {
    setBusyBlockId(block.id);
    setMessage(null);
    store.updateBlock(currentDocument.id, block.id, { target: "", status: "ai_draft" });

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          document: currentDocument,
          blockId: block.id,
          settings: store.settings,
        }),
      });

      if (!response.ok || !response.body) {
        const error = await response.text();
        throw new Error(error || "AI translation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let target = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        target += decoder.decode(value, { stream: true });
        store.updateBlock(currentDocument.id, block.id, { target, status: "ai_draft" });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(locale, "aiFailed"));
    } finally {
      setBusyBlockId(null);
    }
  }

  async function translateMissing() {
    const targets = currentDocument.blocks.filter((block) => !block.target.trim());
    for (const block of targets) {
      await translateBlock(block);
    }
  }

  async function publishDocument() {
    setMessage(t(locale, "publishInProgress"));
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: currentDocument, slug: currentDocument.published?.slug }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { slug: string; url: string; mode: "blob" | "local" };
      const published = { slug: result.slug, url: result.url, publishedAt: new Date().toISOString() };
      store.updateDocumentMeta(currentDocument.id, { published });
      saveLocalShare(result.slug, { ...currentDocument, published });
      setMessage(result.mode === "blob" ? `${t(locale, "publishUpdated")}: ${result.url}` : `${t(locale, "localShareCreated")}: ${result.url}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(locale, "publishFailed"));
    }
  }

  async function stopPublish() {
    if (!currentDocument.published?.slug) return;
    setMessage(t(locale, "unpublishInProgress"));
    try {
      await fetch("/api/publish", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: currentDocument.published.slug }),
      });
      deleteLocalShare(currentDocument.published.slug);
      store.updateDocumentMeta(currentDocument.id, { published: undefined });
      setMessage(t(locale, "unpublishDone"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t(locale, "unpublishFailed"));
    }
  }

  function splitSelected(block: Block, side: "source" | "target") {
    const element = selectionRef.current;
    const at = element?.selectionStart ?? block[side].length;
    store.splitBlock(currentDocument.id, block.id, side, at);
  }

  function blockPanel(block: Block, side: "source" | "target") {
    const editableValue = block[side];
    const displayName = side === "source" ? t(locale, "source") : t(locale, "target");
    return (
      <section
        key={`${side}-${block.id}`}
        className={cn("rounded-lg border p-3 transition", activeClass(block.id))}
        onMouseEnter={() => setHoveredId(block.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => setSelectedId(block.id)}
      >
        <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{typeLabel(block.type)}</Badge>
            {side === "target" ? <Badge tone={statusTone[block.status]}>{statusLabel(locale, block.status)}</Badge> : null}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{displayName}</span>
        </div>

        {block.type === "image" && block.meta?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.meta.imageUrl} alt={renderBlockText(block, side)} className="mb-3 max-h-64 rounded-md object-contain" />
        ) : null}

        {block.type === "divider" ? (
          <div className="py-8">
            <div className="border-t border-slate-300" />
          </div>
        ) : (
          <AutoResizeTextarea
            ref={side === "target" && selectedId === block.id ? selectionRef : undefined}
            value={editableValue}
            placeholder={side === "target" ? t(locale, "targetPlaceholder") : t(locale, "sourcePlaceholder")}
            className={cn(
              "border-transparent bg-transparent px-0 py-0 text-[15px] shadow-none focus:border-transparent focus:ring-0",
              block.type === "h1" && "text-3xl font-semibold leading-tight",
              block.type === "h2" && "text-2xl font-semibold leading-tight",
              block.type === "h3" && "text-xl font-semibold leading-tight",
              block.type === "quote" && "border-l-4 border-slate-300 pl-4 italic text-slate-600",
              block.type === "code" && "font-mono text-sm",
            )}
            onFocus={(event) => {
              selectionRef.current = event.currentTarget;
              setSelectedId(block.id);
            }}
            onChange={(value) =>
              store.updateBlock(currentDocument.id, block.id, {
                [side]: value,
                status: side === "target" && block.status === "ai_draft" ? "reviewed" : block.status,
              })
            }
          />
        )}

        {side === "target" ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => translateBlock(block)} disabled={busyBlockId === block.id}>
              <Languages size={14} />
              {busyBlockId === block.id ? t(locale, "translating") : t(locale, "aiTranslate")}
            </Button>
            <Button size="icon" title="Status" onClick={() => store.updateBlock(currentDocument.id, block.id, { status: nextStatus(block.status) })}>
              <Check size={14} />
            </Button>
            <Button size="icon" title="Split" onClick={() => splitSelected(block, side)}>
              <Scissors size={14} />
            </Button>
            <Button size="icon" title="Merge up" onClick={() => store.mergeBlockUp(currentDocument.id, block.id)}>
              <Combine size={14} />
            </Button>
            <Button size="icon" title="Move up" onClick={() => store.moveBlock(currentDocument.id, block.id, "up")}>
              <ArrowUp size={14} />
            </Button>
            <Button size="icon" title="Move down" onClick={() => store.moveBlock(currentDocument.id, block.id, "down")}>
              <ArrowDown size={14} />
            </Button>
            <Button size="icon" title="Add block" onClick={() => store.addBlockAfter(currentDocument.id, block.id)}>
              <Plus size={14} />
            </Button>
            <Button size="icon" variant="danger" title="Delete" onClick={() => store.deleteBlock(currentDocument.id, block.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex gap-1.5">
            <Button size="sm" onClick={() => splitSelected(block, side)}>
              <Scissors size={14} />
              {t(locale, "split")}
            </Button>
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-stone-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button size="icon" onClick={() => router.push("/")}>
              <ArrowLeft size={16} />
            </Button>
            <div className="min-w-0">
              <Input className="h-9 border-transparent px-0 text-lg font-semibold focus:border-slate-200" value={document.title} onChange={(event) => store.updateDocumentMeta(document.id, { title: event.target.value })} />
              <p className="text-xs text-slate-500">
                {languageLabel(document.sourceLang, locale)} → {languageLabel(document.targetLang, locale)} / {document.blocks.length} blocks
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Progress document={document} label={t(locale, "reviewedProgress")} />
            <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BlockStatus | "all")}>
              <option value="all">{t(locale, "all")}</option>
              <option value="untranslated">{statusLabel(locale, "untranslated")}</option>
              <option value="ai_draft">{statusLabel(locale, "ai_draft")}</option>
              <option value="reviewed">{statusLabel(locale, "reviewed")}</option>
            </select>
            <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <input type="checkbox" checked={syncScroll} onChange={(event) => setSyncScroll(event.target.checked)} />
              {t(locale, "scrollSync")}
            </label>
            <SettingsModal />
            <Button size="sm" onClick={translateMissing}>
              <Languages size={15} />
              {t(locale, "translateMissing")}
            </Button>
            <Button size="sm" onClick={() => router.push(`/doc/${document.id}/import`)}>
              <FileCode2 size={15} />
              {t(locale, "import")}
            </Button>
            <Button size="sm" variant="primary" onClick={publishDocument}>
              <Link2 size={15} />
              {t(locale, "publish")}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => downloadText(`${document.title}-target.md`, exportMarkdown(document, "target"), "text/markdown")}>
            <Download size={14} />
            {t(locale, "targetMd")}
          </Button>
          <Button size="sm" onClick={() => downloadText(`${document.title}-source.md`, exportMarkdown(document, "source"), "text/markdown")}>
            <Download size={14} />
            {t(locale, "sourceMd")}
          </Button>
          <Button size="sm" onClick={() => downloadText(`${document.title}-parallel.md`, exportMarkdown(document, "parallel"), "text/markdown")}>
            <Download size={14} />
            {t(locale, "parallelMd")}
          </Button>
          <Button size="sm" onClick={() => downloadText(`${document.title}.html`, exportHtml(document), "text/html")}>
            <Download size={14} />
            HTML
          </Button>
          {document.published ? (
            <>
              <Link className="text-sm font-medium text-sky-700 hover:underline" href={`/share/${document.published.slug}`} target="_blank">
                /share/{document.published.slug}
              </Link>
              <Button size="sm" variant="danger" onClick={stopPublish}>
                {t(locale, "unpublish")}
              </Button>
            </>
          ) : null}
          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-slate-200">
        <div ref={leftRef} className="overflow-auto bg-stone-50 p-5" onScroll={() => syncScrollFrom("left")}>
          <div className="mx-auto flex max-w-3xl flex-col gap-4">{filteredBlocks.map((block) => blockPanel(block, "source"))}</div>
        </div>
        <div ref={rightRef} className="overflow-auto bg-stone-50 p-5" onScroll={() => syncScrollFrom("right")}>
          <div className="mx-auto flex max-w-3xl flex-col gap-4">{filteredBlocks.map((block) => blockPanel(block, "target"))}</div>
        </div>
      </div>
    </main>
  );
}
