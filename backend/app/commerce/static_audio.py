"""Prevent old static URLs bypassing signed book-audio delivery."""
from pathlib import PurePosixPath

from fastapi import HTTPException
from starlette.staticfiles import StaticFiles

from app.config import settings


class ProtectedAudioFiles(StaticFiles):
    async def get_response(self, path, scope):
        # These namespaces contain free instructional/cultural media. Book and
        # chant recordings, including unindexed files, always use commerce/media.
        normalized = PurePosixPath(path.replace("\\", "/"))
        free_namespaces = {"varnamala", "dialogue", "challenge", "grammar", "parva-art"}
        if settings.commerce_enabled and (".." in normalized.parts or not normalized.parts or normalized.parts[0] not in free_namespaces):
            raise HTTPException(403, "Use the current authorized audio link from the app")
        return await super().get_response(path, scope)
