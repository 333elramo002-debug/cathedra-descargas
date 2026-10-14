/* La página de Cathedra.

   Las dos constantes que hay que tocar al publicar están arriba. El resto:
     · la carga: la C de dovelas se arma con lo que va llegando (las letras y la
       página) y, al cerrarse, la luz se abre en un círculo desde el signo;
     · las entradas: los títulos llegan palabra por palabra y los bloques suben
       con la curva de la casa cuando entran en pantalla (y vuelven a su lugar
       quietos con «reducir movimiento»);
     · la cabecera, que cambia de fondo apenas se deja la portada;
     · desde la v7 no hay escena 3D: el fondo es luz en CSS y las capturas son reales.
   El texto, los enlaces y los botones son HTML. */

const ENLACE_INSTALADOR = "https://github.com/333elramo002-debug/cathedra-descargas/releases/latest/download/Cathedra-Setup.exe";
const CONTACTO = "[EMAIL DE CONTACTO]";

(function () {
"use strict";

const raiz = document.documentElement;
const PAGINA = window.CATHEDRA_PAGINA || (window.CATHEDRA_PAGINA = {});
// sin animaciones: lo pide el sistema, la dirección (?quieto) o el enlace del pie (se recuerda)
let quietoElegido = null;
try { quietoElegido = localStorage.getItem("cathedra-quieto"); } catch (e) { quietoElegido = null; }
const quieto = quietoElegido === "1" || /quieto/.test(location.search) ||
  (quietoElegido !== "0" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
// «animada» le dice al CSS que el JS decidió animar (si el sistema pide menos movimiento, el CSS
// solo ya frena todo; así la preferencia se respeta aunque este archivo no llegue a correr)
raiz.classList.add(quieto ? "quieto" : "animada");
// vistas para fabricar las imágenes de la página (la nave sola, la tarjeta para compartir)
const vista = (location.search.match(/vista=(nave|compartir)/) || [])[1];
if (vista) raiz.classList.add("vista-" + vista);

/* ══════════════════════ los enlaces ══════════════════════ */
document.querySelectorAll("[data-descarga]").forEach((a) => { a.href = ENLACE_INSTALADOR; });
const esCorreo = /^[^\s@\[\]]+@[^\s@\[\]]+\.[^\s@\[\]]+$/.test(CONTACTO);
document.querySelectorAll("[data-contacto]").forEach((a) => {
  if (esCorreo) a.href = "mailto:" + CONTACTO;
});
document.querySelectorAll("[data-contacto-texto]").forEach((el) => { el.textContent = CONTACTO; });

/* ══════════════════════ las palabras ══════════════════════ */
/* Cada palabra de los títulos en su caja, para que suban de a una. El texto
   sigue siendo uno solo para quien lee con lector de pantalla. */
document.querySelectorAll(".palabras").forEach((el) => {
  const texto = el.textContent.trim();
  el.textContent = "";
  const lector = document.createElement("span");
  lector.className = "solo-lector";
  lector.textContent = texto;
  el.appendChild(lector);
  texto.split(/\s+/).forEach((p, i) => {
    const caja = document.createElement("span");
    caja.className = "pal";
    caja.setAttribute("aria-hidden", "true");
    const dentro = document.createElement("span");
    dentro.textContent = p;
    dentro.style.setProperty("--n", i);
    caja.appendChild(dentro);
    el.appendChild(caja);
    el.appendChild(document.createTextNode(" "));
  });
});

/* ══════════════════════ las transiciones atadas al scroll ══════════════════════ */
/* Ningún texto aparece de golpe: cada título, párrafo, etiqueta, botón, tarjeta e imagen tiene un
   valor --v (0 a 1) que sigue a su posición en la pantalla con la curva de la casa. Entra desde
   abajo (de desenfocado a nítido, con un desplazamiento corto; los títulos por máscara y palabra
   por palabra; las imágenes con zoom lento y revelado) y sale igual, en espejo, cuando se va por
   arriba. Con «reducir movimiento» todo queda puesto desde el principio. */
const TIPOS = [
  [".tramo .titular, .todo .titular, .descargar .titular", "rev-mascara"],
  [".tramo .paso-num, .tramo-bajada, .datos li, .nota-al-pie, .todo .rotulo, .todo .tramo-bajada, .descargar-caja > :not(.titular), .pie > *", "rev-texto"],
  [".demo, .tarjeta", "rev-panel"],
  [".profundidad", "rev-imagen"],
];
const revelables = [];
TIPOS.forEach(([sel, clase]) => document.querySelectorAll(sel).forEach((el) => {
  if (el.dataset.rev !== undefined) return;
  el.dataset.rev = ""; el.classList.add(clase); revelables.push(el);
}));
// la portada ya entra con la apertura: sólo sale, en espejo, al bajar
document.querySelectorAll("#portada .portada-caja, #portada .bajar").forEach((el) => { el.dataset.rev = "salida"; el.classList.add("rev-salida"); revelables.push(el); });
const curva = (x) => { const t = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - t, 3); };
if (quieto || !("IntersectionObserver" in window)) {
  revelables.forEach((el) => el.style.setProperty("--v", "1"));
} else {
  const activos = new Set();
  let pedido = 0, antes = 0;
  /* el scroll da el objetivo; cada elemento lo persigue con un resorte de segundo orden (amortiguación 0,9,
     unos 2,2 Hz): entra y sale con peso, sin seguir la barra de desplazamiento al pie de la letra ni cortarse */
  const resortes = new WeakMap();
  const W = 2 * Math.PI * 2.2, Z = 0.9;
  const actualizar = (ahora) => {
    pedido = 0;
    const dt = antes ? Math.min((ahora - antes) / 1000, 1 / 30) : 1 / 60; antes = ahora;
    const vh = window.innerHeight;
    let moviendo = false;
    activos.forEach((el) => {
      const r = el.getBoundingClientRect();
      const entra = el.dataset.rev === "salida" ? 1 : curva((vh - r.top) / (vh * 0.3));
      const sale = curva((r.bottom - vh * 0.04) / (vh * 0.26));
      const objetivo = Math.min(entra, sale);
      let st = resortes.get(el);
      if (!st) { st = { v: el.dataset.rev === "salida" ? 1 : 0, d: 0 }; resortes.set(el, st); }
      st.d += (W * W * (objetivo - st.v) - 2 * Z * W * st.d) * dt; st.v += st.d * dt;
      if (Math.abs(objetivo - st.v) < 0.001 && Math.abs(st.d) < 0.002) { st.v = objetivo; st.d = 0; } else moviendo = true;
      el.style.setProperty("--v", Math.min(1, Math.max(0, st.v)).toFixed(3));
    });
    if (moviendo) pedir(); else antes = 0;
  };
  const pedir = () => { if (!pedido) pedido = requestAnimationFrame(actualizar); };
  // se observa cada sección (no cada elemento: un título recortado por su máscara no «se ve» y no avisaría)
  const porSeccion = new Map();
  revelables.forEach((el) => {
    if (el.dataset.rev !== "salida") el.style.setProperty("--v", "0");
    const sec = el.closest("section, footer, header") || el;
    if (!porSeccion.has(sec)) porSeccion.set(sec, []);
    porSeccion.get(sec).push(el);
  });
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => porSeccion.get(e.target).forEach((el) => (e.isIntersecting ? activos.add(el) : activos.delete(el))));
    pedir();
  }, { rootMargin: "15% 0px 15% 0px" });
  porSeccion.forEach((_, sec) => io.observe(sec));
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
}
// los tramos se marcan cuando entran (lo usa la escena y los avisos de la cabecera)
const observador = "IntersectionObserver" in window ? new IntersectionObserver((entradas) => {
  for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("visto"); observador.unobserve(e.target); }
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }) : null;
document.querySelectorAll(".tramo, .sec-cab").forEach((el) => {
  if (observador && !quieto) observador.observe(el); else el.classList.add("visto");
});

