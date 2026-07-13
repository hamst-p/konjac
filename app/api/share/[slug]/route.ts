import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response("Blob storage is not configured", { status: 404 });
  }

  const result = await list({ prefix: `konjac/${slug}.json`, limit: 1 });
  const blob = result.blobs[0];
  if (!blob) return new Response("Snapshot not found", { status: 404 });

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) return new Response("Snapshot could not be loaded", { status: 502 });

  return new Response(await response.text(), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

