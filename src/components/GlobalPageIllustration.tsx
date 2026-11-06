import "./global-page-illustration.css";

type IllustrationKind = "intelligence" | "collection" | "products" | "trade" | "social" | "commerce" | "seo" | "mail" | "settings";

function getKind(path: string): IllustrationKind {
  if (path === "/platform-data-collection") return "collection";
  if (path === "/products") return "products";
  if (path === "/trade-access") return "trade";
  if (path.startsWith("/social-discovery") || path.startsWith("/leads/") || path.startsWith("/platform-data/")) return "social";
  if (path.startsWith("/ecommerce-discovery")) return "commerce";
  if (path === "/seo-analysis") return "seo";
  if (path === "/communication/mail") return "mail";
  if (path.startsWith("/settings/")) return "settings";
  return "intelligence";
}

export default function GlobalPageIllustration({ path }: { path: string }) {
  const kind = getKind(path);
  return (
    <div className={`kosmo-page-art kosmo-page-art--${kind}`} aria-hidden="true">
      <svg className="kosmo-page-art__canvas" viewBox={kind === "collection" ? "0 0 1200 240" : "0 0 1200 190"} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="kosmo-page-art-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--cds-blue-50)" />
            <stop offset=".55" stopColor="var(--cds-blue-40)" />
            <stop offset="1" stopColor="var(--cds-teal-50)" />
          </linearGradient>
          <linearGradient id="kosmo-page-art-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--cds-blue-30)" stopOpacity=".55" />
            <stop offset="1" stopColor="var(--cds-teal-20)" stopOpacity=".12" />
          </linearGradient>
          <radialGradient id="kosmo-page-art-glow">
            <stop offset="0" stopColor="var(--cds-blue-40)" stopOpacity=".34" />
            <stop offset="1" stopColor="var(--cds-blue-40)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {kind !== "collection" && <g className="kosmo-page-art__ambient">
          <ellipse cx="920" cy="92" rx="255" ry="115" fill="url(#kosmo-page-art-glow)" />
          <path d="M0 150H1200" stroke="var(--cds-border-subtle)" strokeWidth="1" opacity=".5" />
          <path d="M0 38H1200M0 76H1200M0 114H1200" stroke="var(--cds-border-subtle)" strokeWidth="1" opacity=".22" strokeDasharray="2 12" />
        </g>}
        {kind !== "collection" && <g className="kosmo-page-art__flow" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.5">
          <path d="M28 128C180 128 196 48 350 48S520 144 680 144 888 30 1172 30" strokeDasharray="3 10" />
          <path d="M80 166C250 166 300 88 444 88S650 174 790 174 1010 72 1190 72" opacity=".55" />
        </g>}
        {kind === "collection" && <g className="kosmo-page-art__collection" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="pdc-window" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--cds-link-primary)" stopOpacity=".16"/><stop offset="1" stopColor="var(--cds-support-05)" stopOpacity=".06"/></linearGradient>
            <linearGradient id="pdc-data" x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--cds-interactive-01)"/><stop offset=".5" stopColor="var(--cds-support-05)"/><stop offset="1" stopColor="var(--cds-support-04)"/></linearGradient>
            <linearGradient id="pdc-scan" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--cds-support-04)" stopOpacity="0"/><stop offset=".5" stopColor="var(--cds-support-04)" stopOpacity=".55"/><stop offset="1" stopColor="var(--cds-support-04)" stopOpacity="0"/></linearGradient>
          </defs>
          <g className="pdc-window pdc-window--a" transform="translate(48 34)">
            <rect width="218" height="108" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H218" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-02)" fontSize="11" fontWeight="700">amazon</text>
            <rect x="12" y="34" width="52" height="58" rx="2" fill="var(--cds-support-02)" opacity=".18"/><path d="M20 75l13-19 12 11 10-15" fill="none" stroke="var(--cds-support-02)" strokeWidth="2"/><path d="M77 39H198M77 49H183M77 63H190M77 78H155M77 89H181" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--b" transform="translate(302 18)">
            <rect width="194" height="104" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H194" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-link-primary)" fontSize="11" fontWeight="700">Google Trends</text>
            <path d="M14 83L38 70 58 75 80 46 102 59 126 36 151 49 180 29" fill="none" stroke="var(--cds-link-primary)" strokeWidth="2.4"/><path d="M14 88H180M14 40V88" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="126" cy="36" r="3.5" fill="var(--cds-link-primary)"/>
          </g>
          <g className="pdc-window pdc-window--c" transform="translate(528 35)">
            <rect width="190" height="100" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H190" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-03)" fontSize="11" fontWeight="700">Instagram</text>
            <rect x="13" y="34" width="48" height="48" rx="3" fill="var(--cds-support-03)" opacity=".18"/><circle cx="37" cy="58" r="12" fill="none" stroke="var(--cds-support-03)" strokeWidth="2"/><path d="M72 39H175M72 50H166M72 63H179M72 76H151" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--d" transform="translate(754 20)">
            <rect width="194" height="106" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H194" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-02)" fontSize="11" fontWeight="700">reddit</text>
            <circle cx="39" cy="57" r="20" fill="var(--cds-support-02)" opacity=".16"/><circle cx="39" cy="57" r="11" fill="none" stroke="var(--cds-support-02)" strokeWidth="2"/><path d="M73 40H180M73 53H168M73 66H181M73 80H150" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--e" transform="translate(974 42)">
            <rect width="178" height="100" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H178" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-link-primary)" fontSize="11" fontWeight="700">Facebook</text>
            <circle cx="31" cy="57" r="18" fill="var(--cds-link-primary)" opacity=".16"/><path d="M23 66V49h7v-5c0-6 4-9 10-9h6v7h-5c-3 0-4 1-4 4v3h9l-2 7h-7v10" fill="none" stroke="var(--cds-link-primary)" strokeWidth="2"/><path d="M65 40H164M65 53H153M65 66H163M65 79H140" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--f" transform="translate(154 174)">
            <rect width="204" height="92" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H204" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-03)" fontSize="11" fontWeight="700">YouTube</text>
            <rect x="14" y="35" width="42" height="42" rx="5" fill="var(--cds-support-03)" opacity=".17"/><path d="M31 46l14 10-14 10z" fill="var(--cds-support-03)"/><path d="M69 41H190M69 53H178M69 66H188M69 77H158" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--g" transform="translate(402 186)">
            <rect width="202" height="82" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H202" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-04)" fontSize="11" fontWeight="700">TikTok</text>
            <path d="M18 43H183M18 55H165M18 68H178" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--h" transform="translate(650 185)">
            <rect width="202" height="84" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H202" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-support-04)" fontSize="11" fontWeight="700">Shopify</text>
            <rect x="16" y="35" width="28" height="35" rx="3" fill="var(--cds-support-04)" opacity=".2"/><path d="M60 42H186M60 54H174M60 67H182" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-window pdc-window--i" transform="translate(900 180)">
            <rect width="194" height="88" rx="5" fill="url(#pdc-window)" stroke="var(--cds-border-subtle)" strokeOpacity=".55"/><path d="M0 22H194" stroke="var(--cds-border-subtle)" strokeOpacity=".5"/><circle cx="12" cy="11" r="2.5" fill="var(--cds-support-03)"/><circle cx="22" cy="11" r="2.5" fill="var(--cds-support-02)"/><circle cx="32" cy="11" r="2.5" fill="var(--cds-support-04)"/><text x="48" y="15" fill="var(--cds-link-primary)" fontSize="11" fontWeight="700">eBay</text>
            <path d="M17 42H177M17 54H166M17 68H179" stroke="var(--cds-border-subtle)" strokeOpacity=".65" strokeWidth="3"/>
          </g>
          <g className="pdc-data-routes" fill="none" stroke="url(#pdc-data)" strokeWidth="2.2">
            <path d="M155 142C170 158 260 148 330 160S465 174 548 156L728 144Q800 137 876 157L1005 174"/>
            <path d="M410 122C420 142 480 146 548 156L728 144Q800 137 876 157L1005 174"/>
            <path d="M620 135L728 144Q800 137 876 157L1005 174"/>
            <path d="M850 126Q865 146 876 157L1005 174"/>
            <path d="M260 174Q390 195 548 156M500 186Q520 169 548 156M750 185Q760 168 876 157M995 142Q980 156 1005 174"/>
          </g>
          <g className="pdc-crawler" transform="translate(548 156)">
            <circle r="28" fill="var(--cds-interactive-01)" fillOpacity=".10" stroke="var(--cds-interactive-01)" strokeOpacity=".75" strokeWidth="1.5"/>
            <circle r="17" fill="var(--cds-layer-03)" stroke="var(--cds-link-primary)" strokeWidth="1.5"/>
            <path d="M-9-5L0-12 9-5 7 8H-7Z" fill="var(--cds-link-primary)" fillOpacity=".35" stroke="var(--cds-link-primary)" strokeWidth="1.5"/>
            <circle className="pdc-crawler-eye" cx="0" cy="-1" r="3.5" fill="var(--cds-support-04)"/>
            <path d="M-25-18l-10-9m60 9 10-9M-25 18l-10 9m60-9 10 9" stroke="var(--cds-link-primary)" strokeWidth="2"/>
            <path d="M-42-38H42V38H-42Z" fill="none" stroke="var(--cds-support-04)" strokeOpacity=".4" strokeDasharray="3 5"/>
          </g>
          <g className="pdc-scan-beam"><path d="M80 150H1120" stroke="var(--cds-support-04)" strokeOpacity=".28" strokeWidth="1"/><path d="M80 148H1120V161H80Z" fill="url(#pdc-scan)" opacity=".35"/></g>
          <g className="pdc-server" transform="translate(1092 226)">
            <rect x="-45" y="-43" width="90" height="80" rx="4" fill="var(--cds-layer-03)" stroke="var(--cds-border-subtle)" strokeWidth="1.5"/>
            <rect x="-35" y="-32" width="70" height="16" rx="2" fill="var(--cds-layer-02)" stroke="var(--cds-border-strong)"/><rect x="-35" y="-9" width="70" height="16" rx="2" fill="var(--cds-layer-02)" stroke="var(--cds-border-strong)"/><rect x="-35" y="14" width="70" height="14" rx="2" fill="var(--cds-layer-02)" stroke="var(--cds-border-strong)"/>
            <circle className="pdc-server-led pdc-server-led--one" cx="25" cy="-24" r="3.2" fill="var(--cds-support-04)"/><circle className="pdc-server-led pdc-server-led--two" cx="25" cy="-1" r="3.2" fill="var(--cds-support-04)"/><circle className="pdc-server-led pdc-server-led--three" cx="25" cy="21" r="3.2" fill="var(--cds-support-04)"/>
            <path d="M-25-24H12M-25-1H12M-25 21H12" stroke="var(--cds-text-secondary)" strokeWidth="2"/>
          </g>
          <g className="pdc-packets" fill="var(--cds-support-04)"><circle r="3.5"><animateMotion dur="3.6s" repeatCount="indefinite" path="M155 142C280 166 450 170 548 156L876 157L1005 174"/></circle><circle r="2.8"><animateMotion dur="4.4s" begin="-1.6s" repeatCount="indefinite" path="M410 122C470 150 500 160 548 156L876 157L1005 174"/></circle><circle r="3"><animateMotion dur="3.9s" begin="-2.1s" repeatCount="indefinite" path="M850 126Q865 146 876 157L1005 174L1092 183"/></circle></g>
        </g>}
        {kind === "intelligence" && <g className="kosmo-page-art__motif" transform="translate(920 94)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.6">
          <circle r="65" fill="url(#kosmo-page-art-fill)" /><ellipse rx="65" ry="25" /><ellipse rx="65" ry="25" transform="rotate(60)" /><ellipse rx="65" ry="25" transform="rotate(120)" /><circle r="65" strokeDasharray="3 9" className="kosmo-page-art__orbit" /><path d="M-65 0H65M0-65V65" opacity=".6" />
        </g>}
        {kind === "products" && <g className="kosmo-page-art__motif" transform="translate(920 96)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.7" strokeLinejoin="round">
          <path d="m0-67 58 33v66L0 66l-58-34v-66z" fill="url(#kosmo-page-art-fill)" /><path d="M-58-34 0 0l58-34M0 0v66" /><path d="m-28-83 58 33 58-33M-86 0l28 34v66M86 0 28 34v66" opacity=".5" />
        </g>}
        {kind === "trade" && <g className="kosmo-page-art__motif" transform="translate(920 96)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.7">
          <path d="M-105-42H95L70 0h-150z" fill="url(#kosmo-page-art-fill)" /><path d="M-80-42v-34H70v34M-48-76v-27H38v27M-14-103v-19h18v19" /><path d="M-125 24H110M-96 42H82M-64 60H50" opacity=".6" />
        </g>}
        {kind === "social" && <g className="kosmo-page-art__motif" transform="translate(920 94)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.8">
          <path d="M0 0-94-47M0 0 78-64M0 0 100 43M0 0-72 67M-94-47-22-91M78-64 124-15M100 43 46 94M-72 67-125 18" /><circle r="22" fill="url(#kosmo-page-art-fill)" /><circle cx="-94" cy="-47" r="10" /><circle cx="78" cy="-64" r="10" /><circle cx="100" cy="43" r="10" /><circle cx="-72" cy="67" r="10" /><circle cx="-22" cy="-91" r="5" /><circle cx="124" cy="-15" r="5" /><circle cx="46" cy="94" r="5" /><circle cx="-125" cy="18" r="5" />
        </g>}
        {kind === "commerce" && <g className="kosmo-page-art__motif" transform="translate(920 96)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M-84-60h24l22 112h115l25-83h-145" /><circle cx="-20" cy="72" r="11" fill="url(#kosmo-page-art-fill)" /><circle cx="67" cy="72" r="11" fill="url(#kosmo-page-art-fill)" /><path d="M-33-22H76M-22 3H68" opacity=".7" />
        </g>}
        {kind === "seo" && <g className="kosmo-page-art__motif" transform="translate(920 96)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.8">
          <path d="M-112 55V5h32v50M-58 55v-82h32v82M-4 55v-112h32V55M50 55v-64h32v64" fill="url(#kosmo-page-art-fill)" /><path d="m-125-36 55-28 49 16 68-45 70 12" /><circle cx="117" cy="-81" r="6" fill="var(--cds-teal-50)" />
        </g>}
        {kind === "mail" && <g className="kosmo-page-art__motif" transform="translate(920 96)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="-94" y="-55" width="188" height="112" rx="3" fill="url(#kosmo-page-art-fill)" /><path d="m-92-51 92 72 92-72M-92 55l65-55M92 55 27 0" />
        </g>}
        {kind === "settings" && <g className="kosmo-page-art__motif" transform="translate(920 94)" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.8">
          <circle r="24" fill="url(#kosmo-page-art-fill)" /><circle r="58" strokeDasharray="4 8" /><path d="M0-88v-22M0 88v22M88 0h22M-88 0h-22M62-62l16-16M-62 62l-16 16M62 62l16 16M-62-62l-16-16" /><circle r="82" opacity=".45" />
        </g>}
        {kind !== "collection" && <g className="kosmo-page-art__nodes" fill="var(--cds-teal-50)">
          <circle cx="720" cy="44" r="3" /><circle cx="790" cy="154" r="2.5" /><circle cx="1080" cy="40" r="3" /><circle cx="1110" cy="148" r="2.5" />
        </g>}
      </svg>
      {kind !== "collection" && <div className="kosmo-page-art__light" />}
    </div>
  );
}
