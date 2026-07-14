export function shouldUseBlobStorage() {
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidcStore = Boolean(process.env.BLOB_STORE_ID && (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL));

  return hasReadWriteToken || hasOidcStore || process.env.VERCEL === "1";
}

export function blobEnvironmentSummary() {
  return {
    hasReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    hasStoreId: Boolean(process.env.BLOB_STORE_ID),
    hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    isVercel: process.env.VERCEL === "1",
  };
}
