import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.config import get_settings


class SlidingWindowLimiter:
    """In-memory per-key limiter. Good for one server process; use Redis if you run several workers."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window: int) -> int | None:
        """Record a hit. Returns None if allowed, else seconds until the client may retry."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= window:
                hits.popleft()
            if len(hits) >= limit:
                return max(1, int(window - (now - hits[0])))
            hits.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


lead_limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit_lead_submissions(request: Request) -> None:
    s = get_settings()
    retry_after = lead_limiter.check(client_ip(request), s.lead_rate_limit, s.lead_rate_window_seconds)
    if retry_after is not None:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many enquiries from this connection. Please try again later or WhatsApp us.",
            headers={"Retry-After": str(retry_after)},
        )
