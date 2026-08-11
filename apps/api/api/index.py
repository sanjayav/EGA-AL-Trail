"""Vercel serverless entrypoint.

The classic @vercel/python builder auto-detects api/*.py, pip-installs
requirements.txt into the function bundle, and serves the ASGI `app`.
Everything real lives in dpp_api; vercel.json rewrites all paths here.
"""

import os
import sys

# The function bundle root is the apps/api directory; make dpp_api importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dpp_api.main import app

__all__ = ["app"]
