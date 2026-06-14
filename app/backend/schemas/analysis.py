"""Pydantic schemas for the analysis API."""
from pydantic import BaseModel, Field, field_validator
from typing import Any, Literal, Optional


class AnalysisRequest(BaseModel):
    jd_text: Optional[str] = None
    pdf_base64: Optional[str] = None


class AnalysisResponse(BaseModel):
    jd_analysis: Optional[dict[str, Any]] = None
    resume_analysis: Optional[dict[str, Any]] = None
    match_result: Optional[dict[str, Any]] = None


class JDAnalysis(BaseModel):
    job_title: str = "unknown"
    industry: str = "unknown"
    domain_keywords: list[str] = Field(default_factory=list)
    skill_keywords: list[str] = Field(default_factory=list)
    task_keywords: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    implicit_requirements: list[str] = Field(default_factory=list)
    seniority_level: Literal["junior", "mid", "senior", "unknown"] = "unknown"
    job_type: Literal[
        "research", "engineering", "product", "data", "design", "unknown"
    ] = "unknown"


class ResumeBasicInfo(BaseModel):
    education_level: str = "unknown"
    major: str = "unknown"


class ResumeProject(BaseModel):
    name: str = "unknown"
    description: str = ""
    skills_used: list[str] = Field(default_factory=list)
    task_type: Literal[
        "research", "engineering", "product", "data", "design", "unknown"
    ] = "unknown"


class ResumeInternship(BaseModel):
    company: str = "unknown"
    role: str = "unknown"
    domain_keywords: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    skills_used: list[str] = Field(default_factory=list)


class ResumeAnalysis(BaseModel):
    basic_info: ResumeBasicInfo = Field(default_factory=ResumeBasicInfo)
    domain_keywords: list[str] = Field(default_factory=list)
    skill_keywords: list[str] = Field(default_factory=list)
    task_keywords: list[str] = Field(default_factory=list)
    projects: list[ResumeProject] = Field(default_factory=list)
    internships: list[ResumeInternship] = Field(default_factory=list)
    experience_tags: list[str] = Field(default_factory=list)


class MatchBreakdown(BaseModel):
    skill_match: int = Field(ge=0, le=100)
    task_match: int = Field(ge=0, le=100)
    domain_match: int = Field(ge=0, le=100)


class ResumeOptimizationSuggestion(BaseModel):
    section: Literal[
        "summary",
        "skills",
        "project",
        "internship",
        "education",
        "other",
    ] = "other"
    issue: str
    action: str
    example: str = ""


class MatchAnalysis(BaseModel):
    final_score: int = Field(ge=0, le=100)
    match_level: Literal["High", "Medium", "Low"]
    breakdown: MatchBreakdown
    match_reasons: list[str] = Field(default_factory=list)
    gap_analysis: list[str] = Field(default_factory=list)
    risk_factors: list[str] = Field(default_factory=list)
    resume_optimization_suggestions: list[ResumeOptimizationSuggestion] = Field(
        default_factory=list
    )
    recommendation: Literal["apply", "maybe", "not_recommended"]


class MatchRequest(BaseModel):
    jd_analysis: dict[str, Any]
    resume_analysis: dict[str, Any]


class AIConfigRequest(BaseModel):
    base_url: str = Field(min_length=1, max_length=2048)
    api_key: Optional[str] = Field(default=None, max_length=4096)
    text_model: str = Field(min_length=1, max_length=200)

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")
        if not value.startswith(("http://", "https://")):
            raise ValueError("Base URL 必须以 http:// 或 https:// 开头")
        return value

    @field_validator("text_model")
    @classmethod
    def strip_required_values(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("该字段不能为空")
        return value

    @field_validator("api_key")
    @classmethod
    def strip_optional_api_key(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class AIConfigResponse(BaseModel):
    configured: bool
    base_url: Optional[str] = None
    text_model: Optional[str] = None
    source: Optional[str] = None
