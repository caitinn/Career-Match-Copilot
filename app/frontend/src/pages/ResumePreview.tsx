import NavBar from '@/components/NavBar';
import AnalysisWaitingState from '@/components/AnalysisWaitingState';
import { getAnalysisState } from '@/lib/analysisState';

export default function ResumePreview() {
  const data = getAnalysisState().resume_analysis;

  const taskTypeMap: Record<string, string> = {
    research: '研究',
    engineering: '工程',
    product: '产品',
    data: '数据',
    unknown: '未知',
  };

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold text-morandi-text mb-1">
            简历结构化预览
          </h1>
          <p className="text-xs text-morandi-text-muted">
            简历经过 AI 结构化提取后的能力模型
          </p>
        </div>

        {!data && (
          <AnalysisWaitingState
            title="等待上传简历"
            description="上传简历 PDF 并完成分析后，这里会持续展示最近一次简历的结构化字段。"
          />
        )}

        {data && (
          <>
        {/* Basic Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-morandi-card-alt">
          <MetaItem label="学历" value={data.basic_info?.education_level || 'unknown'} />
          <MetaItem label="专业" value={data.basic_info?.major || 'unknown'} />
        </div>

        <div className="space-y-6">
          <Section label="技能关键词">
            <TagList items={data.skill_keywords} variant="secondary" />
          </Section>
          <Section label="能力标签">
            <TagList items={data.experience_tags} variant="default" />
          </Section>

          {/* Projects */}
          <Section label="项目经历">
            <div className="space-y-3">
              {data.projects.map((project, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-morandi-card-alt">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-morandi-text">{project.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-primary/10 text-morandi-primary">
                      {taskTypeMap[project.task_type] || project.task_type}
                    </span>
                  </div>
                  <p className="text-xs text-morandi-text-secondary mb-2">{project.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {project.skills_used.map((skill, j) => (
                      <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-secondary/10 text-morandi-secondary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Internships */}
          <Section label="实习经历">
            <div className="space-y-3">
              {data.internships.map((intern, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-morandi-card-alt">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-morandi-text">{intern.company}</span>
                    <span className="text-xs text-morandi-text-secondary">{intern.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {intern.domain_keywords.map((kw, j) => (
                      <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-primary/10 text-morandi-primary">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-1 mb-2">
                    {intern.responsibilities.map((resp, j) => (
                      <li key={j} className="text-xs text-morandi-text-secondary flex items-start gap-1.5">
                        <span className="text-morandi-text-muted mt-0.5 shrink-0">·</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1">
                    {intern.skills_used.map((skill, j) => (
                      <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-secondary/10 text-morandi-secondary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
