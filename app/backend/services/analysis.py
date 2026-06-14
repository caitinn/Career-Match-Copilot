"""
JD Resume Matching & Optimization Analysis Service
Chains 3 AI steps: JD structuring, Resume PDF analysis, Match evaluation
"""
import json
import re
import logging
import base64
from typing import TypeVar

import fitz
from pydantic import BaseModel, ValidationError
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage
from schemas.analysis import JDAnalysis, MatchAnalysis, ResumeAnalysis
from services.ai_config import get_ai_config

logger = logging.getLogger(__name__)
StructuredModel = TypeVar("StructuredModel", bound=BaseModel)

def get_service() -> AIHubService:
    return AIHubService()


def get_text_model() -> str:
    config = get_ai_config()
    if not config:
        raise ValueError("AI service not configured. Please configure it on the API settings page.")
    return config.text_model


def extract_pdf_text(pdf_data_uri: str) -> str:
    """Extract text from a base64 PDF data URI for provider-neutral analysis."""
    if "," not in pdf_data_uri:
        raise ValueError("Invalid PDF data.")

    header, encoded = pdf_data_uri.split(",", 1)
    if not header.lower().startswith("data:application/pdf;base64"):
        raise ValueError("Only PDF files are supported.")

    try:
        pdf_bytes = base64.b64decode(encoded, validate=True)
        with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
            text = "\n\n".join(page.get_text("text") for page in document)
    except Exception as exc:
        raise ValueError("PDF parsing failed. Please upload a readable PDF.") from exc

    text = text.strip()
    if not text:
        raise ValueError("No text was found in the PDF. Scanned resumes are not supported yet.")

    return text[:60000]


