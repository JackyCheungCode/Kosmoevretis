import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Checkbox, Dropdown, InlineNotification, NumberInput, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, Tag, TextArea, TextInput,
} from "@carbon/react";
import { Download, Search, ShoppingCart, Store, Star, Currency, Chat, UserMultiple, Activity } from "@carbon/icons-react";
import { supabase } from "../lib/supabase";
import { EmptyState, IntelligencePageTemplate } from "../design-system";
import { CollectionModeGrid } from "../design-system/components/CollectionModeGrid";
import "../facebook-discovery.css";
import "./ecommerce-discovery.css";

export type EcommercePlatform =
  | "amazon" | "walmart" | "ebay" | "aliexpress" | "temu" | "etsy"
  | "shopify" | "mercado-libre" | "rakuten";

type Mode = "keyword" | "details" | "listing" | "reviews" | "sellers";
type RowData = Record<string, unknown>;
type HistoryRow = {
  id: string; title: string; status: string; result_count: number; created_at: string;
  actor_id?: string; error_message?: string | null; input_snapshot?: Record<string, unknown>;
};
type LogEntry = { id: number; time: string; level: "info" | "success" | "warning" | "error"; message: string };
type Option = { id: string; text: string };

const platformConfig: Record<EcommercePlatform, {
  name: string; description: string; domain: string; domains: Option[]; supportsKeyword: boolean;
}> = {
  amazon: { name: "Amazon", description: "发现商品、价格、评论与卖家，覆盖不同国家站点。", domain: "www.amazon.com", supportsKeyword: true, domains: [
    { id: "www.amazon.com", text: "美国 · Amazon.com" }, { id: "www.amazon.co.uk", text: "英国 · Amazon.co.uk" },
    { id: "www.amazon.de", text: "德国 · Amazon.de" }, { id: "www.amazon.co.jp", text: "日本 · Amazon.co.jp" },
    { id: "www.amazon.ca", text: "加拿大 · Amazon.ca" }, { id: "www.amazon.com.au", text: "澳大利亚 · Amazon.com.au" },
  ] },
  walmart: { name: "Walmart", description: "发现 Walmart 商品、价格、评分、评论与供给信息。", domain: "www.walmart.com", supportsKeyword: true, domains: [
    { id: "www.walmart.com", text: "美国 · Walmart.com" }, { id: "www.walmart.ca", text: "加拿大 · Walmart.ca" },
  ] },
  ebay: { name: "eBay", description: "发现商品刊登、价格、卖家与消费者反馈。", domain: "www.ebay.com", supportsKeyword: true, domains: [
    { id: "www.ebay.com", text: "美国 · eBay.com" }, { id: "www.ebay.co.uk", text: "英国 · eBay.co.uk" },
    { id: "www.ebay.de", text: "德国 · eBay.de" }, { id: "www.ebay.com.au", text: "澳大利亚 · eBay.com.au" },
  ] },
  aliexpress: { name: "AliExpress", description: "发现跨境商品、价格、店铺与公开评论。", domain: "www.aliexpress.com", supportsKeyword: false, domains: [
    { id: "www.aliexpress.com", text: "全球 · AliExpress.com" },
  ] },
  temu: { name: "Temu", description: "发现 Temu 商品、价格、商品信息与市场供给信号。", domain: "www.temu.com", supportsKeyword: false, domains: [
    { id: "www.temu.com", text: "全球 · Temu.com" },
  ] },
  etsy: { name: "Etsy", description: "发现创意商品、手工制品、卖家与价格分布。", domain: "www.etsy.com", supportsKeyword: false, domains: [
    { id: "www.etsy.com", text: "全球 · Etsy.com" },
  ] },
  shopify: { name: "Shopify", description: "通过公开店铺、商品和分类页 URL 发现独立站商品。", domain: "", supportsKeyword: false, domains: [] },
  "mercado-libre": { name: "Mercado Libre", description: "发现拉美市场商品、价格、卖家与评价。", domain: "www.mercadolibre.com.mx", supportsKeyword: true, domains: [
    { id: "www.mercadolibre.com.mx", text: "墨西哥 · Mercado Libre" }, { id: "www.mercadolibre.com.ar", text: "阿根廷 · Mercado Libre" },
    { id: "www.mercadolivre.com.br", text: "巴西 · Mercado Livre" }, { id: "www.mercadolibre.com.co", text: "哥伦比亚 · Mercado Libre" },
    { id: "www.mercadolibre.cl", text: "智利 · Mercado Libre" },
  ] },
  rakuten: { name: "Rakuten", description: "发现日本及其他地区乐天市场商品、价格与店铺。", domain: "www.rakuten.co.jp", supportsKeyword: false, domains: [
    { id: "www.rakuten.co.jp", text: "日本 · Rakuten.co.jp" }, { id: "www.rakuten.com", text: "美国 · Rakuten.com" },
  ] },
};

