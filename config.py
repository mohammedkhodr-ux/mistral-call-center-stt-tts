"""Configuration management for DDA Voice Chat Agent."""

import json
import os
from pathlib import Path
from pydantic import BaseModel, Field

CONFIG_FILE = Path(__file__).parent / "config.json"

DEFAULT_SYSTEM_PROMPT_EN = (
    "You are a helpful government services assistant for the Digital Dubai Authority (DDA). "
    "You help citizens of Dubai with government services including visa applications, "
    "business licensing, utility payments, housing services, healthcare, education, "
    "and general inquiries about Dubai government services. "
    "Be polite, professional, and concise. If you don't know something, direct the citizen "
    "to the appropriate government portal or office. Always respond in English."
)

DEFAULT_SYSTEM_PROMPT_AR = (
    "أنت مساعد خدمات حكومية مفيد لهيئة دبي الرقمية. "
    "تساعد مواطني دبي في الخدمات الحكومية بما في ذلك طلبات التأشيرات، "
    "تراخيص الأعمال، دفع فواتير المرافق، خدمات الإسكان، الرعاية الصحية، التعليم، "
    "والاستفسارات العامة حول الخدمات الحكومية في دبي. "
    "كن مهذباً ومحترفاً وموجزاً. إذا كنت لا تعرف شيئاً، وجّه المواطن "
    "إلى البوابة الحكومية أو المكتب المناسب. أجب دائماً باللغة العربية."
)


class AppConfig(BaseModel):
    """Application configuration."""

    # Model settings
    chat_model: str = Field(default="mistral-small-latest")
    stt_model: str = Field(default="voxtral-mini-latest")
    tts_model: str = Field(default="voxtral-mini-tts-2603")

    # Generation parameters
    temperature: float = Field(default=0.3, ge=0.0, le=1.5)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1024, ge=1, le=32768)

    # Language
    language: str = Field(default="en")  # "en" or "ar"

    # TTS settings
    voice_id: str = Field(default="gb_jane_neutral")
    tts_response_format: str = Field(default="wav")  # pcm, wav, mp3, flac, opus
    custom_voice_audio_b64: str | None = Field(default=None)

    # STT settings
    stt_diarize: bool = Field(default=False)

    # System prompts
    system_prompt_en: str = Field(default=DEFAULT_SYSTEM_PROMPT_EN)
    system_prompt_ar: str = Field(default=DEFAULT_SYSTEM_PROMPT_AR)

    @property
    def system_prompt(self) -> str:
        return self.system_prompt_ar if self.language == "ar" else self.system_prompt_en


def load_config() -> AppConfig:
    """Load config from disk or return defaults."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            data = json.load(f)
        return AppConfig(**data)
    return AppConfig()


def save_config(config: AppConfig) -> None:
    """Persist config to disk."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config.model_dump(exclude={"custom_voice_audio_b64"}), f, indent=2, ensure_ascii=False)
