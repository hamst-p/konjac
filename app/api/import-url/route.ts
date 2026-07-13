import { extract } from "@extractus/article-extractor";
import TurndownService from "turndown";

export const runtime = "nodejs";

type MediumParagraph = {
  type?: string;
  text?: string;
  metadata?: {
    id?: string;
    alt?: string | null;
  } | null;
};

const mediumHeaders = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9,ja;q=0.8",
};

function isMediumUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "medium.com" || hostname.endsWith(".medium.com");
  } catch {
    return false;
  }
}

function extractWindowAssignment(html: string, name: string) {
  const marker = `window.${name} = `;
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const valueStart = html.indexOf("{", start + marker.length);
  if (valueStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = valueStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(valueStart, index + 1);
    }
  }

  return null;
}

function paragraphToMarkdown(paragraph: MediumParagraph) {
  const text = (paragraph.text || "").trim();

  if (paragraph.type === "IMG" && paragraph.metadata?.id) {
    const alt = paragraph.metadata.alt || "";
    return `![${alt}](https://miro.medium.com/v2/resize:fit:1400/${paragraph.metadata.id})`;
  }

  if (!text) return "";

  if (paragraph.type === "H2") return `## ${text}`;
  if (paragraph.type === "H3") return `### ${text}`;
  if (paragraph.type === "H4") return `#### ${text}`;
  if (paragraph.type === "BQ") return `> ${text}`;
  if (paragraph.type === "PRE") return ["```", text, "```"].join("\n");
  if (paragraph.type === "ULI") return `- ${text}`;
  if (paragraph.type === "OLI") return `1. ${text}`;

  return text;
}

async function extractMediumMarkdown(url: string) {
  const response = await fetch(url, {
    headers: mediumHeaders,
    cache: "no-store",
  });
  if (!response.ok) return null;

  const html = await response.text();
  const rawApollo = extractWindowAssignment(html, "__APOLLO_STATE__");
  if (!rawApollo) return null;

  let state: Record<string, unknown>;
  try {
    state = JSON.parse(rawApollo) as Record<string, unknown>;
  } catch {
    return null;
  }
  const post = Object.values(state).find((value) => {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { __typename?: string }).__typename === "Post" &&
      typeof (value as { title?: unknown }).title === "string"
    );
  }) as Record<string, unknown> | undefined;

  if (!post) return null;

  const contentKey = Object.keys(post).find((key) => key.startsWith("content("));
  const content = contentKey ? (post[contentKey] as { bodyModel?: { paragraphs?: Array<{ __ref?: string }> } }) : null;
  const refs = content?.bodyModel?.paragraphs ?? [];

  const markdownBlocks = refs
    .map((ref) => {
      if (!ref.__ref) return "";
      return paragraphToMarkdown(state[ref.__ref] as MediumParagraph);
    })
    .filter(Boolean);

  if (markdownBlocks.length < 2) return null;

  const title = String(post.title || "Imported Medium article");
  const hasTitleBlock = markdownBlocks[0]?.replace(/^#+\s+/, "") === title;
  const normalizedBlocks = hasTitleBlock ? [`# ${title}`, ...markdownBlocks.slice(1)] : [`# ${title}`, ...markdownBlocks];
  const markdown = normalizedBlocks.join("\n\n");

  return { title, markdown };
}

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url?: string };
  if (!url) return new Response("URL is required", { status: 400 });

  try {
    if (isMediumUrl(url)) {
      const medium = await extractMediumMarkdown(url);
      if (medium) return Response.json(medium);
    }

    const article = await extract(url);
    if (!article?.content) return new Response("本文を抽出できませんでした。Markdown貼り付けを使ってください。", { status: 422 });

    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    const body = turndown.turndown(article.content);
    const title = article.title || "Imported article";
    const markdown = [`# ${title}`, body].join("\n\n");

    return Response.json({ title, markdown });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "URL import failed", { status: 500 });
  }
}
