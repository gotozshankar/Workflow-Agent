# logger_config.py
import logging
import os

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

def setup_logger(name: str) -> logging.Logger:
    """
    Returns a logger configured with Stream + File handlers.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        # Stream (console) - ensure UTF-8 encoding to avoid Windows cp1252 errors
        import sys
        import io

        try:
            sh = logging.StreamHandler()
            # Prefer reconfigure if available (Python 3.7+)
            if hasattr(sh.stream, 'reconfigure'):
                try:
                    sh.stream.reconfigure(encoding='utf-8', errors='backslashreplace')
                except Exception:
                    pass
            else:
                try:
                    sh.stream = io.TextIOWrapper(getattr(sys.stdout, 'buffer', sys.stdout), encoding='utf-8', errors='backslashreplace')
                except Exception:
                    pass

            sh.setFormatter(logging.Formatter(LOG_FORMAT))
            logger.addHandler(sh)
        except Exception:
            # Fallback to default stream handler
            sh = logging.StreamHandler()
            sh.setFormatter(logging.Formatter(LOG_FORMAT))
            logger.addHandler(sh)

        # Optional: write logs to a file (ephemeral on Azure!) with UTF-8 encoding
        try:
            file_handler = logging.FileHandler("app.log", mode="a", encoding='utf-8')
            file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
            logger.addHandler(file_handler)
        except Exception:
            # If file handler can't be created, continue without file logging
            pass

    return logger
