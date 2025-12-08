"""Main application entry point"""
import logging
import sys
from contextlib import asynccontextmanager

from aiogram import Bot, Dispatcher
from aiogram.types import Update
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from bot import router as bot_router, payment_command_router
from api import api_router, payment_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Initialize bot and dispatcher
bot = Bot(token=settings.telegram_bot_token)
dp = Dispatcher()
dp.include_router(bot_router)
dp.include_router(payment_command_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting application...")

    # Set webhook if URL is provided
    if settings.telegram_webhook_url:
        webhook_url = f"{settings.telegram_webhook_url}{settings.telegram_webhook_path}"
        logger.info(f"Setting webhook to: {webhook_url}")
        await bot.set_webhook(webhook_url)
    else:
        logger.warning("No webhook URL provided, webhook not set")

    yield

    # Shutdown
    logger.info("Shutting down application...")
    await bot.delete_webhook()
    await bot.session.close()


# Create FastAPI app
app = FastAPI(
    title="Volleyball Community API",
    description="API for managing volleyball community with Telegram bot integration",
    version="1.0.0",
    lifespan=lifespan
)

# Include API routers
app.include_router(api_router)
app.include_router(payment_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Volleyball Community Bot API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post(settings.telegram_webhook_path)
async def telegram_webhook(request: Request):
    """
    Telegram webhook endpoint.
    Receives updates from Telegram and processes them.
    """
    try:
        update_dict = await request.json()
        update = Update(**update_dict)
        await dp.feed_update(bot, update)
        return JSONResponse(content={"ok": True})
    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        return JSONResponse(
            content={"ok": False, "error": str(e)},
            status_code=500
        )


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/ready")
async def ready():
    """Readiness check endpoint"""
    # You can add more sophisticated checks here
    # (e.g., database connectivity, webhook status)
    return {"status": "ready"}


def main():
    """Main entry point"""
    logger.info(f"Starting bot-api service on {settings.api_host}:{settings.api_port}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

    # Validate required settings
    if not settings.telegram_bot_token:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        sys.exit(1)

    if not settings.database_password:
        logger.error("Database password not configured!")
        sys.exit(1)

    # Run the application
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="info" if not settings.debug else "debug",
    )


if __name__ == "__main__":
    main()
