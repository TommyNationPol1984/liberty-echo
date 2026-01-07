# api/services/storage.py

import os
import aiofiles
from typing import Optional


class Storage:
    """
    Minimal storage abstraction.
    Replace with aioboto3 or azure blob client in production.
    """
    
    def __init__(self, base_dir: str = "storage"):
        self.base = base_dir
        os.makedirs(self.base, exist_ok=True)
        os.makedirs(os.path.join(self.base, "voices"), exist_ok=True)
        os.makedirs(os.path.join(self.base, "outputs"), exist_ok=True)
        os.makedirs(os.path.join(self.base, "uploads"), exist_ok=True)
        os.makedirs(os.path.join(self.base, "consents"), exist_ok=True)

    async def put_file(self, key: str, data: bytes) -> str:
        """Save file and return path."""
        path = os.path.join(self.base, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return path

    async def get_file(self, key: str) -> bytes:
        """Read file contents."""
        path = os.path.join(self.base, key)
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete_key(self, key: str) -> bool:
        """Delete file."""
        path = os.path.join(self.base, key)
        try:
            os.remove(path)
            return True
        except FileNotFoundError:
            return False

    def get_path(self, key: str) -> str:
        """Get full path for a key."""
        return os.path.join(self.base, key)

    def exists(self, key: str) -> bool:
        """Check if file exists."""
        path = os.path.join(self.base, key)
        return os.path.exists(path)