/* la cabecera dice en qué sección estás (cambia con un fundido corto) */
const rotuloCab = document.querySelector(".cab-seccion");
const conNombre = [...document.querySelectorAll("[data-nombre]")];
if (rotuloCab && conNombre.length) {
  let actual = "";
  const cual = () => {
    const c = window.innerHeight * 0.45;
    let nombre = "";
    for (const s of conNombre) { const r = s.getBoundingClientRect(); if (r.top <= c && r.bottom > c) { nombre = s.dataset.nombre; break; } }
    if (nombre === actual) return;
    actual = nombre;
    rotuloCab.classList.add("cambiando");
    setTimeout(() => { rotuloCab.textContent = nombre; rotuloCab.classList.toggle("vacio", !nombre); rotuloCab.classList.remove("cambiando"); }, quieto ? 0 : 180);
  };
  window.addEventListener("scroll", cual, { passive: true });
  cual();
}

/* ══════════════════════ la cabecera ══════════════════════ */
const cabecera = document.querySelector(".cabecera");
const portada = document.getElementById("portada");
function cabeceraSegunScroll() {
  if (!cabecera || !portada) return;          // en las legales la cabecera ya va con fondo
  const pasada = portada ? portada.getBoundingClientRect().bottom < 90 : window.scrollY > 200;
  cabecera.classList.toggle("sobre", pasada);
}
window.addEventListener("scroll", cabeceraSegunScroll, { passive: true });
cabeceraSegunScroll();

/* ══════════════════════ la carga ══════════════════════ */
/* Lo que se mide de verdad: las letras (30 %) y la nave (70 %: el código que
   llega, la construcción y el primer dibujo). Lo que se muestra persigue a lo
   medido con un suavizado, y dura como mínimo un segundo para que el ritmo
   se sostenga aunque todo ya esté. Tope: a los 7 s se abre igual. */
const carga = document.getElementById("carga");
const cifra = document.getElementById("carga-cifra");
const linea = document.getElementById("carga-linea");
const inicio = performance.now();
let medidoLetras = 0, medidoNave = 0, medidoPagina = 0, mostrado = 0, abierta = false, naveLista = false, sinNave = false;
PAGINA.cargando = (p) => { medidoNave = Math.max(medidoNave, p); };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medidoLetras = 1; });
else medidoLetras = 1;
setTimeout(() => { medidoLetras = 1; }, 2500);
if (document.readyState === "complete") medidoPagina = 1; else window.addEventListener("load", () => { medidoPagina = 1; });

function pasoCarga(ahora) {
  if (abierta) return;
  // la carga mide las letras y la página; la escena llega después, encima de la imagen quieta
  const medido = medidoLetras * 0.7 + medidoPagina * 0.3;
  const dt = 1 / 60;
  mostrado += (medido - mostrado) * (1 - Math.exp(-7 * dt));
  // nunca más rápido que 1 por segundo: la carga mínima es de un segundo
  mostrado = Math.min(mostrado, (ahora - inicio) / 550);
  if (medido >= 0.999 && mostrado > 0.985) mostrado = 1;
  if (linea) linea.style.transform = `scaleX(${mostrado})`;
  if (cifra) cifra.textContent = String(Math.round(mostrado * 100)).padStart(3, "0");
  // tope: a los 1,8 s se abre igual; si la nave no llegó, mientras tanto se ve la imagen quieta
  if (mostrado >= 1 || ahora - inicio > 900) {
    abrir();
    return;
  }
  requestAnimationFrame(pasoCarga);
}

function abrir() {
  if (abierta) return;
  abierta = true;
  raiz.classList.remove("cargando");
  raiz.classList.add("abriendo");
  // la luz se abre en un círculo desde el signo de la portada
  const signo = document.getElementById("signo");
  const r = signo ? signo.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  raiz.style.setProperty("--ax", x + "px");
  raiz.style.setProperty("--ay", y + "px");
  // el signo de la carga viaja hasta el lugar del signo de la portada y se queda ahí
  const signoCarga = carga && carga.querySelector(".carga-signo");
  if (signoCarga && r.width) {
    const c = signoCarga.getBoundingClientRect();
    const s = r.width / c.width;
    raiz.style.setProperty("--viaje",
      `translate(${x - (c.left + c.width / 2)}px, ${y - (c.top + c.height / 2)}px) scale(${s})`);
  }
  if (PAGINA.motor) PAGINA.motor.arrancar();
  setTimeout(() => { raiz.classList.remove("abriendo"); raiz.classList.add("abierta"); }, quieto ? 50 : 1900);
}