def extract_json_block(text: str) -> str:
    """Extract JSON block from AI response that may contain markdown wrappers."""
    if text.startswith("```"):
        match = re.search(r"```(?:json)?\n(.*?)```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start:end + 1]
    return text


def parse_json_payload(raw_content: str) -> dict:
    """Parse a JSON object and unwrap common provider-added containers."""
    payload_text = extract_json_block(raw_content.strip())
    payload = json.loads(payload_text)
    if not isinstance(payload, dict):
        raise ValueError("AI output must be a JSON object.")

    wrapper_keys = ("result", "data", "analysis", "output", "jd_analysis", "resume_analysis")
    for key in wrapper_keys:
        wrapped = payload.get(key)
        if len(payload) == 1 and isinstance(wrapped, dict):
            return wrapped
    return payload


def validate_structured_payload(
    payload: dict,
    schema: type[StructuredModel],
    required_fields: list[str],
) -> dict:
    missing = [field for field in required_fields if field not in payload]
    if missing:
        raise ValueError(f"missing fields: {', '.join(missing)}")

    validated = schema.model_validate(payload)
    return validated.model_dump()


async def request_structured_json(
    messages: list[ChatMessage],
    schema: type[StructuredModel],
    required_fields: list[str],
    max_tokens: int = 4096,
) -> dict:
    """Request schema-shaped JSON and retry once on incomplete provider output."""
    request = GenTxtRequest(
        messages=messages,
        model=get_text_model(),
        temperature=0.0,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    response = await get_service().gentxt(request)

    try:
        payload = parse_json_payload(response.content)
        return validate_structured_payload(payload, schema, required_fields)
    except (json.JSONDecodeError, ValueError, ValidationError) as first_error:
        logger.warning("Structured output validation failed, retrying: %s", first_error)

    schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
    retry_messages = [
        *messages,
        ChatMessage(role="assistant", content=response.content),
        ChatMessage(
            role="user",
            content=(
                "上一份输出不符合要求。请重新生成完整 JSON 对象，不要沿用缺失字段的结构。"
                "所有顶层字段都必须存在；缺少信息时字符串使用 \"unknown\"，数组使用 []。"
                f"\n必须符合以下 JSON Schema：\n{schema_json}"
            ),
        ),
    ]
    retry_request = GenTxtRequest(
        messages=retry_messages,
        model=get_text_model(),
        temperature=0.0,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    retry_response = await get_service().gentxt(retry_request)
    try:
        payload = parse_json_payload(retry_response.content)
        return validate_structured_payload(payload, schema, required_fields)
    except (json.JSONDecodeError, ValueError, ValidationError) as exc:
        logger.error("Structured output failed after retry: %s", exc)
        raise ValueError("AI 返回的结构化结果不完整，请重试或切换模型。") from exc


async def structure_jd(jd_text: str) -> dict:
    """Step 1: Extract evidence-grounded structured JD data."""
    system_message = """你是岗位信息抽取系统，不是职业建议顾问。
你的唯一任务是把 JD 中有文本证据的信息归一化为 JSON。

准确性规则：
1. 只提取 JD 明示内容，不补充“通常需要”的技能、学历、经验或职责。
2. 可以做同义词归一化，例如“撰写需求文档”归一为“PRD 编写”，但不能扩大含义。
3. interest、热爱、关注、拥抱等态度描述不能转成硬技能。
4. implicit_requirements 只收录 JD 中以“优先、加分、要求、需要、熟悉”等方式明确表达的条件。
5. 不确定时使用 "unknown" 或 []，禁止猜测。
6. 输出语言与 JD 主体语言一致，技术名词保留行业常用写法。
7. 只返回一个完整 JSON 对象。"""

    user_prompt = f"""请分析以下 JD：
<jd>
{jd_text}
</jd>

返回以下完整结构：
{{
  "job_title": "JD 明示的岗位名称；未给出则 unknown",
  "industry": "JD 明示或可由公司业务直接确定的行业；证据不足则 unknown",
  "domain_keywords": ["岗位直接涉及的业务或产品领域，最多 8 条"],
  "skill_keywords": ["JD 明确要求的工具、方法、技术或专业技能，最多 10 条"],
  "task_keywords": ["从职责中归一化出的动词+对象任务单元，最多 10 条"],
  "soft_skills": ["JD 明确要求的沟通、协作等软技能，最多 6 条"],
  "responsibilities": ["忠实概括的核心职责，3-8 条，不添加原文没有的职责"],
  "implicit_requirements": ["原文明确表达的任职条件或加分项，最多 8 条"],
  "seniority_level": "junior | mid | senior | unknown",
  "job_type": "research | engineering | product | data | design | unknown"
}}

级别判断仅依据职责范围：
- junior：辅助或执行任务，有明确指导；
- mid：独立负责模块、方案或指标；
- senior：负责战略、系统架构、团队或跨部门决策；
- 证据不足：unknown。

数组缺失时必须返回 []，所有顶层字段都必须存在。"""

    return await request_structured_json(
        [
            ChatMessage(role="system", content=system_message),
            ChatMessage(role="user", content=user_prompt),
        ],
        JDAnalysis,
        [
            "job_title",
            "industry",
            "domain_keywords",
            "skill_keywords",
            "task_keywords",
            "soft_skills",
            "responsibilities",
            "implicit_requirements",
            "seniority_level",
            "job_type",
        ],
    )


async def structure_resume(pdf_base64: str) -> dict:
    """Step 2: Extract resume PDF text locally and structure it with the configured model."""
    instruction = """你是简历事实抽取系统。只依据简历原文建立候选人能力模型。

准确性规则：
1. 不推断候选人未写出的技能、岗位、公司、项目结果或工作年限。
2. 只有明确使用、完成或产出过的工具/方法才能进入 skill_keywords。
3. task_keywords 使用“动词+对象”，必须能在经历或项目中找到证据。
4. 校园组织经历不能归入 internships；个人项目不能归入 internships。
5. PDF 文本顺序可能错乱。公司、岗位、日期无法可靠关联时填 unknown，不要强行拼接。
6. 不输出姓名、手机号、邮箱、证件号等个人信息。
7. 指标和成果可以保留在项目描述或职责中，但不得改写数字。
8. 缺失的数组必须返回 []，缺失的字符串返回 "unknown"。
9. 只返回一个完整 JSON 对象。"""

    resume_text = extract_pdf_text(pdf_base64)
    user_prompt = f"""以下是从简历 PDF 提取的文本：
<resume>
{resume_text}
</resume>

返回以下完整结构：
{{
  "basic_info": {{
    "education_level": "本科 | 硕士 | 博士 | unknown，以最高在读或已获学历为准",
    "major": "最高学历对应专业；无法关联则 unknown"
  }},
  "domain_keywords": ["有项目或经历证据的业务/产品领域，最多 10 条"],
  "skill_keywords": ["明确使用过的工具、方法、技术或产品技能，最多 15 条"],
  "task_keywords": ["明确做过的动词+对象任务单元，最多 15 条"],
  "projects": [
    {{
      "name": "项目名称",
      "description": "项目目标、本人动作和结果的忠实摘要",
      "skills_used": ["项目中有证据的技能"],
      "task_type": "research | engineering | product | data | design | unknown"
    }}
  ],
  "internships": [
    {{
      "company": "公司名或 unknown",
      "role": "岗位名或 unknown",
      "domain_keywords": ["该实习涉及领域"],
      "responsibilities": ["本人执行的动词+对象任务"],
      "skills_used": ["该实习中有证据的技能"]
    }}
  ],
  "experience_tags": ["对多条经历进行归纳的能力/经验标签，最多 10 条"]
}}

所有顶层字段都必须存在。不要把“兴趣、自我评价、熟练”等没有行为证据的文字直接当作能力。"""

    return await request_structured_json(
        [
            ChatMessage(role="system", content=instruction),
            ChatMessage(role="user", content=user_prompt),
        ],
        ResumeAnalysis,
        [
            "basic_info",
            "domain_keywords",
            "skill_keywords",
            "task_keywords",
            "projects",
            "internships",
            "experience_tags",
        ],
        max_tokens=8192,
    )


async def evaluate_match(jd_structured: dict, resume_structured: dict) -> dict:
    """Step 3: Evaluate semantic match and enforce deterministic totals."""
    system_message = """你是求职匹配评估系统。
只依据输入的结构化 JD 与简历证据评分，不使用候选人的姓名、学校声望、公司声望等无关因素。
同义表达可以匹配，但“兴趣、了解、关注”不能等同于“执行过、负责过、交付过”。
缺少证据表示未证明，不得自行补全。只返回完整 JSON。"""

    user_prompt = f"""## 输入

### 1. JD结构化数据
{json.dumps(jd_structured, ensure_ascii=False, indent=2)}

### 2. Resume结构化数据
{json.dumps(resume_structured, ensure_ascii=False, indent=2)}

---

## 评分方法
1. skill_match：比较 JD.skill_keywords 与 Resume.skill_keywords、项目/实习 skills_used。
2. task_match：比较 JD.task_keywords、responsibilities 与 Resume.task_keywords、项目/实习 responsibilities。
3. domain_match：比较双方 domain_keywords，并参考 Resume.experience_tags。

分数锚点：
- 90-100：大部分核心要求有直接、重复或成果型证据；
- 70-89：多数核心要求有证据，存在少量明确缺口；
- 50-69：部分要求匹配，但关键任务或技能证据不足；
- 0-49：核心方向不一致或大部分要求无证据。

不要因为关键词字面相同直接给高分，要判断简历是否有实际行为证据。

## 输出

{{
  "final_score": 0-100,
  "match_level": "High / Medium / Low",
  "breakdown": {{
    "skill_match": 0-100,
    "task_match": 0-100,
    "domain_match": 0-100
  }},
  "match_reasons": ["最多3条；指出 JD 要求和简历证据"],
  "gap_analysis": ["最多3条；指出 JD 明确要求但简历缺少证据的能力"],
  "risk_factors": ["最多3条；仅依据学历、级别、经历或关键要求的明确不匹配"],
  "resume_optimization_suggestions": [
    {{
      "section": "summary | skills | project | internship | education | other",
      "issue": "简历已有信息与该 JD 对齐不足的位置",
      "action": "针对该 JD 的具体修改动作",
      "example": "仅基于简历已有事实的参考改写；无法安全改写时填空字符串"
    }}
  ],
  "recommendation": "apply / maybe / not_recommended"
}}

final_score 暂按 skill_match*0.4 + task_match*0.4 + domain_match*0.2 计算。
resume_optimization_suggestions 最多4条，只能优化简历中已经存在的事实与证据。
不得虚构项目、职责、技能或量化数据；真实缺失的能力应保留在 gap_analysis，不得改写成候选人已经具备。
所有字段必须存在；没有内容的列表返回 []。"""

    result = await request_structured_json(
        [
            ChatMessage(role="system", content=system_message),
            ChatMessage(role="user", content=user_prompt),
        ],
        MatchAnalysis,
        [
            "final_score",
            "match_level",
            "breakdown",
            "match_reasons",
            "gap_analysis",
            "risk_factors",
            "resume_optimization_suggestions",
            "recommendation",
        ],
    )
    breakdown = result["breakdown"]
    final_score = round(
        breakdown["skill_match"] * 0.4
        + breakdown["task_match"] * 0.4
        + breakdown["domain_match"] * 0.2
    )
    result["final_score"] = final_score
    if final_score >= 80:
        result["match_level"] = "High"
        result["recommendation"] = "apply"
    elif final_score >= 60:
        result["match_level"] = "Medium"
        result["recommendation"] = "maybe"
    else:
        result["match_level"] = "Low"
        result["recommendation"] = "not_recommended"
    return MatchAnalysis.model_validate(result).model_dump()


async def full_analysis(jd_text: str | None = None, pdf_base64: str | None = None) -> dict:
    """Run analysis pipeline based on available inputs.
    
    - Only jd_text: runs JD structuring only
    - Only pdf_base64: runs Resume structuring only
    - Both: runs full 3-step analysis
    """
    result: dict = {}

    if jd_text and pdf_base64:
        # Full analysis: all 3 steps
        jd_structured = await structure_jd(jd_text)
        resume_structured = await structure_resume(pdf_base64)
        match_result = await evaluate_match(jd_structured, resume_structured)
        result["jd_analysis"] = jd_structured
        result["resume_analysis"] = resume_structured
        result["match_result"] = match_result
    elif jd_text:
        # JD only: structure JD
        jd_structured = await structure_jd(jd_text)
        result["jd_analysis"] = jd_structured
    elif pdf_base64:
        # Resume only: structure resume
        resume_structured = await structure_resume(pdf_base64)
        result["resume_analysis"] = resume_structured

    return result
