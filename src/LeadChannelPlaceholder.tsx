export default function LeadChannelPlaceholder({title,description}:{title:string;description:string}) {
 return <section className="lead-placeholder"><span className="eyebrow">LEAD DISCOVERY CHANNEL</span><h2>{title}</h2><p>{description}</p><div className="lead-placeholder-note">渠道框架已建立，采集器与数据标准化将在该渠道单独接入。</div></section>;
}
