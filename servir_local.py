# -*- coding: utf-8 -*-
"""Sirve la página en esta computadora como la sirve Vercel (vercel.json: "cleanUrls"): «/privacidad» entrega privacidad.html,
«/terminos#contacto» entrega terminos.html, y lo que no existe, 404.html con el código 404. Es para mirarla antes de publicar
(la demo la abre con «Ver pagina (demo).bat»); `python -m http.server` no resuelve esas direcciones y los enlaces del pie
daban 404. No se publica (.vercelignore).

    python servir_local.py [puerto]        (de fábrica 8000; sólo en 127.0.0.1)
"""
import http.server
import os
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent


class Pagina(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(AQUI), **k)

    def send_head(self):
        ruta = self.path.split("?", 1)[0].split("#", 1)[0]
        local = Path(self.translate_path(ruta))
        if ruta.endswith("/") and (local / "index.html").is_file():
            return super().send_head()
        if not local.exists() and local.with_name(local.name + ".html").is_file():
            self.path = ruta + ".html"
            return super().send_head()
        if not local.exists():
            pagina = AQUI / "404.html"
            cuerpo = pagina.read_bytes() if pagina.is_file() else b"No existe."
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            from io import BytesIO
            return BytesIO(cuerpo)
        return super().send_head()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(AQUI)
    with http.server.ThreadingHTTPServer(("127.0.0.1", puerto), Pagina) as s:
        print(f"La página en http://127.0.0.1:{puerto}/ (Ctrl+C para cerrar)")
        s.serve_forever()
