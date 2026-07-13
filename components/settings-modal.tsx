"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/i18n";
import type { UiLocale } from "@/lib/types";
import { useDocumentStore } from "@/store/document-store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const settings = useDocumentStore((state) => state.settings);
  const locale = useDocumentStore((state) => state.uiLocale);
  const updateSettings = useDocumentStore((state) => state.updateSettings);
  const updateUiLocale = useDocumentStore((state) => state.updateUiLocale);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} title="AI settings">
        <Settings size={15} />
        {t(locale, "settings")}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">{t(locale, "settingsTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t(locale, "settingsDescription")}</p>
            </div>
            <label className="mb-4 block text-sm font-medium text-slate-700">
              {t(locale, "displayLanguage")}
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={locale}
                onChange={(event) => updateUiLocale(event.target.value as UiLocale)}
              >
                <option value="ja">{t(locale, "japanese")}</option>
                <option value="en">{t(locale, "english")}</option>
              </select>
            </label>
            <label className="mb-4 block text-sm font-medium text-slate-700">
              {t(locale, "provider")}
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={settings.provider}
                onChange={(event) =>
                  updateSettings({
                    provider: event.target.value as "anthropic" | "openai",
                    model: event.target.value === "openai" ? "gpt-4o-mini" : "claude-3-5-haiku-latest",
                  })
                }
              >
                <option value="anthropic">Claude</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {t(locale, "model")}
              <Input className="mt-2" value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value })} />
            </label>
            <div className="mt-5 flex justify-end">
              <Button variant="primary" onClick={() => setOpen(false)}>
                {t(locale, "close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
