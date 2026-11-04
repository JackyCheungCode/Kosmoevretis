/**
 * Same-origin proxy for geoBoundaries ADM1 GeoJSON.
 * Keeps browser requests away from third-party CORS restrictions and caches
 * the administrative boundary response at the edge.
 */
const COUNTRIES_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const METADATA_URL = "https://www.geoboundaries.org/api/current/gbOpen/";

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

export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url);
  const geo = (url.searchParams.get("geo") || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(geo)) {
    return json({ error: "请提供有效的 ISO 3166-1 两位国家代码。" }, 400, "no-store");
  }

  try {
    const countryResponse = await fetch(COUNTRIES_URL, {
      headers: { Accept: "application/geo+json, application/json" },
    });
    if (!countryResponse.ok) return json({ error: "国家边界数据服务暂不可用。" }, 502, "no-store");
    const countries = await countryResponse.json() as any;
    const country = (countries.features || []).find((feature: any) => {
      const props = feature.properties || {};
      return String(props["ISO3166-1-Alpha-2"] || props.ISO_A2 || props.iso_a2 || "").toUpperCase() === geo;
    });
    const props = country?.properties || {};
    const iso3 = String(props["ISO3166-1-Alpha-3"] || props.ISO_A3 || props.ADM0_A3 || "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(iso3)) {
      return json({ error: "暂不支持该国家的省／州级边界数据。" }, 404, "no-store");
    }

    const metadataResponse = await fetch(METADATA_URL + iso3 + "/ADM1/", {
      headers: { Accept: "application/json" },
    });
    if (!metadataResponse.ok) {
      return json({ error: "该国家的省／州边界暂不可用。" }, 404, "no-store");
    }
    const metadata = await metadataResponse.json() as any;
    const downloadUrl = String(metadata.gjDownloadURL || metadata.geojson || "");
    if (!downloadUrl) return json({ error: "该国家暂无可用的省／州边界文件。" }, 404, "no-store");

    const download = new URL(downloadUrl);
    const allowedHosts = new Set(["www.geoboundaries.org", "geoboundaries.org", "github.com", "raw.githubusercontent.com", "data.humdata.org"]);
    if (download.protocol !== "https:" || !allowedHosts.has(download.hostname)) {
      return json({ error: "边界数据下载地址不受支持。" }, 502, "no-store");
    }

    const boundaryResponse = await fetch(download.toString(), {
      headers: { Accept: "application/geo+json, application/json" },
    });
    if (!boundaryResponse.ok) return json({ error: "省／州边界文件下载失败，请稍后重试。" }, 502, "no-store");
    const boundary = await boundaryResponse.json() as any;
    if (boundary?.type !== "FeatureCollection" || !Array.isArray(boundary.features)) {
      return json({ error: "返回的行政区边界数据格式无效。" }, 502, "no-store");
    }
    return json(boundary, 200, "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400");
  } catch (error) {
    return json({
      error: error instanceof Error ? "行政区边界服务请求失败：" + error.message : "行政区边界服务请求失败。",
    }, 502, "no-store");
  }
}
