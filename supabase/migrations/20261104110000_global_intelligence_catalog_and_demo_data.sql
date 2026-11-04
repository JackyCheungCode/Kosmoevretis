
create table if not exists public.intelligence_data_sources (
 id uuid primary key default gen_random_uuid(), slug text not null unique, channel text not null, name text not null,
 logo_url text not null, website_url text not null, description text not null, market_codes text[] not null default '{}',
 languages text[] not null default '{}', status text not null check(status in ('ready','needs_auth','limited','planned','error')),
 sort_order integer not null default 0, is_active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.intelligence_source_connectors (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.intelligence_data_sources(id) on delete cascade,
 name text not null, connector_type text not null check(connector_type in ('official_api','apify_actor','third_party','public_web')),
 provider text not null, actor_id text, status text not null check(status in ('ready','needs_auth','limited','planned','error')),
 auth_required boolean not null default true, capabilities text[] not null default '{}', notes text not null default '',
 input_schema jsonb not null default '{}'::jsonb, output_fields text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source_id,name)
);
create table if not exists public.intelligence_source_capabilities (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.intelligence_data_sources(id) on delete cascade,
 capability_key text not null, label text not null, description text not null, evidence_type text not null check(evidence_type in ('observed','estimated','inferred')),
 availability_status text not null check(availability_status in ('ready','needs_auth','limited','planned','error')),
 metric_keys text[] not null default '{}', created_at timestamptz not null default now(), unique(source_id,capability_key)
);
create table if not exists public.intelligence_demo_datasets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 slug text not null, name text not null, product_label text not null, is_demo boolean not null default true,
 dataset jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,slug)
);
create index if not exists intelligence_source_connectors_source_idx on public.intelligence_source_connectors(source_id,status);
create index if not exists intelligence_source_capabilities_source_idx on public.intelligence_source_capabilities(source_id,availability_status);
create index if not exists intelligence_demo_datasets_org_idx on public.intelligence_demo_datasets(organization_id,slug);
alter table public.intelligence_data_sources enable row level security;
alter table public.intelligence_source_connectors enable row level security;
alter table public.intelligence_source_capabilities enable row level security;
alter table public.intelligence_demo_datasets enable row level security;
drop policy if exists intelligence_sources_authenticated_read on public.intelligence_data_sources;
create policy intelligence_sources_authenticated_read on public.intelligence_data_sources for select to authenticated using (true);
drop policy if exists intelligence_connectors_authenticated_read on public.intelligence_source_connectors;
create policy intelligence_connectors_authenticated_read on public.intelligence_source_connectors for select to authenticated using (true);
drop policy if exists intelligence_capabilities_authenticated_read on public.intelligence_source_capabilities;
create policy intelligence_capabilities_authenticated_read on public.intelligence_source_capabilities for select to authenticated using (true);
drop policy if exists intelligence_demo_members_select on public.intelligence_demo_datasets;
create policy intelligence_demo_members_select on public.intelligence_demo_datasets for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists intelligence_demo_members_insert on public.intelligence_demo_datasets;
create policy intelligence_demo_members_insert on public.intelligence_demo_datasets for insert to authenticated with check (private.is_org_member(organization_id));
drop policy if exists intelligence_demo_members_update on public.intelligence_demo_datasets;
create policy intelligence_demo_members_update on public.intelligence_demo_datasets for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
grant select on public.intelligence_data_sources,public.intelligence_source_connectors,public.intelligence_source_capabilities to authenticated;
grant select,insert,update on public.intelligence_demo_datasets to authenticated;
insert into public.intelligence_data_sources(slug,channel,name,logo_url,website_url,description,market_codes,languages,status,sort_order,is_active)
values ('amazon','电商平台','Amazon','https://cdn.simpleicons.org/amazon','https://www.amazon.com','全球综合电商，商品、价格、榜单、评论与卖家信号。','US,CA,GB,DE,FR,IT,ES,JP,AU,IN'::text[],'en,ja,de,fr,es'::text[],'needs_auth',1,true),
('ebay','电商平台','eBay','https://cdn.simpleicons.org/ebay','https://www.ebay.com','商品列表、价格与受权限约束的成交历史。','US,GB,DE,AU,CA'::text[],'en,de'::text[],'limited',2,true),
('aliexpress','电商平台','AliExpress','https://cdn.simpleicons.org/aliexpress','https://www.aliexpress.com','跨境商品、价格、店铺与商品评价信号。','US,GB,DE,FR,ES,JP'::text[],'en,es,fr,de'::text[],'planned',3,true),
('walmart','电商平台','Walmart','https://cdn.simpleicons.org/walmart','https://www.walmart.com','美国零售商品、价格、评分与排名信号。','US'::text[],'en'::text[],'planned',4,true),
('shopee','电商平台','Shopee','https://cdn.simpleicons.org/shopee','https://shopee.com','东南亚及部分区域电商商品与价格信号。','SG,MY,TH,VN,ID,PH,TW,BR'::text[],'en,th,vi,id,ms,zh'::text[],'planned',5,true),
('lazada','电商平台','Lazada','https://cdn.simpleicons.org/lazada','https://www.lazada.com','东南亚电商商品、价格、评论和店铺信号。','SG,MY,TH,VN,ID,PH'::text[],'en,th,vi,id,ms'::text[],'planned',6,true),
('google-trends','搜索引擎','Google Trends','https://cdn.simpleicons.org/google','https://trends.google.com','关键词相对搜索兴趣、地区热度、相关查询与季节性。','GLOBAL,US,JP,DE,GB,FR,CA,AU'::text[],'en,ja,de,fr'::text[],'needs_auth',1,true),
('google-search','搜索引擎','Google Search','https://cdn.simpleicons.org/google','https://www.google.com','SERP、竞品域名、商品页面与内容线索。','GLOBAL'::text[],'en,ja,de,fr,es,zh'::text[],'planned',2,true),
('bing','搜索引擎','Bing','https://cdn.simpleicons.org/bing','https://www.bing.com','搜索结果与网页内容发现。','GLOBAL'::text[],'en'::text[],'planned',3,true),
('tiktok','社交媒体','TikTok','https://cdn.simpleicons.org/tiktok','https://www.tiktok.com','公开视频、话题、互动量与内容增长信号。','US,GB,DE,FR,JP,KR,SG,TH,ID'::text[],'en,ja,de,fr,ko,th,id'::text[],'planned',1,true),
('instagram','社交媒体','Instagram','https://cdn.simpleicons.org/instagram','https://www.instagram.com','公开帖子、标签、创作者与互动信号。','GLOBAL'::text[],'en,ja,de,fr,es'::text[],'planned',2,true),
('facebook','社交媒体','Facebook','https://cdn.simpleicons.org/facebook','https://www.facebook.com','公开页面、帖子与互动信号，受平台权限限制。','GLOBAL'::text[],'en'::text[],'planned',3,true),
('youtube','视频平台','YouTube','https://cdn.simpleicons.org/youtube','https://www.youtube.com','视频、频道、播放量、评论与测评内容。','GLOBAL'::text[],'en,ja,de,fr,es,zh'::text[],'needs_auth',1,true),
('reddit','社区论坛','Reddit','https://cdn.simpleicons.org/reddit','https://www.reddit.com','社区讨论、购买意图、产品痛点与口碑。','US,GB,CA,AU,DE'::text[],'en,de'::text[],'needs_auth',1,true),
('trustpilot','用户评价','Trustpilot','https://cdn.simpleicons.org/trustpilot','https://www.trustpilot.com','品牌与零售商评价、评分和口碑趋势。','GLOBAL'::text[],'en,de,fr,es'::text[],'planned',1,true),
('x','社交媒体','X','https://cdn.simpleicons.org/x','https://x.com','公开讨论、话题和传播互动信号。','GLOBAL'::text[],'en,ja'::text[],'planned',4,true)
on conflict(slug) do update set channel=excluded.channel,name=excluded.name,logo_url=excluded.logo_url,website_url=excluded.website_url,description=excluded.description,market_codes=excluded.market_codes,languages=excluded.languages,status=excluded.status,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.intelligence_source_connectors(source_id,name,connector_type,provider,actor_id,status,auth_required,capabilities,notes)
select id,'官方 API','official_api','Amazon SP-API',null,'needs_auth',true,'product_listing,price,seller,reviews'::text[],'卖家授权数据；不能据此获取全市场竞品真实销量。' from public.intelligence_data_sources where slug='amazon'
union all
select id,'公开商品采集','apify_actor','Amazon 商品页 Actor',null,'planned',true,'product_listing,price,bsr,reviews'::text[],'需在数据源管理中心选择并验证具体 Actor。' from public.intelligence_data_sources where slug='amazon'
union all
select id,'官方 API','official_api','eBay Browse API',null,'needs_auth',true,'product_listing,price'::text[],'需开发者应用凭证。' from public.intelligence_data_sources where slug='ebay'
union all
select id,'成交历史接口','official_api','Marketplace Insights API',null,'limited',true,'sold_history'::text[],'Limited Release，访问资格受限。' from public.intelligence_data_sources where slug='ebay'
union all
select id,'公开商品采集','apify_actor','AliExpress 商品采集 Actor',null,'planned',true,'product_listing,price,reviews'::text[],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='aliexpress'
union all
select id,'公开商品采集','apify_actor','Walmart 商品采集 Actor',null,'planned',true,'product_listing,price,reviews'::text[],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='walmart'
union all
select id,'公开商品采集','apify_actor','Shopee 商品采集 Actor',null,'planned',true,'product_listing,price,reviews'::text[],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='shopee'
union all
select id,'公开商品采集','apify_actor','Lazada 商品采集 Actor',null,'planned',true,'product_listing,price,reviews'::text[],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='lazada'
union all
select id,'Apify Actor','apify_actor','surefetch/google-trends','surefetch/google-trends','needs_auth',true,'search_interest,geo_interest,related_queries,seasonality'::text[],'已规划复用该 Actor；仍需配置 Apify Token 并验证输入输出。' from public.intelligence_data_sources where slug='google-trends'
union all
select id,'Apify SERP Actor','apify_actor','Google Search Results Actor',null,'planned',true,'serp,competitor_domains,shopping_results'::text[],'具体 Actor ID 与字段映射待配置。' from public.intelligence_data_sources where slug='google-search'
union all
select id,'公开搜索采集','apify_actor','Bing Search Actor',null,'planned',true,'serp'::text[],'具体 Actor ID 待配置。' from public.intelligence_data_sources where slug='bing'
union all
select id,'公开内容采集','apify_actor','TikTok 内容 Actor',null,'planned',true,'video_count,views,engagement,hashtags,comments'::text[],'遵守平台条款、地区限制与采集频率。' from public.intelligence_data_sources where slug='tiktok'
union all
select id,'公开内容采集','apify_actor','Instagram 公共内容 Actor',null,'planned',true,'posts,engagement,hashtags'::text[],'仅限允许访问的公开数据。' from public.intelligence_data_sources where slug='instagram'
union all
select id,'官方 Graph API','official_api','Meta Graph API',null,'needs_auth',true,'public_pages,posts,engagement'::text[],'需要应用审核、授权与相应权限。' from public.intelligence_data_sources where slug='facebook'
union all
select id,'官方 Data API','official_api','YouTube Data API v3',null,'needs_auth',true,'videos,views,comments,channels'::text[],'需要 Google Cloud API Key，受配额限制。' from public.intelligence_data_sources where slug='youtube'
union all
select id,'官方 API','official_api','Reddit API',null,'needs_auth',true,'discussions,comments,community_signals'::text[],'需要 OAuth 应用与遵守 Reddit API 条款。' from public.intelligence_data_sources where slug='reddit'
union all
select id,'公开评价采集','apify_actor','Trustpilot Reviews Actor',null,'planned',true,'reviews,rating,sentiment'::text[],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='trustpilot'
union all
select id,'官方 API','official_api','X API',null,'needs_auth',true,'posts,engagement,topics'::text[],'按 API 套餐与访问权限提供数据。' from public.intelligence_data_sources where slug='x'
on conflict(source_id,name) do update set connector_type=excluded.connector_type,provider=excluded.provider,actor_id=excluded.actor_id,status=excluded.status,auth_required=excluded.auth_required,capabilities=excluded.capabilities,notes=excluded.notes,updated_at=now();
insert into public.intelligence_source_capabilities(source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'product_listing','商品信息','商品标题、型号、类目与商品链接','observed','needs_auth','product_listing'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'price','价格与促销','当前价格、折扣与价格变化','observed','needs_auth','price'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'bsr','商品排名','Best Sellers Rank 等平台排名信号','observed','needs_auth','bsr'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'reviews','评论与评分','评论数量、评分与评论文本','observed','needs_auth','reviews'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'seller','卖家信息','卖家与品牌信息','observed','needs_auth','seller'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'estimated_sales','销量估算','第三方估算，不等于真实销量','estimated','needs_auth','estimated_sales'::text[] from public.intelligence_data_sources where slug='amazon'
union all
select id,'product_listing','商品信息','商品标题、类目与商品链接','observed','needs_auth','product_listing'::text[] from public.intelligence_data_sources where slug='ebay'
union all
select id,'price','价格','商品挂牌价格','observed','needs_auth','price'::text[] from public.intelligence_data_sources where slug='ebay'
union all
select id,'sold_history','成交历史','受限接口提供的历史成交记录','observed','needs_auth','sold_history'::text[] from public.intelligence_data_sources where slug='ebay'
union all
select id,'product_listing','商品信息','商品标题、型号与类目','observed','planned','product_listing'::text[] from public.intelligence_data_sources where slug='aliexpress'
union all
select id,'price','价格与促销','商品价格、折扣','observed','planned','price'::text[] from public.intelligence_data_sources where slug='aliexpress'
union all
select id,'reviews','评论与评分','评论数量、评分与评价内容','observed','planned','reviews'::text[] from public.intelligence_data_sources where slug='aliexpress'
union all
select id,'product_listing','商品信息','商品标题与类目','observed','planned','product_listing'::text[] from public.intelligence_data_sources where slug='walmart'
union all
select id,'price','价格','商品价格与促销','observed','planned','price'::text[] from public.intelligence_data_sources where slug='walmart'
union all
select id,'reviews','评论与评分','商品评分与评论','observed','planned','reviews'::text[] from public.intelligence_data_sources where slug='walmart'
union all
select id,'product_listing','商品信息','商品标题、店铺与类目','observed','planned','product_listing'::text[] from public.intelligence_data_sources where slug='shopee'
union all
select id,'price','价格','商品价格与促销','observed','planned','price'::text[] from public.intelligence_data_sources where slug='shopee'
union all
select id,'reviews','评论与评分','商品评论与评分','observed','planned','reviews'::text[] from public.intelligence_data_sources where slug='shopee'
union all
select id,'product_listing','商品信息','商品标题、店铺与类目','observed','planned','product_listing'::text[] from public.intelligence_data_sources where slug='lazada'
union all
select id,'price','价格','商品价格与促销','observed','planned','price'::text[] from public.intelligence_data_sources where slug='lazada'
union all
select id,'reviews','评论与评分','商品评论与评分','observed','planned','reviews'::text[] from public.intelligence_data_sources where slug='lazada'
union all
select id,'search_interest','搜索兴趣','关键词相对搜索热度指数','observed','needs_auth','search_interest'::text[] from public.intelligence_data_sources where slug='google-trends'
union all
select id,'geo_interest','地区热度','不同国家地区的相对兴趣','observed','needs_auth','geo_interest'::text[] from public.intelligence_data_sources where slug='google-trends'
union all
select id,'related_queries','相关查询','上升查询与相关关键词','observed','needs_auth','related_queries'::text[] from public.intelligence_data_sources where slug='google-trends'
union all
select id,'seasonality','季节性','周期性需求与季节变化','inferred','needs_auth','seasonality'::text[] from public.intelligence_data_sources where slug='google-trends'
union all
select id,'serp','搜索结果','自然搜索结果与页面信息','observed','planned','serp'::text[] from public.intelligence_data_sources where slug='google-search'
union all
select id,'competitor_domains','竞品网站','品牌官网与竞品域名线索','observed','planned','competitor_domains'::text[] from public.intelligence_data_sources where slug='google-search'
union all
select id,'shopping_results','购物结果','商品价格与商家信息（视地区可用性）','observed','planned','shopping_results'::text[] from public.intelligence_data_sources where slug='google-search'
union all
select id,'serp','搜索结果','网页搜索结果与内容线索','observed','planned','serp'::text[] from public.intelligence_data_sources where slug='bing'
union all
select id,'video_count','视频数量','关键词或话题相关公开视频数量','observed','planned','video_count'::text[] from public.intelligence_data_sources where slug='tiktok'
union all
select id,'views','播放量','视频播放量（如可见）','observed','planned','views'::text[] from public.intelligence_data_sources where slug='tiktok'
union all
select id,'engagement','互动表现','点赞、评论、分享等互动信号','observed','planned','engagement'::text[] from public.intelligence_data_sources where slug='tiktok'
union all
select id,'hashtags','热门话题','相关话题与标签','observed','planned','hashtags'::text[] from public.intelligence_data_sources where slug='tiktok'
union all
select id,'comments','用户评论','公开视频评论与需求表达','observed','planned','comments'::text[] from public.intelligence_data_sources where slug='tiktok'
union all
select id,'posts','公开帖子','公开帖子与标签','observed','planned','posts'::text[] from public.intelligence_data_sources where slug='instagram'
union all
select id,'engagement','互动表现','点赞与评论等互动信号','observed','planned','engagement'::text[] from public.intelligence_data_sources where slug='instagram'
union all
select id,'hashtags','热门话题','公开标签与内容主题','observed','planned','hashtags'::text[] from public.intelligence_data_sources where slug='instagram'
union all
select id,'public_pages','公开主页','公开品牌主页信息','observed','needs_auth','public_pages'::text[] from public.intelligence_data_sources where slug='facebook'
union all
select id,'posts','公开帖子','允许访问的公开帖子','observed','needs_auth','posts'::text[] from public.intelligence_data_sources where slug='facebook'
union all
select id,'engagement','互动表现','公开互动指标','observed','needs_auth','engagement'::text[] from public.intelligence_data_sources where slug='facebook'
union all
select id,'videos','视频内容','视频标题、描述与发布时间','observed','needs_auth','videos'::text[] from public.intelligence_data_sources where slug='youtube'
union all
select id,'views','播放量','视频播放量与增长信号','observed','needs_auth','views'::text[] from public.intelligence_data_sources where slug='youtube'
union all
select id,'comments','评论','公开视频评论与用户反馈','observed','needs_auth','comments'::text[] from public.intelligence_data_sources where slug='youtube'
union all
select id,'channels','频道','创作者与频道信息','observed','needs_auth','channels'::text[] from public.intelligence_data_sources where slug='youtube'
union all
select id,'discussions','社区讨论','相关 subreddit 讨论与帖子','observed','needs_auth','discussions'::text[] from public.intelligence_data_sources where slug='reddit'
union all
select id,'comments','用户评论','评论、赞同与反对信号','observed','needs_auth','comments'::text[] from public.intelligence_data_sources where slug='reddit'
union all
select id,'community_signals','需求与痛点','购买意图、未满足需求与使用痛点','inferred','needs_auth','community_signals'::text[] from public.intelligence_data_sources where slug='reddit'
union all
select id,'reviews','用户评价','品牌与零售商评论','observed','planned','reviews'::text[] from public.intelligence_data_sources where slug='trustpilot'
union all
select id,'rating','评分','评分分布与变化','observed','planned','rating'::text[] from public.intelligence_data_sources where slug='trustpilot'
union all
select id,'sentiment','情感倾向','评论情绪与主题归纳','inferred','planned','sentiment'::text[] from public.intelligence_data_sources where slug='trustpilot'
union all
select id,'posts','公开帖子','公开帖子与讨论','observed','needs_auth','posts'::text[] from public.intelligence_data_sources where slug='x'
union all
select id,'engagement','互动表现','公开互动信号','observed','needs_auth','engagement'::text[] from public.intelligence_data_sources where slug='x'
union all
select id,'topics','话题趋势','热门话题与讨论增速','observed','needs_auth','topics'::text[] from public.intelligence_data_sources where slug='x'
on conflict(source_id,capability_key) do update set label=excluded.label,description=excluded.description,evidence_type=excluded.evidence_type,availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;
insert into public.intelligence_demo_datasets(organization_id,slug,name,product_label,is_demo,dataset) values ('d6dd93fe-75ac-4c2f-90a3-53474acdef8f'::uuid,'wireless-headphones-global-demo-v1','全球无线降噪耳机市场演示数据','AI 主动降噪无线耳机',true,'{"schema_version":"1.0","demo_notice":"以下全部为演示模拟数据，用于展示图表与分析交互，不代表真实平台销量、搜索量或 API/Actor 采集结果。","product":{"name":"AI 主动降噪无线耳机","category":"音频设备","brand":"Auralink（虚构演示品牌）"},"kpis":[{"label":"跨平台商品样本","value":"2,486","delta":"+18.6%","unit":"条"},{"label":"搜索兴趣指数","value":"76.4","delta":"+12.8%","unit":"/100"},{"label":"社交互动样本","value":"184K","delta":"+24.3%","unit":"次"},{"label":"消费者评价样本","value":"12,840","delta":"+9.7%","unit":"条"}],"trend":[{"period":"06月","search":42,"social":31,"commerce":36},{"period":"07月","search":48,"social":38,"commerce":40},{"period":"08月","search":51,"social":44,"commerce":46},{"period":"09月","search":58,"social":52,"commerce":51},{"period":"10月","search":67,"social":64,"commerce":59},{"period":"11月","search":76,"social":78,"commerce":72}],"bestsellers":[{"rank":1,"name":"QuietMax Pro ANC","brand":"SoundPeak","price":129.99,"currency":"USD","score":94,"review_count":8420,"market":"US"},{"rank":2,"name":"AirSilence 5","brand":"Auralink Demo","price":99.99,"currency":"USD","score":89,"review_count":6210,"market":"JP"},{"rank":3,"name":"Studio ANC X","brand":"NovaSound","price":159,"currency":"USD","score":86,"review_count":5340,"market":"DE"},{"rank":4,"name":"TravelBuds NC","brand":"Waveform","price":79.99,"currency":"USD","score":81,"review_count":4980,"market":"GB"},{"rank":5,"name":"Hybrid Quiet 2","brand":"EchoLab","price":119,"currency":"USD","score":78,"review_count":3720,"market":"CA"}],"search_terms":[{"term":"best noise cancelling headphones","index":100,"growth":"+28%"},{"term":"hybrid ANC earbuds","index":82,"growth":"+36%"},{"term":"long battery headphones","index":71,"growth":"+19%"},{"term":"low latency wireless audio","index":58,"growth":"+42%"},{"term":"travel noise cancelling","index":54,"growth":"+17%"}],"social":[{"platform":"TikTok","engagement":82,"share":38},{"platform":"YouTube","engagement":64,"share":29},{"platform":"Instagram","engagement":42,"share":19},{"platform":"Reddit","engagement":31,"share":14}],"pain_points":[{"label":"佩戴舒适度 / 耳压","count":2860},{"label":"通话降噪效果","count":2180},{"label":"续航与充电","count":1840},{"label":"多设备切换","count":1420},{"label":"风噪控制","count":980}],"competitors":[{"name":"SoundPeak","share":28,"price":129.99},{"name":"NovaSound","share":22,"price":159},{"name":"Auralink Demo","share":18,"price":99.99},{"name":"Waveform","share":17,"price":79.99},{"name":"EchoLab","share":15,"price":119}],"categories":[{"label":"头戴式 ANC","value":42},{"label":"真无线 ANC","value":34},{"label":"运动降噪耳机","value":14},{"label":"开放式音频","value":10}],"markets":[{"code":"US","name":"美国","flag":"🇺🇸","opportunity":92,"search":86,"social":88,"price":139},{"code":"JP","name":"日本","flag":"🇯🇵","opportunity":89,"search":82,"social":76,"price":158},{"code":"DE","name":"德国","flag":"🇩🇪","opportunity":84,"search":78,"social":72,"price":146},{"code":"GB","name":"英国","flag":"🇬🇧","opportunity":81,"search":74,"social":80,"price":132},{"code":"CA","name":"加拿大","flag":"🇨🇦","opportunity":77,"search":69,"social":71,"price":135},{"code":"AU","name":"澳大利亚","flag":"🇦🇺","opportunity":74,"search":66,"social":73,"price":142},{"code":"KR","name":"韩国","flag":"🇰🇷","opportunity":72,"search":70,"social":79,"price":151},{"code":"FR","name":"法国","flag":"🇫🇷","opportunity":68,"search":63,"social":65,"price":128}],"ai_reports":{"all":"综合判断：演示样本显示，AI 主动降噪无线耳机在美国、日本和德国具备较高的需求与渠道热度信号。搜索兴趣、社交互动和电商样本同步上升，值得进一步验证中高端 ANC 细分市场。建议优先验证 99–159 美元价格带，并围绕佩戴舒适度、通话降噪和多设备切换形成差异化。注意：以上为模拟数据推演，不可作为真实市场规模或销量结论。","tabs":{"bestsellers":"热销榜专项解读：头部商品的演示热度分数集中在 78–94。高评分与评论样本量可作为商品关注度线索，但不能直接推断真实销量。建议按价格、评价主题和规格拆分头部商品，寻找尚未满足的场景。","search":"搜索趋势专项解读：混合 ANC、低延迟和长续航相关查询增长较快。可将其转化为产品卖点与长尾词测试，但搜索指数是相对兴趣信号，不是绝对搜索量。","social":"社交趋势专项解读：TikTok 与 YouTube 在演示互动样本中占比较高。适合优先验证短视频演示、降噪对比和真实通话场景内容。","consumer":"消费者洞察专项解读：佩戴舒适度、通话降噪和续航是高频痛点。建议将耳压、麦克风阵列、风噪抑制和快充作为产品验证重点。","competitors":"竞品专项解读：头部品牌价格分布从约 80 美元到 159 美元。Auralink Demo 的演示定位处于中端区间，需以佩戴舒适度和通话质量形成差异化。","categories":"品类专项解读：头戴式 ANC 与真无线 ANC 合计占演示样本结构的 76%。可以先围绕两类产品做规格与价格带研究。","markets":"国家市场专项解读：美国、日本、德国的演示机会指数领先。实际进入顺序仍需结合当地法规、渠道成本、竞争强度和真实数据验证。","overview":"情报总览专项解读：搜索、社交和电商信号在近六个月呈同步上升。多源同向变化值得继续观察，但仍需要真实采集和连续时间序列验证。"}}}'::jsonb) on conflict(organization_id,slug) do update set name=excluded.name,product_label=excluded.product_label,is_demo=true,dataset=excluded.dataset,updated_at=now();