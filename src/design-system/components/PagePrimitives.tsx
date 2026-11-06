import type { ReactNode } from "react";
import { Button, InlineLoading, InlineNotification, Tag } from "@carbon/react";
import { Link, useLocation } from "react-router-dom";

export type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  scope?: string;
  actions?: ReactNode;
  headingLevel?: 1 | 2;
};

function breadcrumbGroup(path: string) {
  if (path === "/intelligence") return [];
  if (path === "/products") return [{ label: "企业数据", to: "/products" }];
  if (path === "/trade-access") return [{ label: "全球情报中心", to: "/intelligence" }];
  if (path.startsWith("/social-discovery") || path.startsWith("/leads/") || path.startsWith("/platform-data/")) {
    return [{ label: "平台数据采集", to: "/social-discovery" }, { label: "社媒平台发现", to: "/social-discovery" }];
  }
  if (path.startsWith("/ecommerce-discovery")) {
    return [{ label: "平台数据采集", to: "/ecommerce-discovery/amazon" }, { label: "电商平台发现", to: "/ecommerce-discovery/amazon" }];
  }
  if (path === "/seo-analysis") return [{ label: "独立站运维", to: "/seo-analysis" }];
  if (path === "/communication/mail") return [{ label: "沟通与跟进", to: "/communication/mail" }];
  if (path.startsWith("/settings/")) return [{ label: "系统设置", to: "/settings/providers" }];
  return [{ label: "工作空间", to: "/intelligence" }];
}

export function PageHeader({ title, description, scope, actions, headingLevel = 1 }: PageHeaderProps) {
  const HeadingTag = headingLevel === 2 ? "h2" : "h1";
  const { pathname } = useLocation();
  const group = breadcrumbGroup(pathname.replace(/\/$/, "") || "/");
  const crumbs = [{ label: "Kosmoevretis", to: "/intelligence" }, ...group];
  const isCurrentAlreadyInGroup = group.length > 0 && group[group.length - 1].label === title;
  return (
    <header className="kosmo-page-header">
      <nav className="kosmo-page-header__breadcrumb" aria-label="面包屑导航">
        {crumbs.map((crumb, index) => (
          <span className="kosmo-page-header__breadcrumb-item" key={crumb.label + index}>
            {index > 0 && <span className="kosmo-page-header__breadcrumb-separator" aria-hidden="true">/</span>}
            <Link to={crumb.to}>{crumb.label}</Link>
          </span>
        ))}
        {!isCurrentAlreadyInGroup && (
          <span className="kosmo-page-header__breadcrumb-current" aria-current="page">
            <span className="kosmo-page-header__breadcrumb-separator" aria-hidden="true">/</span>
            {title}
          </span>
        )}
      </nav>
      <div className="kosmo-page-header__body">
        <div className="kosmo-page-header__copy">
          <HeadingTag className="kosmo-page-header__title">{title}</HeadingTag>
          {description && <p className="kosmo-page-header__description">{description}</p>}
        </div>
        <div className="kosmo-page-header__meta">
          {actions && <div className="kosmo-page-header__actions">{actions}</div>}
          {scope && <span className="kosmo-page-header__scope">{scope}</span>}
        </div>
      </div>
    </header>
  );
}

export function PageSection({ title, description, actions, children, className = "", headingLevel = 2 }: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const HeadingTag = headingLevel === 3 ? "h3" : "h2";
  return (
    <section className={["kosmo-page-section", className].filter(Boolean).join(" ")}>
      {(title || description || actions) && (
        <div className="kosmo-page-section__header">
          <div className="kosmo-page-section__copy">
            {title && <HeadingTag className="kosmo-page-section__title">{title}</HeadingTag>}
            {description && <p className="kosmo-page-section__description">{description}</p>}
          </div>
          {actions && <div className="kosmo-page-section__actions">{actions}</div>}
        </div>
      )}
      <div className="kosmo-page-section__content">{children}</div>
    </section>
  );
}

export function PageFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={["kosmo-page-frame", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function EmptyState({ title, description, actionLabel, onAction }: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="kosmo-empty-state" role="status">
      <h3 className="kosmo-empty-state__title">{title}</h3>
      {description && <p className="kosmo-empty-state__description">{description}</p>}
      {actionLabel && onAction && <Button kind="tertiary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function LoadingState({ description = "正在加载…" }: { description?: string }) {
  return (
    <div className="kosmo-loading-state" role="status" aria-live="polite">
      <InlineLoading status="active" description={description} />
    </div>
  );
}

export function SuccessState({ title, description, actionLabel, onAction }: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="kosmo-success-state">
      <InlineNotification kind="success" lowContrast title={title} subtitle={description} hideCloseButton />
      {actionLabel && onAction && <Button kind="ghost" size="sm" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function ErrorState({ title = "暂时无法完成操作", description, actionLabel = "重试", onRetry }: {
  title?: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="kosmo-error-state">
      <InlineNotification kind="error" lowContrast title={title} subtitle={description} hideCloseButton />
      {onRetry && <Button kind="ghost" size="sm" onClick={onRetry}>{actionLabel}</Button>}
    </div>
  );
}

export function StatusTag({ children, type = "gray" }: {
  children: ReactNode;
  type?: "red" | "magenta" | "purple" | "blue" | "cyan" | "teal" | "green" | "gray" | "cool-gray" | "warm-gray" | "high-contrast" | "outline";
}) {
  return <Tag type={type}>{children}</Tag>;
}
