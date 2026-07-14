import { del, put } from "@vercel/blob";
import { shouldUseBlobStorage } from "@/lib/blob-config";
import type { Document } from "@/lib/types";

export const runtime = "nodejs";

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `${base || "document"}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const { document, slug } = (await request.json()) as { document?: Document; slug?: string };
  if (!document) return new Response("Document is required", { status: 400 });

  const nextSlug = slug || slugify(document.title);
  const snapshot = JSON.stringify({ ...document, published: { slug: nextSlug, publishedAt: new Date().toISOString() } }, null, 2);

  if (!shouldUseBlobStorage()) {
    return Response.json({ slug: nextSlug, url: `/share/${nextSlug}`, mode: "local" });
  }

  let blob;
  try {
    blob = await put(`konjac/${nextSlug}.json`, snapshot, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Blob publish failed", { status: 500 });
  }

  return Response.json({ slug: nextSlug, url: `/share/${nextSlug}`, blobUrl: blob.url, mode: "blob" });
}

export async function DELETE(request: Request) {
  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) return new Response("Slug is required", { status: 400 });

  if (shouldUseBlobStorage()) {
    await del(`konjac/${slug}.json`);
  }

  return Response.json({ ok: true });
}
