import { useState } from "react";
import { Button, InlineNotification, NumberInput, Select, SelectItem, TextInput } from "@carbon/react";
import { Globe, Search } from "@carbon/icons-react";
import { EmptyState, IntelligencePageTemplate, PageSection } from "../design-system";

export default function SeoAnalysis() {
  const [url, setUrl] = useState("");
  const [market, setMarket] = useState("US");
  const [maxPages, setMaxPages] = useState(500);
  const [pageSpeedLimit, setPageSpeedLimit] = useState(10);

  const sourceConfiguration = (
    <section aria-label="网站分析源配置">
      <div>
        <TextInput
          id="seo-site-url"
          labelText="独立站网址"
          placeholder="https://www.example.com"
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          helperText="输入可公开访问的网站首页网址。"
        />
      </div>
      <div>
        <Select id="seo-target-market" labelText="目标市场" value={market} onChange={(event) => setMarket(event.currentTarget.value)}>
          <SelectItem value="US" text="美国" />
          <SelectItem value="GB" text="英国" />
          <SelectItem value="DE" text="德国" />
          <SelectItem value="JP" text="日本" />
          <SelectItem value="GLOBAL" text="全球" />
        </Select>
        <NumberInput
          id="seo-max-pages"
          label="最大爬取页面数"
          min={1}
          max={500}
          value={maxPages}
          onChange={(_event, state) => setMaxPages(Number(state.value) || 500)}
        />
        <NumberInput
          id="seo-pagespeed-limit"
          label="PageSpeed 检测页面数"
          min={1}
          max={10}
          value={pageSpeedLimit}
          onChange={(_event, state) => setPageSpeedLimit(Number(state.value) || 10)}
        />
      </div>
      <InlineNotification
        kind="info"
        lowContrast
        title="分析服务接入准备中"
        subtitle="当前已建立页面入口与分析配置框架。DataForSEO、PageSpeed 连接和异步诊断任务接入后，将开放正式分析。"
        hideCloseButton
      />
      <Button kind="primary" renderIcon={Search} disabled={!/^https?:\/\//i.test(url.trim())}>
        分析服务接入后开放
      </Button>
    </section>
  );

  return (
    <IntelligencePageTemplate
      title="独立站Seo分析"
      description="输入独立站网址，检查技术 SEO、页面内容与网站性能，并生成 AI 优化建议。"
      eyebrow="WEBSITE SEO INTELLIGENCE"
      sourceConfiguration={sourceConfiguration}
    >
      <PageSection
        title="SEO 诊断工作区"
        description="完成网站分析后，在此查看综合健康度、技术问题、页面性能和 AI 优化建议。"
      >
        <EmptyState
          title="等待提交网站进行诊断"
          description="目前为页面与配置框架阶段，尚未连接 DataForSEO 和 Google PageSpeed Insights；不会展示模拟评分或虚构检测结果。"
        />
      </PageSection>
    </IntelligencePageTemplate>
  );
}
