export type LanguageCode = "en" | "ja";

export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "paragraph"
  | "quote"
  | "bulletList"
  | "numberedList"
  | "image"
  | "code"
  | "divider";

export type BlockStatus = "untranslated" | "ai_draft" | "reviewed";

export type Block = {
  id: string;
  type: BlockType;
  source: string;
  target: string;
  status: BlockStatus;
  meta?: {
    imageUrl?: string;
    caption?: string;
    language?: string;
  };
};

export type PublishedSnapshot = {
  slug: string;
  publishedAt: string;
  url?: string;
};

export type Document = {
  id: string;
  title: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
  published?: PublishedSnapshot;
};

export type AiProvider = "anthropic" | "openai";

export type UiLocale = "ja" | "en";

export type AiSettings = {
  provider: AiProvider;
  model: string;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "anthropic",
  model: "claude-3-5-haiku-latest",
};

export const DEFAULT_UI_LOCALE: UiLocale = "ja";
