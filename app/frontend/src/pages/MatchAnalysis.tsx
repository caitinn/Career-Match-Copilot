import NavBar from '@/components/NavBar';
import AnalysisWaitingState from '@/components/AnalysisWaitingState';
import { getAnalysisState } from '@/lib/analysisState';

export default function MatchAnalysis() {
  const state = getAnalysisState();
  const data = state.match_result;

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

  const level = data ? getLevelLabel(data.match_level) : null;
  const rec = data ? getRecLabel(data.recommendation) : null;

  const dimensions = data ? [
    { key: 'skill_match', label: '技能匹配', score: data.breakdown.skill_match, weight: '40%', barColor: 'bg-morandi-success' },
    { key: 'task_match', label: '能力行为匹配', score: data.breakdown.task_match, weight: '40%', barColor: 'bg-morandi-warning' },
    { key: 'domain_match', label: '领域匹配', score: data.breakdown.domain_match, weight: '20%', barColor: 'bg-morandi-success' },
  ] : [];

  return (
    <div className="min-h-screen bg-morandi-bg">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold text-morandi-text mb-1">
            匹配度分析
          </h1>
          <p className="text-xs text-morandi-text-muted">
            基于 JD 与简历的三维匹配评分与决策建议
          </p>
        </div>

        {!data && (
          <AnalysisWaitingState
            title="等待上传 JD 和简历"
            description={
              state.jd_analysis || state.resume_analysis
                ? '已保存一侧分析结果，请继续上传另一侧信息以生成匹配报告。'
                : '上传 JD 和简历后，这里会展示基于最近两份数据生成的匹配结果。'
            }
          />
        )}

        {data && level && rec && (
          <>
        {/* Score Overview */}
        <div className="flex items-center gap-10 pb-6 mb-6 border-b border-morandi-card-alt">
          <div>
            <p className="text-xs text-morandi-text-muted uppercase tracking-wide mb-1">综合评分</p>
            <p className={`text-4xl font-bold tabular-nums ${getScoreColor(data.final_score)}`}>
              {data.final_score}
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

        {/* Dimension Breakdown */}
        <div className="mb-8">
          <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-4">三维匹配分解</p>
          <div className="space-y-5">
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

        {/* Match Reasons */}
        {data.match_reasons && data.match_reasons.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">匹配原因</p>
            <ul className="space-y-2.5">
              {data.match_reasons.map((reason, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                  <span className="text-morandi-success mt-0.5 shrink-0">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gap & Risk */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">能力缺口</p>
            <ul className="space-y-2.5">
              {(data.gap_analysis || []).map((gap, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                  <span className="text-morandi-error mt-0.5 shrink-0">—</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-3">投递风险</p>
            <ul className="space-y-2.5">
              {(data.risk_factors || []).map((risk, i) => (
                <li key={i} className="text-sm text-morandi-text-secondary flex items-start gap-2">
                  <span className="text-morandi-warning mt-0.5 shrink-0">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {data.resume_optimization_suggestions?.length ? (
          <div className="mt-8 pt-6 border-t border-morandi-card-alt">
            <p className="text-xs font-medium text-morandi-text-muted uppercase tracking-wide mb-1">
              简历优化建议
            </p>
            <p className="text-xs text-morandi-text-muted mb-4">
              建议仅基于简历已有事实，不应补写未实际具备的经历或数据。
            </p>
            <div className="space-y-3">
              {data.resume_optimization_suggestions.map((suggestion, index) => {
                const sectionLabels = {
                  summary: '个人概述',
                  skills: '技能',
                  project: '项目经历',
                  internship: '实习经历',
                  education: '教育经历',
                  other: '其他',
                };

                return (
                  <div
                    key={`${suggestion.section}-${index}`}
                    className="rounded-lg border border-morandi-primary/20 bg-morandi-primary/5 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="rounded bg-morandi-primary/10 px-2 py-1 text-[11px] font-medium text-morandi-primary">
                        {sectionLabels[suggestion.section] ?? '其他'}
                      </span>
                      <span className="text-sm text-morandi-text-secondary">
                        {suggestion.issue}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-morandi-text">
                      {suggestion.action}
                    </p>
                    {suggestion.example ? (
                      <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-morandi-text-secondary">
                        <span className="font-medium text-morandi-text">参考改写：</span>
                        {suggestion.example}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
          </>
        )}
      </main>
    </div>
  );
}
