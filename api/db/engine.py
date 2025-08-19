from sqlmodel import create_engine
import os

# get required enviironment variables
db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASS")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_database = os.getenv("DB_DATABASE")

# raise error if any of the required variables are not set
if not all([db_user, db_pass, db_host, db_port, db_database]):
    raise ValueError("Required environment variables are not set to conenct to MySQL db")

DB_ENGINE = create_engine(
    f"mysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_database}"
    )