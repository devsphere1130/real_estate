from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

_url = get_settings().sqlalchemy_database_url
_kwargs = {"connect_args": {"check_same_thread": False}} if _url.startswith("sqlite") else {"pool_pre_ping": True}

engine = create_engine(_url, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


if _url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _record):
        # SQLite ignores ON DELETE CASCADE / SET NULL unless this is switched on.
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


class Base(DeclarativeBase):
    pass
