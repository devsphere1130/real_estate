from functools import lru_cache
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173"
    upload_dir: str = "uploads"
    max_upload_mb: int = 8
    lead_rate_limit: int = 5
    lead_rate_window_seconds: int = 600
    trust_proxy_headers: bool = False
    docs_enabled: bool = True
    timezone: str = "Asia/Kolkata"
    site_url: str = "http://localhost:5173"

    # Where listing photos are stored: "local" (the uploads folder), "cloudinary", or "auto"
    # (Cloudinary when its credentials are set, otherwise local).
    storage_backend: str = "auto"
    cloudinary_url: str = ""  # cloudinary://API_KEY:API_SECRET@CLOUD_NAME (as shown in the Cloudinary dashboard)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "real-estate/properties"

    @property
    def cloudinary_credentials(self) -> tuple[str, str, str] | None:
        """(cloud name, API key, API secret) from CLOUDINARY_URL or the three separate variables."""
        if self.cloudinary_url.startswith("cloudinary://"):
            parsed = urlparse(self.cloudinary_url)
            if parsed.hostname and parsed.username and parsed.password:
                return parsed.hostname, unquote(parsed.username), unquote(parsed.password)
        if self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret:
            return self.cloudinary_cloud_name, self.cloudinary_api_key, self.cloudinary_api_secret
        return None

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_upload_dir(self) -> Path:
        # Vercel serverless functions can only write to /tmp.
        if os.getenv("VERCEL"):
            return Path("/tmp/uploads")
        return Path(self.upload_dir)


@lru_cache
def get_settings() -> Settings:
    return Settings()