if (quieto || !carga) {
  // sin animaciones (o una página sin carga, como las legales): la página ya está puesta
  raiz.classList.remove("cargando");
  raiz.classList.add("abierta");
  abierta = true;
} else {
  requestAnimationFrame(pasoCarga);
}

/* ══════════════════════ la secuencia del héroe (etapas 1 y 2) ══════════════════════ */
/* El libro que se abre con el scroll: cuadros prerrenderizados en Cycles (AVIF de calidad alta). Primero el póster (ya está en
   el HTML); después los cuadros, de grueso a fino (cada 8, cada 4, cada 2, todos) para que el recorrido entero
   funcione enseguida y se vaya afinando. En el teléfono, la mitad de los cuadros y a 1280. Con menos movimiento
   no se monta: queda el póster quieto.
   Etapa 2: se dibuja en un plano con shader (WebGL sólo para la imagen, ninguna geometría): con el mapa de
   profundidad de cada cuadro (el pase de niebla de Blender) el puntero corre lo cercano más que lo lejano, una
   profundidad falsa suave. Sin WebGL, el mismo cuadro en un canvas 2D. Encima, los títulos y los rótulos con
   línea de cada tramo del recorrido. */
(function secuencia() {
  const pista = document.getElementById("portada");
  const lienzo = pista && pista.querySelector(".portada-lienzo");
  if (!pista || !lienzo || quieto || !lienzo.getContext) return;
  const telefono = window.matchMedia("(max-width: 600px)");          // el encuadre del teléfono (la foto arriba)
  const liviano = window.matchMedia("(max-width: 900px)");           // por debajo de 900 px: 1280 y uno de cada dos cuadros
  const claroSistema = window.matchMedia("(prefers-color-scheme: light)");
  const conPuntero = window.matchMedia("(pointer: fine)").matches;
    const claro = () => raiz.dataset.tema === "claro" || (raiz.dataset.tema !== "oscuro" && claroSistema.matches);
  let juego = null, actual = 0, objetivo = 0, pintado = -1, andando = false;
  const raton = { x: 0, y: 0, ox: 0, oy: 0 };

  // ── el plano con shader (o el canvas 2D si no hay WebGL) ──
  let gl = null, prog = null, texColor = null, texProf = null, ctx = null, profPintada = -1;
  try { gl = lienzo.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
  if (gl) {
    const sh = (tipo, src) => { const o = gl.createShader(tipo); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, [
      "precision mediump float; varying vec2 v; uniform sampler2D uC, uP; uniform vec4 uCubre; uniform vec2 uRaton; uniform float uHayProf;",
      "void main(){ vec2 uv = v * uCubre.xy + uCubre.zw;",
      "  float d = texture2D(uP, uv).r;",                                   // 0 = cerca, 1 = lejos
      "  vec2 corre = uRaton * (0.55 - d) * 0.016 * uHayProf;",
      "  gl_FragColor = vec4(texture2D(uC, clamp(uv + corre, 0.001, 0.999)).rgb, 1.0); }"].join("\n")));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
  }
  if (gl) {
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = (unidad) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
      return t;
    };
    texColor = tex(0); texProf = tex(1);
    gl.uniform1i(gl.getUniformLocation(prog, "uC"), 0); gl.uniform1i(gl.getUniformLocation(prog, "uP"), 1);
  } else {
    ctx = lienzo.getContext("2d");
  }

  // la secuencia la describe imagenes/portada/secuencia/manifiesto.json (lo escribe el empaquetador de la máquina del
  // dueño: por tema —onix, marmol— y por ancho —1920, 1280— la carpeta y los cuadros que ya hay) y la profundidad de
  // los cuadros clave, profundidad.json
  const BASE = "imagenes/portada/secuencia/";
  let manifiesto = null, profundidad = {};
  const pedirManifiesto = Promise.all([
    fetch(BASE + "manifiesto.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(BASE + "profundidad.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]).then(([m, p]) => { profundidad = p || {}; return m; });

  function armar() {
    if (!manifiesto) return;
    const movil = telefono.matches, chico = liviano.matches;
    const tema = claro() ? "marmol" : "onix", porAncho = manifiesto.temas && manifiesto.temas[tema];
    const datos = porAncho && (chico && porAncho["1280"] && porAncho["1280"].cantidad ? porAncho["1280"] : porAncho["1920"]);
    if (!datos || !datos.cuadros || !datos.cuadros.length) return;
    // en el teléfono, la carpeta de 1280 y la mitad de los cuadros
    const todos = datos.cuadros.slice().sort((a, b) => a - b);
    const indices = todos.filter((n, i) => !chico || i % 2 === 0 || i === todos.length - 1);
    const carpeta = BASE + datos.carpeta + "/", ext = manifiesto.formato || "avif";
    const nombre = (n) => String(n).padStart(4, "0");
    const prof = (profundidad[tema] || []).slice().sort((a, b) => a - b);
    const nuevo = { indices, total: manifiesto.total_por_tema || todos[todos.length - 1] + 1, cuadros: new Array(indices.length),
      prof, profImg: new Array(prof.length), fx: movil ? 0.93 : 0.7, fy: movil ? 0.45 : 0.5 };
    juego = nuevo; pintado = -1; profPintada = -1;
    const orden = [], visto = new Set();
    for (const s of [8, 4, 2, 1]) for (let k = 0; k < indices.length; k += s) if (!visto.has(k)) { visto.add(k); orden.push(k); }
    if (!visto.has(indices.length - 1)) orden.splice(1, 0, indices.length - 1);
    let enCurso = 0, sig = 0, fallo = false;
    const pedir = () => {
      // el primero solo: si no llega (sin AVIF, por ejemplo) no se pide nada más y queda el póster
      while (juego === nuevo && !fallo && enCurso < (nuevo.cuadros[0] ? 4 : 1) && sig < orden.length) {
        const k = orden[sig++]; enCurso++;
        const img = new Image(); img.decoding = "async";
        img.onload = () => { enCurso--; if (juego !== nuevo) return; nuevo.cuadros[k] = img; pedir(); pintar(false); };
        img.onerror = () => { enCurso--; if (k === 0) fallo = true; pedir(); };
        img.src = carpeta + nombre(indices[k]) + "." + ext;
      }
    };
    pedir();
    // la profundidad (sólo los cuadros clave; con plano y puntero): se usa la del cuadro clave más cercano
    if (gl && conPuntero) prof.forEach((n, j) => {
      const p = new Image(); p.decoding = "async";
      p.onload = () => { if (juego === nuevo) { nuevo.profImg[j] = p; pintar(false); } };
      p.src = BASE + tema + "-prof/" + nombre(n) + ".webp";
    });
  }

  function medida() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(lienzo.clientWidth * dpr), h = Math.round(lienzo.clientHeight * dpr);
    if (w && (lienzo.width !== w || lienzo.height !== h)) { lienzo.width = w; lienzo.height = h; pintado = -1; if (gl) gl.viewport(0, 0, w, h); }
  }

  function cercano(lista, k) {
    for (let d = 0; d < lista.length; d++) { if (lista[k - d]) return k - d; if (lista[k + d]) return k + d; }
    return -1;
  }

  // de coordenadas del cuadro (1920×1080) a píxeles CSS del lienzo, con el mismo «cover» del dibujo
  function cubrir() {
    const cw = lienzo.clientWidth, ch = lienzo.clientHeight, iw = 1920, ih = 1080;
    const s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    return { s, dx: (cw - dw) * juego.fx, dy: (ch - dh) * juego.fy, dw, dh, cw, ch };
  }
  PAGINA.mapaHeroe = (x, y) => { if (!juego) return null; const c = cubrir(); return [c.dx + x * c.s, c.dy + y * c.s]; };

  function pintar(forzar) {
    if (!juego) return;
    const f = actual * (juego.total - 1), ind = juego.indices;
    let objetivoK = 0;
    for (let i = 1; i < ind.length; i++) if (Math.abs(ind[i] - f) < Math.abs(ind[objetivoK] - f)) objetivoK = i;
    const k = cercano(juego.cuadros, objetivoK);
    const moverRaton = gl && (Math.abs(raton.x - raton.ox) > 0.0005 || Math.abs(raton.y - raton.oy) > 0.0005);
    if (k < 0 || (k === pintado && !forzar && !moverRaton)) return;
    const img = juego.cuadros[k];
    if (gl) {
      if (k !== pintado) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texColor); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
      let kp = -1;
      juego.prof.forEach((nf, j) => { if (juego.profImg[j] && (kp < 0 || Math.abs(nf - ind[k]) < Math.abs(juego.prof[kp] - ind[k]))) kp = j; });
      if (kp >= 0 && kp !== profPintada) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texProf); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, juego.profImg[kp]); profPintada = kp; }
      const c = cubrir();
      // uv de pantalla → uv de la imagen: escala y corrimiento del «cover»
      gl.uniform4f(gl.getUniformLocation(prog, "uCubre"), c.cw / c.dw, c.ch / c.dh, -c.dx / c.dw, -c.dy / c.dh);
      gl.uniform2f(gl.getUniformLocation(prog, "uRaton"), raton.ox, raton.oy);
      gl.uniform1f(gl.getUniformLocation(prog, "uHayProf"), profPintada >= 0 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      const cw = lienzo.width, ch = lienzo.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (cw - dw) * juego.fx, (ch - dh) * juego.fy, dw, dh);
    }
    pintado = k; lienzo.classList.add("listo");
  }

  // ── los títulos y los rótulos de cada tramo ──
  const capas = pista.querySelector(".heroe-capas");
  const titulos = capas ? [...capas.querySelectorAll(".hc-titulo")] : [];
  const rotulos = capas ? [...capas.querySelectorAll(".hc-rotulo")] : [];
  const svg = capas && capas.querySelector(".hc-lineas");
  const NS = svg ? svg.namespaceURI : "";          // el del propio <svg> (sin escribir direcciones externas)
  titulos.forEach((t) => {
    const txt = t.querySelector(".hc-txt");
    txt.innerHTML = txt.textContent.split(" ").map((w, i) => `<span class="pal"><span style="--n:${i}">${w}</span></span>`).join(" ");
  });
  const trazos = rotulos.map((r) => {
    const linea = document.createElementNS(NS, "path"); linea.setAttribute("pathLength", "1"); linea.classList.add("hc-linea");
    const punto = document.createElementNS(NS, "circle"); punto.setAttribute("r", "4"); punto.classList.add("hc-punto");
    const aro = document.createElementNS(NS, "circle"); aro.setAttribute("r", "11"); aro.classList.add("hc-aro");
    svg.append(linea, aro, punto);
    return { r, linea, punto, aro, ancla: r.dataset.ancla.split(",").map(Number), arriba: r.dataset.lado !== "abajo" };
  });
  const tramo = (el, p) => {
    const a = parseFloat(el.dataset.desde), b = parseFloat(el.dataset.hasta);
    return { dentro: p >= a && p < b, entra: Math.max(0, Math.min(1, (p - a) / 0.06)), pasado: p >= b };
  };
  function capasSegun(p) {
    if (!capas) return;
    titulos.forEach((t) => { const e = tramo(t, p); t.classList.toggle("activo", e.dentro); t.classList.toggle("ido", e.pasado); });
    const W = lienzo.clientWidth, H = lienzo.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    trazos.forEach((o) => {
      const e = tramo(o.r, p), m = PAGINA.mapaHeroe(o.ancla[0], o.ancla[1]);
      if (!m) return;
      const [ax, ay] = m, alto = Math.min(150, H * 0.18) * (o.arriba ? -1 : 1);
      const lx = ax + Math.min(90, W * 0.08), ly = ay + alto;              // el rótulo, arriba (o abajo) a la derecha del punto
      o.linea.setAttribute("d", `M${ax},${ay} L${ax + (lx - ax) * 0.35},${ly} L${lx + 8},${ly}`);
      o.r.style.transform = `translate(${lx + 14}px, ${ly - 9}px)`;
      const visible = ax > 0 && ax < W && ay > 12 && ay < H - 12;          // en el teléfono la foto es más baja
      const v = e.dentro && visible ? e.entra : 0;
      o.linea.style.strokeDashoffset = String(1 - v);
      [o.punto, o.aro].forEach((c) => { c.setAttribute("cx", ax); c.setAttribute("cy", ay); });
      o.punto.style.opacity = o.aro.style.opacity = String(Math.min(1, v * 2));
      o.r.classList.toggle("activo", e.dentro && visible && e.entra > 0.6);
    });
  }

  function progreso() {
    const r = pista.getBoundingClientRect(), recorrido = r.height - window.innerHeight;
    objetivo = recorrido > 0 ? Math.max(0, Math.min(1, -r.top / recorrido)) : 0;
    if (!andando) { andando = true; requestAnimationFrame(paso); }
  }
  function paso() {
    actual += (objetivo - actual) * 0.16;                 // con inercia: el libro sigue al scroll, no lo copia
    if (Math.abs(objetivo - actual) < 0.0005) actual = objetivo;
    raton.ox += (raton.x - raton.ox) * 0.08; raton.oy += (raton.y - raton.oy) * 0.08;
    pintar(false);
    pista.style.setProperty("--salida", Math.max(0, Math.min(1, (actual - 0.06) / 0.08)).toFixed(3));
    pista.style.setProperty("--cierre", Math.max(0, Math.min(1, (actual - 0.94) / 0.06)).toFixed(3));
    capasSegun(actual);
    const quieta = actual === objetivo && Math.abs(raton.x - raton.ox) < 0.0005 && Math.abs(raton.y - raton.oy) < 0.0005;
    if (!quieta && !document.hidden) requestAnimationFrame(paso); else andando = false;
  }

  // sin manifiesto (o sin cuadros) la portada queda como estaba: el póster quieto, sin pista alta
  pedirManifiesto.then((m) => {
    if (!m || !m.temas) return;
    manifiesto = m; pista.classList.add("con-secuencia");
    medida(); armar(); progreso();
  });
  window.addEventListener("scroll", progreso, { passive: true });
  window.addEventListener("resize", () => { medida(); pintar(true); capasSegun(actual); }, { passive: true });
  if (gl && conPuntero) window.addEventListener("pointermove", (e) => {
    raton.x = (e.clientX / window.innerWidth) * 2 - 1; raton.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (!andando) { andando = true; requestAnimationFrame(paso); }
  }, { passive: true });
  telefono.addEventListener("change", () => { armar(); medida(); });
  liviano.addEventListener("change", () => { armar(); medida(); });
  claroSistema.addEventListener("change", armar);
})();

