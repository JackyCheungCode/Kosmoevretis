import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: ReactNode;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={["app-page-header", className].filter(Boolean).join(" ")}>
      <div className="app-page-header__copy">
        <div className="app-page-header__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {meta ? <div className="app-page-header__meta">{meta}</div> : null}
    </header>
  );
}
