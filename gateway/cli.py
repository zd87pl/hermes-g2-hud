"""CLI for the Hermes WS Gateway."""

import argparse
import logging
import os
import sys

import uvicorn


def main():
    parser = argparse.ArgumentParser(
        description="Hermes WS Gateway — bridges G2 glasses to Hermes AI"
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("HERMES_GATEWAY_HOST", "0.0.0.0"),
        help="Host to bind to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("HERMES_GATEWAY_PORT", "9090")),
        help="Port to listen on (default: 9090)",
    )
    parser.add_argument(
        "--callback-url",
        default=os.environ.get("HERMES_CALLBACK_URL", ""),
        help="URL for Hermes command callback (e.g., http://localhost:8080)",
    )
    parser.add_argument(
        "--log-level",
        default=os.environ.get("LOG_LEVEL", "info"),
        choices=["debug", "info", "warning", "error"],
        help="Log level (default: info)",
    )
    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stderr,
    )

    logger = logging.getLogger("hermes-gateway")
    logger.info(f"Starting Hermes WS Gateway on {args.host}:{args.port}")

    if args.callback_url:
        logger.info(f"Command callback URL: {args.callback_url}")
    else:
        logger.info("No callback URL set — external commands disabled")

    # Import and run
    from gateway.server import create_app

    app = create_app(command_callback_url=args.callback_url)

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=args.log_level,
    )


if __name__ == "__main__":
    main()