/* ══════════════════════ los números que cuentan ══════════════════════ */
/* Cada [data-cuenta] cuenta desde cero hasta su valor cuando entra en pantalla (con la curva de la casa). */
if (!quieto && "IntersectionObserver" in window) {
  const cuentas = document.querySelectorAll("[data-cuenta]");
  const ioc = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    ioc.unobserve(e.target);
    const el = e.target, fin = Number(el.dataset.cuenta), cifras = Number(el.dataset.cifras || 0), t0 = performance.now(), dura = 900 + Math.min(900, fin * 12);
    const escribir = (v) => { el.textContent = String(v).padStart(cifras, "0"); };
    escribir(0);
    const paso = (ahora) => { const t = Math.min(1, (ahora - t0) / dura); escribir(Math.round(fin * (1 - Math.pow(1 - t, 3)))); if (t < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }), { threshold: 0.6 });
  cuentas.forEach((el) => ioc.observe(el));
}

/* ══════════════════════ el scroll con inercia ══════════════════════ */
/* La rueda del mouse no salta: el destino se acumula y la página llega con un resorte suave. El teclado, la
   barra, el táctil y los enlaces siguen siendo los del navegador (sólo se toma la rueda, con puntero fino). */
if (!quieto && window.matchMedia("(pointer: fine)").matches) {
  let destino = window.scrollY, andandoScroll = false, propio = false;
  const tope = () => document.documentElement.scrollHeight - window.innerHeight;
  const mover = () => {
    const y = window.scrollY, d = destino - y;
    if (Math.abs(d) < 0.6) { propio = true; window.scrollTo(0, destino); andandoScroll = false; return; }
    propio = true; window.scrollTo(0, y + d * 0.14);
    requestAnimationFrame(mover);
  };
  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.defaultPrevented || e.target.closest("dialog[open], textarea, select, [data-scroll-propio]")) return;
    e.preventDefault();
    const paso = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    destino = Math.max(0, Math.min(tope(), (andandoScroll ? destino : window.scrollY) + paso));
    if (!andandoScroll) { andandoScroll = true; requestAnimationFrame(mover); }
  }, { passive: false });
  window.addEventListener("scroll", () => { if (propio) { propio = false; return; } if (!andandoScroll) destino = window.scrollY; }, { passive: true });
}

