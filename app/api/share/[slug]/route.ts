import { list } from "@vercel/blob";
import { shouldUseBlobStorage } from "@/lib/blob-config";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!shouldUseBlobStorage()) {
    return new Response("Blob storage is not configured", { status: 404 });
  }

  let result;
  try {
    result = await list({ prefix: `konjac/${slug}.json`, limit: 1 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Blob storage could not be read", { status: 500 });
  }
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
