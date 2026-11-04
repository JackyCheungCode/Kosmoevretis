insert into public.intelligence_data_sources(slug,channel,name,logo_url,website_url,description,market_codes,languages,status,sort_order,is_active)
values
('google-news','新闻媒体','Google News','https://cdn.simpleicons.org/google','https://news.google.com','全球新闻报道、品牌动态、新品发布与行业事件。',ARRAY['GLOBAL'],ARRAY['en','ja','de','fr','es','zh'],'planned',17,true),
('techcrunch','新闻媒体','TechCrunch','https://www.google.com/s2/favicons?domain=techcrunch.com&sz=64','https://techcrunch.com','科技企业、消费电子新品、融资与行业动态。',ARRAY['GLOBAL'],ARRAY['en'],'planned',18,true),
('gsmarena','行业媒体','GSMArena','https://www.google.com/s2/favicons?domain=gsmarena.com&sz=64','https://www.gsmarena.com','手机与消费电子规格、评测、价格和新品信息。',ARRAY['GLOBAL'],ARRAY['en'],'planned',19,true),
('statista','行业数据','Statista','https://www.google.com/s2/favicons?domain=statista.com&sz=64','https://www.statista.com','授权市场研究、消费者调查与行业统计数据。',ARRAY['GLOBAL'],ARRAY['en','de'],'planned',20,true),
('idc','行业数据','IDC','https://www.google.com/s2/favicons?domain=idc.com&sz=64','https://www.idc.com','授权设备出货量、市场份额与行业预测数据。',ARRAY['GLOBAL'],ARRAY['en'],'planned',21,true),
('google-patents','行业数据','Google Patents','https://cdn.simpleicons.org/google','https://patents.google.com','专利公开信息、技术主题与创新方向线索。',ARRAY['GLOBAL'],ARRAY['en','ja','de','fr','zh'],'planned',22,true)
on conflict(slug) do update set channel=excluded.channel,name=excluded.name,logo_url=excluded.logo_url,website_url=excluded.website_url,description=excluded.description,market_codes=excluded.market_codes,languages=excluded.languages,status=excluded.status,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.intelligence_source_connectors(source_id,name,connector_type,provider,status,auth_required,capabilities,notes)
select id,'Google News 公开新闻采集','apify_actor','Apify Actor', 'planned',true,ARRAY['articles','product_launches','media_mentions'],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='google-news'
union all select id,'TechCrunch 公开网页采集','public_web','公开网页采集','planned',false,ARRAY['articles','product_launches','media_mentions'],'仅采集公开可访问内容并遵守网站条款。' from public.intelligence_data_sources where slug='techcrunch'
union all select id,'GSMArena 商品与评测采集','apify_actor','Apify Actor','planned',true,ARRAY['product_specs','reviews','price_signals'],'Actor ID 待选型与验证。' from public.intelligence_data_sources where slug='gsmarena'
union all select id,'Statista 授权数据服务','third_party','Statista','planned',true,ARRAY['market_reports','market_size','consumer_statistics'],'需要企业授权与对应数据许可。' from public.intelligence_data_sources where slug='statista'
union all select id,'IDC 授权数据服务','third_party','IDC','planned',true,ARRAY['shipments','market_share','forecasts'],'需要企业授权与对应数据许可。' from public.intelligence_data_sources where slug='idc'
union all select id,'Google Patents 公开数据','public_web','Google Patents','planned',false,ARRAY['patents','technology_topics'],'公开专利信息，需按国家与专利局范围解释。' from public.intelligence_data_sources where slug='google-patents'
on conflict(source_id,name) do update set connector_type=excluded.connector_type,provider=excluded.provider,status=excluded.status,auth_required=excluded.auth_required,capabilities=excluded.capabilities,notes=excluded.notes,updated_at=now();

insert into public.intelligence_source_capabilities(source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'articles','新闻与行业报道','公开新闻、科技媒体文章与事件记录','observed','planned',ARRAY['articles'] from public.intelligence_data_sources where slug in ('google-news','techcrunch')
union all select id,'product_launches','新品发布','新品发布、产品更新与品牌动态','observed','planned',ARRAY['launches'] from public.intelligence_data_sources where slug in ('google-news','techcrunch')
union all select id,'media_mentions','品牌曝光','品牌、型号与品类媒体提及','observed','planned',ARRAY['mentions'] from public.intelligence_data_sources where slug in ('google-news','techcrunch')
union all select id,'product_specs','产品规格','产品参数、型号与规格对比','observed','planned',ARRAY['specs'] from public.intelligence_data_sources where slug='gsmarena'
union all select id,'reviews','产品评测','专业评测、评分与优缺点','observed','planned',ARRAY['reviews'] from public.intelligence_data_sources where slug='gsmarena'
union all select id,'market_reports','市场报告','授权市场研究报告与行业统计','observed','planned',ARRAY['reports'] from public.intelligence_data_sources where slug='statista'
union all select id,'market_size','市场规模估计','第三方报告中的市场规模估计','estimated','planned',ARRAY['market_size'] from public.intelligence_data_sources where slug in ('statista','idc')
union all select id,'shipments','设备出货量','授权行业统计中的设备出货数据','estimated','planned',ARRAY['shipments'] from public.intelligence_data_sources where slug='idc'
union all select id,'market_share','市场份额','第三方行业报告中的品牌或品类份额','estimated','planned',ARRAY['market_share'] from public.intelligence_data_sources where slug='idc'
union all select id,'forecasts','行业预测','第三方预测与年度展望','estimated','planned',ARRAY['forecasts'] from public.intelligence_data_sources where slug in ('statista','idc')
union all select id,'patents','专利公开数据','专利申请、公开时间与技术分类','observed','planned',ARRAY['patents'] from public.intelligence_data_sources where slug='google-patents'
union all select id,'technology_topics','技术主题趋势','技术关键词、专利主题与方向线索','inferred','planned',ARRAY['technology_topics'] from public.intelligence_data_sources where slug='google-patents'
on conflict(source_id,capability_key) do update set label=excluded.label,description=excluded.description,evidence_type=excluded.evidence_type,availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;