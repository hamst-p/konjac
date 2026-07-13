import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { AiSettings, Document } from "@/lib/types";

export const runtime = "nodejs";

function selectModel(settings: AiSettings) {
  if (settings.provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY が設定されていません。");
    return openai(settings.model || "gpt-4o-mini");
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  return anthropic(settings.model || "claude-3-5-haiku-latest");
}

export async function POST(request: Request) {
  try {
    const { document, blockId, settings } = (await request.json()) as {
      document: Document;
      blockId: string;
      settings: AiSettings;
    };

    const index = document.blocks.findIndex((block) => block.id === blockId);
    const block = document.blocks[index];
    if (!block) return new Response("Block not found", { status: 404 });

    const context = document.blocks
      .slice(Math.max(0, index - 3), Math.min(document.blocks.length, index + 4))
      .map((item, itemIndex) => {
        const marker = item.id === block.id ? "TARGET_BLOCK" : `context_${itemIndex}`;
        return `<${marker} type="${item.type}">\n${item.source}\n</${marker}>`;
      })
      .join("\n\n");

    const result = streamText({
      model: selectModel(settings),
      system:
        "You are a careful professional article translator. Translate between English and Japanese. Return only the translated Markdown for the target block. Preserve Markdown structure, code fences, list shape, links, and image markdown. Do not add commentary.",
      prompt: `Document title: ${document.title}
Source language: ${document.sourceLang}
Target language: ${document.targetLang}

Nearby article context:
${context}

Translate only TARGET_BLOCK and return only the translation.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "AI translation failed", { status: 500 });
  }
}

