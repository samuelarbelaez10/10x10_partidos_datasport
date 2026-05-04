"""
DATA SPORT - Backend en Python con FastAPI
Big Games 2026 - Sistema de gestión de torneos deportivos estudiantiles
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os


class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        # No-cache para index.html (sirve en / y cualquier ruta SPA) y archivos estáticos
        if path.startswith("/static/") or not path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

from app.routers import schools, sports, categories, teams, players, matches, events, statistics, standings, schedule, posts, individual_medals, venues, tournaments

app = FastAPI(
    title="Data Sport API",
    description="API para gestión de torneos deportivos estudiantiles - Big Games 2026",
    version="1.0.0",
)

# No cache para archivos estáticos
app.add_middleware(NoCacheStaticMiddleware)

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
app.include_router(tournaments.router)

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

    @app.get("/landing")
    def serve_landing():
        return FileResponse(os.path.join(static_dir, "landing.html"))

    @app.get("/aviso-legal")
    def serve_aviso_legal():
        return FileResponse(os.path.join(static_dir, "aviso-legal.html"))

    @app.get("/privacidad")
    def serve_privacidad():
        return FileResponse(os.path.join(static_dir, "privacidad.html"))

    @app.get("/terminos")
    def serve_terminos():
        return FileResponse(os.path.join(static_dir, "terminos.html"))

    @app.get("/robots.txt")
    def robots_txt():
        from fastapi.responses import PlainTextResponse
        body = (
            "User-agent: *\n"
            "Allow: /\n"
            "Disallow: /api/\n"
            "\n"
            "Sitemap: https://datagames.co/sitemap.xml\n"
        )
        return PlainTextResponse(body, headers={"Cache-Control": "public, max-age=86400"})

    @app.get("/sitemap.xml")
    def sitemap_xml():
        from fastapi.responses import Response
        urls = [
            ("https://datagames.co/landing",     "1.0", "monthly"),
            ("https://datagames.co/aviso-legal", "0.3", "yearly"),
            ("https://datagames.co/privacidad",  "0.3", "yearly"),
            ("https://datagames.co/terminos",    "0.3", "yearly"),
        ]
        items = "\n".join(
            f'  <url><loc>{loc}</loc><priority>{p}</priority><changefreq>{c}</changefreq></url>'
            for loc, p, c in urls
        )
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f'{items}\n'
            '</urlset>\n'
        )
        return Response(content=body, media_type="application/xml",
                        headers={"Cache-Control": "public, max-age=86400"})

    # OG image generado dinámicamente para previews de WhatsApp/redes
    _og_cache: dict = {}

    @app.get("/static/og-datagames.png")
    def og_image():
        from fastapi.responses import Response
        if "png" not in _og_cache:
            from PIL import Image, ImageDraw, ImageFont
            import io

            W, H = 1200, 630
            img = Image.new("RGB", (W, H), color=(8, 8, 12))
            d = ImageDraw.Draw(img)

            # Fondo: gradiente radial azul tenue (manual con círculos concéntricos)
            cx, cy = W // 2, int(H * 0.42)
            for i in range(180, 0, -8):
                alpha = int(30 * (1 - i / 180))
                if alpha <= 0:
                    continue
                d.ellipse(
                    [cx - i * 4, cy - i * 3, cx + i * 4, cy + i * 3],
                    fill=(20 + alpha // 4, 32 + alpha // 3, 70 + alpha),
                )

            # Lambda azul (∧)
            apex_x, apex_y = cx, int(H * 0.22)
            base_y = int(H * 0.52)
            stroke_w = 22
            half = 95
            # Antialias suave: dibujamos varias líneas
            for off in range(stroke_w // 2, -1, -1):
                color = (96 + off, 165 + off, 250) if off else (191, 219, 254)
                d.line([(apex_x - off, apex_y), (apex_x - half - off, base_y)], fill=color, width=4)
                d.line([(apex_x + off, apex_y), (apex_x + half + off, base_y)], fill=color, width=4)
            # Línea central limpia azul
            d.line([(apex_x, apex_y), (apex_x - half, base_y)], fill=(37, 99, 235), width=18)
            d.line([(apex_x, apex_y), (apex_x + half, base_y)], fill=(37, 99, 235), width=18)

            # Cargar fuente (default si no encuentra)
            def font(sz, bold=True):
                # En Cloud Run, fuentes en /usr/share/fonts. Fallback a default.
                candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "DejaVuSans-Bold.ttf",
                    "arial.ttf",
                ]
                for c in candidates:
                    try:
                        return ImageFont.truetype(c, sz)
                    except Exception:
                        continue
                return ImageFont.load_default()

            # Títulos DATA y GAMES alrededor del lambda
            f_brand = font(54)
            data_text = "DATA"
            games_text = "GAMES"
            dw = d.textlength(data_text, font=f_brand)
            gw = d.textlength(games_text, font=f_brand)
            d.text((apex_x - half - 30 - dw, base_y - 50), data_text, fill=(191, 219, 254), font=f_brand)
            d.text((apex_x + half + 30, base_y - 50), games_text, fill=(96, 165, 250), font=f_brand)

            # Headline grande
            f_head = font(58)
            head1 = "El deporte estudiantil"
            head2 = "pasa a otra liga."
            h1w = d.textlength(head1, font=f_head)
            h2w = d.textlength(head2, font=f_head)
            d.text(((W - h1w) // 2, int(H * 0.66)), head1, fill=(255, 255, 255), font=f_head)
            d.text(((W - h2w) // 2, int(H * 0.74)), head2, fill=(96, 165, 250), font=f_head)

            # Sub
            f_sub = font(26, bold=False)
            sub = "Marcadores en vivo · Estadísticas · Acceso público vía QR"
            sw = d.textlength(sub, font=f_sub)
            d.text(((W - sw) // 2, int(H * 0.86)), sub, fill=(160, 180, 210), font=f_sub)

            # URL
            f_url = font(22)
            url = "datagames.co"
            uw = d.textlength(url, font=f_url)
            d.text(((W - uw) // 2, int(H * 0.93)), url, fill=(96, 165, 250), font=f_url)

            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            _og_cache["png"] = buf.getvalue()

        return Response(content=_og_cache["png"], media_type="image/png")

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
