import { useMemo, useState } from "react";
import { Button, Checkbox, ClickableTile, Dropdown, Search, Tag } from "@carbon/react";
import { ArrowRight, Filter, Search as SearchIcon } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../design-system/components";
import "./platform-data-collection-directory.css";

type ChannelType = "ecommerce" | "social";
type Channel = { id: string; name: string; type: ChannelType; description: string; route: string; icon: string; color: string };

const channels: Channel[] = [
  { id: "amazon", name: "Amazon", type: "ecommerce", description: "商品、热销榜、价格、评论与卖家发现", route: "/ecommerce-discovery/amazon", icon: "amazon", color: "FF9900" },
  { id: "walmart", name: "Walmart", type: "ecommerce", description: "商品、价格、评分、评论与供给信息", route: "/ecommerce-discovery/walmart", icon: "walmart", color: "0071CE" },
  { id: "ebay", name: "eBay", type: "ecommerce", description: "商品刊登、价格、卖家与消费者反馈", route: "/ecommerce-discovery/ebay", icon: "ebay", color: "3665F3" },
  { id: "aliexpress", name: "AliExpress", type: "ecommerce", description: "跨境商品、价格、店铺与公开评论", route: "/ecommerce-discovery/aliexpress", icon: "aliexpress", color: "FF4747" },
  { id: "temu", name: "Temu", type: "ecommerce", description: "商品信息、价格与市场供给信号", route: "/ecommerce-discovery/temu", icon: "temu", color: "FB7701" },
  { id: "etsy", name: "Etsy", type: "ecommerce", description: "创意商品、手工制品、卖家与价格分布", route: "/ecommerce-discovery/etsy", icon: "etsy", color: "F1641E" },
  { id: "shopify", name: "Shopify", type: "ecommerce", description: "通过公开店铺及商品页面发现独立站商品", route: "/ecommerce-discovery/shopify", icon: "shopify", color: "7AB55C" },
  { id: "mercado-libre", name: "Mercado Libre", type: "ecommerce", description: "拉美市场商品、价格、卖家与评价", route: "/ecommerce-discovery/mercado-libre", icon: "mercadolibre", color: "2D3277" },
  { id: "rakuten", name: "Rakuten", type: "ecommerce", description: "日本及其他地区乐天市场商品与店铺", route: "/ecommerce-discovery/rakuten", icon: "rakuten", color: "BF0000" },
  { id: "facebook", name: "Facebook", type: "social", description: "公开主页、帖子与社交客户发现", route: "/social-discovery/facebook", icon: "facebook", color: "0866FF" },
  { id: "instagram", name: "Instagram", type: "social", description: "公开账号、内容与创作者发现", route: "/social-discovery/instagram", icon: "instagram", color: "E4405F" },
  { id: "linkedin", name: "LinkedIn", type: "social", description: "企业、专业人士与商业关系发现", route: "/social-discovery/linkedin", icon: "linkedin", color: "0A66C2" },
  { id: "google-maps", name: "Google Maps", type: "social", description: "地点、企业档案与本地商家发现", route: "/social-discovery/google-maps", icon: "googlemaps", color: "4285F4" },
  { id: "x", name: "X", type: "social", description: "公开动态、账号、社区与趋势发现", route: "/social-discovery/x", icon: "x", color: "000000" },
  { id: "reddit", name: "Reddit", type: "social", description: "社区、帖子、评论与用户公开活动", route: "/social-discovery/reddit", icon: "reddit", color: "FF4500" },
  { id: "pinterest", name: "Pinterest", type: "social", description: "灵感搜索、Pin、创作者与 Board 发现", route: "/social-discovery/pinterest", icon: "pinterest", color: "BD081C" },
  { id: "tiktok", name: "TikTok", type: "social", description: "短视频、创作者、话题与评论发现", route: "/social-discovery/tiktok", icon: "tiktok", color: "000000" },
  { id: "youtube", name: "YouTube", type: "social", description: "视频、频道、评论、字幕与趋势发现", route: "/social-discovery/youtube", icon: "youtube", color: "FF0000" },
];

const sortOptions = [
  { id: "name-asc", text: "名称：A 到 Z" },
  { id: "name-desc", text: "名称：Z 到 A" },
];

