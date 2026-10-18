"""
WSGI entry point for hosts that can't run ASGI directly (PythonAnywhere free plan,
cPanel "Setup Python App"). Docker/VPS keeps using uvicorn + app.main:app.

PythonAnywhere: in the web app's WSGI configuration file, add the backend folder to
sys.path and `from wsgi import application`.
"""
import asyncio
import os
import sys
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from a2wsgi import ASGIMiddleware
from app.main import app
from app.models import engine, init_db


async def _init():
    # The WSGI bridge doesn't send ASGI startup events, so create tables here.
    # Dispose afterwards: pooled connections must not stay bound to this temporary loop.
    await init_db()
    await engine.dispose()


asyncio.run(_init())

# ASGIMiddleware starts its event-loop thread when constructed. uWSGI (PythonAnywhere)
# imports this file in the master and then forks workers, which don't inherit threads,
# so requests would hang forever. Build it lazily inside the worker instead.
_bridge = None
_bridge_lock = threading.Lock()


def application(environ, start_response):
    global _bridge
    if _bridge is None:
        with _bridge_lock:
            if _bridge is None:
                _bridge = ASGIMiddleware(app)
    return _bridge(environ, start_response)
