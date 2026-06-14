import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import NavBar from '@/components/NavBar';
import {
  getAnalysisState,
  JdAnalysis,
  MatchResult,
  PersistedAnalysisState,
  ResumeAnalysis,
} from '@/lib/analysisState';

export default function Results() {
  const navigate = useNavigate();
  const [result, setResult] = useState<PersistedAnalysisState | null>(null);

  useEffect(() => {
    const stored = getAnalysisState();
    if (!stored.jd_analysis && !stored.resume_analysis && !stored.match_result) {
      navigate('/');
      return;
    }
    setResult(stored);
  }, [navigate]);

  if (!result) return null;

  const { jd_analysis, resume_analysis, match_result } = result;
  const hasMatch = match_result != null;
  const hasJd = jd_analysis != null;
  const hasResume = resume_analysis != null;

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      {/* Sub-header */}
      <div className="border-b border-morandi-card-alt">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-morandi-text-muted">
            {hasMatch ? '完整匹配报告' : hasJd ? 'JD 结构化分析' : '简历结构化分析'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-morandi-text-muted hover:text-morandi-text text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            返回输入
          </Button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Match Score Overview */}
        {hasMatch && match_result && <MatchScoreBar matchResult={match_result} />}

        {/* Preview hint */}
        {!hasMatch && (
          <div className="mb-6 px-3 py-2 rounded-md border border-morandi-card-alt bg-morandi-card">
            <p className="text-xs text-morandi-text-muted">
              预览模式 — 仅展示结构化分析。同时提供 JD 和简历可获得完整匹配评估。
            </p>
          </div>
        )}

        {/* Dimension Breakdown */}
        {hasMatch && match_result && <DimensionBreakdown matchResult={match_result} />}

        {/* Gap & Suggestions */}
        {hasMatch && match_result && <GapSection matchResult={match_result} />}

        {/* Structured Data */}
        {hasJd && jd_analysis && <JdSection jdAnalysis={jd_analysis} />}
        {hasResume && resume_analysis && <ResumeSection resumeAnalysis={resume_analysis} />}
      </main>
    </div>
  );
}

/* ==================== Match Score Bar ==================== */
function MatchScoreBar({ matchResult }: { matchResult: MatchResult }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-morandi-success';
    if (score >= 60) return 'text-morandi-warning';
    return 'text-morandi-error';
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'High': return { text: '高匹配', cls: 'bg-morandi-success/10 text-morandi-success' };
      case 'Medium': return { text: '中匹配', cls: 'bg-morandi-warning/10 text-morandi-warning' };
      case 'Low': return { text: '低匹配', cls: 'bg-morandi-error/10 text-morandi-error' };
      default: return { text: level, cls: 'bg-morandi-card-alt text-morandi-text-secondary' };
    }
  };

  const getRecLabel = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'apply': return { text: '建议投递', cls: 'bg-morandi-success/10 text-morandi-success' };
      case 'maybe': return { text: '可以考虑', cls: 'bg-morandi-warning/10 text-morandi-warning' };
      case 'not_recommended': return { text: '不建议投递', cls: 'bg-morandi-error/10 text-morandi-error' };
      default: return { text: rec, cls: 'bg-morandi-card-alt text-morandi-text-secondary' };
    }
  };

  const level = getLevelLabel(matchResult.match_level);
  const rec = getRecLabel(matchResult.recommendation);

  return (
    <div className="mb-8 flex items-center gap-8 py-4 border-b border-morandi-card-alt">
      <div>
        <p className="text-xs text-morandi-text-muted uppercase tracking-wide mb-1">综合评分</p>
        <p className={`text-3xl font-bold tabular-nums ${getScoreColor(matchResult.final_score)}`}>
          {matchResult.final_score}
          <span className="text-sm font-normal text-morandi-text-muted ml-0.5">/100</span>
        </p>
      </div>
      <div>
        <p className="text-xs text-morandi-text-muted uppercase tracking-wide mb-1">匹配等级</p>
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded ${level.cls}`}>
          {level.text}
        </span>
      </div>
      <div>
        <p className="text-xs text-morandi-text-muted uppercase tracking-wide mb-1">投递建议</p>
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded ${rec.cls}`}>
          {rec.text}
        </span>
      </div>
    </div>
  );
}

