import { useState } from "react";

type BrandLogoProps = {
  name: string;
  domain?: string;
  mark?: string;
};

export default function BrandLogo({ name, domain, mark }: BrandLogoProps) {
  const [failed, setFailed] = useState(!domain);
  return (
    <span
      aria-label={name + " Logo"}
      title={name}
      style={{
        width: 36,
        height: 36,
        minWidth: 36,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--cds-layer-02, #e8e8e8)",
        color: "var(--cds-text-primary, #161616)",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {!failed && domain ? (
        <img
          src={`https://${domain}/favicon.ico`}
          alt={name}
          width={28}
          height={28}
          style={{ objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      ) : (
        mark || name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
