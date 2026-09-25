import os
import sys
import urllib.parse
from starlette.types import ASGIApp, Scope, Receive, Send

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ["VERCEL"] = "1"

from backend.main import app as raw_app

class VercelPathFixMiddleware:
    """
    On Vercel, requests to '/api/<path>' are rewritten to '/api/index.py?__route=<path>'.
    This middleware resets 'scope[\"path\"]' to '/api/<path>' and removes '__route'
    from query params, matching FastAPI's router exactly.
    """
    def __init__(self, asgi_app: ASGIApp):
        self.asgi_app = asgi_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            query_str = scope.get("query_string", b"").decode("utf-8")
            if "__route=" in query_str:
                params = urllib.parse.parse_qs(query_str)
                if "__route" in params:
                    route_sub = params["__route"][0].lstrip("/")
                    scope["path"] = f"/api/{route_sub}"
                    del params["__route"]
                    scope["query_string"] = urllib.parse.urlencode(params, doseq=True).encode("utf-8")
            elif scope.get("path") == "/api/index.py":
                # Check x-matched-path header
                headers = dict(scope.get("headers", []))
                matched = headers.get(b"x-matched-path", b"").decode("utf-8")
                if matched and not matched.endswith("index.py"):
                    scope["path"] = matched

        await self.asgi_app(scope, receive, send)

# In Vercel, 'app' is the primary ASGI entrypoint
app = VercelPathFixMiddleware(raw_app)
handler = app
