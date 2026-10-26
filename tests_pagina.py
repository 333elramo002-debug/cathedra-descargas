#!/usr/bin/env python3
"""
Chequeo de la página pública de Cathedra. Se corre desde la raíz del repo, de dos maneras:

    python3 tests_pagina.py                                    # imprime cada chequeo y termina con 1 si algo falla
    python3 -m pytest tests_pagina.py -q -p no:cacheprovider   # lo mismo, como pruebas

Qué verifica (sin navegador):
  · un solo botón de descarga en index.html (el único con data-descarga), y ENLACE_INSTALADOR
    en pagina.js apunta a un instalador por https;
  · ningún recurso externo: fuera del sitio sólo se pide el instalador (las direcciones absolutas
    propias viven únicamente en las etiquetas para compartir, que lo exigen);
  · ninguna palabra prohibida en el texto visible (precio, gratis, beta fuera de las legales,
    modelo, API, placa, tokens, JSON, WebGL, shader, nombres de proveedores...);
  · cada página declara lang="es-AR", charset utf-8 y viewport;
  · el peso: cada imagen servida <= 2 MB y lo público < 16 MB (sin lo de antes, en las carpetas _anterior, que no se
    publica). Lo que baja de verdad un visitante (un solo tamaño y un solo formato de cada pantalla, y sólo al llegar)
    se mide en el navegador: la portada, <= 1,5 MB;
  · cada pantalla de la app (imagenes/app/<nombre>) tiene sus 1280 y 1920 en avif y webp, y el visor las encuentra;
  · la sección de descarga dice la versión;
  · existen las legales (privacidad, términos, cookies) y 404.html; vercel.json sirve las direcciones
    limpias; todos los enlaces internos (y los anclas) resuelven;
  · el CSS respeta prefers-reduced-motion por sí solo y la página se ve sin JS;
  · (d66, el manual de producción visual) el héroe de §04: titular, botón principal cherry y secundario de borde fino,
    la barra de marca con su navegación breve y Oscuro / Claro, y la composición en capas con sus tamaños en avif y webp
    (la escena de 1920 <= 450 KB); el atlas de §05: cinco paneles con su ficha técnica, las imágenes de nombre fijo y sus
    variantes al día (imagenes/atlas/derivadas.json); el movimiento de §14 y §16: reposo sólo en el héroe, @keyframes
    sólo con transform y opacity, a lo sumo dos superficies con desenfoque, y la clara de fábrica.

Con Chromium (si hay uno; se busca en CATHEDRA_NAVEGADOR_PRUEBAS, /opt/pw-browsers/chromium o el de
Playwright), además sirve el repo en un puerto libre y mira la página de verdad:
  · ninguna petición sale del sitio (normal y ?quieto); sin errores de JS;
  · un solo enlace al instalador, el que tiene data-descarga;
  · con «reducir movimiento» del sistema nada se anima y la carga no aparece; sin JS la página se ve;
  · «Descargar» de la cabecera llega a la sección (celular y escritorio) y el foco pasa a ella;
  · el bloque «Tu computadora» aparece en Windows, con un paquete del catálogo, y no en otros sistemas;
  · a 390px no hay desborde horizontal.
"""
from __future__ import annotations

import functools
import http.server
import json
import os
import re
import socket
import sys
import threading
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PAGINAS = ["index.html", "404.html", "privacidad.html", "terminos.html", "cookies.html"]
LEGALES = {"privacidad.html", "terminos.html", "cookies.html"}
GUIONES = ["pagina.js", "demos.js"]
HOJAS = ["estilos.css"]
# lo de antes (la identidad Ónix/Candy, el héroe del libro, la dirección visual): queda en el repositorio pero no se
# publica (.vercelignore), así que no cuenta en el peso
NO_PUBLICO = {"_anterior", "imagenes/_anterior", "fuentes/_anterior"}
PESO_MAXIMO = 16 * 1000 * 1000         # d60: las 19 pantallas nuevas de la app, en dos tamaños y dos formatos; d80: más las
                                       # composiciones 3D de las secciones (imagenes/secciones, ~7 MB: 10 × 2 temas × 2 anchos ×
                                       # 2 formatos). Un visitante baja una sola variante y sólo al acercarse (la portada, <= 1,5 MB)
IMAGEN_MAXIMA = 2 * 1000 * 1000        # cada imagen servida
UA_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# lo que el alumno nunca tiene que leer: nada técnico, nada de precios, ningún proveedor
PROHIBIDAS = [
    (r"\bprecios?\b", "precio"), (r"\bgratis\b", "gratis"), (r"\bgratuit[oa]s?\b", "gratuito"),
    (r"\bfree\b", "free"), (r"\bsin cargo\b", "sin cargo"), (r"\bprueba gratuita\b", "prueba gratuita"),
    (r"\bmodelos?\b", "modelo"), (r"\bAPIs?\b", "API"), (r"\bplacas?\b", "placa"), (r"\btokens?\b", "tokens"),
    (r"\bJSON\b", "JSON"), (r"\bWebGL2?\b", "WebGL"), (r"\bshaders?\b", "shader"),
    (r"\b(GPU|CPU|VRAM|RAM|CUDA)\b", "pieza de la computadora"),
    (r"\b(OpenAI|ChatGPT|GPT|Anthropic|Claude|Gemini|Whisper|Llama|Ollama|Mistral|DeepSeek|Qwen|Gemma|"
     r"OpenRouter|Groq|Hugging ?Face|Azure|Bedrock|Cohere|ElevenLabs|Copilot|Vercel|GitHub)\b", "proveedor"),
]
BETA = (r"\bbeta\b", "beta (sólo en las legales)")


