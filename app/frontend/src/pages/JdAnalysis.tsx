import NavBar from '@/components/NavBar';
import AnalysisWaitingState from '@/components/AnalysisWaitingState';
import { getAnalysisState } from '@/lib/analysisState';

export default function JdAnalysis() {
  const data = getAnalysisState().jd_analysis;

  const seniorityMap: Record<string, string> = {
    junior: '初级',
    mid: '中级',
    senior: '高级',
  };

  const jobTypeMap: Record<string, string> = {
    research: '研究',
    engineering: '工程',
    product: '产品',
    data: '数据',
    design: '设计',
    unknown: '未知',
  };

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold text-morandi-text mb-1">
            岗位结构化分析
          </h1>
          <p className="text-xs text-morandi-text-muted">
            JD 文本经过 AI 结构化提取后的关键信息
          </p>
        </div>

        {!data && (
          <AnalysisWaitingState
            title="等待上传 JD"
            description="粘贴岗位描述并完成分析后，这里会持续展示最近一次 JD 的结构化字段。"
          />
        )}

        {data && (
          <>
        {/* Meta Info Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-morandi-card-alt">
          <MetaItem label="岗位名称" value={data.job_title || 'unknown'} />
          <MetaItem label="行业" value={data.industry || 'unknown'} />
          <MetaItem label="级别" value={seniorityMap[data.seniority_level || ''] || data.seniority_level || 'unknown'} />
          <MetaItem label="类型" value={jobTypeMap[data.job_type || ''] || data.job_type || 'unknown'} />
        </div>

        <div className="space-y-6">
          <Section label="领域关键词">
            <TagList items={data.domain_keywords} variant="primary" />
          </Section>
          <Section label="硬技能要求">
            <TagList items={data.skill_keywords} variant="secondary" />
          </Section>
          <Section label="软技能要求">
            <TagList items={data.soft_skills} variant="default" />
          </Section>
          <Section label="工作职责">
            <div className="bg-white rounded-lg p-4 border border-morandi-card-alt">
              <ItemList items={data.responsibilities} />
            </div>
          </Section>
          <Section label="隐含要求">
            <div className="bg-white rounded-lg p-4 border border-morandi-card-alt">
              <ItemList items={data.implicit_requirements} />
            </div>
          </Section>
        </div>
          </>
        )}
      </main>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-morandi-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-morandi-text">{value}</p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function TagList({ items, variant = 'default' }: { items: string[]; variant?: 'primary' | 'secondary' | 'default' }) {
  const colorMap = {
    primary: 'bg-morandi-primary/10 text-morandi-primary',
    secondary: 'bg-morandi-secondary/10 text-morandi-secondary',
    default: 'bg-morandi-card-alt text-morandi-text-secondary',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`inline-block text-xs px-2 py-0.5 rounded ${colorMap[variant]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
          <span className="text-morandi-text-muted mt-0.5 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
