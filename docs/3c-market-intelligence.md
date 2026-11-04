# 3C 全球市场情报平台 — P0 基线

## 定位
面向全球 3C 自有品牌企业，覆盖消费电子、电脑及手机周边、智能硬件、智能家居、游戏设备及配件、网络通信、音频设备及其他 3C 品类。

## P0 闭环
1. 数据源管理：API 凭证、Apify Actors、连接状态、国家/语言/品类配置。
2. 全球数据采集：调度、分页、限流、重试、原始响应归档。
3. 商品知识库：品牌、产品家族、型号、SKU、跨平台同款关联。
4. 情报分析：热销、增长、搜索动能、社交传播、消费者痛点、竞品变化。
5. 情报工作台：全球热销榜、增长榜、趋势雷达、消费者洞察和机会报告。

## 数据源
电商、Google Trends、YouTube、TikTok、Instagram、Pinterest、X、Reddit、Quora、产品论坛、电商评论、品牌新品、专利、认证法规和供应链信号。平台访问遵循授权、API 条款、速率限制和适用法律；不可得的数据必须明确标注。

## 证据可信度
每条证据保留来源 URL、采集时间、市场、币种、语言、获取方式、原始响应引用和处理版本。明确区分 observed（来源直接提供）、estimated（第三方或模型估算）、inferred（AI 推断）。不得将排名或估算销量包装成真实销量。

## 指标
Global Popularity、Sales Momentum、Search Momentum、Social Momentum、Consumer Satisfaction、Competition Index、Opportunity Score、Evidence Confidence。热度不等于商业机会，所有评分必须能追溯到输入证据和计算版本。

## 核心实体
DataSource、CollectionRun、RawEvidence、Brand、ProductFamily、ProductModel、ProductSKU、ProductIdentityLink、MarketplaceListing、PriceObservation、RankingObservation、Review、SocialMention、SearchTrend、ConsumerNeed、CompetitorEvent、MarketSignal、OpportunityAssessment。

## 阶段边界
先建设数据源连接与采集框架、统一证据模型、商品身份主数据和可追溯情报呈现。暂不建设完整 ERP、生产或供应链业务流程。
