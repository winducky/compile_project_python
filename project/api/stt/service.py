import os
import uuid
from fastapi import UploadFile
from api.stt.repo import load_audio, transcribe_audio
from api.stt.schema import TranscribeResponse


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}


def _convert_to_wav(src: str) -> str:
    from pydub import AudioSegment
    wav_path = os.path.splitext(src)[0] + "_converted.wav"
    audio = AudioSegment.from_file(src)
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    audio.export(wav_path, format="wav")
    return wav_path


def _save_upload(file: UploadFile) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "audio.wav")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".wav"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = file.file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    return filepath


def _cleanup(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception:
        pass


def process_audio_file(file: UploadFile) -> TranscribeResponse:
    filepath = _save_upload(file)
    wav_path = None
    try:
        ext = os.path.splitext(filepath)[1].lower()
        if ext != ".wav":
            wav_path = _convert_to_wav(filepath)
            _cleanup(filepath)
            audio_data, sample_rate = load_audio(wav_path)
        else:
            audio_data, sample_rate = load_audio(filepath)
        transcript = transcribe_audio(audio_data, sample_rate)
        lines = []
        for line in transcript.lines:
            lines.append({
                "text": line.text,
                "start_time": line.start_time,
                "duration": line.duration,
                "is_complete": line.is_complete,
            })
        full_text = " ".join(line.text for line in transcript.lines).strip()
        total_duration = len(audio_data) / sample_rate if sample_rate > 0 else 0
        return TranscribeResponse(
            text=full_text,
            language="vi",
            duration_seconds=total_duration,
            lines=lines,
        )
    finally:
        _cleanup(wav_path or filepath)
