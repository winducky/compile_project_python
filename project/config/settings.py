import os

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}
DEBUG = os.environ.get("DEBUG", "true").lower() == "true"
API_KEY = os.environ.get("API_KEY", "moonshine-stt-key-2024")
