from typing import Any

def ok(data: Any = None, message: str = "Success"):
    return {"success": True, "message": message, "data": data}


def error(message: str = "Error", status_code: int = 400):
    return {"success": False, "message": message, "status_code": status_code}
