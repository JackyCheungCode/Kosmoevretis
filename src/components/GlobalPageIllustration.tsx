type IllustrationKind = "intelligence" | "products" | "trade" | "social" | "commerce" | "seo" | "mail" | "settings";

function getKind(path: string): IllustrationKind {
  if (path === "/products") return "products";
  if (path === "/trade-access") return "trade";
  if (path.startsWith("/social-discovery") || path.startsWith("/leads/") || path.startsWith("/platform-data/")) return "social";
  if (path.startsWith("/ecommerce-discovery")) return "commerce";
  if (path === "/seo-analysis") return "seo";
  if (path === "/communication/mail") return "mail";
  if (path.startsWith("/settings/")) return "settings";
  return "intelligence";
}

const labels: Record<IllustrationKind, string> = {
  intelligence: "GLOBAL SIGNALS",
  products: "PRODUCT INTELLIGENCE",
  trade: "GLOBAL TRADE NETWORK",
  social: "SOCIAL GRAPH",
  commerce: "COMMERCE PULSE",
  seo: "DIGITAL VISIBILITY",
  mail: "CONNECTED CONVERSATIONS",
  settings: "SYSTEM ORCHESTRATION",
};

export default function GlobalPageIllustration({ path }: { path: string }) {
  const kind = getKind(path);
  return (
    <section className={`kosmo-illustration kosmo-illustration--${kind}`} aria-label={labels[kind]}>
      <div className="kosmo-illustration__label" aria-hidden="true">{labels[kind]}</div>
      <svg className="kosmo-illustration__art" viewBox="0 0 760 176" role="img" aria-label={labels[kind]} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="kosmo-art-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#78A9FF" />
            <stop offset="1" stopColor="#08BDBA" />
          </linearGradient>
          <radialGradient id="kosmo-art-core">
            <stop offset="0" stopColor="#D0E2FF" stopOpacity=".95" />
            <stop offset="1" stopColor="#4589FF" stopOpacity=".08" />
          </radialGradient>
        </defs>
        <g className="kosmo-illustration__grid" fill="none" stroke="#A6C8FF" strokeWidth="1">
          {Array.from({ length: 13 }, (_, i) => <path key={`v${i}`} d={`M${260 + i * 20} 12 V164`} />)}
          {Array.from({ length: 7 }, (_, i) => <path key={`h${i}`} d={`M248 ${20 + i * 22} H744`} />)}
        </g>
        <g className="kosmo-illustration__orbit" fill="none" stroke="url(#kosmo-art-line)" strokeWidth="1.5">
          <ellipse cx="540" cy="88" rx="178" ry="60" transform="rotate(-15 540 88)" />
          <ellipse cx="540" cy="88" rx="126" ry="82" transform="rotate(48 540 88)" />
          <path d="M330 88 C410 16 594 12 708 88 C615 158 424 158 330 88Z" strokeDasharray="5 8" />
        </g>
        <circle className="kosmo-illustration__halo" cx="540" cy="88" r="52" fill="url(#kosmo-art-core)" />
        {kind === "intelligence" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2">
          <circle cx="540" cy="88" r="37" /><path d="M503 88h74M540 51c-18 18-18 56 0 74M540 51c18 18 18 56 0 74M510 66c18 10 42 10 60 0M510 110c18-10 42-10 60 0" />
          <path d="M540 12v18M540 146v18M464 88h18M598 88h18" stroke="#08BDBA" />
        </g>}
        {kind === "products" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2" strokeLinejoin="round">
          <path d="m540 43 42 23v48l-42 23-42-23V66zM498 66l42 24 42-24M540 90v47" />
          <path d="m516 54 42 24M564 54l-42 24" stroke="#08BDBA" />
        </g>}
        {kind === "trade" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2">
          <path d="M478 103h124l-14 24h-96zM496 103V76h88v27M510 76V59h60v17M526 59V44h28v15" />
          <path d="M488 140h104M506 150h68" stroke="#08BDBA" />
        </g>}
        {kind === "social" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2">
          <path d="M540 88 486 52m54 36 67-42m-67 42 65 47m-65-47-62 49" />
          <circle cx="540" cy="88" r="17" fill="#D0E2FF" /><circle cx="486" cy="52" r="9" /><circle cx="607" cy="46" r="9" /><circle cx="605" cy="135" r="9" /><circle cx="478" cy="137" r="9" />
        </g>}
        {kind === "commerce" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2" strokeLinejoin="round">
          <path d="M487 58h18l15 67h72l15-49h-91M528 139h1m56 0h1" strokeLinecap="round" />
          <circle cx="528" cy="139" r="7" fill="#D0E2FF" /><circle cx="585" cy="139" r="7" fill="#D0E2FF" />
          <path d="M530 78h64M537 94h52" stroke="#08BDBA" />
        </g>}
        {kind === "seo" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2" strokeLinejoin="round">
          <path d="M485 122V88h22v34M521 122V64h22v58M557 122V43h22v79M593 122V77h22v45" />
          <path d="m480 69 38-20 32 8 48-27" stroke="#08BDBA" /><path d="M588 30h10v10" stroke="#08BDBA" />
        </g>}
        {kind === "mail" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2" strokeLinejoin="round">
          <rect x="484" y="53" width="112" height="72" rx="3" /><path d="m486 58 54 42 54-42" /><path d="M505 139h70" stroke="#08BDBA" />
        </g>}
        {kind === "settings" && <g className="kosmo-illustration__object" fill="none" stroke="#0F62FE" strokeWidth="2">
          <circle cx="540" cy="88" r="17" /><circle cx="540" cy="88" r="39" strokeDasharray="4 6" />
          <path d="M540 36v-16m0 136v-16m52-52h16m-136 0h16m89-37 12-12m-98 98 12-12m74 0 12 12m-98-98 12 12" stroke="#08BDBA" />
        </g>}
        <g className="kosmo-illustration__particles" fill="#08BDBA">
          <circle cx="376" cy="48" r="3" /><circle cx="688" cy="40" r="3" /><circle cx="675" cy="139" r="2.5" /><circle cx="408" cy="136" r="2.5" />
        </g>
        <path className="kosmo-illustration__signal" d="M284 130 C340 130 352 62 408 62 S478 130 536 130 640 48 736 48" fill="none" stroke="url(#kosmo-art-line)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 10" />
      </svg>
      <div className="kosmo-illustration__accent" aria-hidden="true" />
    </section>
  );
}
