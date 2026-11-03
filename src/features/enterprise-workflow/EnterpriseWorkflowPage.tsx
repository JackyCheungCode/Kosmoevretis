import { useState } from "react";
import { ProgressIndicator, ProgressStep } from "@carbon/react";
import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
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
  { label: "企业方案", description: "完善并保存企业档案" },
  { label: "AI 分析", description: "配置维度与模型并执行" },
  { label: "分析结果", description: "查看报告与历史版本" }
];

export function EnterpriseWorkflowPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<WorkflowProfile | null>(null);
  const companyName = profile?.display_name || "当前企业";

  return <div className="enterprise-page enterprise-workflow-page">
    <header className="ep-page-heading">
      <div>
        <div className="ep-eyebrow"><i/> BUSINESS PROFILE / AI INTELLIGENCE</div>
        <h1>企业档案与AI分析</h1>
        <p>从企业信息建档到 AI 商业分析，再到可追溯的分析报告，使用统一工作流程完成。</p>
      </div>
    </header>
    <div className="ep-carbon-stepper" aria-label="企业档案与 AI 分析流程">
      <ProgressIndicator currentIndex={currentStep} spaceEqually>
        {steps.map((step, index) => <ProgressStep key={step.label} label={step.label} description={step.description} secondaryLabel={index === currentStep ? "当前步骤" : index < currentStep ? "已完成" : "待处理"} />)}
      </ProgressIndicator>
    </div>

    {currentStep === 0 && <EnterpriseProfilePage embedded initialProfileId={profile?.id} onContinue={(saved) => { setProfile(saved); setCurrentStep(1); }} />}
    {currentStep === 1 && <section className="workflow-step-content">
      {profile && <div className="analysis-enterprise workflow-enterprise"><div className="analysis-enterprise-mark">{companyName.slice(0,1)}</div><div><small>ANALYSIS SUBJECT</small><b>{companyName}</b><span>企业档案 v{profile.version} · 已保存并锁定本次分析上下文</span></div></div>}
      <AIAnalysisPage embedded enterpriseName={companyName} profile={profile?.profile as Record<string,string>} initialProfileId={profile?.id} onContinue={() => setCurrentStep(2)} />
      <div className="ep-workflow-controls"><button type="button" className="ep-button-secondary" onClick={() => setCurrentStep(0)}><ArrowLeft size={15}/> 返回企业方案</button><span>模型配置完成后，启动分析将自动进入下一步</span></div>
    </section>}
    {currentStep === 2 && <section className="workflow-step-content">
      <AnalysisResultsPage embedded companyName={companyName} profileId={profile?.id} onConfigureAnalysis={() => setCurrentStep(1)} />
      <div className="ep-workflow-controls"><button type="button" className="ep-button-secondary" onClick={() => setCurrentStep(1)}><ArrowLeft size={15}/> 返回 AI 分析</button><button type="button" className="ep-button-primary" onClick={() => setCurrentStep(0)}>完成并返回企业档案 <ArrowRight size={15}/></button></div>
    </section>}
  </div>;
}
