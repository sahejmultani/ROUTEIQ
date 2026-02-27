from fastapi import FastAPI

from app.routers import heatmap

app = FastAPI(
    title="RouteIQ API",
    description="Backend for fleet heatmap and risk analysis",
    version="0.1.0",
)

app.include_router(heatmap.router)


@app.get("/")
def root():
    return {"message": "RouteIQ backend is running"}
