"""Rate limiting via slowapi.

Sliding-window in-memory limiter keyed by client IP. For multi-worker / multi-host
deployments swap the storage backend (e.g. Redis) by setting
``SLOWAPI_STORAGE_URI`` in the environment.
"""

from __future__ import annotations

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Honour X-Forwarded-For when running behind nginx/Traefik.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("SLOWAPI_STORAGE_URI", "memory://"),
    headers_enabled=True,
)
