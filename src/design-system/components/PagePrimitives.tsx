import type { ReactNode } from "react";
import { Button, InlineLoading, InlineNotification, Tag } from "@carbon/react";

export type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="kosmo-page-header">
      <div className="kosmo-page-header__copy">
        {eyebrow && <p className="kosmo-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="kosmo-page-header__title">{title}</h1>
        {description && <p className="kosmo-page-header__description">{description}</p>}
      </div>
      {actions && <div className="kosmo-page-header__actions">{actions}</div>}
    </header>
  );
}

export function PageSection({ title, description, actions, children, className = "" }: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["kosmo-page-section", className].filter(Boolean).join(" ")}>
      {(title || description || actions) && (
        <div className="kosmo-page-section__header">
          <div className="kosmo-page-section__copy">
            {title && <h2 className="kosmo-page-section__title">{title}</h2>}
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

export function ErrorState({ title = "暂时无法完成操作", description, actionLabel = "重试", onRetry }: {
  title?: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <InlineNotification
      kind="error"
      lowContrast
      title={title}
      subtitle={description}
      hideCloseButton
      actions={onRetry ? <Button kind="ghost" size="sm" onClick={onRetry}>{actionLabel}</Button> : undefined}
    />
  );
}

export function StatusTag({ children, type = "gray" }: {
  children: ReactNode;
  type?: "red" | "magenta" | "purple" | "blue" | "cyan" | "teal" | "green" | "gray" | "cool-gray" | "warm-gray" | "high-contrast" | "outline";
}) {
  return <Tag type={type}>{children}</Tag>;
}
