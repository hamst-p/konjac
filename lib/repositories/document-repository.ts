import type { Document } from "../types";

export interface DocumentRepository {
  list(): Promise<Document[]>;
  get(id: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
  delete(id: string): Promise<void>;
  importJson(json: string): Promise<Document>;
  exportJson(id: string): Promise<string>;
}

const STORAGE_KEY = "konjac.documents.v1";

function readMap(): Record<string, Document> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Document>;
  } catch {
    return {};
  }
}

function writeMap(value: Record<string, Document>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export class LocalStorageDocumentRepository implements DocumentRepository {
  async list() {
    return Object.values(readMap()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return readMap()[id] ?? null;
  }

  async save(document: Document) {
    const documents = readMap();
    documents[document.id] = document;
    writeMap(documents);
  }

  async delete(id: string) {
    const documents = readMap();
    delete documents[id];
    writeMap(documents);
  }

  async importJson(json: string) {
    const document = JSON.parse(json) as Document;
    if (!document.id || !document.blocks) {
      throw new Error("Konjac document JSONではありません。");
    }
    await this.save(document);
    return document;
  }

  async exportJson(id: string) {
    const document = await this.get(id);
    if (!document) throw new Error("Document not found");
    return JSON.stringify(document, null, 2);
  }
}

export const documentRepository = new LocalStorageDocumentRepository();

