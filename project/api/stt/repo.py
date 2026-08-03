import os
from typing import Optional
from moonshine_voice import (
    Transcriber,
    get_model_for_language,
    load_wav_file,
    ModelArch,
)

_transcriber: Optional[Transcriber] = None
_language: str = "vi"
_model_arch: Optional[ModelArch] = None


def get_session():
    global _transcriber, _language, _model_arch
    if _transcriber is None:
        model_path, model_arch = get_model_for_language(
            _language, _model_arch
        )
        _transcriber = Transcriber(model_path=model_path, model_arch=model_arch)
    return _transcriber


def close_session():
    global _transcriber
    if _transcriber is not None:
        _transcriber.close()
        _transcriber = None


def reload_model(language: str = "vi", model_arch: Optional[int] = None):
    global _transcriber, _language, _model_arch
    close_session()
    _language = language
    if model_arch is not None:
        _model_arch = ModelArch(model_arch)
    else:
        _model_arch = None
    return get_session()


def load_audio(file_path: str):
    return load_wav_file(file_path)


def transcribe_audio(audio_data: list[float], sample_rate: int):
    transcriber = get_session()
    transcript = transcriber.transcribe_without_streaming(
        audio_data, sample_rate=sample_rate
    )
    return transcript


def is_model_loaded() -> bool:
    return _transcriber is not None


def get_language() -> str:
    return _language
