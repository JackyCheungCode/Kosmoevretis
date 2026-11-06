update public.intelligence_data_sources
set status='ready',description='通过公开 Google News RSS 按关键词与国家 / 地区检索新闻报道，无需第三方 Actor 凭证。',updated_at=now()
where slug='google-news';

insert into public.intelligence_source_connectors
  (source_id,name,connector_type,provider,actor_id,status,auth_required,capabilities,notes)
select id,'Google News RSS 搜索','public_web','Google News','google-news-rss-search','ready',false,
  array['news_search','publisher','published_at','market_locale'],
  '公开 RSS 检索；按所选关键词和市场语言执行，无需 Apify。'
from public.intelligence_data_sources where slug='google-news'
on conflict (source_id,name) do update set
  connector_type=excluded.connector_type,provider=excluded.provider,actor_id=excluded.actor_id,
  status=excluded.status,auth_required=excluded.auth_required,capabilities=excluded.capabilities,
  notes=excluded.notes,updated_at=now();

insert into public.intelligence_source_capabilities
  (source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'news_search','新闻与行业动态','按关键词和国家 / 地区获取公开新闻标题、摘要、发布方与发布时间','observed','ready',array['publisher','published_at','source_url']
from public.intelligence_data_sources where slug='google-news'
on conflict (source_id,capability_key) do update set
  label=excluded.label,description=excluded.description,evidence_type=excluded.evidence_type,
  availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;