/* ==================== Dimension Breakdown ==================== */
function DimensionBreakdown({ matchResult }: { matchResult: MatchResult }) {
  const dimensions = [
    { key: 'skill_match', label: '技能匹配', score: matchResult.breakdown.skill_match, weight: '40%', barColor: 'bg-morandi-success' },
    { key: 'task_match', label: '能力行为匹配', score: matchResult.breakdown.task_match, weight: '40%', barColor: 'bg-morandi-warning' },
    { key: 'domain_match', label: '领域匹配', score: matchResult.breakdown.domain_match, weight: '20%', barColor: 'bg-morandi-success' },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-4">三维匹配分解</h2>
      <div className="space-y-4">
        {dimensions.map(({ key, label, score, weight, barColor }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-morandi-text-secondary">
                {label}
                <span className="text-[11px] text-morandi-text-muted ml-1.5">权重 {weight}</span>
              </span>
              <span className="text-sm font-medium tabular-nums text-morandi-text">
                {score}%
              </span>
            </div>
            <div className="h-2 bg-morandi-card-alt rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== Gap Section ==================== */
function GapSection({ matchResult }: { matchResult: MatchResult }) {
  return (
    <div className="mb-8 space-y-6">
      {/* Match Reasons */}
      {matchResult.match_reasons && matchResult.match_reasons.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">匹配原因</h2>
          <ul className="space-y-2">
            {matchResult.match_reasons.map((reason, i) => (
              <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                <span className="text-morandi-success mt-0.5 shrink-0">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gap Analysis */}
        <div>
          <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">能力缺口</h2>
          <ul className="space-y-2">
            {matchResult.gap_analysis?.map((gap, i) => (
              <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                <span className="text-morandi-error mt-0.5 shrink-0">—</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Factors */}
        <div>
          <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">投递风险</h2>
          <ul className="space-y-2">
            {matchResult.risk_factors?.length ? (
              matchResult.risk_factors.map((risk, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                  <span className="text-morandi-warning mt-0.5 shrink-0">⚠</span>
                  <span>{risk}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-morandi-text-muted">暂无</li>
            )}
          </ul>
        </div>
      </div>

      {matchResult.resume_optimization_suggestions?.length ? (
        <div className="pt-6 border-t border-morandi-card-alt">
          <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-1">
            简历优化建议
          </h2>
          <p className="text-xs text-morandi-text-muted mb-4">
            建议仅基于简历已有事实，不应补写未实际具备的经历或数据。
          </p>
          <div className="space-y-3">
            {matchResult.resume_optimization_suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.section}-${index}`}
                className="rounded-lg border border-morandi-primary/20 bg-morandi-primary/5 p-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-morandi-primary">
                  {suggestion.section}
                </p>
                <p className="mt-1 text-sm text-morandi-text-secondary">{suggestion.issue}</p>
                <p className="mt-2 text-sm font-medium text-morandi-text">{suggestion.action}</p>
                {suggestion.example ? (
                  <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-morandi-text-secondary">
                    <span className="font-medium text-morandi-text">参考改写：</span>
                    {suggestion.example}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ==================== JD Section ==================== */
function JdSection({ jdAnalysis }: { jdAnalysis: JdAnalysis }) {
  const seniorityMap: Record<string, string> = { junior: '初级', mid: '中级', senior: '高级' };
  const jobTypeMap: Record<string, string> = { research: '研究', engineering: '工程', product: '产品', data: '数据', design: '设计', unknown: '未知' };

  return (
    <div className="mb-8 pt-6 border-t border-morandi-card-alt">
      <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-4">JD 结构化</h2>

      {/* Meta info */}
      {(jdAnalysis.job_title || jdAnalysis.industry || jdAnalysis.seniority_level || jdAnalysis.job_type) && (
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-3 border-b border-morandi-card-alt">
          {jdAnalysis.job_title && <MetaItem label="岗位" value={jdAnalysis.job_title} />}
          {jdAnalysis.industry && <MetaItem label="行业" value={jdAnalysis.industry} />}
          {jdAnalysis.seniority_level && <MetaItem label="级别" value={seniorityMap[jdAnalysis.seniority_level] || jdAnalysis.seniority_level} />}
          {jdAnalysis.job_type && <MetaItem label="类型" value={jobTypeMap[jdAnalysis.job_type] || jdAnalysis.job_type} />}
        </div>
      )}

      <div className="space-y-4">
        <TagGroup label="领域关键词" items={jdAnalysis.domain_keywords} variant="primary" />
        <TagGroup label="硬技能要求" items={jdAnalysis.skill_keywords} variant="secondary" />
        {jdAnalysis.soft_skills && jdAnalysis.soft_skills.length > 0 && (
          <TagGroup label="软技能要求" items={jdAnalysis.soft_skills} variant="default" />
        )}
        <div>
          <p className="text-xs font-medium text-morandi-text-muted mb-2">工作职责</p>
          <div className="bg-white rounded-lg p-4 border border-morandi-card-alt">
            <ul className="space-y-1.5">
              {jdAnalysis.responsibilities?.length > 0 ? jdAnalysis.responsibilities.map((item, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-1.5">
                  <span className="text-morandi-text-muted">·</span>
                  {item}
                </li>
              )) : (
                <li className="text-xs text-morandi-text-muted">无数据</li>
              )}
            </ul>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-morandi-text-muted mb-2">隐含要求</p>
          <div className="bg-white rounded-lg p-4 border border-morandi-card-alt">
            <ul className="space-y-1.5">
              {jdAnalysis.implicit_requirements?.length > 0 ? jdAnalysis.implicit_requirements.map((item, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-1.5">
                  <span className="text-morandi-text-muted">·</span>
                  {item}
                </li>
              )) : (
                <li className="text-xs text-morandi-text-muted">无数据</li>
              )}
            </ul>
          </div>
        </div>
      </div>
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

/* ==================== Resume Section ==================== */
function ResumeSection({ resumeAnalysis }: { resumeAnalysis: ResumeAnalysis }) {
  const taskTypeMap: Record<string, string> = { research: '研究', engineering: '工程', product: '产品', data: '数据', unknown: '未知' };

  return (
    <div className="mb-8 pt-6 border-t border-morandi-card-alt">
      <h2 className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-4">简历结构化</h2>

      {/* Basic Info */}
      {resumeAnalysis.basic_info && (
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-3 border-b border-morandi-card-alt">
          <MetaItem label="学历" value={resumeAnalysis.basic_info.education_level} />
          <MetaItem label="专业" value={resumeAnalysis.basic_info.major} />
        </div>
      )}

      <div className="space-y-4">
        <TagGroup label="技能关键词" items={resumeAnalysis.skill_keywords} variant="primary" />
        <TagGroup label="行为能力" items={resumeAnalysis.task_keywords} variant="secondary" />
        <TagGroup label="能力标签" items={resumeAnalysis.experience_tags} variant="default" />
          <div>
            <p className="text-xs font-medium text-morandi-text-muted mb-2">项目经历</p>
            {resumeAnalysis.projects?.length > 0 ? (
              <div className="space-y-2">
                {resumeAnalysis.projects.map((p, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-morandi-card-alt bg-morandi-card">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-morandi-text">{p.name}</p>
                      {p.task_type && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-primary/10 text-morandi-primary">
                          {taskTypeMap[p.task_type] || p.task_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-morandi-text-secondary mt-0.5">{p.description}</p>
                    {p.skills_used && p.skills_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.skills_used.map((skill, j) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-secondary/10 text-morandi-secondary">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-morandi-text-muted">无数据</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-morandi-text-muted mb-2">实习经历</p>
            {resumeAnalysis.internships?.length > 0 ? (
              <div className="space-y-2">
                {resumeAnalysis.internships.map((intern, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-morandi-card-alt bg-morandi-card">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-morandi-text">
                        {intern.company} · {intern.role}
                      </p>
                    </div>
                    {intern.domain_keywords && intern.domain_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {intern.domain_keywords.map((kw, j) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-primary/10 text-morandi-primary">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {intern.responsibilities && intern.responsibilities.length > 0 && (
                      <ul className="space-y-0.5 mb-1.5">
                        {intern.responsibilities.map((resp, j) => (
                          <li key={j} className="text-xs text-morandi-text-secondary flex items-start gap-1">
                            <span className="text-morandi-text-muted mt-0.5 shrink-0">·</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {intern.skills_used && intern.skills_used.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {intern.skills_used.map((skill, j) => (
                          <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-morandi-secondary/10 text-morandi-secondary">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-morandi-text-muted">无数据</p>
            )}
          </div>
      </div>
    </div>
  );
}

/* ==================== Shared Components ==================== */
function TagGroup({ label, items, variant = 'default' }: { label: string; items: string[]; variant?: 'primary' | 'secondary' | 'default' }) {
  const colorMap = {
    primary: 'bg-morandi-primary/10 text-morandi-primary',
    secondary: 'bg-morandi-secondary/10 text-morandi-secondary',
    default: 'bg-morandi-card-alt text-morandi-text-secondary',
  };

  return (
    <div>
      <p className="text-xs font-medium text-morandi-text-muted mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items?.length > 0 ? items.map((item, i) => (
          <span
            key={i}
            className={`inline-block text-xs px-2 py-0.5 rounded ${colorMap[variant]}`}
          >
            {item}
          </span>
        )) : (
          <span className="text-xs text-morandi-text-muted">无数据</span>
        )}
      </div>
    </div>
  );
}

function ListGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-morandi-text-muted mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items?.length > 0 ? items.map((item, i) => (
          <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-1.5">
            <span className="text-morandi-text-muted">·</span>
            {item}
          </li>
        )) : (
          <li className="text-xs text-morandi-text-muted">无数据</li>
        )}
      </ul>
    </div>
  );
}
