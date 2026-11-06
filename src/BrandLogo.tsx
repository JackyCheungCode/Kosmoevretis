import { useState } from "react";
import { DataBase } from "@carbon/icons-react";

type BrandLogoProps = {
  name: string;
  domain?: string;
  mark?: string;
};

export default function BrandLogo({ name, domain }: BrandLogoProps) {
  const [failed, setFailed] = useState(!domain);
  return (
    <span className="kosmo-brand-logo" aria-label={name + " Logo"} title={name}>
      {!failed && domain ? (
        <img
          className="kosmo-brand-logo__image"
          src={`https://${domain}/favicon.ico`}
          alt={name}
          onError={() => setFailed(true)}
        />
      ) : (
        <DataBase size={20} aria-hidden="true" />
      )}
    </span>
  );
}
