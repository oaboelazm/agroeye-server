import os
import logging
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file (useful when running locally outside docker)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

logger = logging.getLogger(__name__)

DB_USER = os.environ.get("MYSQL_USER")
DB_PASSWORD = os.environ.get("MYSQL_PASSWORD")
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = os.environ.get("MYSQL_DATABASE")

if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    raise ValueError("Database credentials (MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE) must be set in .env")

# URL-encode password to handle special characters (!, @, #, etc.)
DATABASE_URL = "mysql+pymysql://{user}:{password}@{host}/{dbname}".format(
    user=quote_plus(DB_USER),
    password=quote_plus(DB_PASSWORD),
    host=DB_HOST,
    dbname=DB_NAME
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Reconnect on stale connections (MySQL gone away)
    pool_recycle=3600,        # Recycle connections every hour
    pool_size=10,             # Maintain 10 connections in the pool
    max_overflow=20,          # Allow up to 20 overflow connections under load
    echo=False,               # Disable SQL echo in production
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

logger.info("Database engine configured for %s@%s/%s", DB_USER, DB_HOST, DB_NAME)