/* ══════════════════════ sin escena 3D (v7, paso 0) ══════════════════════ */
/* La escena en tiempo real se sacó: la página es texto, capturas reales y luz en CSS. Los visuales que vienen
   (prerrenderizados, recorridos con el scroll) se cargan aparte cuando estén aprobados. */

/* ══════════════════════ las pantallas con profundidad ══════════════════════ */
/* El marco se inclina hacia el puntero (hasta 6°); en las tarjetas, además, la pieza de
   adelante y la pantalla de atrás se corren en sentidos opuestos: la profundidad sigue al mouse. */
if (!quieto && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".profundidad").forEach((fig) => {
    fig.addEventListener("pointermove", (e) => {
      const r = fig.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      fig.classList.add("mirando");
      fig.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
      fig.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
    });
    fig.addEventListener("pointerleave", () => {
      fig.classList.remove("mirando");
      fig.style.removeProperty("--ry"); fig.style.removeProperty("--rx");
    });
  });
  document.querySelectorAll(".tarjeta").forEach((t) => {
    t.addEventListener("pointermove", (e) => {
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
      t.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
      t.style.setProperty("--fx", (x * 18).toFixed(1) + "px");
      t.style.setProperty("--fy", (y * 14).toFixed(1) + "px");
    });
    t.addEventListener("pointerleave", () => { ["--rx", "--ry", "--fx", "--fy"].forEach((v) => t.style.removeProperty(v)); });
  });
}

