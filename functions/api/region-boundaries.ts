/**
 * Same-origin proxy for geoBoundaries ADM1 GeoJSON.
 * Resolves ISO2 codes server-side, retries the alternate geoBoundaries release,
 * validates the payload and caches successful administrative boundary data.
 */
const COUNTRIES_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const REST_COUNTRY_URL = "https://restcountries.com/v3.1/alpha/";
const GEOBOUNDARIES_BASE = "https://www.geoboundaries.org/api/current/";

function json(body: unknown, status = 200, cache = "public, max-age=3600, s-maxage=86400") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function fetchJson(url: string, timeoutMs = 18000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    if (!response.ok) throw new Error("上游服务返回 HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveIso3(iso2: string): Promise<string> {
  try {
    const country = await fetchJson(REST_COUNTRY_URL + encodeURIComponent(iso2) + "?fields=cca3", 9000);
    const code = String(country?.cca3 || "").toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) return code;
  } catch {
    // Fall back to the Natural Earth country file if REST Countries is unavailable.
  }
  const countries = await fetchJson(COUNTRIES_URL, 18000);
  const feature = (countries.features || []).find((item: any) => {
    const props = item.properties || {};
    return String(props["ISO3166-1-Alpha-2"] || props.ISO_A2 || props.iso_a2 || "").toUpperCase() === iso2;
  });
  const props = feature?.properties || {};
  const code = String(props["ISO3166-1-Alpha-3"] || props.ISO_A3 || props.ADM0_A3 || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error("无法将国家代码 " + iso2 + " 转换为 ISO3。");
  return code;
}

async function getAdmin1(iso3: string): Promise<any> {
  const errors: string[] = [];
  for (const dataset of ["gbOpen", "gbHumanitarian"]) {
    try {
      const metadata = await fetchJson(GEOBOUNDARIES_BASE + dataset + "/" + iso3 + "/ADM1/", 18000);
      const downloadUrl = String(metadata.gjDownloadURL || metadata.geojson || "");
      if (!downloadUrl) throw new Error("数据目录未提供 GeoJSON 下载地址");
      const download = new URL(downloadUrl);
      const allowedHosts = new Set(["www.geoboundaries.org", "geoboundaries.org", "github.com", "raw.githubusercontent.com", "data.humdata.org"]);
      if (download.protocol !== "https:" || !allowedHosts.has(download.hostname)) throw new Error("边界下载地址不受支持");
      const boundary = await fetchJson(download.toString(), 25000);
      if (boundary?.type === "FeatureCollection" && Array.isArray(boundary.features) && boundary.features.length) return boundary;
      throw new Error("GeoJSON 中没有有效行政区要素");
    } catch (error) {
      errors.push(dataset + "：" + (error instanceof Error ? error.message : "请求失败"));
    }
  }
  throw new Error(errors.join("；"));
}

export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url);
  const geo = (url.searchParams.get("geo") || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(geo)) {
    return json({ error: "请提供有效的 ISO 3166-1 两位国家代码。" }, 400, "no-store");
  }

  try {
    const iso3 = await resolveIso3(geo);
    const boundary = await getAdmin1(iso3);
    return json(boundary, 200, "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    return json({
      error: "暂时无法获取该国家的省／州边界数据。",
      detail,
      country: geo,
    }, 502, "no-store");
  }
}
