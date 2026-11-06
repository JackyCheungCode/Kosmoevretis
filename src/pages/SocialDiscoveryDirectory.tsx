import { ClickableTile, Search, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../design-system/components";
import "./social-discovery-directory.css";

type Platform = { id: string; name: string; description: string; route: string; icon: string; color: string; category: string };
const platforms: Platform[] = [
  { id: "facebook", name: "Facebook", description: "公开主页、帖子、视频、地点、活动与社群发现", route: "/social-discovery/facebook", icon: "facebook", color: "0866FF", category: "社交网络" },
  { id: "instagram", name: "Instagram", description: "公开账号、内容、创作者与品牌影响力发现", route: "/social-discovery/instagram", icon: "instagram", color: "E4405F", category: "视觉内容" },
  { id: "linkedin", name: "LinkedIn", description: "企业、专业人士、职位与商业关系发现", route: "/social-discovery/linkedin", icon: "linkedin", color: "0A66C2", category: "商业网络" },
  { id: "x", name: "X", description: "公开动态、账号、社区讨论与实时趋势发现", route: "/social-discovery/x", icon: "x", color: "000000", category: "社交网络" },
  { id: "reddit", name: "Reddit", description: "社区、帖子、评论与用户公开活动洞察", route: "/social-discovery/reddit", icon: "reddit", color: "FF4500", category: "社区讨论" },
  { id: "tiktok", name: "TikTok", description: "短视频、创作者、话题、评论与声音趋势", route: "/social-discovery/tiktok", icon: "tiktok", color: "000000", category: "短视频" },
  { id: "youtube", name: "YouTube", description: "视频、频道、Shorts、评论与字幕内容发现", route: "/social-discovery/youtube", icon: "youtube", color: "FF0000", category: "视频内容" },
  { id: "pinterest", name: "Pinterest", description: "灵感搜索、Pin、创作者与视觉趋势发现", route: "/social-discovery/pinterest", icon: "pinterest", color: "BD081C", category: "视觉内容" },
  { id: "google-maps", name: "Google Maps", description: "全球地点、企业档案与本地商家发现", route: "/social-discovery/google-maps", icon: "googlemaps", color: "4285F4", category: "本地商业" },
];

export default function SocialDiscoveryDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return platforms.filter((p) => !q || [p.name, p.description, p.category].join(" ").toLocaleLowerCase().includes(q));
  }, [query]);

  return (
    <main className="social-discovery-directory">
      <PageHeader title="社交平台发现" description="统一浏览全球社交与内容平台，按渠道进入独立发现工作区，探索潜在客户、品牌、创作者、社区与市场需求信号。" />
      <section className="sdd-overview" aria-label="社交平台发现概览">
        <div><span className="sdd-eyebrow">SOCIAL INTELLIGENCE</span><h2>全球社交渠道</h2><p>从公开社交内容中发现市场信号与潜在商业机会。</p></div>
        <Tag type="blue">{platforms.length} 个平台</Tag>
      </section>
      <div className="sdd-search">
        <Search size="lg" labelText="搜索社交平台" placeholder="搜索平台、渠道或发现能力" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
      </div>
      {visible.length ? <div className="sdd-grid">
        {visible.map((platform) => (
          <ClickableTile key={platform.id} className="sdd-card" onClick={() => navigate(platform.route)}>
            <div className="sdd-card__top">
              <img src={"https://cdn.simpleicons.org/" + platform.icon + "/" + platform.color} alt="" loading="lazy" />
              <Tag type="cool-gray">{platform.category}</Tag>
            </div>
            <h3>{platform.name}</h3>
            <p>{platform.description}</p>
            <span className="sdd-card__action">进入发现工作区 <ArrowRight size={16} /></span>
          </ClickableTile>
        ))}
      </div> : <div className="sdd-empty">没有找到匹配的平台，请尝试其他关键词。</div>}
    <p className="sdd-footnote">平台可用的数据类型与采集范围取决于平台公开数据政策、授权状态及已配置的数据服务。</p>
    </main>
  );
}