/* ══════════════════════ los enlaces de la misma página ══════════════════════ */
/* Se deslizan hasta la sección (sólo al tocarlos: el resto del desplazamiento es nativo).
   El viaje es propio y no el del navegador: el destino se vuelve a medir en cada cuadro, porque
   mientras se llega las secciones lejanas se maquetan (content-visibility: auto, con un alto
   estimado) y las demos se montan y crecen; con el desplazamiento suave nativo, que mide una sola
   vez al salir, «Descargar» caía en las tarjetas en celular. Un gesto del alumno corta el viaje. */
let viaje = 0;
function deslizarHasta(destino) {
  cancelAnimationFrame(viaje);
  // la sección puede pedir aire arriba (scroll-margin-top: en las legales, para no quedar bajo la cabecera)
  const aire = parseFloat(getComputedStyle(destino).scrollMarginTop) || 0;
  const arriba = () => destino.getBoundingClientRect().top + window.scrollY - aire;
  const desde = window.scrollY, salida = performance.now(), dura = quieto ? 0 : 900;
  let asentando = 0;
  const paso = (ahora) => {
    const t = dura ? Math.min(1, (ahora - salida) / dura) : 1;
    const meta = arriba();
    if (t < 1) { window.scrollTo(0, desde + (meta - desde) * curva(t)); viaje = requestAnimationFrame(paso); return; }
    // al llegar, unos cuadros más midiendo: lo que se maqueta recién al acercarse corre el destino
    // en ese mismo cuadro, y ahí el anclaje del navegador no lo compensa
    if (Math.abs(window.scrollY - meta) > 1) window.scrollTo(0, meta);
    if (asentando++ < 10) viaje = requestAnimationFrame(paso);
  };
  if (!dura) window.scrollTo(0, arriba());
  viaje = requestAnimationFrame(paso);
}
["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => cancelAnimationFrame(viaje), { passive: true }));
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute("href").slice(1);
  if (!id) return;
  a.addEventListener("click", (e) => {
    const destino = document.getElementById(id);
    if (!destino) return;
    e.preventDefault();
    deslizarHasta(destino);
    history.replaceState(null, "", "#" + id);
    // como el salto nativo: el foco (y el Tab siguiente) siguen desde la sección; vale para «Saltar al contenido»
    if (!destino.hasAttribute("tabindex")) destino.setAttribute("tabindex", "-1");
    destino.focus({ preventScroll: true });
  });
});

/* ══════════════════════ las demos ══════════════════════ */
/* La interfaz de verdad con datos de una materia de ejemplo, sin servidor. Se piden cuando
   la primera demo se acerca a la pantalla (no pesan en la carga). */
const demos = document.querySelectorAll("[data-demo]");
if (demos.length) {
  let pedidas = false;
  const pedirDemos = () => {
    if (pedidas) return; pedidas = true;
    import("./demos.js").then((m) => m.montar(document, { quieto })).catch(() => {});
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); pedirDemos(); } }, { rootMargin: "25% 0px" });
    demos.forEach((d) => io.observe(d));
  } else pedirDemos();
}

/* ══════════════════════ el sonido ══════════════════════ */
/* Todo sintetizado en el momento (no se descarga ningún archivo): campanitas de piedra y
   bronce afinadas en el acorde de la firma de la app (re · la · do# · mi · fa#), con
   variantes que rotan para no repetir. Arranca con el primer gesto (el navegador lo exige),
   se apaga con el botón (y lo recuerda), y calla con la pestaña oculta. */
