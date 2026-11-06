import { InlineNotification, Tile } from "@carbon/react";
import { DataListPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";

export default function TaskCenter() {
  return (
    <DataListPageTemplate
      title="分析任务"
      description="统一查看市场情报采集、产品机会分析与 AI 分析任务的执行进度和结果。"
      eyebrow="ANALYSIS OPERATIONS"
      headingLevel={1}
      summary={
        <div className="task-center-summary">
          <Tile><strong>任务队列</strong><p>待执行、执行中与需要处理的任务。</p></Tile>
          <Tile><strong>执行历史</strong><p>按时间追踪已完成和异常任务。</p></Tile>
          <Tile><strong>分析结果</strong><p>集中回看任务产出的结构化情报。</p></Tile>
        </div>
      }
    >
      <PageSection title="任务工作区" description="任务中心作为业务入口，与系统级 API、模型和安全配置分离。">
        <InlineNotification
          kind="info"
          lowContrast
          title="任务数据接口尚未接入"
          subtitle="当前版本先建立独立的业务导航与工作区入口；不会展示虚构的任务数量、执行状态或分析结果。"
          hideCloseButton
        />
      </PageSection>
    </DataListPageTemplate>
  );
}
