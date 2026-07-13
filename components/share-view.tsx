"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { renderBlockText } from "@/lib/markdown";
import { readLocalShare } from "@/lib/repositories/share-repository";
import type { Block, Document } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/store/document-store";

type Props = {
  slug: string;
};

function blockClass(block: Block) {
  return cn(
    "leading-7 text-slate-800",
    block.type === "h1" && "text-3xl font-semibold leading-tight text-slate-950",
    block.type === "h2" && "text-2xl font-semibold leading-tight text-slate-950",
    block.type === "h3" && "text-xl font-semibold leading-tight text-slate-950",
    block.type === "quote" && "border-l-4 border-slate-300 pl-4 italic text-slate-600",
    block.type === "code" && "rounded-md bg-slate-950 p-4 font-mono text-sm text-slate-100",
  );
}

function BlockRender({ block, side }: { block: Block; side: "source" | "target" }) {
  if (block.type === "divider") return <div className="border-t border-slate-200 py-4" />;
  if (block.type === "image" && block.meta?.imageUrl) {
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.meta.imageUrl} alt={renderBlockText(block, side)} className="max-h-96 rounded-lg object-contain" />
        <figcaption className="mt-2 text-sm text-slate-500">{renderBlockText(block, side)}</figcaption>
      </figure>
    );
  }
  if (block.type === "bulletList" || block.type === "numberedList") {
    const List = block.type === "bulletList" ? "ul" : "ol";
    return (
      <List className={cn("space-y-2 pl-6 leading-7", block.type === "bulletList" ? "list-disc" : "list-decimal")}>
        {renderBlockText(block, side)
          .split("\n")
          .filter(Boolean)
          .map((item, index) => (
            <li key={index}>{item}</li>
          ))}
      </List>
    );
  }
  return <div className={blockClass(block)}>{renderBlockText(block, side)}</div>;
}

export function ShareView({ slug }: Props) {
  const [document, setDocument] = useState<Document | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locale = useDocumentStore((state) => state.uiLocale);

  useEffect(() => {
    useDocumentStore.getState().init();

    async function load() {
      try {
        const response = await fetch(`/api/share/${slug}`);
        if (response.ok) {
          setDocument((await response.json()) as Document);
          setMessage("");
          return;
        }
      } catch {
        // Local fallback below.
      }

      const local = readLocalShare(slug);
      if (local) {
        setDocument(local);
        setMessage("");
      } else {
        setMessage(t(locale, "shareNotFound"));
      }
    }
    load();
  }, [slug, locale]);

  if (!document) {
    return <main className="grid min-h-screen place-items-center bg-stone-50 p-6 text-sm text-slate-500">{message ?? t(locale, "shareLoading")}</main>;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <p className="text-sm font-medium text-slate-500">{t(locale, "delivery")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{document.title}</h1>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-px bg-slate-200 px-0 md:grid-cols-2">
        <section className="bg-stone-50 p-5 md:p-8">
          <div className="mb-5 text-sm font-semibold text-slate-500">{t(locale, "source")}</div>
          <div className="space-y-5">
            {document.blocks.map((block) => (
              <article
                key={`source-${block.id}`}
                className={cn("rounded-lg border border-transparent p-3 transition", hoveredId === block.id && "border-sky-300 bg-sky-50")}
                onMouseEnter={() => setHoveredId(block.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <BlockRender block={block} side="source" />
              </article>
            ))}
          </div>
        </section>
        <section className="bg-stone-50 p-5 md:p-8">
          <div className="mb-5 text-sm font-semibold text-slate-500">{t(locale, "target")}</div>
          <div className="space-y-5">
            {document.blocks.map((block) => (
              <article
                key={`target-${block.id}`}
                className={cn("rounded-lg border border-transparent p-3 transition", hoveredId === block.id && "border-sky-300 bg-sky-50")}
                onMouseEnter={() => setHoveredId(block.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <BlockRender block={block} side="target" />
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