const SONIDO = (() => {
  const boton = document.getElementById("sonido");
  let ctx = null, maestro = null, prendido = true, cuenta = 0;
  try { prendido = localStorage.getItem("cathedra-sonido") !== "0"; } catch (e) { /* sin almacenamiento: queda prendido */ }
  const NOTAS = [587.33, 880.0, 1108.73, 1318.51, 1479.98, 1174.66];   // re5 la5 do#6 mi6 fa#6 re6
  function crear() {
    if (ctx || !window.AudioContext) return;
    ctx = new AudioContext();
    maestro = ctx.createGain();
    maestro.gain.value = prendido ? 0.5 : 0;
    // una sala chica: un eco corto y oscuro
    const eco = ctx.createDelay(); eco.delayTime.value = 0.11;
    const vuelta = ctx.createGain(); vuelta.gain.value = 0.28;
    const oscuro = ctx.createBiquadFilter(); oscuro.type = "lowpass"; oscuro.frequency.value = 2200;
    maestro.connect(ctx.destination);
    maestro.connect(eco); eco.connect(oscuro); oscuro.connect(vuelta); vuelta.connect(eco); vuelta.connect(ctx.destination);
  }
  function campana(f, cuando, vol, largo) {
    const t0 = ctx.currentTime + cuando;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + largo);
    g.connect(maestro);
    // fundamental + parciales inarmónicos de campana
    [[1, 1], [2.76, 0.32], [5.4, 0.12]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = f * m;
      const ga = ctx.createGain(); ga.gain.value = a;
      o.connect(ga); ga.connect(g);
      o.start(t0); o.stop(t0 + largo + 0.05);
    });
  }
  const sonar = {
    pasar() { campana(NOTAS[cuenta++ % 5] * 2, 0, 0.035, 0.35); },
    tocar() { const f = NOTAS[cuenta++ % 3]; campana(f, 0, 0.09, 0.9); campana(f * 1.5, 0.045, 0.05, 0.8); },
    entrar() { [0, 1, 2].forEach((i) => campana(NOTAS[i] / 2, i * 0.09, 0.05, 1.8)); campana(NOTAS[3] / 2, 0.3, 0.04, 2.2); },
  };
  function tocarSonido(nombre) {
    if (!ctx || !prendido || ctx.state !== "running") return;
    sonar[nombre]();
  }
  function primerGesto() {
    crear();
    if (ctx && ctx.state === "suspended") ctx.resume();
    window.removeEventListener("pointerdown", primerGesto, true);
    window.removeEventListener("keydown", primerGesto, true);
  }
  window.addEventListener("pointerdown", primerGesto, true);
  window.addEventListener("keydown", primerGesto, true);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  // los gestos que suenan: pasar por botones y enlaces, tocarlos
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest && e.target.closest("a, button");
    if (el && !el.contains(e.relatedTarget)) tocarSonido("pasar");
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("a, button") && !e.target.closest("#sonido")) tocarSonido("tocar");
  });

  // el botón: la onda dibujada, plana si está apagado
  if (boton && window.AudioContext) {
    boton.hidden = false;
    const lienzo = boton.querySelector("canvas");
    const c2 = lienzo.getContext("2d");
    let amp = prendido ? 1 : 0, dibujando = false;
    const pintar = (ahora) => {
      const objetivo = prendido ? 1 : 0;
      amp += (objetivo - amp) * 0.12;
      c2.clearRect(0, 0, 44, 44);
      c2.strokeStyle = getComputedStyle(boton).color;
      c2.lineWidth = 2.4; c2.lineCap = "round";
      c2.beginPath();
      for (let i = 0; i <= 32; i++) {
        const x = 6 + (i / 32) * 32;
        const env = Math.sin((i / 32) * Math.PI);
        const y = 22 + Math.sin(ahora / 1000 * 8 + (i / 32) * 7) * 9 * amp * env;
        i ? c2.lineTo(x, y) : c2.moveTo(x, y);
      }
      c2.stroke();
      if (!quieto && (Math.abs(amp - objetivo) > 0.01 || prendido) && !document.hidden) requestAnimationFrame(pintar);
      else dibujando = false;
    };
    const redibujar = () => { if (!dibujando) { dibujando = true; requestAnimationFrame(pintar); } };
    const estado = () => {
      boton.setAttribute("aria-pressed", String(prendido));
      boton.setAttribute("aria-label", prendido ? "Apagar el sonido de la página" : "Prender el sonido de la página");
      boton.title = prendido ? "Sonido prendido" : "Sonido apagado";
    };
    estado(); redibujar();
    document.addEventListener("visibilitychange", redibujar);
    boton.addEventListener("click", () => {
      crear();
      prendido = !prendido;
      try { localStorage.setItem("cathedra-sonido", prendido ? "1" : "0"); } catch (e) { /* nada */ }
      if (maestro) maestro.gain.setTargetAtTime(prendido ? 0.5 : 0, ctx.currentTime, 0.08);
      if (prendido && ctx) { ctx.resume().then(() => sonar.entrar()); }
      estado(); redibujar();
    });
  }
  return { tocar: tocarSonido };
})();

/* ══════════════════════ la cortina entre páginas ══════════════════════ */
/* Los enlaces a las otras páginas del sitio: la página siguiente se pide apenas el puntero
   se acerca, y al tocar, el negro se cierra en un círculo hacia el dedo antes de irse. */
const cortina = document.querySelector(".cortina");
const pedidas = new Set();
function esOtraPagina(a) {
  if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-descarga")) return false;
  const u = new URL(a.href, location.href);
  return u.origin === location.origin && u.pathname !== location.pathname;
}
document.addEventListener("pointerover", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || !esOtraPagina(a) || pedidas.has(a.href)) return;
  pedidas.add(a.href);
  const l = document.createElement("link");
  l.rel = "prefetch"; l.href = a.href;
  document.head.appendChild(l);
});
if (cortina && !quieto) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || !esOtraPagina(a)) return;
    e.preventDefault();
    raiz.style.setProperty("--cx", e.clientX ? e.clientX + "px" : "50%");
    raiz.style.setProperty("--cy", e.clientY ? e.clientY + "px" : "50%");
    raiz.classList.add("saliendo");
    if (window.CATHEDRA_PAGINA && window.CATHEDRA_PAGINA.pausar) window.CATHEDRA_PAGINA.pausar();
    try { sessionStorage.setItem("cathedra-cortina", "1"); } catch (err) { /* nada */ }
    setTimeout(() => { location.href = a.href; }, 720);
  });
  // al llegar desde otra página del sitio, se abre desde el centro
  let vino = false;
  try { vino = sessionStorage.getItem("cathedra-cortina") === "1"; sessionStorage.removeItem("cathedra-cortina"); } catch (e) { /* nada */ }
  if (vino && !carga) {
    raiz.classList.add("entrando");
    requestAnimationFrame(() => requestAnimationFrame(() => { raiz.classList.add("entro"); raiz.classList.remove("entrando"); }));
  }
  // al volver con «atrás», la página no puede quedar tapada
  window.addEventListener("pageshow", (e) => { if (e.persisted) raiz.classList.remove("saliendo"); });
}

/* ══════════════════════ sin animaciones, a mano ══════════════════════ */
document.querySelectorAll("[data-quieto]").forEach((a) => {
  a.textContent = quieto ? "Ver con animaciones" : "Ver sin animaciones";
  a.setAttribute("aria-pressed", String(quieto));
  a.addEventListener("click", (e) => {
    e.preventDefault();
    try { localStorage.setItem("cathedra-quieto", quieto ? "0" : "1"); } catch (err) { /* sin almacenamiento */ }
    location.replace(location.pathname + location.hash);
  });
});

