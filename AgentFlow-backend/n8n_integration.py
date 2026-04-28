from requests.sessions import Session

# Import SSL utilities for HTTPS/Windows compatibility
from ssl_utils import create_n8n_session
import os
from logger_config import setup_logger
logger = setup_logger("app")

_n8n_session = None 
def get_n8n_session() -> Session:
    """Get or create a persistent n8n session with SSL handling for Render"""
    global _n8n_session
    if _n8n_session is None:
        _n8n_session = create_n8n_session(api_key=os.getenv('N8N_API_KEY'))
        logger.info("✅ Created persistent n8n session with SSL support")
    return _n8n_session