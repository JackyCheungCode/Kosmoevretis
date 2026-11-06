insert into public.intelligence_data_sources
  (slug,channel,name,logo_url,website_url,description,market_codes,languages,status,sort_order,is_active)
values
  ('mercado-libre','电商平台','Mercado Libre','https://cdn.simpleicons.org/mercadolibre','https://www.mercadolibre.com',
   '拉丁美洲主要电商市场，支持墨西哥、阿根廷、巴西、哥伦比亚与智利站点。',array['MX','AR','BR','CO','CL'],array['es','pt'],'needs_auth',6,true)
on conflict (slug) do update set
  channel=excluded.channel,name=excluded.name,logo_url=excluded.logo_url,website_url=excluded.website_url,
  description=excluded.description,market_codes=excluded.market_codes,languages=excluded.languages,
  is_active=true,updated_at=now();

insert into public.intelligence_source_connectors
  (source_id,name,connector_type,provider,actor_id,status,auth_required,capabilities,notes)
select id,'Mercado Libre 商品关键词发现','apify_actor','Apify','apify/e-commerce-scraping-tool',
  'needs_auth',true,array['keyword_search','product_listings','price','rating','seller'],
  '按拉美站点逐市场执行，使用组织级 Apify 凭证。'
from public.intelligence_data_sources where slug='mercado-libre'
on conflict (source_id,name) do update set
  actor_id=excluded.actor_id,status=excluded.status,capabilities=excluded.capabilities,notes=excluded.notes,updated_at=now();

insert into public.intelligence_source_capabilities
  (source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'keyword_product_search','商品关键词发现','从拉美 Mercado Libre 站点检索商品、价格、评分与卖家信息','observed','needs_auth',array['product_listing','price','rating','review_count','seller']
from public.intelligence_data_sources where slug='mercado-libre'
on conflict (source_id,capability_key) do update set
  label=excluded.label,description=excluded.description,availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;
