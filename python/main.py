"""
DATA SPORT - Backend en Python con FastAPI
Big Games 2026 - Sistema de gestión de torneos deportivos estudiantiles
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.routers import schools, sports, categories, teams, players, matches, events, statistics, standings, schedule, posts, individual_medals, venues

app = FastAPI(
    title="Data Sport API",
    description="API para gestión de torneos deportivos estudiantiles - Big Games 2026",
    version="1.0.0",
)

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(schools.router)
app.include_router(sports.router)
app.include_router(categories.router)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(matches.router)
app.include_router(events.router)
app.include_router(statistics.router)
app.include_router(standings.router)
app.include_router(schedule.router)
app.include_router(posts.router)
app.include_router(individual_medals.router)
app.include_router(venues.router)

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Data Sport", "version": "1.0.0"}


# Servir archivos estáticos (frontend) — debe ir al final
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    def serve_spa():
        return FileResponse(os.path.join(static_dir, "index.html"))

    @app.get("/{full_path:path}")
    def catch_all(full_path: str):
        index_path = os.path.join(static_dir, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        from fastapi import HTTPException
        raise HTTPException(status_code=404)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
