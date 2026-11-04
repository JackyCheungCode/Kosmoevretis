interface Env { DEEPL_AUTH_KEY?: string }
interface Context { request: Request; env: Env }
export const onRequestPost = async ({request,env}:Context) => {
  if (!env.DEEPL_AUTH_KEY) return Response.json({error:"DeepL 服务尚未配置，请在 Cloudflare Pages Secrets 中添加 DEEPL_AUTH_KEY。"}, {status:503});
  try {
    const body = await request.json() as {text?:unknown;target_lang?:unknown};
    const texts = Array.isArray(body.text) ? body.text : [body.text];
    const target = typeof body.target_lang === "string" ? body.target_lang.toUpperCase() : "";
    if (!texts.length || texts.length > 30 || texts.some(x=>typeof x!=="string" || !x.trim()) || !/^[A-Z]{2}(-[A-Z]{2})?$/.test(target)) {
      return Response.json({error:"翻译参数无效。"}, {status:400});
    }
    const endpoint = env.DEEPL_AUTH_KEY.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
    const form = new URLSearchParams();
    for (const text of texts as string[]) form.append("text",text.slice(0,5000));
    form.set("target_lang",target);
    const upstream = await fetch(endpoint,{method:"POST",headers:{"Authorization":"DeepL-Auth-Key "+env.DEEPL_AUTH_KEY,"Content-Type":"application/x-www-form-urlencoded"},body:form});
    const payload = await upstream.json() as {translations?:{text:string;detected_source_language?:string}[];message?:string};
    if (!upstream.ok) return Response.json({error:payload.message||"DeepL 翻译请求失败。"}, {status:upstream.status});
    return Response.json({translations:payload.translations||[]});
  } catch {
    return Response.json({error:"翻译请求处理失败。"}, {status:500});
  }
};
