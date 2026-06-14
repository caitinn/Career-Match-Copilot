export interface JdAnalysis {
  job_title?: string;
  industry?: string;
  domain_keywords: string[];
  skill_keywords: string[];
  soft_skills?: string[];
  responsibilities: string[];
  implicit_requirements: string[];
  seniority_level?: string;
  job_type?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  skills_used?: string[];
  task_type?: string;
}

export interface ResumeInternship {
  company: string;
  role: string;
  domain_keywords?: string[];
  responsibilities?: string[];
  skills_used?: string[];
}

export interface ResumeAnalysis {
  basic_info?: {
    education_level: string;
    major: string;
  };
  skill_keywords: string[];
  task_keywords: string[];
  experience_tags: string[];
  projects: ResumeProject[];
  internships: ResumeInternship[];
}

export interface ResumeOptimizationSuggestion {
  section: 'summary' | 'skills' | 'project' | 'internship' | 'education' | 'other';
  issue: string;
  action: string;
  example?: string;
}

export interface MatchResult {
  final_score: number;
  match_level: string;
  breakdown: {
    skill_match: number;
    task_match: number;
    domain_match: number;
  };
  match_reasons?: string[];
  gap_analysis?: string[];
  risk_factors?: string[];
  resume_optimization_suggestions?: ResumeOptimizationSuggestion[];
  recommendation: string;
}

export interface AnalysisResult {
  jd_analysis?: JdAnalysis | null;
  resume_analysis?: ResumeAnalysis | null;
  match_result?: MatchResult | null;
}

export interface PersistedAnalysisState extends AnalysisResult {
  jd_text?: string;
  resume_file_name?: string;
  jd_updated_at?: string;
  resume_updated_at?: string;
  match_updated_at?: string;
}

const STORAGE_KEY = 'offerCatcherAnalysisState';
const LEGACY_SESSION_KEY = 'analysisResult';

export function getAnalysisState(): PersistedAnalysisState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as PersistedAnalysisState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
  if (legacy) {
    try {
      const migrated = JSON.parse(legacy) as PersistedAnalysisState;
      saveAnalysisState(migrated);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return migrated;
    } catch {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
  }

  return {};
}

export function saveAnalysisState(state: PersistedAnalysisState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function mergeAnalysisState(
  current: PersistedAnalysisState,
  incoming: AnalysisResult,
  metadata: {
    jdText?: string;
    resumeFileName?: string;
  },
): PersistedAnalysisState {
  const now = new Date().toISOString();
  const hasNewJd = incoming.jd_analysis != null;
  const hasNewResume = incoming.resume_analysis != null;

  return {
    ...current,
    jd_analysis: hasNewJd ? incoming.jd_analysis : current.jd_analysis,
    resume_analysis: hasNewResume
      ? incoming.resume_analysis
      : current.resume_analysis,
    match_result:
      incoming.match_result ??
      (hasNewJd || hasNewResume ? null : current.match_result),
    jd_text: hasNewJd ? metadata.jdText : current.jd_text,
    resume_file_name: hasNewResume
      ? metadata.resumeFileName
      : current.resume_file_name,
    jd_updated_at: hasNewJd ? now : current.jd_updated_at,
    resume_updated_at: hasNewResume ? now : current.resume_updated_at,
    match_updated_at: incoming.match_result ? now : current.match_updated_at,
  };
}