const modes: { id: Mode; label: string; description: string; icon: typeof Search }[] = [
  { id: "keyword", label: "关键词发现", description: "按商品关键词检索市场商品", icon: Search },
  { id: "details", label: "商品详情", description: "读取指定商品 URL 的详细字段", icon: ShoppingCart },
  { id: "listing", label: "分类 / 列表", description: "从分类页或搜索列表发现商品", icon: Store },
  { id: "reviews", label: "消费者评论", description: "采集商品评论与评分反馈", icon: Chat },
  { id: "sellers", label: "品牌 / 卖家", description: "读取公开店铺与卖家资料", icon: UserMultiple },
];
const tabs = [
  { id: "overview", label: "情报总览", icon: Activity },
  { id: "products", label: "商品发现", icon: ShoppingCart },
  { id: "bestsellers", label: "全球热销榜", icon: Star },
  { id: "pricing", label: "价格与供给", icon: Currency },
  { id: "reviews", label: "消费者评论", icon: Chat },
  { id: "sellers", label: "品牌与卖家", icon: Store },
  { id: "raw", label: "完整原始数据", icon: Star },
  { id: "history", label: "采集历史", icon: Activity },
];
const columns: Record<string, { key: string; label: string }[]> = {
  products: [
    { key: "name", label: "商品名称" }, { key: "brand", label: "品牌" }, { key: "price", label: "价格" },
    { key: "currency", label: "币种" }, { key: "rating", label: "评分" }, { key: "reviewCount", label: "评论数" },
    { key: "availability", label: "库存 / 供给" }, { key: "url", label: "商品链接" },
  ],
  bestsellers: [
    { key: "name", label: "商品名称" }, { key: "brand", label: "品牌" }, { key: "rank", label: "公开排名" },
    { key: "category", label: "榜单类别" }, { key: "price", label: "价格" }, { key: "url", label: "商品链接" },
  ],
  pricing: [
    { key: "name", label: "商品名称" }, { key: "price", label: "当前价格" }, { key: "currency", label: "币种" },
    { key: "originalPrice", label: "原价" }, { key: "discount", label: "折扣信息" },
    { key: "availability", label: "库存状态" }, { key: "seller", label: "卖家" }, { key: "url", label: "商品链接" },
  ],
  reviews: [
    { key: "productName", label: "商品" }, { key: "reviewTitle", label: "评论标题" }, { key: "reviewBody", label: "评论内容" },
    { key: "reviewRating", label: "评分" }, { key: "author", label: "评论者" }, { key: "datePublished", label: "发布时间" },
    { key: "url", label: "来源链接" },
  ],
  sellers: [
    { key: "sellerName", label: "卖家 / 店铺" }, { key: "url", label: "店铺链接" }, { key: "rating", label: "评分" },
    { key: "ratingCount", label: "评价数量" }, { key: "country", label: "国家 / 地区" }, { key: "productCount", label: "商品数量" },
  ],
};
const aliases: Record<string, string[]> = {
  name: ["name", "title", "productName", "product_name"], brand: ["brand", "brandName", "manufacturer"],
  price: ["price", "currentPrice", "salePrice", "offers.price", "price.value"],
  currency: ["currency", "priceCurrency", "offers.priceCurrency", "price.currency"],
  rating: ["rating", "stars", "aggregateRating.ratingValue", "reviewRating.ratingValue"],
  reviewCount: ["reviewCount", "reviewsCount", "ratingCount", "numberOfReviews"],
  rank: ["rank", "bestSellerRank", "bestsellerRank", "salesRank", "position", "bestsellerRanks.0.rank", "bestsellerRanks.rank"],
  category: ["category", "categoryName", "breadcrumb", "categoryPath", "bestsellerRanks.0.category", "bestsellerRanks.category"],
  availability: ["availability", "inStockText", "inStock", "stockStatus"],
  url: ["url", "productUrl", "product_url", "sellerUrl", "profileUrl"],
  originalPrice: ["originalPrice", "listPrice", "wasPrice"], discount: ["discount", "discountText", "promotion"],
  seller: ["seller", "sellerName", "merchantName", "offers.0.seller"],
  productName: ["productName", "product.name", "name", "productTitle"],
  reviewTitle: ["reviewTitle", "title", "name"], reviewBody: ["reviewBody", "text", "body", "content"],
  reviewRating: ["reviewRating.ratingValue", "rating", "stars"], author: ["author", "reviewer", "userName"],
  datePublished: ["datePublished", "createdAt", "reviewDate", "date"],
  sellerName: ["sellerName", "name", "merchantName", "parentOrganization.name"],
  ratingCount: ["ratingCount", "aggregateRating.ratingCount", "reviewCount"],
  country: ["country", "address.addressCountry", "location.country"], productCount: ["productCount", "productsCount"],
};
const readPath = (row: RowData, path: string): unknown => path.split(".").reduce<unknown>((value, key) => {
  if (Array.isArray(value) && /^\d+$/.test(key)) return value[Number(key)];
  if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
  return undefined;
}, row);
const getValue = (row: RowData, key: string) => (aliases[key] || [key]).map(path => readPath(row, path)).find(value => value !== undefined && value !== null && value !== "") ?? null;
const hasPublicRank = (row: RowData) => getValue(row, "rank") !== null;
const show = (value: unknown) => value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);
const exportJson = (rows: RowData[], platform: string) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = platform + "-ecommerce-discovery.json"; anchor.click(); URL.revokeObjectURL(url);
};
const splitLines = (value: string) => [...new Set(value.split(/[\n,，;；]+/).map(item => item.trim()).filter(Boolean))];
const statusLabel = (status: string) => status === "succeeded" ? "已完成" : status === "failed" ? "失败" : status === "partial" ? "部分完成" : status === "running" ? "执行中" : status;

