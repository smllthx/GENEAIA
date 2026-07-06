export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  const fallbackUrl = "https://wallet-finance-ai.vercel.app";

  const url = explicitUrl || (vercelUrl ? `https://${vercelUrl}` : fallbackUrl);
  return url.endsWith("/") ? url : `${url}/`;
}
