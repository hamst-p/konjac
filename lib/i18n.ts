import type { BlockStatus, UiLocale } from "./types";

type TranslationKey =
  | "appTitle"
  | "jsonImport"
  | "new"
  | "loading"
  | "emptyTitle"
  | "emptyBody"
  | "newDocument"
  | "updated"
  | "import"
  | "delete"
  | "settings"
  | "settingsTitle"
  | "settingsDescription"
  | "displayLanguage"
  | "japanese"
  | "english"
  | "provider"
  | "model"
  | "close"
  | "documentLoading"
  | "backToList"
  | "source"
  | "target"
  | "targetPlaceholder"
  | "sourcePlaceholder"
  | "translating"
  | "aiTranslate"
  | "split"
  | "reviewedProgress"
  | "all"
  | "scrollSync"
  | "translateMissing"
  | "publish"
  | "targetMd"
  | "sourceMd"
  | "parallelMd"
  | "unpublish"
  | "importTitle"
  | "saveBlocks"
  | "urlImport"
  | "markdownPaste"
  | "noImportableBlocks"
  | "fetchingUrl"
  | "fetched"
  | "urlImportFailed"
  | "shareLoading"
  | "shareNotFound"
  | "delivery"
  | "publishInProgress"
  | "publishUpdated"
  | "localShareCreated"
  | "publishFailed"
  | "unpublishInProgress"
  | "unpublishDone"
  | "unpublishFailed"
  | "aiFailed";

const dictionary: Record<UiLocale, Record<TranslationKey, string>> = {
  ja: {
    appTitle: "対訳ブロックエディタ",
    jsonImport: "JSON import",
    new: "新規作成",
    loading: "読み込み中...",
    emptyTitle: "最初の記事を取り込みましょう",
    emptyBody: "Markdown ペーストまたは Medium URL からブロック分割して、左右対訳で編集できます。",
    newDocument: "新規ドキュメント",
    updated: "更新",
    import: "取り込み",
    delete: "削除",
    settings: "設定",
    settingsTitle: "設定",
    settingsDescription: "表示言語、AIプロバイダ、モデルはこのブラウザに保存されます。",
    displayLanguage: "表示言語",
    japanese: "日本語",
    english: "English",
    provider: "プロバイダ",
    model: "モデル",
    close: "閉じる",
    documentLoading: "ドキュメントを読み込み中です。",
    backToList: "一覧へ",
    source: "原文",
    target: "訳文",
    targetPlaceholder: "訳文を入力",
    sourcePlaceholder: "原文を入力",
    translating: "翻訳中",
    aiTranslate: "AI翻訳",
    split: "分割",
    reviewedProgress: "確認済み",
    all: "全て",
    scrollSync: "スクロール同期",
    translateMissing: "未翻訳を一括下訳",
    publish: "公開/更新",
    targetMd: "訳文MD",
    sourceMd: "原文MD",
    parallelMd: "対訳MD",
    unpublish: "公開停止",
    importTitle: "記事の取り込み",
    saveBlocks: "ブロック化して保存",
    urlImport: "URLインポート",
    markdownPaste: "Markdown ペースト",
    noImportableBlocks: "取り込めるブロックがありません。",
    fetchingUrl: "URLを取得中...",
    fetched: "取得しました",
    urlImportFailed: "URL取得に失敗しました。Markdown貼り付けで取り込んでください。",
    shareLoading: "読み込み中...",
    shareNotFound: "公開スナップショットが見つかりません。",
    delivery: "Konjac delivery",
    publishInProgress: "公開中...",
    publishUpdated: "公開URLを更新しました",
    localShareCreated: "ローカル公開URLを作成しました",
    publishFailed: "公開に失敗しました。",
    unpublishInProgress: "公開停止中...",
    unpublishDone: "公開を停止しました。",
    unpublishFailed: "公開停止に失敗しました。",
    aiFailed: "AI翻訳に失敗しました。",
  },
  en: {
    appTitle: "Bilingual Block Editor",
    jsonImport: "JSON import",
    new: "New",
    loading: "Loading...",
    emptyTitle: "Import your first article",
    emptyBody: "Paste Markdown or import a Medium URL, then edit aligned source and translation blocks.",
    newDocument: "New document",
    updated: "Updated",
    import: "Import",
    delete: "Delete",
    settings: "Settings",
    settingsTitle: "Settings",
    settingsDescription: "Display language, AI provider, and model are saved in this browser.",
    displayLanguage: "Display language",
    japanese: "Japanese",
    english: "English",
    provider: "Provider",
    model: "Model",
    close: "Close",
    documentLoading: "Loading document.",
    backToList: "Back to list",
    source: "Source",
    target: "Translation",
    targetPlaceholder: "Enter translation",
    sourcePlaceholder: "Enter source text",
    translating: "Translating",
    aiTranslate: "AI translate",
    split: "Split",
    reviewedProgress: "reviewed",
    all: "All",
    scrollSync: "Scroll sync",
    translateMissing: "Translate untranslated",
    publish: "Publish/update",
    targetMd: "Target MD",
    sourceMd: "Source MD",
    parallelMd: "Parallel MD",
    unpublish: "Unpublish",
    importTitle: "Import article",
    saveBlocks: "Save as blocks",
    urlImport: "Import URL",
    markdownPaste: "Markdown paste",
    noImportableBlocks: "No importable blocks found.",
    fetchingUrl: "Fetching URL...",
    fetched: "Fetched",
    urlImportFailed: "URL import failed. Paste Markdown instead.",
    shareLoading: "Loading...",
    shareNotFound: "Published snapshot was not found.",
    delivery: "Konjac delivery",
    publishInProgress: "Publishing...",
    publishUpdated: "Published URL updated",
    localShareCreated: "Local share URL created",
    publishFailed: "Publishing failed.",
    unpublishInProgress: "Unpublishing...",
    unpublishDone: "Unpublished.",
    unpublishFailed: "Unpublish failed.",
    aiFailed: "AI translation failed.",
  },
};

export function t(locale: UiLocale, key: TranslationKey) {
  return dictionary[locale][key];
}

export function statusLabel(locale: UiLocale, status: BlockStatus) {
  const labels: Record<UiLocale, Record<BlockStatus, string>> = {
    ja: {
      untranslated: "未翻訳",
      ai_draft: "AI下訳",
      reviewed: "確認済み",
    },
    en: {
      untranslated: "Untranslated",
      ai_draft: "AI draft",
      reviewed: "Reviewed",
    },
  };

  return labels[locale][status];
}

