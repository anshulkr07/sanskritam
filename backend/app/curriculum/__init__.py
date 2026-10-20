"""The story course ("The Burnt Book"): content as data, checked, served.

Authors and agents edit YAML under ``content/`` (shapes: ``schema.py``).
``python -m app.curriculum check --engine`` must pass before anything ships;
``tests/test_curriculum.py`` runs the same checks in CI.

The server builds the pack once per process (like the Grammar guide) and
serves it from ``/learn/*`` (``app.routers.learn``). The app caches each
lesson by its hash, so new or fixed lessons go live with a backend deploy —
no app build, no OTA.

Spec: ``specs/learn-story/IMPLEMENTATION.md``.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from . import validate as validation  # the module; ``validate`` stays the module name
from .loader import CONTENT_DIR, CourseData, load
from .pack import Pack, build

logger = logging.getLogger("shabd.curriculum")


@lru_cache(maxsize=1)
def get_pack() -> Pack:
    """Load, validate (structure only) and build. Errors are logged, never
    raised: the pack leaves broken pieces out, and CI blocks them anyway."""
    data = load(CONTENT_DIR)
    issues = validation.validate(data)
    bad = validation.errors(issues)
    if bad:
        logger.error("course content has %d errors; first: %s", len(bad), bad[0])
    return build(data)


__all__ = ["CONTENT_DIR", "CourseData", "Pack", "build", "get_pack", "load", "validation"]
