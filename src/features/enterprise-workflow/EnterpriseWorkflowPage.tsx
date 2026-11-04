import { useState } from "react";
import { ProgressIndicator, ProgressStep, Button } from "@carbon/react";
import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EnterpriseProfilePage } from "../enterprise-profile/EnterpriseProfilePage";
import { AIAnalysisPage } from "../ai-analysis/AIAnalysisPage";
import { AnalysisResultsPage } from "../analysis-results/AnalysisResultsPage";

type WorkflowProfile = {
  id: string;
  display_name: string;
  legal_name: string | null;
  website: string | null;
  country: string | null;
  industry: string | null;
  profile: Record<string, unknown>;
  version: number;
  updated_at: string;
};

const steps = [
  { label: "企业信息", description: "企业、产品、全球市场、规模与商业关系" },
  { label: "AI 配置", description: "分析目标、维度、数据与模型策略" },
  { label: "AI 分析", description: "执行任务并跟踪分析进度" },
  { label: "分析结果", description: "查看报告、证据与历史版本" }
];

export function EnterpriseWorkflowPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<WorkflowProfile | null>(null);
  const companyName = profile?.display_name || "当前企业";

  return <div className="enterprise-page enterprise-workflow-page">
    <PageHeader className="ep-page-heading" eyebrow={<div className="ep-eyebrow"><i/> BUSINESS PROFILE / AI INTELLIGENCE</div>} title="企业档案与AI分析" description="先建立完整企业画像，再配置 AI、执行分析，最后查看可追溯的分析结果。" />
    <div className="ep-carbon-stepper" aria-label="企业档案与 AI 分析四阶段流程">
      <ProgressIndicator currentIndex={currentStep} spaceEqually>
        {steps.map((step, index) => <ProgressStep key={step.label} label={step.label} description={step.description} secondaryLabel={index === currentStep ? "当前步骤" : index < currentStep ? "已完成" : "待处理"} />)}
      </ProgressIndicator>
    </div>

    {currentStep === 0 && <section className="workflow-step-content">
      <EnterpriseProfilePage embedded initialProfileId={profile?.id} onContinue={(saved) => { setProfile(saved); setCurrentStep(1); }} />
      <div className="ep-workflow-controls">
        <span>第一步包含企业基本信息、产品与服务、全球市场布局、企业规模及商业关系。</span>
        <Button kind="ghost" renderIcon={ArrowRight} disabled={!profile} onClick={() => setCurrentStep(1)}>继续：AI 配置</Button>
      </div>
    </section>}

    <section className="workflow-step-content" hidden={currentStep !== 1 && currentStep !== 2}>
      {profile && <div className="analysis-enterprise workflow-enterprise"><div className="analysis-enterprise-mark">{companyName.slice(0,1)}</div><div><small>ANALYSIS SUBJECT</small><b>{companyName}</b><span>企业档案 v{profile.version} · 本次分析使用已保存的档案快照</span></div></div>}
      <AIAnalysisPage
        embedded
        stage={currentStep === 1 ? "configure" : "execute"}
        enterpriseName={companyName}
        profile={profile?.profile as Record<string,string>}
        initialProfileId={profile?.id}
        onContinue={() => setCurrentStep(currentStep === 1 ? 2 : 3)}
      />
      <div className="ep-workflow-controls">
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => setCurrentStep(currentStep === 1 ? 0 : 1)}>
          {currentStep === 1 ? "返回企业信息" : "返回 AI 配置"}
        </Button>
        <span>{currentStep === 1 ? "完成配置后进入第三步，分析任务将在第三步启动。" : "分析执行结束后进入第四步查看结果。"}</span>
      </div>
    </section>

    {currentStep === 3 && <section className="workflow-step-content">
      <AnalysisResultsPage embedded companyName={companyName} profileId={profile?.id} onConfigureAnalysis={() => setCurrentStep(1)} />
      <div className="ep-workflow-controls">
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => setCurrentStep(2)}>返回 AI 分析</Button>
        <Button kind="primary" renderIcon={ArrowRight} onClick={() => setCurrentStep(0)}>完成并返回企业信息</Button>
      </div>
    </section>}
  </div>;
}
