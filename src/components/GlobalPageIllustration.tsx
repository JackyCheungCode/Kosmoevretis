import "./global-page-illustration.css";

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

export default function GlobalPageIllustration({ path }: { path: string }) {
  const kind = getKind(path);
  return (
    <div className={`kosmo-page-art kosmo-page-art--${kind}`} aria-hidden="true">
      <svg className="kosmo-page-art__canvas" viewBox="0 0 1200 190" preserveAspectRatio="xMidYMid meet">
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
        <g className="kosmo-page-art__ambient">
          <ellipse cx="920" cy="92" rx="255" ry="115" fill="url(#kosmo-page-art-glow)" />
          <path d="M0 150H1200" stroke="var(--cds-border-subtle)" strokeWidth="1" opacity=".5" />
          <path d="M0 38H1200M0 76H1200M0 114H1200" stroke="var(--cds-border-subtle)" strokeWidth="1" opacity=".22" strokeDasharray="2 12" />
        </g>
        <g className="kosmo-page-art__flow" fill="none" stroke="url(#kosmo-page-art-stroke)" strokeWidth="1.5">
          <path d="M28 128C180 128 196 48 350 48S520 144 680 144 888 30 1172 30" strokeDasharray="3 10" />
          <path d="M80 166C250 166 300 88 444 88S650 174 790 174 1010 72 1190 72" opacity=".55" />
        </g>
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
        <g className="kosmo-page-art__nodes" fill="var(--cds-teal-50)">
          <circle cx="720" cy="44" r="3" /><circle cx="790" cy="154" r="2.5" /><circle cx="1080" cy="40" r="3" /><circle cx="1110" cy="148" r="2.5" />
        </g>
      </svg>
      <div className="kosmo-page-art__light" />
    </div>
  );
}
