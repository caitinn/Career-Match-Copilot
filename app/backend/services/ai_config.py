"""Runtime AI configuration for the local Offer Catcher application."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv, set_key, unset_key


BACKEND_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(BACKEND_ENV_PATH, override=False)


@dataclass
class AIConfig:
    base_url: str
    api_key: str
    text_model: str


_runtime_config: Optional[AIConfig] = None


def is_ai_config_read_only() -> bool:
    return os.getenv("AI_CONFIG_READ_ONLY", "").lower() in ("1", "true", "yes")


def set_runtime_ai_config(base_url: str, api_key: str, text_model: str) -> None:
    global _runtime_config
    _runtime_config = AIConfig(
        base_url=base_url.rstrip("/"),
        api_key=api_key,
        text_model=text_model,
    )


def persist_ai_config(
    base_url: str,
    api_key: Optional[str],
    text_model: str,
) -> AIConfig:
    """Persist AI settings to the ignored backend .env file."""
    if is_ai_config_read_only():
        raise ValueError("线上环境的 AI 配置由部署平台环境变量管理")

    existing = get_ai_config()
    resolved_key = (api_key or "").strip() or (existing.api_key if existing else "")
    if not resolved_key:
        raise ValueError("首次配置时必须填写 API Key")

    BACKEND_ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKEND_ENV_PATH.touch(exist_ok=True)

    values = {
        "APP_AI_BASE_URL": base_url.rstrip("/"),
        "APP_AI_KEY": resolved_key,
        "APP_AI_TEXT_MODEL": text_model,
    }
    for key, value in values.items():
        set_key(str(BACKEND_ENV_PATH), key, value, quote_mode="never")
        os.environ[key] = value

    set_runtime_ai_config(
        base_url=values["APP_AI_BASE_URL"],
        api_key=values["APP_AI_KEY"],
        text_model=values["APP_AI_TEXT_MODEL"],
    )
    return _runtime_config


def clear_runtime_ai_config() -> None:
    global _runtime_config
    _runtime_config = None


def clear_persisted_ai_config() -> None:
    """Remove persisted AI settings while keeping unrelated .env values."""
    if is_ai_config_read_only():
        raise ValueError("线上环境的 AI 配置由部署平台环境变量管理")

    clear_runtime_ai_config()
    for key in ("APP_AI_BASE_URL", "APP_AI_KEY", "APP_AI_TEXT_MODEL"):
        if BACKEND_ENV_PATH.exists():
            unset_key(str(BACKEND_ENV_PATH), key)
        os.environ.pop(key, None)


def get_ai_config() -> Optional[AIConfig]:
    if _runtime_config:
        return _runtime_config

    base_url = os.getenv("APP_AI_BASE_URL", "").strip()
    api_key = os.getenv("APP_AI_KEY", "").strip()
    text_model = os.getenv("APP_AI_TEXT_MODEL", "gpt-5.4").strip()
    if not base_url or not api_key:
        return None

    return AIConfig(
        base_url=base_url.rstrip("/"),
        api_key=api_key,
        text_model=text_model or "gpt-5.4",
    )


def get_ai_config_status() -> dict:
    config = get_ai_config()
    if not config:
        return {
            "configured": False,
            "base_url": None,
            "text_model": None,
            "source": None,
        }

    return {
        "configured": True,
        "base_url": config.base_url,
        "text_model": config.text_model,
        "source": "saved" if BACKEND_ENV_PATH.exists() else "environment",
    }
