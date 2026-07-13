"use client";

import { create } from "zustand";
import { createDocumentFromMarkdown } from "@/lib/markdown";
import { documentRepository } from "@/lib/repositories/document-repository";
import { loadAiSettings, loadUiLocale, saveAiSettings, saveUiLocale } from "@/lib/repositories/settings-repository";
import { DEFAULT_AI_SETTINGS, DEFAULT_UI_LOCALE, type AiSettings, type Block, type BlockStatus, type BlockType, type Document, type LanguageCode, type UiLocale } from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

type StoreState = {
  documents: Document[];
  settings: AiSettings;
  uiLocale: UiLocale;
  hydrated: boolean;
  init: () => Promise<void>;
  createEmptyDocument: () => Promise<Document>;
  createFromMarkdown: (markdown: string, title?: string) => Promise<Document>;
  importDocumentJson: (json: string) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  saveDocument: (document: Document) => Promise<void>;
  updateSettings: (settings: AiSettings) => void;
  updateUiLocale: (locale: UiLocale) => void;
  updateDocumentMeta: (id: string, patch: Partial<Pick<Document, "title" | "sourceLang" | "targetLang" | "published">>) => void;
  updateBlock: (documentId: string, blockId: string, patch: Partial<Block>) => void;
  splitBlock: (documentId: string, blockId: string, side: "source" | "target", at: number) => void;
  mergeBlockUp: (documentId: string, blockId: string) => void;
  deleteBlock: (documentId: string, blockId: string) => void;
  moveBlock: (documentId: string, blockId: string, direction: "up" | "down") => void;
  addBlockAfter: (documentId: string, blockId: string, type?: BlockType) => void;
};

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSave(document: Document) {
  const previous = saveTimers.get(document.id);
  if (previous) clearTimeout(previous);
  saveTimers.set(
    document.id,
    setTimeout(() => {
      documentRepository.save(document);
      saveTimers.delete(document.id);
    }, 450),
  );
}

function touch(document: Document): Document {
  return { ...document, updatedAt: nowIso() };
}

function replaceDocument(documents: Document[], next: Document) {
  scheduleSave(next);
  return documents.map((document) => (document.id === next.id ? next : document)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function emptyDocument(): Document {
  const timestamp = nowIso();
  return {
    id: createId("doc"),
    title: "Untitled translation",
    sourceLang: "en",
    targetLang: "ja",
    blocks: [
      {
        id: createId("block"),
        type: "paragraph",
        source: "",
        target: "",
        status: "untranslated",
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const useDocumentStore = create<StoreState>((set) => ({
  documents: [],
  settings: DEFAULT_AI_SETTINGS,
  uiLocale: DEFAULT_UI_LOCALE,
  hydrated: false,
  init: async () => {
    const documents = await documentRepository.list();
    set({ documents, settings: loadAiSettings(), uiLocale: loadUiLocale(), hydrated: true });
  },
  createEmptyDocument: async () => {
    const document = emptyDocument();
    await documentRepository.save(document);
    set((state) => ({ documents: [document, ...state.documents] }));
    return document;
  },
  createFromMarkdown: async (markdown, title) => {
    const document = createDocumentFromMarkdown(markdown, title);
    await documentRepository.save(document);
    set((state) => ({ documents: [document, ...state.documents] }));
    return document;
  },
  importDocumentJson: async (json) => {
    const document = await documentRepository.importJson(json);
    set((state) => ({
      documents: [document, ...state.documents.filter((item) => item.id !== document.id)],
    }));
    return document;
  },
  deleteDocument: async (id) => {
    await documentRepository.delete(id);
    set((state) => ({ documents: state.documents.filter((document) => document.id !== id) }));
  },
  saveDocument: async (document) => {
    await documentRepository.save(document);
    set((state) => ({ documents: replaceDocument(state.documents, document) }));
  },
  updateSettings: (settings) => {
    saveAiSettings(settings);
    set({ settings });
  },
  updateUiLocale: (uiLocale) => {
    saveUiLocale(uiLocale);
    set({ uiLocale });
  },
  updateDocumentMeta: (id, patch) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === id);
      if (!document) return state;
      const next = touch({ ...document, ...patch });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  updateBlock: (documentId, blockId, patch) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document) return state;
      const next = touch({
        ...document,
        blocks: document.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  splitBlock: (documentId, blockId, side, at) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document) return state;
      const index = document.blocks.findIndex((block) => block.id === blockId);
      const block = document.blocks[index];
      if (!block) return state;
      const value = block[side];
      const left = value.slice(0, at).trim();
      const right = value.slice(at).trim();
      if (!left || !right) return state;
      const first = { ...block, [side]: left };
      const second: Block = {
        ...block,
        id: createId("block"),
        source: side === "source" ? right : "",
        target: side === "target" ? right : "",
        status: side === "target" ? block.status : "untranslated",
      };
      const blocks = [...document.blocks];
      blocks.splice(index, 1, first, second);
      const next = touch({ ...document, blocks });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  mergeBlockUp: (documentId, blockId) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document) return state;
      const index = document.blocks.findIndex((block) => block.id === blockId);
      if (index <= 0) return state;
      const previous = document.blocks[index - 1];
      const current = document.blocks[index];
      const merged: Block = {
        ...previous,
        source: [previous.source, current.source].filter(Boolean).join("\n\n"),
        target: [previous.target, current.target].filter(Boolean).join("\n\n"),
        status: previous.status === "reviewed" && current.status === "reviewed" ? "reviewed" : previous.status,
      };
      const blocks = [...document.blocks];
      blocks.splice(index - 1, 2, merged);
      const next = touch({ ...document, blocks });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  deleteBlock: (documentId, blockId) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document || document.blocks.length <= 1) return state;
      const next = touch({ ...document, blocks: document.blocks.filter((block) => block.id !== blockId) });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  moveBlock: (documentId, blockId, direction) => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document) return state;
      const index = document.blocks.findIndex((block) => block.id === blockId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= document.blocks.length) return state;
      const blocks = [...document.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(targetIndex, 0, block);
      const next = touch({ ...document, blocks });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
  addBlockAfter: (documentId, blockId, type = "paragraph") => {
    set((state) => {
      const document = state.documents.find((item) => item.id === documentId);
      if (!document) return state;
      const index = document.blocks.findIndex((block) => block.id === blockId);
      const block: Block = {
        id: createId("block"),
        type,
        source: "",
        target: "",
        status: "untranslated",
      };
      const blocks = [...document.blocks];
      blocks.splice(index + 1, 0, block);
      const next = touch({ ...document, blocks });
      return { documents: replaceDocument(state.documents, next) };
    });
  },
}));

export function languageLabel(code: LanguageCode, locale: UiLocale = "en") {
  if (locale === "ja") return code === "en" ? "英語" : "日本語";
  return code === "en" ? "English" : "Japanese";
}

export function nextStatus(status: BlockStatus): BlockStatus {
  if (status === "untranslated") return "ai_draft";
  if (status === "ai_draft") return "reviewed";
  return "untranslated";
}
