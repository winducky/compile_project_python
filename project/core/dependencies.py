from fastapi import Request
from config.database import get_session, close_session


def resolve_db(request: Request):
    db = get_session()
    request.state.db = db
    return db
