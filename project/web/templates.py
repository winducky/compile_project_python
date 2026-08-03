import os
from jinja2 import Environment, FileSystemLoader
from starlette.templating import Jinja2Templates

templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(templates_dir),
    auto_reload=False,
)
templates = Jinja2Templates(env=jinja_env)
