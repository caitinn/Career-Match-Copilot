"""API router for JD-Resume matching analysis."""
import logging
from fastapi import APIRouter, HTTPException

from schemas.analysis import (
    AIConfigRequest,
    AIConfigResponse,
    AnalysisRequest,
    AnalysisResponse,
    MatchRequest,
)
from services.ai_config import (
    clear_persisted_ai_config,
    get_ai_config_status,
    persist_ai_config,
)
from services.analysis import evaluate_match, full_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])


@router.get("/config", response_model=AIConfigResponse)
async def get_analysis_config():
    """Return non-secret information about the active AI configuration."""
    return AIConfigResponse(**get_ai_config_status())


@router.post("/config", response_model=AIConfigResponse)
async def update_analysis_config(data: AIConfigRequest):
    """Persist AI credentials to the local ignored backend .env file."""
    try:
        persist_ai_config(
            base_url=data.base_url,
            api_key=data.api_key,
            text_model=data.text_model,
        )
        return AIConfigResponse(**get_ai_config_status())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/config", response_model=AIConfigResponse)
async def delete_analysis_config():
    """Clear persisted and in-memory AI configuration."""
    clear_persisted_ai_config()
    return AIConfigResponse(**get_ai_config_status())


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_jd_resume(data: AnalysisRequest):
    """
    Analyze JD and/or Resume.
    - Only JD provided: runs JD structuring only
    - Only Resume provided: runs Resume structuring only
    - Both provided: runs full 3-step analysis (JD + Resume + Match)
    No auth required - public endpoint.
    """
    has_jd = data.jd_text is not None and data.jd_text.strip() != ""
    has_pdf = data.pdf_base64 is not None and data.pdf_base64.strip() != ""

    if not has_jd and not has_pdf:
        raise HTTPException(status_code=400, detail="请至少提供岗位JD或简历PDF之一")

    try:
        result = await full_analysis(
            jd_text=data.jd_text if has_jd else None,
            pdf_base64=data.pdf_base64 if has_pdf else None,
        )
        return AnalysisResponse(**result)
    except ValueError as e:
        logger.error(f"Analysis parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/match")
async def match_structured_analysis(data: MatchRequest):
    """Recalculate matching when either persisted JD or resume changes."""
    try:
        return await evaluate_match(data.jd_analysis, data.resume_analysis)
    except ValueError as e:
        logger.error(f"Match parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Match analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Match analysis failed: {str(e)}")