export default function PlatformDataCollectionDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<ChannelType[]>([]);
  const [sort, setSort] = useState("name-asc");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const visibleChannels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const result = channels.filter((channel) => {
      const matchesType = types.length === 0 || types.includes(channel.type);
      const matchesSearch = !normalized || [channel.name, channel.description, channel.type === "ecommerce" ? "电商 电商发现" : "社交 社媒 社交发现"]
        .join(" ").toLocaleLowerCase().includes(normalized);
      return matchesType && matchesSearch;
    });
    return result.sort((a, b) => sort === "name-desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
  }, [query, types, sort]);

  const toggleType = (type: ChannelType, checked: boolean) => {
    setTypes((current) => checked ? [...current, type] : current.filter((item) => item !== type));
  };

  return (
    <div className="pdc-directory">
      <PageHeader
        title="平台数据采集"
        description="浏览并进入全球电商与社交平台的采集工作区，发现产品、市场趋势与潜在客户。"
      />

      <div className="pdc-directory__toolbar">
        <Search
          size="lg"
          labelText="搜索采集渠道"
          placeholder="搜索平台名称或数据类型"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
        />
        <Button kind="ghost" renderIcon={Filter} hasIconOnly iconDescription={filtersOpen ? "收起筛选" : "展开筛选"} onClick={() => setFiltersOpen((open) => !open)} />
      </div>

      <div className="pdc-directory__layout">
        {filtersOpen && (
          <aside className="pdc-directory__filters" aria-label="筛选方式">
            <div className="pdc-directory__filter-heading">
              <h2>筛选方式</h2>
              <Button kind="ghost" size="sm" onClick={() => { setTypes([]); setQuery(""); }}>清除全部</Button>
            </div>
            <section className="pdc-directory__filter-group">
              <h3>采集类型</h3>
              <Checkbox id="pdc-filter-ecommerce" labelText="电商发现" checked={types.includes("ecommerce")} onChange={(_event, data) => toggleType("ecommerce", data.checked)} />
              <Checkbox id="pdc-filter-social" labelText="社交发现" checked={types.includes("social")} onChange={(_event, data) => toggleType("social", data.checked)} />
            </section>
          </aside>
        )}

        <section className="pdc-directory__results" aria-label="采集渠道列表">
          <div className="pdc-directory__results-top">
            <div>
              <h2>全部采集渠道</h2>
              <p>找到 <strong>{visibleChannels.length}</strong> 个渠道</p>
            </div>
            <Dropdown
              id="pdc-directory-sort"
              titleText="排序方式"
              label="名称：A 到 Z"
              items={sortOptions}
              itemToString={(item) => item?.text || ""}
              selectedItem={sortOptions.find((item) => item.id === sort) || sortOptions[0]}
              onChange={({ selectedItem }) => selectedItem && setSort(selectedItem.id)}
              size="md"
            />
          </div>

          {(query || types.length > 0) && (
            <div className="pdc-directory__active-filters">
              {types.map((type) => <Tag key={type} type="blue" filter onClose={() => toggleType(type, false)}>{type === "ecommerce" ? "电商发现" : "社交发现"}</Tag>)}
              {query && <Tag type="cool-gray" filter onClose={() => setQuery("")}>搜索：{query}</Tag>}
            </div>
          )}

          {visibleChannels.length > 0 ? (
            <div className="pdc-directory__grid">
              {visibleChannels.map((channel) => (
                <ClickableTile key={channel.id} className="pdc-directory-card" onClick={() => navigate(channel.route)}>
                  <div className="pdc-directory-card__top">
                    <img src={"https://cdn.simpleicons.org/" + channel.icon + "/" + channel.color} alt="" loading="lazy" />
                  </div>
                  <h3>{channel.name}</h3>
                  <p>{channel.description}</p>
                  <span className="pdc-directory-card__action" aria-hidden="true"><ArrowRight size={20} /></span>
                </ClickableTile>
              ))}
            </div>
          ) : (
            <div className="pdc-directory__empty">
              <SearchIcon size={24} />
              <h3>没有找到匹配的采集渠道</h3>
              <p>请调整搜索词或筛选条件。</p>
              <Button kind="tertiary" onClick={() => { setQuery(""); setTypes([]); }}>清除搜索和筛选</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
