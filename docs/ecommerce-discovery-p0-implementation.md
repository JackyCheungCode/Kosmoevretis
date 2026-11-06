# 电商平台发现 P0 实施说明

## 页面与导航

- 全局入口：平台数据采集 → 电商平台发现。
- 默认路由：`/ecommerce-discovery/amazon`。
- 独立路由：Amazon、Walmart、eBay、AliExpress、Temu、Etsy、Shopify、Mercado Libre、Rakuten。
- 页面工作区复用社媒发现工作区的桌面平台导航、移动端「其他平台发现」垂直菜单和响应式内容布局。
- 发现对象卡片、标题层级、配置面板、结果 Tab、任务日志、历史任务和 Carbon 数据表直接复用 Facebook 发现页的视觉样式与设计令牌。

## 首期 Actor

- Actor：`apify/e-commerce-scraping-tool`（Apify 官方维护）。
- Actor API Token 只从 `platform_provider_connections` 的已验证 Apify 连接中读取，并在 Edge Function 服务端解密。
- 不在浏览器保存或传递 Apify Token。
- 不自动运行 Actor；用户点击「开始发现」后才会产生 Apify Run 和对应费用。

## 输入映射

| 页面模式 | Actor 输入 |
| --- | --- |
| 关键词发现 | `keyword`、`marketplaces`、`maxProductResults` |
| 商品详情 | `detailsUrls`、`maxProductResults` |
| 分类 / 列表 | `listingUrls`、`maxProductResults` |
| 消费者评论 | `keywordReviews` / `reviewDetailsUrls`、`maxReviewResults`、`sortReview` |
| 品牌 / 卖家 | `sellerUrls`、`maxSellerResults` |

- 首期站内关键词搜索仅在已确认支持的 Amazon、Walmart、eBay、Mercado Libre 页面开放。
- AliExpress、Temu、Etsy、Shopify、Rakuten 首期通过公开商品详情或分类列表 URL 采集；评论模式要求商品 URL。
- Shopify 使用独立站 URL，不伪装成 Shopify 全站关键词搜索。
- 各站点实际可采集字段受目标站点公开页面、Actor 支持情况和地区限制影响。

## 任务与数据

- Edge Function：`ecommerce-discovery`。
- 任务表：复用 `market_trend_tasks`，任务类型 `ecommerce_discovery`，平台标识保存在 `input_snapshot.platform`。
- 支持 `collect`、`poll_task`、`list_history`、`get_history`。
- Actor 运行采用异步启动与状态轮询；成功后读取 Dataset 并保存完整原始 JSON。
- UI 表格通过字段别名读取常见商品字段，原始 JSON 不做破坏性标准化。
- 热销榜仅在原始数据包含公开排名字段时显示；评论数、评分或推测销量不会替代真实排名或真实销量。

## 尚待部署与验收

- 前端与 Edge Function 源码已提交至 `3c-platform`。
- Edge Function 尚未部署；页面目前不能在生产环境启动实际采集任务。
- 尚未执行付费 Actor 测试，须在用户确认测试额度后逐个平台验证。
- 尚未完成浏览器视觉 QA、移动端实机 QA、TypeScript 构建和真实 Dataset 字段验收。
- Actor 配置目录 CRUD 当前仍是设置中心的占位实现；本阶段先使用经选型的固定 Actor ID，后续再接入 `platform_actor_registry`。
