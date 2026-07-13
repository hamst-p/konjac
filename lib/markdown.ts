import type { Block, BlockType, Document } from "./types";
import { createId, escapeHtml, nowIso } from "./utils";

const headingPattern = /^(#{1,6})\s+(.+)$/;
const imagePattern = /^!\[(.*?)\]\((.*?)\)$/;

function blockTypeFromHeading(depth: number): BlockType {
  if (depth <= 1) return "h1";
  if (depth === 2) return "h2";
  return "h3";
}

function makeBlock(type: BlockType, source: string, meta?: Block["meta"]): Block {
  return {
    id: createId("block"),
    type,
    source: source.trim(),
    target: "",
    status: "untranslated",
    meta,
  };
}

function flushParagraph(lines: string[], blocks: Block[]) {
  if (!lines.length) return;

  const source = lines.join("\n").trim();
  if (source) {
    const image = source.match(imagePattern);
    if (image) {
      blocks.push(
        makeBlock("image", source, {
          caption: image[1],
          imageUrl: image[2],
        }),
      );
    } else {
      blocks.push(makeBlock("paragraph", source));
    }
  }
  lines.length = 0;
}

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  const paragraph: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraph, blocks);
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph(paragraph, blocks);
      const language = trimmed.slice(3).trim() || undefined;
      const codeLines = [trimmed];
      index += 1;
      while (index < lines.length) {
        codeLines.push(lines[index] ?? "");
        if ((lines[index] ?? "").trim().startsWith("```")) break;
        index += 1;
      }
      blocks.push(makeBlock("code", codeLines.join("\n"), { language }));
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph(paragraph, blocks);
      blocks.push(makeBlock("divider", trimmed));
      continue;
    }

    const heading = trimmed.match(headingPattern);
    if (heading) {
      flushParagraph(paragraph, blocks);
      blocks.push(makeBlock(blockTypeFromHeading(heading[1].length), trimmed));
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph(paragraph, blocks);
      const quoteLines = [trimmed];
      while (index + 1 < lines.length && (lines[index + 1] ?? "").trim().startsWith(">")) {
        index += 1;
        quoteLines.push((lines[index] ?? "").trim());
      }
      blocks.push(makeBlock("quote", quoteLines.join("\n")));
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph(paragraph, blocks);
      const listLines = [trimmed];
      while (index + 1 < lines.length && /^[-*+]\s+/.test((lines[index + 1] ?? "").trim())) {
        index += 1;
        listLines.push((lines[index] ?? "").trim());
      }
      blocks.push(makeBlock("bulletList", listLines.join("\n")));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(paragraph, blocks);
      const listLines = [trimmed];
      while (index + 1 < lines.length && /^\d+\.\s+/.test((lines[index + 1] ?? "").trim())) {
        index += 1;
        listLines.push((lines[index] ?? "").trim());
      }
      blocks.push(makeBlock("numberedList", listLines.join("\n")));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph(paragraph, blocks);
  return blocks;
}

export function createDocumentFromMarkdown(markdown: string, title?: string): Document {
  const blocks = parseMarkdownToBlocks(markdown);
  const firstHeading = blocks.find((block) => block.type === "h1")?.source.replace(/^#\s+/, "");
  const timestamp = nowIso();

  return {
    id: createId("doc"),
    title: title?.trim() || firstHeading || "Untitled translation",
    sourceLang: "en",
    targetLang: "ja",
    blocks,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function stripHeadingMarkdown(value: string) {
  return value.replace(/^#{1,6}\s+/, "");
}

function stripQuoteMarkdown(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n");
}

function stripListMarkdown(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, ""))
    .join("\n");
}

export function renderBlockText(block: Block, side: "source" | "target") {
  const value = block[side] || (side === "target" ? "" : block.source);
  if (!value) return "";

  if (block.type === "h1" || block.type === "h2" || block.type === "h3") return stripHeadingMarkdown(value);
  if (block.type === "quote") return stripQuoteMarkdown(value);
  if (block.type === "bulletList" || block.type === "numberedList") return stripListMarkdown(value);
  if (block.type === "code") return value.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
  if (block.type === "image") return block.meta?.caption || value;
  if (block.type === "divider") return "";
  return value;
}

export function blockToMarkdown(block: Block, side: "source" | "target") {
  const value = block[side];
  if (block.type === "divider") return "---";
  if (block.type === "image") {
    const caption = side === "target" ? value || block.meta?.caption || "" : block.meta?.caption || "";
    const url = block.meta?.imageUrl || "";
    return url ? `![${caption}](${url})` : value;
  }
  return value || "";
}

export function exportMarkdown(document: Document, mode: "source" | "target" | "parallel") {
  if (mode === "parallel") {
    return document.blocks
      .map((block) => {
        const source = blockToMarkdown(block, "source");
        const target = blockToMarkdown(block, "target");
        return [`<!-- source:${block.id} -->`, source, "", `<!-- target:${block.id} -->`, target].join("\n");
      })
      .join("\n\n");
  }

  return document.blocks.map((block) => blockToMarkdown(block, mode)).filter(Boolean).join("\n\n");
}

function renderHtmlBlock(block: Block) {
  const text = escapeHtml(renderBlockText(block, "target") || renderBlockText(block, "source"));
  if (block.type === "h1") return `<h1>${text}</h1>`;
  if (block.type === "h2") return `<h2>${text}</h2>`;
  if (block.type === "h3") return `<h3>${text}</h3>`;
  if (block.type === "quote") return `<blockquote>${text.replaceAll("\n", "<br>")}</blockquote>`;
  if (block.type === "code") return `<pre><code>${escapeHtml(renderBlockText(block, "target"))}</code></pre>`;
  if (block.type === "divider") return "<hr>";
  if (block.type === "image" && block.meta?.imageUrl) {
    return `<figure><img src="${escapeHtml(block.meta.imageUrl)}" alt="${text}"><figcaption>${text}</figcaption></figure>`;
  }
  if (block.type === "bulletList" || block.type === "numberedList") {
    const tag = block.type === "bulletList" ? "ul" : "ol";
    const items = text
      .split("\n")
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }
  return `<p>${text.replaceAll("\n", "<br>")}</p>`;
}

export function exportHtml(document: Document) {
  return [
    "<!doctype html>",
    '<html lang="ja">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(document.title)}</title>`,
    "<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.75;max-width:760px;margin:48px auto;padding:0 20px;color:#1f2937}h1,h2,h3{line-height:1.25;color:#111827}blockquote{border-left:4px solid #cbd5e1;margin-left:0;padding-left:18px;color:#475569}img{max-width:100%;border-radius:8px}pre{overflow:auto;background:#111827;color:#e5e7eb;padding:16px;border-radius:8px}hr{border:0;border-top:1px solid #e5e7eb;margin:32px 0}</style>",
    "</head>",
    "<body>",
    ...document.blocks.map(renderHtmlBlock),
    "</body>",
    "</html>",
  ].join("\n");
}

