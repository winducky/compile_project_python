import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from fastapi.routing import APIRoute, _IncludedRouter
from fastapi.openapi.docs import get_swagger_ui_html
import swagger_ui_bundle

from api.router import router as api_router
from web.router import router as web_router
from api.stt.repo import get_session

app = FastAPI(title="Moonshine STT API", version="1.0.0", docs_url=None, redoc_url=None)

app.mount("/static", StaticFiles(directory="static"), name="static")

swagger_ui_path = os.path.join(
    os.path.dirname(swagger_ui_bundle.__file__),
    "vendor",
    "swagger-ui-4.15.5",
)
app.mount("/swagger-ui", StaticFiles(directory=swagger_ui_path), name="swagger-ui")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        openapi_version="3.0.3",
    )
    openapi_schema["components"]["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "x-api-key",
        }
    }
    for route in app.routes:
        if isinstance(route, _IncludedRouter):
            for ctx in route.effective_route_contexts():
                if getattr(ctx.endpoint, "__auth_required__", False):
                    path_item = openapi_schema["paths"].get(ctx.path_format)
                    if path_item:
                        for method in ctx.methods:
                            if method.lower() in path_item:
                                path_item[method.lower()].setdefault("security", []).append({"ApiKeyAuth": []})
        elif isinstance(route, APIRoute):
            if getattr(route.endpoint, "__auth_required__", False):
                path_item = openapi_schema["paths"].get(route.path)
                if path_item:
                    for method in route.methods:
                        if method.lower() in path_item:
                            path_item[method.lower()].setdefault("security", []).append({"ApiKeyAuth": []})
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
app.include_router(api_router)
app.include_router(web_router)


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="Moonshine STT API",
        swagger_js_url="/swagger-ui/swagger-ui-bundle.js",
        swagger_css_url="/swagger-ui/swagger-ui.css",
    )


@app.on_event("startup")
def startup():
    print("Loading Moonshine Vietnamese STT model...")
    try:
        get_session()
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Warning: Could not load model on startup: {e}")
        print("Model will be loaded on first request.")