/* ══════════════════════ ver una pantalla en grande ══════════════════════ */
/* Tocar una captura la abre a pantalla completa en un diálogo; Escape (o tocar afuera) la
   cierra y el foco vuelve a donde estaba. */
const visor = document.getElementById("visor");
if (visor && typeof visor.showModal === "function") {
  const imgVisor = visor.querySelector("img");
  const textoVisor = visor.querySelector(".visor-texto");
  /* La imagen tocada SE TRANSFORMA en la pantalla grande (FLIP): sale de su lugar, con su escala,
     y llega con un resorte de segundo orden (amortiguación 0,9, unos 760 ms); al cerrar hace el
     camino inverso hasta su lugar. Mientras se mueve no toma otros toques, salvo cerrar, que la
     da vuelta desde donde esté. */
  const resorte = (() => {
    const z = 0.9, dur = 0.76, w = 4.6 / (z * dur), wd = w * Math.sqrt(1 - z * z), pts = [];
    for (let k = 0; k <= 48; k++) {
      const t = (k / 48) * dur;
      pts.push((1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))).toFixed(4));
    }
    pts[48] = "1";
    return CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)") ? `linear(${pts.join(", ")})` : "cubic-bezier(.22, .68, 0, 1)";
  })();
  let origen = null, animacion = null;
  const transformDesde = (el) => {
    const o = el.getBoundingClientRect(), f = visor.getBoundingClientRect();
    return `translate(${o.left - f.left}px, ${o.top - f.top}px) scale(${o.width / f.width}, ${o.height / f.height})`;
  };
  const abrirVisor = (src, alt, titulo, texto, desde) => {
    if (animacion) return;                                   // bloqueo: una a la vez
    imgVisor.src = src; imgVisor.alt = alt || "";
    visor.classList.toggle("con-texto", !!texto);
    textoVisor.hidden = !texto;
    textoVisor.innerHTML = "";
    if (texto) {
      const b = document.createElement("b"); b.textContent = titulo || ""; textoVisor.append(b, document.createTextNode(texto));
    }
    origen = desde || null;
    visor.classList.toggle("flip", !!origen && !quieto);
    visor.showModal();
    if (!origen || quieto || !visor.animate) return;
    visor.style.transformOrigin = "0 0";
    animacion = visor.animate([{ transform: transformDesde(origen), borderRadius: "14px" }, { transform: "none", borderRadius: "14px" }],
      { duration: 760, easing: resorte, fill: "both" });
    if (texto) textoVisor.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 380, easing: "cubic-bezier(.22,.68,0,1)", fill: "both" });
    animacion.onfinish = () => { animacion.cancel(); animacion = null; };
  };
  const cerrarVisor = () => {
    if (!visor.open) return;
    if (!origen || quieto || !visor.animate) { visor.close(); return; }
    if (animacion) { animacion.reverse(); animacion.onfinish = () => { animacion = null; visor.close(); }; return; }   // interrumpible
    animacion = visor.animate([{ transform: "none" }, { transform: transformDesde(origen) }], { duration: 620, easing: resorte, fill: "both" });
    animacion.onfinish = () => { visor.close(); animacion.cancel(); animacion = null; };
    setTimeout(() => { if (visor.open && animacion) { animacion.cancel(); animacion = null; visor.close(); } }, 900);   // por si el cuadro se atrasa
  };
  // Escape cierra en el acto (el teclado no espera una animación); el toque y el botón hacen la vuelta
  visor.addEventListener("cancel", () => { if (animacion) { animacion.cancel(); animacion = null; } });
  document.querySelectorAll("[data-ampliar]").forEach((b) => {
    b.addEventListener("click", () => {
      const img = b.closest(".profundidad").querySelector(".pf-fondo");
      abrirVisor(b.dataset.ampliar || img.currentSrc || img.src, img.alt, "", "", img);
    });
  });
  // las tarjetas crecen hasta pantalla completa, con lo que hace esa pantalla
  document.querySelectorAll(".tarjeta").forEach((t) => {
    t.addEventListener("click", () => {
      const titulo = t.querySelector("b").textContent;
      abrirVisor(t.dataset.grande, "La pantalla de Cathedra: " + titulo, titulo, t.dataset.texto, t.querySelector(".tj-cuadro"));
    });
  });
  visor.addEventListener("click", (e) => { if (e.target === visor || e.target.closest("[data-cerrar]")) cerrarVisor(); });
} else {
  document.querySelectorAll("[data-ampliar]").forEach((b) => { b.hidden = true; });
}
/* ══════════════════════ tu computadora ══════════════════════
   Estimación con lo que el navegador deja ver (memoria, núcleos, tarjeta de video);
   el instalador mide la de verdad. Espejo de app/paquetes.json de la app: los ids
   son fijos, los textos se pueden editar. «Local plus» sólo lo propone el instalador. */
const PAQUETES = {
  liviano: { nombre: "Liviano", lema: "Todo anda por conexión; casi no ocupa lugar." },
  local_4b: { nombre: "Local", lema: "Preguntas y voz también sin conexión." }
};
function estimarPaquete() {
  const memoria = navigator.deviceMemory || 0;        // el navegador la topa en 8
  const nucleos = navigator.hardwareConcurrency || 0;
  let video = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
    if (info) video = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "");
  } catch (e) { video = ""; }
  const aparte = /\b(GTX|RTX|Quadro|Radeon RX|Radeon Pro|Arc A)\b/i.test(video);
  const alcanza = (memoria === 0 || memoria >= 8) && nucleos >= 4;
  return aparte && alcanza ? "local_4b" : "liviano";
}
(function () {
  const caja = document.getElementById("tu-equipo");
  if (!caja || /Windows/.test(navigator.userAgent) === false) return;
  const p = PAQUETES[estimarPaquete()];
  // la misma frase que la tarjeta de Ajustes › Módulos de la app (paquetes.json › textos › titulo)
  document.getElementById("te-nombre").textContent = "Te recomendamos el paquete «" + p.nombre + "».";
  document.getElementById("te-lema").textContent = p.lema;
  caja.hidden = false;
})();
})();