# ─────────────────────────── lo que se lee de los archivos ───────────────────────────
def leer(nombre: str) -> str:
    return (RAIZ / nombre).read_text(encoding="utf-8")


def sin_comentarios_html(texto: str) -> str:
    return re.sub(r"<!--.*?-->", "", texto, flags=re.S)


def sin_comentarios_css(texto: str) -> str:
    return re.sub(r"/\*.*?\*/", "", texto, flags=re.S)


def sin_comentarios_js(texto: str) -> str:
    texto = re.sub(r"/\*.*?\*/", "", texto, flags=re.S)
    # «//» sólo al principio de la línea o después de un espacio o un signo de código: no el de «https://»
    return re.sub(r"(^|[\s;{}(,=])//[^\n]*", r"\1", texto)


class TextoVisible(HTMLParser):
    """Junta lo que un alumno puede leer: el texto, y los atributos que se muestran o se leen en voz alta."""
    ATRIBUTOS = {"alt", "title", "aria-label", "placeholder", "data-texto", "data-nombre", "value"}
    METAS = {"description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.trozos: list[str] = []
        self.omitiendo = 0
        self.ids: set[str] = set()
        self.enlaces: list[tuple[str, str]] = []      # (atributo, valor) de todo lo que apunta a algo
        self.urls_meta: list[str] = []
        self.pantallas: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self.omitiendo += 1
        if a.get("id"):
            self.ids.add(a["id"])
        for k, v in attrs:
            if v is None:
                continue
            if k in self.ATRIBUTOS:
                self.trozos.append(v)
            if k in ("href", "src", "poster", "data"):
                self.enlaces.append((k, v))
            elif k == "srcset":                       # cada candidato del srcset, no sólo el primero
                for candidato in v.split(","):
                    if candidato.strip():
                        self.enlaces.append((k, candidato.strip().split()[0]))
            elif k in ("data-grande", "data-ampliar"):  # la base de una pantalla de la app: <base>-{1280,1920}.{avif,webp}
                self.pantallas.append(v)
        if tag == "meta":
            clave = a.get("name") or a.get("property") or ""
            if clave in self.METAS and a.get("content"):
                self.trozos.append(a["content"])
            if a.get("content") and re.search(r"https?://", a["content"]):
                self.urls_meta.append(a["content"])

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.omitiendo:
            self.omitiendo -= 1

    def handle_data(self, data):
        if not self.omitiendo and data.strip():
            self.trozos.append(data)


@functools.lru_cache(maxsize=None)
def analizar(pagina: str) -> TextoVisible:
    p = TextoVisible()
    p.feed(sin_comentarios_html(leer(pagina)))
    return p


def frases_js(nombre: str) -> list[str]:
    """Las cadenas con espacios de un .js: lo que puede terminar escrito en la pantalla."""
    codigo = sin_comentarios_js(leer(nombre))
    cadenas = re.findall(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'|`(?:[^`\\]|\\.)*`', codigo)
    return [c[1:-1] for c in cadenas if " " in c]


def buscar_prohibidas(texto: str, con_beta: bool) -> list[str]:
    halladas = []
    for patron, nombre in PROHIBIDAS + ([BETA] if con_beta else []):
        for m in re.finditer(patron, texto, flags=re.I):
            inicio, fin = max(0, m.start() - 30), min(len(texto), m.end() + 30)
            contexto = re.sub(r"\s+", " ", texto[inicio:fin]).strip()
            halladas.append(f"«{m.group(0)}» ({nombre}): …{contexto}…")
    return halladas


def enlace_instalador() -> str:
    m = re.search(r'^const ENLACE_INSTALADOR = "([^"]+)";', leer("pagina.js"), flags=re.M)
    return m.group(1) if m else ""


# ─────────────────────────── los chequeos sin navegador ───────────────────────────
ESTATICOS: list[tuple[str, callable]] = []


def estatico(nombre):
    def registrar(fn):
        ESTATICOS.append((nombre, fn))
        return fn
    return registrar


@estatico("un solo botón de descarga, al instalador")
def un_solo_boton() -> list[str]:
    problemas = []
    for pagina in PAGINAS:
        cuantos = len(re.findall(r"<a\b[^>]*\bdata-descarga\b", sin_comentarios_html(leer(pagina))))
        esperados = 1 if pagina == "index.html" else 0
        if cuantos != esperados:
            problemas.append(f"{pagina}: {cuantos} botones con data-descarga (se esperaba {esperados})")
    enlace = enlace_instalador()
    if not enlace.startswith("https://") or not enlace.lower().endswith(".exe"):
        problemas.append(f"pagina.js: ENLACE_INSTALADOR tiene que ser https y terminar en .exe: {enlace!r}")
    if "[data-descarga]" not in leer("pagina.js"):
        problemas.append("pagina.js: nadie le pone ENLACE_INSTALADOR al botón [data-descarga]")
    return problemas


@estatico("sin recursos externos")
def sin_recursos_externos() -> list[str]:
    problemas = []
    enlace = enlace_instalador()
    url = re.compile(r"https?://[^\s\"'()<>]+")
    for pagina in PAGINAS:
        limpio = sin_comentarios_html(leer(pagina))
        permitidas = set(url.findall(" ".join(analizar(pagina).urls_meta)))
        for u in url.findall(limpio):
            if u not in permitidas:
                problemas.append(f"{pagina}: {u}")
        for atributo, valor in analizar(pagina).enlaces:
            if valor.startswith("//"):
                problemas.append(f"{pagina}: {atributo}={valor!r} (dirección sin protocolo, sale del sitio)")
    for guion in GUIONES:
        for u in url.findall(sin_comentarios_js(leer(guion))):
            if u != enlace:
                problemas.append(f"{guion}: {u}")
    for hoja in HOJAS:
        limpio = sin_comentarios_css(leer(hoja))
        for u in url.findall(limpio):
            problemas.append(f"{hoja}: {u}")
        if re.search(r"@import\b", limpio):
            problemas.append(f"{hoja}: @import")
        for u in re.findall(r"url\(\s*['\"]?//[^)]*\)", limpio):
            problemas.append(f"{hoja}: {u}")
    return problemas


@estatico("sin palabras prohibidas en lo visible")
def sin_palabras_prohibidas() -> list[str]:
    problemas = []
    for pagina in PAGINAS:
        texto = "\n".join(analizar(pagina).trozos)
        problemas += [f"{pagina}: {h}" for h in buscar_prohibidas(texto, con_beta=pagina not in LEGALES)]
    for guion in GUIONES:
        texto = "\n".join(frases_js(guion))
        problemas += [f"{guion}: {h}" for h in buscar_prohibidas(texto, con_beta=True)]
    return problemas


@estatico("es-AR, utf-8 y viewport en cada página")
def idioma_y_viewport() -> list[str]:
    problemas = []
    for pagina in PAGINAS:
        cabeza = leer(pagina)[:3000]
        if not re.search(r'<html\b[^>]*\blang="es-AR"', cabeza):
            problemas.append(f"{pagina}: falta lang=\"es-AR\" en <html>")
        if not re.search(r'<meta charset="utf-8">', cabeza, flags=re.I):
            problemas.append(f"{pagina}: falta <meta charset=\"utf-8\">")
        m = re.search(r'<meta name="viewport" content="([^"]*)"', cabeza)
        if not m or "width=device-width" not in m.group(1) or "initial-scale=1" not in m.group(1):
            problemas.append(f"{pagina}: falta el viewport con width=device-width e initial-scale=1")
        elif re.search(r"user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b", m.group(1)):
            problemas.append(f"{pagina}: el viewport no deja hacer zoom")
    return problemas


def peso_publico() -> int:
    total = 0
    for archivo in RAIZ.rglob("*"):
        if not archivo.is_file():
            continue
        relativo = archivo.relative_to(RAIZ).as_posix()
        if relativo.startswith(".git/") or relativo == Path(__file__).name or relativo.startswith("__pycache__"):
            continue
        if any(relativo == n or relativo.startswith(n + "/") for n in NO_PUBLICO):
            continue
        total += archivo.stat().st_size
    return total


@estatico("cada imagen <= 2 MB y lo público < 16 MB")
def peso() -> list[str]:
    problemas = []
    total = peso_publico()
    if total >= PESO_MAXIMO:
        problemas.append(f"pesa {total / 1e6:.2f} MB (tope {PESO_MAXIMO / 1e6:.0f} MB)")
    for archivo in (RAIZ / "imagenes").rglob("*"):
        relativo = archivo.relative_to(RAIZ).as_posix()
        if archivo.is_file() and not any(relativo.startswith(n + "/") for n in NO_PUBLICO) and archivo.stat().st_size > IMAGEN_MAXIMA:
            problemas.append(f"{relativo}: {archivo.stat().st_size / 1e6:.2f} MB (tope {IMAGEN_MAXIMA / 1e6:.0f} MB por imagen)")
    return problemas


@estatico("cada pantalla de la app tiene sus tamaños y formatos")
def pantallas_de_la_app() -> list[str]:
    problemas = []
    bases = analizar("index.html").pantallas
    if len(bases) < 6:
        problemas.append(f"index.html: {len(bases)} pantallas para ampliar (se esperaban las de cada tramo y las tarjetas)")
    for base in bases:
        for tam in ("1280", "1920"):
            for ext in ("avif", "webp"):
                if not (RAIZ / f"{base}-{tam}.{ext}").is_file():
                    problemas.append(f"index.html: falta {base}-{tam}.{ext}")
    return problemas


@estatico("la sección de descarga dice la versión")
def version_a_la_vista() -> list[str]:
    seccion = sin_comentarios_html(leer("index.html")).split('id="descargar"', 1)[-1].split("</section>", 1)[0]
    if not re.search(r"Versión \d+\.\d+\.\d+", seccion):
        return ["index.html: la sección «Descargar» no dice «Versión X.Y.Z»"]
    return []


def resolver(desde: str, destino: str) -> Path | None:
    """A qué archivo lleva un enlace interno, como lo serviría el hosting (direcciones limpias)."""
    destino = destino.split("#")[0].split("?")[0]
    if destino == "":
        return RAIZ / desde
    base = RAIZ if destino.startswith("/") else (RAIZ / desde).parent
    camino = (base / destino.lstrip("/")).resolve()
    if destino.endswith("/") or destino in (".", "./"):
        camino = camino / "index.html"
    if camino.is_file():
        return camino
    if camino.with_suffix(".html").is_file() and not camino.suffix:
        return camino.with_suffix(".html")
    return None


@estatico("legales y 404 existen, y los enlaces internos resuelven")
def legales_404_y_enlaces() -> list[str]:
    problemas = []
    for nombre in ("privacidad.html", "terminos.html", "cookies.html", "404.html", "vercel.json"):
        if not (RAIZ / nombre).is_file():
            problemas.append(f"falta {nombre}")
    if problemas:
        return problemas
    try:
        if json.loads(leer("vercel.json")).get("cleanUrls") is not True:
            problemas.append("vercel.json: sin cleanUrls, «privacidad» no llevaría a privacidad.html")
    except ValueError as e:
        problemas.append(f"vercel.json no se puede leer: {e}")
    cuerpo_404 = leer("404.html")
    if 'content="noindex"' not in cuerpo_404:
        problemas.append("404.html: sin <meta name=\"robots\" content=\"noindex\">")
    if not re.search(r'<a\b[^>]*href="/"', cuerpo_404):
        problemas.append("404.html: sin enlace al inicio")
    for pagina in PAGINAS:
        a = analizar(pagina)
        if pagina != "404.html":
            for legal in ("privacidad", "terminos", "cookies"):
                if not any(v == legal for k, v in a.enlaces if k == "href"):
                    problemas.append(f"{pagina}: el pie no enlaza a «{legal}»")
        for atributo, valor in a.enlaces:
            if atributo == "srcset":
                valor = valor.split(",")[0].split()[0]
            if re.match(r"(https?:|mailto:|javascript:|data:|//)", valor):
                continue
            if valor.startswith("#"):
                ancla, pagina_ancla = valor[1:], pagina
            else:
                archivo = resolver(pagina, valor)
                if archivo is None:
                    problemas.append(f"{pagina}: {atributo}={valor!r} no lleva a ningún archivo")
                    continue
                ancla = valor.split("#", 1)[1] if "#" in valor else ""
                pagina_ancla = archivo.relative_to(RAIZ).as_posix()
            if ancla and pagina_ancla in PAGINAS and ancla not in analizar(pagina_ancla).ids:
                problemas.append(f"{pagina}: el ancla #{ancla} no existe en {pagina_ancla}")
    return problemas


@estatico("menos movimiento desde el CSS, y la página sin JS")
def menos_movimiento_y_sin_js() -> list[str]:
    problemas = []
    css = sin_comentarios_css(leer("estilos.css"))
    bloque = re.search(r"@media \(prefers-reduced-motion: reduce\)\s*\{(.*?)\n\}", css, flags=re.S)
    if not bloque or "animation: none !important" not in bloque.group(1) or "transition: none !important" not in bloque.group(1):
        problemas.append("estilos.css: el bloque prefers-reduced-motion no frena animaciones y transiciones")
    if "prefers-reduced-motion" not in leer("pagina.js"):
        problemas.append("pagina.js: no mira prefers-reduced-motion")
    indice = leer("index.html")
    if "<noscript>" not in indice or ".carga" not in indice.split("<noscript>", 1)[1].split("</noscript>")[0]:
        problemas.append("index.html: sin <noscript> que saque la carga cuando no hay JS")
    return problemas


# ─────────────────────────── d66 · el manual de producción visual (20/10) ───────────────────────────
HEROE_CAPAS = {   # cada capa del héroe, en sus tamaños; avif y webp de cada uno (§13, §16; cuatro capas desde el 20/10 15:05)
    "fondo-ivory": (768, 1280, 1920), "fondo-espresso": (768, 1280, 1920), "mesa-ivory": (960, 1920), "mesa-espresso": (960, 1920),
    "emblema-ivory": (474, 948), "emblema-espresso": (474, 948), "frente-ivory": (960,), "frente-espresso": (960,),
}
ESCENA_MAXIMA = 450 * 1024        # la escena del héroe a 1920, en cada formato (encargo d66)
ATLAS = ["01_leather", "02_glass", "03_emblem", "04_ivory_stone"]


@estatico("el héroe según el manual: grilla, titular, dos botones y la composición en capas")
def heroe_del_manual() -> list[str]:
    problemas = []
    html = sin_comentarios_html(leer("index.html"))
    heroe = html.split('id="portada"', 1)[-1].split("</section>", 1)[0]
    for clase in ("heroe-escenario", "capa-fondo", "capa-mesa", "capa-emblema", "emblema-flota", "emblema-luz", "capa-frente",
                  "heroe-barrido", "heroe-atmosfera", "heroe-grilla", "heroe-texto"):
        if f'class="{clase}' not in heroe and f' {clase}"' not in heroe:
            problemas.append(f"el héroe no tiene .{clase}")
    if not re.search(r'<h1 class="heroe-titular"[^>]*>.*Estudiás de lo que.*dijo tu <em>profesor\.</em>', heroe, flags=re.S):
        problemas.append("el titular no es «Estudiás de lo que dijo tu profesor.» con la última palabra en cherry")
    if not re.search(r'class="boton-descarga boton-principal"[^>]*>.*?Descargar para Windows', heroe, flags=re.S):
        problemas.append("falta el botón principal cherry «Descargar para Windows»")
    if not re.search(r'class="pildora"[^>]*>Cómo funciona<', heroe):
        problemas.append("falta el secundario de borde fino «Cómo funciona»")
    cabecera = html.split('<header class="cabecera"', 1)[-1].split("</header>", 1)[0]
    for texto in ("Cómo funciona", "Todo lo que hace", "Descargar"):
        if f">{texto}<" not in cabecera:
            problemas.append(f"la barra de marca no lleva «{texto}»")
    for nombre in ("Oscuro", "Claro"):
        if f'aria-label="{nombre}"' not in cabecera:
            problemas.append(f"el selector de apariencia no dice «{nombre}»")
    for base, tamanos in HEROE_CAPAS.items():
        for t in tamanos:
            for ext in ("avif", "webp"):
                f = RAIZ / f"imagenes/heroe/{base}-{t}.{ext}"
                if not f.is_file():
                    problemas.append(f"falta {f.relative_to(RAIZ).as_posix()}")
                elif f"imagenes/heroe/{base}-{t}.{ext}" not in html:
                    problemas.append(f"index.html no pide {base}-{t}.{ext}")
    for base in ("fondo-ivory", "fondo-espresso", "mesa-ivory", "mesa-espresso"):
        for ext in ("avif", "webp"):
            f = RAIZ / f"imagenes/heroe/{base}-1920.{ext}"
            if f.is_file() and f.stat().st_size > ESCENA_MAXIMA:
                problemas.append(f"{f.name}: {f.stat().st_size / 1024:.0f} KB (tope 450 KB)")
    css = sin_comentarios_css(leer("estilos.css"))
    for tema in ("ivory", "espresso"):          # la máscara de los cantos (la luz que los recorre) la pide el CSS
        f = RAIZ / f"imagenes/heroe/cantos-{tema}-640.webp"
        if not f.is_file():
            problemas.append(f"falta {f.relative_to(RAIZ).as_posix()}")
        elif f"imagenes/heroe/cantos-{tema}-640.webp" not in css:
            problemas.append(f"estilos.css no usa cantos-{tema}-640.webp")
    return problemas


@estatico("más cinemático y texturizado: barrido cada 8–10 s sólo en el héroe, microtextura nunca bajo el texto")
def cinematico_y_texturas() -> list[str]:
    """Dueño 20/10 15:05: capas que se separan, luz en los cantos, viñeta y bruma, un barrido cada 8–10 s SÓLO en el
    héroe; macros reales en el atlas; tarjetas marfil con microtextura perceptible pero NUNCA debajo del texto (§08)."""
    problemas = []
    js = sin_comentarios_js(leer("pagina.js"))
    if not re.search(r"delayedCall\(gsap\.utils\.random\(8,\s*10\)", js):
        problemas.append("el barrido de luz no se repite cada 8 a 10 s")
    if ".heroe-barrido i" not in js or ".emblema-luz i" not in js:
        problemas.append("el barrido no está en el héroe")
    grano = RAIZ / "imagenes/grano-marfil-384.webp"
    if not grano.is_file() or grano.stat().st_size > 64 * 1024:
        problemas.append("la microtextura del marfil falta o pesa más de 64 KB")
    con_grano = [sel for sel, cuerpo in reglas_css() if "grano-marfil" in cuerpo]
    permitidos = {".demo::before", ".cita-demo::before", ".profundidad::before", ".tj-cuadro::before", ".legal-indice::before"}
    for sel in con_grano:
        for s in (x.strip() for x in sel.split(",")):
            if s not in permitidos:
                problemas.append(f"microtextura fuera de las tarjetas marfil: {s}")
    con_texto = {".demo::before", ".cita-demo::before", ".legal-indice::before"}
    filo = [sel for sel, cuerpo in reglas_css() if "content-box" in cuerpo and re.search(r"padding:\s*[1-9]px", cuerpo)]
    cubiertos = {s.strip() for sel in filo for s in sel.split(",")}
    if not con_texto <= cubiertos:
        problemas.append(f"la microtextura de las tarjetas con texto no queda en el canto: {sorted(con_texto - cubiertos)}")
    return problemas


@estatico("el atlas de materiales: cinco paneles, imágenes con nombre fijo y variantes al día")
def atlas_de_materiales() -> list[str]:
    import hashlib
    problemas = []
    html = sin_comentarios_html(leer("index.html"))
    if html.count('class="atlas-panel') != 5:
        problemas.append(f"el atlas tiene {html.count('class=\"atlas-panel')} paneles (se esperaban 5)")
    for n in ("01 · Leather", "02 · Liquid Glass", "03 · Signature Emblem", "04 · Ivory &amp; Stone", "05 · Brand system"):
        if n not in html:
            problemas.append(f"falta el panel «{n}»")
    if html.count('class="atlas-ficha"') != 5:
        problemas.append("cada panel lleva su ficha técnica (versión técnica neutra, §05)")
    huellas_f = RAIZ / "imagenes/atlas/derivadas.json"
    huellas = json.loads(huellas_f.read_text(encoding="utf-8")) if huellas_f.is_file() else {}
    for n in ATLAS:
        maestro = RAIZ / f"imagenes/atlas/{n}.webp"
        if not maestro.is_file():
            problemas.append(f"falta imagenes/atlas/{n}.webp")
            continue
        for v in (f"{n}.avif", f"{n}-600.avif", f"{n}-600.webp"):
            if not (RAIZ / "imagenes/atlas" / v).is_file():
                problemas.append(f"falta imagenes/atlas/{v}")
        if huellas.get(n) != hashlib.sha256(maestro.read_bytes()).hexdigest():
            problemas.append(f"imagenes/atlas/{n}.webp cambió y sus variantes no: correr hacer_imagenes_d66.py --atlas")
    return problemas


def reglas_css() -> list[tuple[str, str]]:
    """(selector, cuerpo) de cada regla de estilos.css, con los @media abiertos."""
    css = sin_comentarios_css(leer("estilos.css"))
    return [(sel.strip(), cuerpo) for sel, cuerpo in re.findall(r"([^{}]+)\{([^{}]*)\}", css)]


@estatico("movimiento: reposo sólo en el héroe, sólo transform y opacity, a lo sumo dos desenfoques")
def movimiento_del_manual() -> list[str]:
    problemas = []
    css = sin_comentarios_css(leer("estilos.css"))
    for sel, cuerpo in reglas_css():
        if re.search(r"animation[^;]*\binfinite\b", cuerpo) and not re.search(r"\.boton-principal|\.cursor-escribe", sel):
            problemas.append(f"movimiento de reposo fuera del héroe y el atlas: {sel}")
    for nombre, cuerpo in re.findall(r"@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}", css):
        for prop in re.findall(r"([\w-]+)\s*:", cuerpo):
            if prop not in ("transform", "opacity", "translate", "scale", "rotate"):
                problemas.append(f"@keyframes {nombre} anima {prop} (sólo transform y opacity)")
    con_desenfoque = [sel for sel, cuerpo in reglas_css() if re.search(r"(?<!-webkit-)backdrop-filter\s*:\s*blur", cuerpo)]
    if len(con_desenfoque) > 2:
        problemas.append(f"{len(con_desenfoque)} superficies con desenfoque (tope 2): {con_desenfoque}")
    if "prefers-color-scheme: dark" not in css or ':root[data-tema="cuero"]' not in css:
        problemas.append("la oscura no sale del sistema ni del selector")
    claro = re.search(r":root\s*\{\s*color-scheme:\s*light;[^}]*--fondo:\s*#F1ECE4", css)
    if not claro:
        problemas.append("la clara (Ivory #F1ECE4) no es la de fábrica")
    return problemas


# ─────────────────────────── los chequeos con Chromium ───────────────────────────
def navegador_disponible() -> str | None:
    candidatos = [os.environ.get("CATHEDRA_NAVEGADOR_PRUEBAS"), "/opt/pw-browsers/chromium"]
    for c in candidatos:
        if c and Path(c).exists():
            return c
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
        return ""      # el de Playwright
    except ImportError:
        return None


class _Servidor(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def _servir():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        puerto = s.getsockname()[1]
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", puerto),
                                               functools.partial(_Servidor, directory=str(RAIZ)))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return servidor, f"http://127.0.0.1:{puerto}/"


@functools.lru_cache(maxsize=1)
def en_navegador() -> dict[str, list[str]]:
    """Corre todos los chequeos con Chromium de una sola vez y devuelve {nombre: problemas}."""
    from playwright.sync_api import sync_playwright

    ejecutable = navegador_disponible()
    resultados: dict[str, list[str]] = {}
    servidor, base = _servir()
    enlace = enlace_instalador()
    try:
        with sync_playwright() as p:
            opciones = {"args": ["--no-sandbox"]}
            if ejecutable:
                opciones["executable_path"] = ejecutable
            nav = p.chromium.launch(**opciones)

            def abrir(ruta="", **extra):
                ctx = nav.new_context(user_agent=UA_WINDOWS, **extra)
                pag = ctx.new_page()
                pedidos, errores = [], []
                pag.on("request", lambda r: pedidos.append(r.url))
                pag.on("pageerror", lambda e: errores.append(str(e)))
                pag.goto(base + ruta, wait_until="load")
                pag.wait_for_function("document.documentElement.classList.contains('abierta')", timeout=15000)
                return ctx, pag, pedidos, errores

            # 1 · nada sale del sitio, en los tres modos; y sin errores de JS
            fuera, con_errores = [], []
            for ruta in ("", "?quieto"):
                ctx, pag, pedidos, errores = abrir(ruta, viewport={"width": 1280, "height": 800})
                pag.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                pag.wait_for_timeout(1500)
                fuera += [f"{ruta or '/'}: {u}" for u in pedidos if not u.startswith(base)]
                con_errores += [f"{ruta or '/'}: {e}" for e in errores]
                ctx.close()
            resultados["nada sale del sitio (normal y ?quieto) y sin errores de JS"] = fuera + con_errores

            # 2 · un solo enlace al instalador, el que tiene data-descarga
            ctx, pag, _, _ = abrir(viewport={"width": 1280, "height": 800})
            al_instalador = pag.evaluate("(e) => [...document.querySelectorAll('a')].filter(a => a.href === e).map(a => a.hasAttribute('data-descarga'))", enlace)
            problemas = [] if al_instalador == [True] else [f"enlaces al instalador: {al_instalador} (se esperaba uno solo, con data-descarga)"]
            ctx.close()
            resultados["un solo enlace al instalador"] = problemas

            # 3 · con «reducir movimiento»: quieta desde el arranque, sin carga ni animaciones
            ctx, pag, _, _ = abrir(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            pag.wait_for_timeout(500)
            estado = pag.evaluate("""() => ({
                quieto: document.documentElement.classList.contains('quieto'),
                animaciones: document.getAnimations().length,
                carga: getComputedStyle(document.querySelector('.carga')).display,
                marcado: getComputedStyle(document.querySelector('.marcado')).animationName,
                enlace: document.querySelector('[data-quieto]').textContent,
                emblema: getComputedStyle(document.querySelector('.capa-emblema')).opacity })""")
            problemas = []
            if not estado["quieto"]:
                problemas.append("la página no se puso en modo quieto")
            if estado["animaciones"]:
                problemas.append(f"{estado['animaciones']} animaciones vivas")
            if estado["carga"] != "none" or estado["marcado"] != "none":
                problemas.append(f"la carga ({estado['carga']}) o el aviso de Windows ({estado['marcado']}) siguen animados")
            if estado["enlace"] != "Ver con animaciones":
                problemas.append(f"el enlace del pie dice {estado['enlace']!r}")
            if estado["emblema"] != "1":
                problemas.append(f"quieto, el emblema no se ve (opacidad {estado['emblema']})")
            ctx.close()
            # sin JS (y con menos movimiento): la carga no tapa la página
            ctx = nav.new_context(user_agent=UA_WINDOWS, viewport={"width": 390, "height": 844}, reduced_motion="reduce", java_script_enabled=False)
            pag = ctx.new_page()
            pag.goto(base, wait_until="load")
            pag.wait_for_timeout(300)
            try:
                carga = pag.locator(".carga").evaluate("e => getComputedStyle(e).display")
                marca = pag.locator("h1.heroe-titular").evaluate("e => getComputedStyle(e.querySelector('span')).opacity")
                emblema = pag.locator(".capa-emblema").evaluate("e => getComputedStyle(e).opacity")
                if carga != "none":
                    problemas.append(f"sin JS la carga queda a la vista (display {carga})")
                if marca != "1":
                    problemas.append(f"sin JS el titular no se ve (opacidad {marca})")
                if emblema != "1":
                    problemas.append(f"sin JS el emblema no se ve (opacidad {emblema})")
            except Exception as e:   # sin JS no se puede medir en este navegador: queda anotado
                problemas.append(f"no se pudo medir sin JS: {e}")
            ctx.close()
            resultados["menos movimiento desde el arranque, y la página sin JS"] = problemas

            # 4 · «Descargar» de la cabecera llega a la sección (celular y escritorio, suave y quieto)
            problemas = []
            for vista in ({"width": 390, "height": 844}, {"width": 1920, "height": 1080}):
                for ruta in ("", "?quieto"):
                    ctx, pag, _, _ = abrir(ruta, viewport=vista)
                    pag.wait_for_timeout(300)
                    pag.click("a.cab-ir")
                    pag.wait_for_timeout(2500)
                    top, foco = pag.evaluate("[document.getElementById('descargar').getBoundingClientRect().top, document.activeElement.id]")
                    if abs(top) > 4:
                        problemas.append(f"{vista['width']}px {ruta or 'suave'}: la sección quedó a {top:.0f}px del borde")
                    if foco != "descargar":    # como el salto nativo: el Tab siguiente parte de la sección (y «Saltar al contenido» salta)
                        problemas.append(f"{vista['width']}px {ruta or 'suave'}: el foco no pasó a la sección (quedó en {foco!r})")
                    ctx.close()
            # en las legales, el índice lleva a cada sección respetando su aire (scroll-margin-top)
            for ruta in ("", "?quieto"):
                ctx = nav.new_context(user_agent=UA_WINDOWS, viewport={"width": 390, "height": 844})
                pag = ctx.new_page()
                pag.goto(base + "privacidad.html" + ruta, wait_until="load")
                pag.click('.legal-indice a[href="#grabaciones"]')    # una del medio: la última no puede subir hasta arriba
                pag.wait_for_timeout(2000)
                top, aire, fondo = pag.evaluate("""(() => { const s = document.getElementById('grabaciones');
                    return [s.getBoundingClientRect().top, parseFloat(getComputedStyle(s).scrollMarginTop) || 0,
                            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1]; })()""")
                if abs(top - aire) > 4 and not fondo:
                    problemas.append(f"privacidad #grabaciones {ruta or 'suave'}: la sección quedó a {top:.0f}px del borde (se esperaban {aire:.0f})")
                ctx.close()
            resultados["«Descargar» de la cabecera llega a la sección"] = problemas

            # 5 · «Tu computadora»: en Windows, con un paquete del catálogo; en otros sistemas, nada
            ctx, pag, _, _ = abrir(viewport={"width": 390, "height": 844})
            bloque = pag.evaluate("() => { const b = document.getElementById('tu-equipo'); return { oculto: b.hidden, texto: b.innerText }; }")
            problemas = []
            if bloque["oculto"]:
                problemas.append("en Windows el bloque no aparece")
            elif not re.search(r"Te recomendamos el paquete «(Liviano|Local)»\.", bloque["texto"]):
                problemas.append(f"el bloque dice: {bloque['texto']!r}")
            problemas += [f"bloque: {h}" for h in buscar_prohibidas(bloque["texto"], con_beta=True)]
            ctx.close()
            ctx = nav.new_context(user_agent=UA_MAC, viewport={"width": 390, "height": 844})
            pag = ctx.new_page()
            pag.goto(base + "?quieto", wait_until="load")
            if not pag.evaluate("document.getElementById('tu-equipo').hidden"):
                problemas.append("fuera de Windows el bloque aparece igual")
            ctx.close()
            resultados["«Tu computadora» en Windows y sólo ahí"] = problemas

            # 6 · a 390px no hay desborde horizontal, en claro y en oscuro
            problemas = []
            for tema in ("dark", "light"):
                ctx, pag, _, _ = abrir("?quieto", viewport={"width": 390, "height": 844}, color_scheme=tema)
                pag.evaluate("document.getElementById('descargar').scrollIntoView()")
                pag.wait_for_timeout(300)
                ancho = pag.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
                if ancho[0] > ancho[1]:
                    problemas.append(f"{tema}: la página mide {ancho[0]}px de ancho en una pantalla de {ancho[1]}px")
                ctx.close()
            resultados["sin desborde horizontal a 390px"] = problemas
            nav.close()
    finally:
        servidor.shutdown()
    return resultados


NOMBRES_NAVEGADOR = [
    "nada sale del sitio (normal y ?quieto) y sin errores de JS",
    "un solo enlace al instalador",
    "menos movimiento desde el arranque, y la página sin JS",
    "«Descargar» de la cabecera llega a la sección",
    "«Tu computadora» en Windows y sólo ahí",
    "sin desborde horizontal a 390px",
]


# ─────────────────────────── como pruebas de pytest ───────────────────────────
try:
    import pytest
except ImportError:      # sin pytest también se puede correr como guion
    pytest = None

if pytest:
    @pytest.mark.parametrize("nombre,chequeo", ESTATICOS, ids=[n for n, _ in ESTATICOS])
    def test_estatico(nombre, chequeo):
        assert chequeo() == [], f"{nombre}:\n  " + "\n  ".join(chequeo())

    @pytest.mark.parametrize("nombre", NOMBRES_NAVEGADOR)
    def test_en_navegador(nombre):
        if navegador_disponible() is None:
            pytest.skip("sin Chromium ni Playwright")
        problemas = en_navegador().get(nombre, ["el chequeo no corrió"])
        assert problemas == [], f"{nombre}:\n  " + "\n  ".join(problemas)


# ─────────────────────────── como guion ───────────────────────────
def main() -> int:
    fallas = 0

    def informar(nombre, problemas):
        nonlocal fallas
        if problemas:
            fallas += 1
            print(f"  FALLA  {nombre}")
            for p in problemas:
                print(f"           - {p}")
        else:
            print(f"  bien   {nombre}")

    print("Sin navegador:")
    for nombre, chequeo in ESTATICOS:
        informar(nombre, chequeo())
    print(f"         (lo público pesa {peso_publico() / 1e6:.2f} MB)")
    if navegador_disponible() is None:
        print("Con Chromium: saltado (no hay Chromium ni Playwright)")
    else:
        print("Con Chromium:")
        resultados = en_navegador()
        for nombre in NOMBRES_NAVEGADOR:
            informar(nombre, resultados.get(nombre, ["el chequeo no corrió"]))
    print("Todo bien." if not fallas else f"{fallas} chequeo(s) con problemas.")
    return 1 if fallas else 0


if __name__ == "__main__":
    sys.exit(main())
