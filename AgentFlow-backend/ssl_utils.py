

from typing import Optional
import logging
logger = logging.getLogger(__name__)



def create_ssl_safe_session(verify: bool = False, timeout: int = 30):
    """
    Create a requests.Session with SSL verification disabled.
    
    Args:
        verify: Whether to verify SSL certificates (default False for dev)
        timeout: Default timeout in seconds
        
    Returns:
        Configured requests.Session object
    """
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    
    session = requests.Session()
    
    # Disable SSL verification for development
    session.verify = verify
    
    # Add retry strategy for transient network issues
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    # Set default timeout
    session.timeout = timeout
    
    logger.debug(f"✅ Created SSL-safe session (verify={verify}, timeout={timeout}s)")
    return session


def create_n8n_session(api_key: Optional[str] = None):
    """
    Create a session configured for n8n API requests.
    
    Args:
        api_key: Optional N8N_API_KEY for authentication
        
    Returns:
        Configured session with n8n headers
    """
    import requests
    
    session = create_ssl_safe_session(verify=False)
    
    # Add n8n-specific headers
    session.headers.update({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    
    # Add API key if provided
    if api_key:
        api_key_clean = api_key.strip('"').strip("'")
        session.headers['X-N8N-API-KEY'] = api_key_clean
        logger.debug("✅ Added N8N_API_KEY to session headers")
    
    return session