export default function EcommerceDiscovery({ platform }: { platform: EcommercePlatform }) {
  const config = platformConfig[platform];
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [mode, setMode] = useState<Mode>(config.supportsKeyword ? "keyword" : "listing");
  const [domain, setDomain] = useState(config.domain);
  const [inputText, setInputText] = useState("");
  const [limit, setLimit] = useState(50);
  const [includeAdditional, setIncludeAdditional] = useState(true);
  const [deduplicate, setDeduplicate] = useState(true);
  const [reviewSort, setReviewSort] = useState("Most recent");
  const [activeTab, setActiveTab] = useState("overview");
  const [rows, setRows] = useState<RowData[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [selectedHistory, setSelectedHistory] = useState("");
  const [taskId, setTaskId] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [actorMeta, setActorMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const inputList = useMemo(() => splitLines(inputText), [inputText]);
  const currentMode = modes.find(item => item.id === mode) || modes[0];
  const activeRows = useMemo(() => rows.filter(row => {
    const type = String(row.discovery_type || row.result_type || "").toLowerCase();
    if (activeTab === "reviews") return mode === "reviews" || type.includes("review") || Boolean(row.reviewBody || row.review_body);
    if (activeTab === "sellers") return mode === "sellers" || type.includes("seller") || Boolean(row.sellerName || row.aggregateRating);
    if (activeTab === "bestsellers") return hasPublicRank(row);
    if (activeTab === "products" || activeTab === "pricing") return mode !== "reviews" && mode !== "sellers";
    return true;
  }).filter(row => !filter.trim() || JSON.stringify(row).toLowerCase().includes(filter.trim().toLowerCase())), [rows, activeTab, mode, filter]);
  const addLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setLogs(old => [...old, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), level, message }].slice(-120));
  }, []);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!live || !data.session?.user) return;
      const { data: membership, error: membershipError } = await supabase.from("organization_members")
        .select("organization_id").eq("user_id", data.session.user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) throw new Error("当前账号尚未加入企业工作区。");
      const { data: organization, error: organizationError } = await supabase.from("organizations")
        .select("id,name").eq("id", membership.organization_id).single();
      if (organizationError) throw organizationError;
      if (live) { setOrganizationId(organization.id); setOrganizationName(organization.name); }
    }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : "无法读取企业工作区。"); });
    return () => { live = false; };
  }, []);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke("ecommerce-discovery", { body: { ...body, organization_id: organizationId } });
    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [organizationId]);

  const loadHistory = useCallback(async () => {
    if (!organizationId) return;
    setHistoryLoading(true);
    try {
      const data = await invoke({ action: "list_history", platform });
      setHistory(data.history || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取采集历史。");
    } finally { setHistoryLoading(false); }
  }, [organizationId, platform, invoke]);

  useEffect(() => { if (organizationId) void loadHistory(); }, [organizationId, loadHistory]);

  const pollTask = useCallback(async (id: string) => {
    const data = await invoke({ action: "poll_task", platform, task_id: id });
    setTaskStatus(data.status || "running");
    if (data.status === "succeeded" || data.status === "partial" || data.status === "failed") {
      setLoading(false);
      setRows(data.results || []);
      setActorMeta(data.actor_meta || null);
      setNotice(data.status === "failed" ? "采集任务失败，请查看错误信息和任务日志。" : "采集任务已结束，返回 " + Number(data.result_count || 0).toLocaleString() + " 条记录。");
      if (data.error_message) setError(data.error_message);
      addLog(data.status === "failed" ? "Actor 执行失败：" + data.error_message : "Dataset 已读取，共 " + Number(data.result_count || 0) + " 条。", data.status === "failed" ? "error" : "success");
      await loadHistory();
    }
    return data.status;
  }, [invoke, platform, addLog, loadHistory]);

  useEffect(() => {
    if (!taskId || !loading) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (!active) return;
      void pollTask(taskId).catch(reason => {
        setLoading(false); setError(reason instanceof Error ? reason.message : "读取 Actor 状态失败。");
        addLog("状态查询失败。", "error");
      });
    }, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [taskId, loading, pollTask, addLog]);

  const run = async () => {
    setError(""); setNotice(""); setSelectedHistory(""); setTaskId(""); setActorMeta(null); setRows([]); setLogs([]);
    if (!inputList.length) { setError(mode === "keyword" ? "请至少输入一个商品关键词。" : "请至少输入一个有效 URL。"); return; }
    if (mode === "keyword" && platform === "shopify") { setError("Shopify 独立站请使用店铺或商品列表 URL。"); return; }
    if (mode !== "keyword" && mode !== "reviews" && inputList.some(value => !/^https?:\/\//i.test(value))) {
      setError("当前发现模式需要输入完整的 http(s) URL。"); return;
    }
    if (mode === "reviews" && !config.supportsKeyword && inputList.some(value => !/^https?:\/\//i.test(value))) { setError("当前平台暂不支持关键词评论搜索，请输入商品 URL。"); return; }
    if (mode === "reviews" && inputList.some(value => /^https?:\/\//i.test(value)) && inputList.some(value => !/^https?:\/\//i.test(value))) {
      setError("评论模式请只输入关键词，或只输入商品 URL，不要混合两种输入。"); return;
    }
    if ((mode === "keyword" || (mode === "reviews" && !inputList.every(value => /^https?:\/\//i.test(value)))) && !domain) { setError("请选择目标市场。"); return; }
    if (!organizationId) { setError("当前账号没有可用的企业工作区。"); return; }
    setLoading(true); setTaskStatus("running"); setActiveTab("overview");
    addLog("已创建电商发现请求。"); addLog("正在校验企业权限与 Apify 连接状态。");
    addLog("准备启动 Apify 官方 E-commerce Scraping Tool。");
    try {
      const data = await invoke({
        action: "collect", platform, mode, input_values: inputList, marketplace: domain,
        max_results: limit, include_additional: includeAdditional,
        deduplicate: deduplicate, review_sort: reviewSort,
      });
      setTaskId(data.task_id);
      setTaskStatus(data.status || "running");
      setActorMeta(data.actor_meta || null);
      addLog("Actor Run 已创建：" + (data.actor_run_id || "等待运行编号"), "success");
      setNotice("采集任务已提交，正在等待 Actor 返回数据。");
      if (data.status === "succeeded" || data.status === "partial" || data.status === "failed") {
        setLoading(false); setRows(data.results || []); await loadHistory();
      }
    } catch (reason) {
      setLoading(false); const message = reason instanceof Error ? reason.message : "电商发现任务启动失败。";
      setError(message); addLog("任务启动失败：" + message, "error");
    }
  };

  const openHistory = async (item: HistoryRow) => {
    setError(""); setNotice(""); setSelectedHistory(item.id); setLoading(true);
    try {
      const data = await invoke({ action: "get_history", platform, task_id: item.id });
      const task = data.history;
      setRows(Array.isArray(task.raw_items) ? task.raw_items : []);
      setActorMeta(task.actor_meta || null); setTaskStatus(task.status); setTaskId(task.status === "running" ? item.id : "");
      const snapshot = task.input_snapshot || {};
      if (snapshot.mode) setMode(snapshot.mode as Mode);
      if (Array.isArray(snapshot.input_values)) setInputText(snapshot.input_values.join("\n"));
      if (snapshot.marketplace) setDomain(String(snapshot.marketplace));
      setActiveTab("overview"); setLoading(task.status === "running");
      setNotice("已载入历史任务数据。");
      addLog("历史任务已载入。", "success");
    } catch (reason) {
      setLoading(false); setError(reason instanceof Error ? reason.message : "读取历史任务失败。");
    }
  };

  const tabRows = ["reviews", "sellers", "bestsellers", "pricing", "products"].includes(activeTab) ? activeRows : rows;

  return <IntelligencePageTemplate
    title={config.name + " 电商发现"}
    description={config.description + " 通过已验证的 Apify 连接采集公开商品、价格、评论及店铺数据。"}
    eyebrow="GLOBAL ECOMMERCE DISCOVERY"
    actions={<Tag type="green">{organizationName || "企业工作区"}</Tag>}
    sourceConfiguration={<section className="ec-config-panel">
      <div className="fb-section-head discovery-object-heading">
        <div><span className="eyebrow">DISCOVERY OBJECT</span><h3>选择发现对象</h3></div>
        <span>一个平台，多种商品情报</span>
      </div>
      <CollectionModeGrid ariaLabel={"选择 " + config.name + " 发现对象"} options={modes.filter(item => item.id !== "keyword" || config.supportsKeyword)} selectedId={mode} onSelect={id => {
        setMode(id as Mode); setError(""); setNotice(""); setRows([]); setActiveTab("overview");
      }} />
      <div className="ec-form-grid">
        {(mode === "keyword" || (mode === "reviews" && config.supportsKeyword)) && config.domains.length > 0 && <div className="ec-field">
          <Dropdown id="ec-marketplace" titleText="目标市场 / 站点" label="选择市场" items={config.domains}
            itemToString={(item: Option | null) => item?.text || ""} selectedItem={config.domains.find(item => item.id === domain) || config.domains[0]}
            onChange={({ selectedItem }) => setDomain(selectedItem?.id || config.domain)} />
          <small>Actor 将在所选站点执行关键词检索。</small>
        </div>}
        <div className="ec-field ec-input-field">
          <TextArea id="ec-input-values" labelText={mode === "keyword" ? "商品搜索关键词" : mode === "details" ? "商品详情 URL" : mode === "listing" ? (platform === "shopify" ? "店铺 / 商品分类 URL" : "商品分类 / 列表 URL") : mode === "reviews" ? (config.supportsKeyword ? "评论关键词或商品 URL" : "商品评论 URL") : "店铺 / 卖家主页 URL"}
            placeholder={mode === "keyword" ? "例如：wireless earbuds\n每行一个关键词，可输入多个关键词" : mode === "details" ? "https://www.amazon.com/dp/...\n每行一个商品 URL" : mode === "listing" ? "https://www.example.com/category/...\n每行一个分类或列表 URL" : mode === "reviews" ? "输入评论关键词，或每行一个商品 URL" : "https://www.ebay.com/usr/...\n每行一个卖家或店铺 URL"}
            value={inputText} onChange={event => setInputText(event.target.value)} rows={4} />
          <small>{inputList.length} 个输入 · {mode === "keyword" ? "每个关键词独立搜索" : "每行一个 URL / 关键词"}</small>
        </div>
        <div className="ec-field">
          <NumberInput id="ec-max-results" label="最多返回结果" min={1} max={500} value={limit} onChange={(_event, { value }) => setLimit(Number(value) || 50)} />
          <small>限制本次任务的结果数量。</small>
        </div>
        {mode === "reviews" && <div className="ec-field">
          <Dropdown id="ec-review-sort" titleText="评论排序" label="选择排序" items={[
            { id: "Most recent", text: "最新" }, { id: "Most relevant", text: "最相关" },
            { id: "Most helpful", text: "最有帮助" }, { id: "Highest rated", text: "最高评分" },
            { id: "Lowest rated", text: "最低评分" },
          ]} itemToString={(item: Option | null) => item?.text || ""} selectedItem={[
            { id: "Most recent", text: "最新" }, { id: "Most relevant", text: "最相关" },
            { id: "Most helpful", text: "最有帮助" }, { id: "Highest rated", text: "最高评分" },
            { id: "Lowest rated", text: "最低评分" },
          ].find(item => item.id === reviewSort)} onChange={({ selectedItem }) => setReviewSort(selectedItem?.id || "Most recent")} />
        </div>}
        <div className="ec-options">
          <Checkbox id="ec-additional" labelText="包含扩展商品字段" checked={includeAdditional} onChange={(_event, { checked }) => setIncludeAdditional(checked)} />
          <Checkbox id="ec-deduplicate" labelText="自动去重商品" checked={deduplicate} onChange={(_event, { checked }) => setDeduplicate(checked)} />
        </div>
      </div>
      {platform === "shopify" && <InlineNotification kind="info" lowContrast title="Shopify 独立站采集" subtitle="请提供可公开访问的 Shopify 店铺、商品详情或分类列表 URL。关键词检索需要先指定独立站目标，不会伪装成 Shopify 全站搜索。" hideCloseButton />}
      <div className="fb-submit-row">
        <span>使用设置中心已验证的 Apify Token；Actor 费用按 Apify 当前计费规则产生，启动前请确认账户额度。</span>
        <Button onClick={run} disabled={loading || !inputList.length}>{loading ? "正在采集…" : "开始 " + config.name + " 发现"}</Button>
      </div>
      {error && <InlineNotification kind="error" title="采集未完成" subtitle={error} onCloseButtonClick={() => setError("")} />}
      {notice && <InlineNotification kind="success" title="任务状态" subtitle={notice} onCloseButtonClick={() => setNotice("")} />}
    </section>}
    <>
    <section className="ec-logs-section">
      <div className="fb-section-head"><div><span className="eyebrow">02 / LIVE ACTIVITY</span><h3>任务日志</h3><p>显示任务提交、Actor 状态与 Dataset 读取阶段。</p></div>
        <div className="ec-log-actions"><Tag type={loading ? "blue" : "gray"}>{loading ? "执行中" : taskStatus ? statusLabel(taskStatus) : "空闲"}</Tag><Button kind="ghost" size="sm" onClick={() => setLogs([])}>清空日志</Button></div>
      </div>
      <div className="fb-log-console" aria-live="polite">{logs.length ? logs.map(log => <div className={"fb-log-line " + log.level} key={log.id}><time>{log.time}</time><span className="fb-log-dot" /><span>{log.message}</span></div>) : <div className="fb-log-placeholder">等待任务事件。启动发现后，日志将在此处追加。</div>}</div>
      {actorMeta && <div className="ec-actor-meta"><strong>采集执行信息</strong><span>Actor：{String(actorMeta.actor_id || "apify/e-commerce-scraping-tool")}</span><span>Run：{String(actorMeta.run_id || "—")}</span><span>Dataset：{String(actorMeta.dataset_id || "—")}</span></div>}
    </section>

    <section className="ec-results-section">
      <div className="fb-section-head"><div><span className="eyebrow">03 / DISCOVERY RESULTS</span><h3>电商情报结果</h3><p>仅展示 Actor 实际返回的字段；平台未公开的销量等指标不会被推算成真实数据。</p></div><strong className="fb-result-count">{rows.length.toLocaleString()} 条</strong></div>
      <Tabs selectedIndex={Math.max(0, tabs.findIndex(item => item.id === activeTab))} onChange={({ selectedIndex }) => setActiveTab(tabs[selectedIndex]?.id || "overview")}>
        <TabList aria-label={config.name + " 电商情报维度"}>{tabs.map(item => { const Icon = item.icon; return <Tab key={item.id}><span className="fb-tab-label"><Icon size={16} />{item.label}{item.id !== "overview" && item.id !== "raw" && item.id !== "history" ? <span className="fb-tab-count">{item.id === "reviews" ? (mode === "reviews" ? rows.length : 0) : item.id === "sellers" ? (mode === "sellers" ? rows.length : 0) : item.id === "bestsellers" ? rows.filter(hasPublicRank).length : rows.length}</span> : null}</span></Tab>; })}</TabList>
        <TabPanels>
          <TabPanel><div className="ec-kpis">
            <div><span>结果总量</span><strong>{rows.length.toLocaleString()}</strong></div>
            <div><span>当前发现模式</span><strong>{currentMode.label}</strong></div>
            <div><span>目标站点</span><strong>{domain || "独立站 URL"}</strong></div>
            <div><span>任务状态</span><strong>{taskStatus ? statusLabel(taskStatus) : "待启动"}</strong></div>
          </div>
            {rows.length ? <ResultTable rows={rows.slice(0, 20)} type={mode === "reviews" ? "reviews" : mode === "sellers" ? "sellers" : "products"} /> : <EmptyState title="等待电商情报数据" description="在上方选择发现对象并配置关键词或 URL，启动采集后将在这里展示实际返回的商品、价格和市场信息。" />}
          </TabPanel>
          <TabPanel><div className="ec-table-tools"><TextInput id="ec-product-filter" labelText="筛选商品结果" placeholder="搜索商品名称、品牌或字段…" value={filter} onChange={event => setFilter(event.target.value)} /></div><ResultTable rows={tabRows} type="products" /></TabPanel>
          <TabPanel>{tabRows.length ? <ResultTable rows={tabRows} type="bestsellers" /> : <EmptyState title="暂无可验证的榜单排名" description="只有 Actor 返回真实公开排名字段时才会生成榜单；不会用评论数或推测销量冒充热销排名。" />}</TabPanel>
          <TabPanel><div className="ec-table-tools"><TextInput id="ec-price-filter" labelText="筛选价格与供给" placeholder="搜索价格、币种、库存或卖家…" value={filter} onChange={event => setFilter(event.target.value)} /></div><ResultTable rows={tabRows} type="pricing" /></TabPanel>
          <TabPanel><ResultTable rows={tabRows} type="reviews" /></TabPanel>
          <TabPanel><ResultTable rows={tabRows} type="sellers" /></TabPanel>
          <TabPanel><div className="ec-raw-actions"><Button kind="secondary" renderIcon={Download} disabled={!rows.length} onClick={() => exportJson(rows, platform)}>导出完整 JSON</Button></div>{rows.length ? <pre className="ec-raw-json">{JSON.stringify(rows, null, 2)}</pre> : <EmptyState title="暂无原始数据" description="执行采集后，可在这里查看 Actor 返回的全部 JSON 字段。" />}</TabPanel>
          <TabPanel>{historyLoading ? <div className="fb-history-empty">正在读取历史任务…</div> : !history.length ? <div className="fb-history-empty">暂无历史发现记录</div> : <div className="fb-history-list">{history.map(item => <button type="button" key={item.id} className={selectedHistory === item.id ? "fb-history-row selected" : "fb-history-row"} onClick={() => void openHistory(item)}><span><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span><span><Tag type={item.status === "succeeded" ? "green" : item.status === "failed" ? "red" : "warm-gray"}>{statusLabel(item.status)}</Tag><small>{item.result_count || 0} 条</small></span></button>)}</div>}</TabPanel>
        </TabPanels>
      </Tabs>
      {activeTab !== "history" && <div className="ec-history-refresh"><Button kind="ghost" size="sm" onClick={() => void loadHistory()}>刷新历史记录</Button></div>}
    </section>
    </>
  </IntelligencePageTemplate>;
}

function ResultTable({ rows, type }: { rows: RowData[]; type: string }) {
  const headers = columns[type] || columns.products;
  if (!rows.length) return <EmptyState title="暂无此类结果" description="当前任务没有返回该类型记录。可切换发现对象并执行采集。" />;
  return <TableContainer className="fb-carbon-table" title="电商发现结果">
    <Table size="lg" useZebraStyles><TableHead><TableRow>{headers.map(header => <TableHeader key={header.key}>{header.label}</TableHeader>)}</TableRow></TableHead>
      <TableBody>{rows.map((row, index) => <TableRow key={String(row.id || row.asin || row.url || index) + "-" + index}>{headers.map(header => {
        const value = getValue(row, header.key);
        const isLink = header.key === "url" && typeof value === "string" && /^https?:\/\//i.test(value);
        return <TableCell key={header.key}>{isLink ? <a className="fb-table-link" href={value as string} target="_blank" rel="noreferrer">{show(value)}</a> : <span title={show(value)}>{show(value)}</span>}</TableCell>;
      })}</TableRow>)}</TableBody>
    </Table>
  </TableContainer>;
}
