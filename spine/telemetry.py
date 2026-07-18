"""structlog config + correlation IDs (spec §13.1).

Every log line carries the bound correlation ids (trace_id, saga_id, job_id,
worker_id) so one agent call is reconstructable end-to-end.
"""
import logging
import sys

import structlog


def configure(level: int = logging.INFO) -> None:
    """Configure structlog to emit one JSON event per line to stdout."""
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,  # correlation ids
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def bind(**ids) -> None:
    """Bind correlation ids (trace_id, saga_id, job_id, worker_id) to the context."""
    structlog.contextvars.bind_contextvars(**{k: v for k, v in ids.items() if v is not None})


def clear() -> None:
    structlog.contextvars.clear_contextvars()


def get_logger(name: str | None = None):
    return structlog.get_logger(name)
