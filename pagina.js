/* La página de Cathedra · identidad cuero (19/10/2026).

   Las dos constantes que hay que tocar al publicar están arriba. El resto:
     · la carga: la estrella se enciende con lo que va llegando (las letras y la página) y se abre;
     · el héroe: el emblema protagonista entra con GSAP (fondo y titular, después la bajada y el botón, al final
       el emblema sube y se enciende), flota sin repetirse (tramos de 6 a 9 s), gira hasta 6° hacia el puntero y,
       al bajar, se achica y se corre a un costado (ScrollTrigger). En el teléfono, arriba y sin seguir al puntero;
     · las apariencias Cuero y Marfil: siguen al sistema hasta que se elige una en la cabecera (se recuerda);
     · las entradas de las secciones atadas al scroll, la cabecera, las demos, el visor y el sonido.
   Con «reducir movimiento» (del sistema o del pie) nada se anima y todo llega puesto. Sin JS, la página se ve igual
   de completa. El texto, los enlaces y los botones son HTML. */

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
// la vista para fabricar la imagen para compartir
if (/vista=compartir/.test(location.search)) raiz.classList.add("vista-compartir");
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════ los enlaces ══════════════════════ */
document.querySelectorAll("[data-descarga]").forEach((a) => { a.href = ENLACE_INSTALADOR; });
const esCorreo = /^[^\s@\[\]]+@[^\s@\[\]]+\.[^\s@\[\]]+$/.test(CONTACTO);
document.querySelectorAll("[data-contacto]").forEach((a) => {
  if (esCorreo) a.href = "mailto:" + CONTACTO;
});
document.querySelectorAll("[data-contacto-texto]").forEach((el) => { el.textContent = CONTACTO; });

/* ══════════════════════ las apariencias: Cuero y Marfil ══════════════════════ */
/* Sin elegir, la página sigue al sistema (las imágenes también, con <source media>). Al elegir, <html data-tema>
   fija la apariencia (lo pone ya el guion de la cabecera antes de pintar) y las fuentes de las imágenes se ajustan. */
const claroSistema = window.matchMedia("(prefers-color-scheme: light)");
const temaActual = () => raiz.dataset.tema || (claroSistema.matches ? "marfil" : "cuero");
const NOMBRE_TEMA = { cuero: "Cuero", marfil: "Marfil" };
const COLOR_TEMA = { cuero: "#1A0F0B", marfil: "#F1ECE4" };
const botonTema = document.getElementById("tema");
function fuentesSegunTema() {
  const elegido = raiz.dataset.tema;
  document.querySelectorAll("source[data-tema]").forEach((s) => {
    if (s.dataset.mediaOriginal === undefined) s.dataset.mediaOriginal = s.getAttribute("media") || "";
    if (!elegido) {
      if (s.dataset.mediaOriginal) s.setAttribute("media", s.dataset.mediaOriginal); else s.removeAttribute("media");
    } else s.setAttribute("media", s.dataset.tema === elegido ? "all" : "not all");
  });
  if (elegido) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", COLOR_TEMA[elegido]));
  if (botonTema) {
    const ahora = temaActual(), otro = ahora === "cuero" ? "marfil" : "cuero";
    botonTema.setAttribute("aria-label", `Apariencia ${NOMBRE_TEMA[ahora]}: cambiar a ${NOMBRE_TEMA[otro]}`);
    botonTema.title = `Cambiar a ${NOMBRE_TEMA[otro]}`;
  }
}
fuentesSegunTema();
if (botonTema) {
  botonTema.hidden = false;
  botonTema.addEventListener("click", () => {
    const nuevo = temaActual() === "cuero" ? "marfil" : "cuero";
    const cambiar = () => {
      raiz.dataset.tema = nuevo;
      try { localStorage.setItem("cathedra-tema", nuevo); } catch (e) { /* sin almacenamiento: vale para esta visita */ }
      fuentesSegunTema();
    };
    if (!quieto && document.startViewTransition) document.startViewTransition(cambiar); else cambiar();
  });
  claroSistema.addEventListener("change", fuentesSegunTema);
}

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
/* Ningún texto aparece de golpe: cada título, párrafo, etiqueta, botón, tarjeta e imagen tiene un valor --v (0 a 1)
   que sigue a su posición en la pantalla. Entra desde abajo (sólo opacidad y un desplazamiento corto; los títulos por
   máscara y palabra por palabra; las pantallas con un revelado) y sale igual, en espejo, cuando se va por arriba.
   Con «reducir movimiento» todo queda puesto desde el principio. */
const TIPOS = [
  [".tramo .titular, .todo .titular, .descargar .titular, .cita .titular", "rev-mascara"],
  [".tramo .paso-num, .cita .paso-num, .tramo-bajada, .datos li, .nota-al-pie, .todo .rotulo, .todo .tramo-bajada, .descargar-caja > :not(.titular), .pie > *", "rev-texto"],
  [".demo, .tarjeta, .cita-demo", "rev-panel"],
  [".profundidad", "rev-imagen"],
];
const revelables = [];
TIPOS.forEach(([sel, clase]) => document.querySelectorAll(sel).forEach((el) => {
  if (el.dataset.rev !== undefined) return;
  el.dataset.rev = ""; el.classList.add(clase); revelables.push(el);
}));
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
      // entra entero apenas asoma (el último 16 % de la pantalla) y sale sólo al irse por arriba (el primer 10 %)
      const entra = curva((vh - r.top) / (vh * 0.16));
      const sale = curva(r.bottom / (vh * 0.1));
      const objetivo = Math.min(entra, sale);
      let st = resortes.get(el);
      if (!st) { st = { v: 0, d: 0 }; resortes.set(el, st); }
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
    el.style.setProperty("--v", "0");
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
    setTimeout(() => { rotuloCab.textContent = nombre; rotuloCab.classList.toggle("vacio", !nombre); rotuloCab.classList.remove("cambiando"); }, quieto ? 0 : 160);
  };
  window.addEventListener("scroll", cual, { passive: true });
  cual();
}

/* ══════════════════════ la cabecera ══════════════════════ */
const cabecera = document.querySelector(".cabecera");
const portada = document.getElementById("portada");
function cabeceraSegunScroll() {
  if (!cabecera || !portada) return;          // en las legales la cabecera ya va con fondo
  cabecera.classList.toggle("sobre", portada.getBoundingClientRect().bottom < 90);
}
window.addEventListener("scroll", cabeceraSegunScroll, { passive: true });
cabeceraSegunScroll();

/* ══════════════════════ el héroe: el emblema protagonista ══════════════════════ */
/* Tres capas para el emblema, cada una con un solo trabajo (así ninguna transformación pisa a otra):
   .heroe-emblema (el scroll), .emblema-entrada (la entrada), .emblema-flota (la flotación) y .emblema-giro (el puntero).
   El núcleo y el halo respiran con tramos al azar. Todo se frena cuando el héroe sale de la pantalla. */
(function heroe() {
  const sec = document.getElementById("portada");
  if (!sec || quieto || !gsap) return;           // quieto o sin GSAP: el héroe ya está puesto y encendido
  const q = (s) => sec.querySelector(s);
  const emblema = q(".heroe-emblema"), entrada = q(".emblema-entrada"), flota = q(".emblema-flota"), giro = q(".emblema-giro");
  const img = q(".emblema-img"), halo = q(".emblema-halo"), nucleo = q(".emblema-nucleo"), fondo = q(".heroe-fondo");
  const texto = q(".heroe-texto"), lineas = sec.querySelectorAll(".heroe-titular .linea > span");
  const despues = [q(".heroe-bajada"), q(".portada-acciones"), q(".requisito")];
  const rotulo = q(".rotulo"), datos = q(".heroe-datos"), bajar = q(".bajar");
  const apilado = window.matchMedia("(max-width: 860px), (max-aspect-ratio: 11/10)").matches;
  const fino = window.matchMedia("(pointer: fine)").matches && !apilado;
  const sombra = getComputedStyle(img).filter.replace(/brightness\([^)]*\)|saturate\([^)]*\)/g, "").trim() || "none";
  const encendido = "brightness(1) saturate(1) " + (sombra === "none" ? "" : sombra);
  const apagado = "brightness(0.42) saturate(0.55) " + (sombra === "none" ? "" : sombra);

  // el estado de partida (mientras la carga tapa la página)
  gsap.set(fondo, { opacity: 0, scale: 1.06, transformOrigin: "60% 60%" });
  gsap.set(lineas, { yPercent: 112 });
  gsap.set([rotulo, ...despues], { opacity: 0, y: 18 });
  if (datos) gsap.set(datos, { opacity: 0, x: 24 });
  gsap.set(bajar, { opacity: 0 });
  gsap.set(entrada, { opacity: 0, y: apilado ? 40 : 70, scale: 0.94 });
  gsap.set(img, { filter: apagado });
  gsap.set([halo, nucleo], { opacity: 0, scale: 0.6 });
  gsap.set(giro, { transformPerspective: 1100 });

  let enVista = true, vivos = [];
  const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
  tl.to(fondo, { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" }, 0)
    .to(rotulo, { opacity: 1, y: 0, duration: 0.5 }, 0.05)
    .to(lineas, { yPercent: 0, duration: 0.55, stagger: 0.08 }, 0)                 // 0–0,6 s: fondo y titular
    .to(despues, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.3)          // 0,3–1,2 s: bajada y botón
    .to(entrada, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }, 0.7)   // 0,7–1,6 s: sube…
    .to(img, { filter: encendido, duration: 0.75, ease: "power2.inOut" }, 0.85)           // …y se enciende
    .to(halo, { opacity: 1, scale: 1, duration: 0.8 }, 0.95)
    .to(nucleo, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.2)" }, 1.05)
    .to(datos || {}, { opacity: 1, x: 0, duration: 0.7 }, 1.0)
    .to(bajar, { opacity: 1, duration: 0.6 }, 1.3)
    .add(() => { gsap.set(img, { clearProps: "filter" }); flotar(); respirar(nucleo, 0.7, 1, 0.9, 1.08, 1.6, 2.8); respirar(halo, 0.75, 1, 0.96, 1.04, 2.6, 4.2); }, 1.65);

  // la flotación: cada tramo va a un punto nuevo al azar y dura la mitad de un ciclo de 6 a 9 s (nunca se repite)
  const amplitud = apilado ? 0.6 : 1;
  function flotar() {
    const paso = () => {
      const t = gsap.to(flota, {
        y: gsap.utils.random(-16, 6) * amplitud, x: gsap.utils.random(-7, 7) * amplitud, rotation: gsap.utils.random(-1.8, 1.8),
        duration: gsap.utils.random(3, 4.5), ease: "sine.inOut", onComplete: paso,
      });
      vivos[0] = t; if (!enVista) t.pause();
    };
    paso();
  }
  function respirar(el, o0, o1, s0, s1, d0, d1) {
    const i = vivos.length;
    const paso = () => {
      const t = gsap.to(el, { opacity: gsap.utils.random(o0, o1), scale: gsap.utils.random(s0, s1), duration: gsap.utils.random(d0, d1), ease: "sine.inOut", onComplete: paso });
      vivos[i] = t; if (!enVista) t.pause();
    };
    vivos[i] = null; paso();
  }

  // el puntero: gira hasta 6° (y en vertical hasta 4°), con inercia; sólo en escritorio
  if (fino) {
    const rx = gsap.quickTo(giro, "rotationX", { duration: 1.1, ease: "power3.out" });
    const ry = gsap.quickTo(giro, "rotationY", { duration: 1.1, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => {
      if (!enVista) return;
      ry((e.clientX / window.innerWidth - 0.5) * 12);
      rx((0.5 - e.clientY / window.innerHeight) * 8);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { rx(0); ry(0); });
  }

  // el scroll: el emblema se achica y se corre a un costado, el texto se va y el fondo baja apenas
  if (ScrollTrigger) {
    const st = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: 0.6,
      onToggle: (s) => { enVista = s.isActive; vivos.forEach((t) => t && (enVista ? t.resume() : t.pause())); } } });
    if (apilado) {
      st.to(emblema, { scale: 0.82, yPercent: -12, ease: "none" }, 0)
        .to(emblema, { opacity: 0, ease: "power1.in", duration: 0.4 }, 0.6);
    } else {
      st.to(emblema, { scale: 0.5, xPercent: 40, yPercent: -16, ease: "none" }, 0)
        .to(emblema, { opacity: 0, ease: "power1.in", duration: 0.35 }, 0.65)
        .to(texto, { y: -70, opacity: 0, ease: "none", duration: 0.6 }, 0)
        .to(datos || {}, { y: -40, opacity: 0, ease: "none", duration: 0.5 }, 0)
        .to(fondo, { yPercent: 5, scale: 1.04, ease: "none" }, 0);
    }
  }
  document.addEventListener("visibilitychange", () => vivos.forEach((t) => t && (document.hidden || !enVista ? t.pause() : t.resume())));
  PAGINA.entrarHeroe = () => tl.play();
})();

/* ══════════════════════ la carga: la estrella se enciende ══════════════════════ */
/* Lo que se mide de verdad: las letras (70 %) y la página (30 %). Lo que se muestra persigue a lo medido con un
   suavizado y dura como mínimo 0,6 s, para que el ritmo se sostenga aunque todo ya esté. Tope: a los 1,4 s se abre. */
const carga = document.getElementById("carga");
const estrellaCarga = document.getElementById("carga-estrella");
const cifra = document.getElementById("carga-cifra");
const inicio = performance.now();
let medidoLetras = 0, medidoPagina = 0, mostrado = 0, abierta = false;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medidoLetras = 1; });
else medidoLetras = 1;
setTimeout(() => { medidoLetras = 1; }, 1200);
if (document.readyState === "complete") medidoPagina = 1; else window.addEventListener("load", () => { medidoPagina = 1; });

function pasoCarga(ahora) {
  if (abierta) return;
  const medido = medidoLetras * 0.7 + medidoPagina * 0.3;
  mostrado += (medido - mostrado) * (1 - Math.exp(-7 / 60));
  mostrado = Math.min(mostrado, (ahora - inicio) / 600);
  if (medido >= 0.999 && mostrado > 0.985) mostrado = 1;
  if (estrellaCarga) estrellaCarga.style.setProperty("--p", mostrado.toFixed(3));
  if (cifra) cifra.textContent = String(Math.round(mostrado * 100)).padStart(3, "0");
  if (mostrado >= 1 || ahora - inicio > 1400) { abrir(); return; }
  requestAnimationFrame(pasoCarga);
}
function abrir() {
  if (abierta) return;
  abierta = true;
  if (estrellaCarga) estrellaCarga.style.setProperty("--p", "1");
  raiz.classList.remove("cargando");
  raiz.classList.add("abriendo");
  setTimeout(() => { if (PAGINA.entrarHeroe) PAGINA.entrarHeroe(); }, 200);
  setTimeout(() => { raiz.classList.remove("abriendo"); raiz.classList.add("abierta"); }, 700);
}
if (quieto || !carga) {
  // sin animaciones (o una página sin carga, como las legales): la página ya está puesta
  raiz.classList.remove("cargando");
  raiz.classList.add("abierta");
  abierta = true;
} else {
  requestAnimationFrame(pasoCarga);
}

/* ══════════════════════ la cita al minuto ══════════════════════ */
/* Al pasar el mouse por un sello (o al tocarlo, o con el foco del teclado) se ilumina el tramo de la clase que lo
   respalda; el sello vacío muestra que eso no está en el material. */
document.querySelectorAll("[data-cita-demo]").forEach((demo) => {
  const sellos = [...demo.querySelectorAll("button.sello")];
  const lineas = [...demo.querySelectorAll(".cd-clase li")];
  const encender = (clave) => {
    sellos.forEach((s) => s.classList.toggle("activo", s.dataset.cita === clave));
    lineas.forEach((l) => l.classList.toggle("encendida", !!clave && l.dataset.cita === clave));
  };
  sellos.forEach((s) => {
    s.setAttribute("aria-pressed", "false");
    const en = () => { encender(s.dataset.cita); sellos.forEach((o) => o.setAttribute("aria-pressed", String(o === s))); };
    s.addEventListener("mouseenter", en); s.addEventListener("focus", en); s.addEventListener("click", en);
  });
  encender("a"); sellos[0].setAttribute("aria-pressed", "true");     // de entrada, el primero encendido
});

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

/* ══════════════════════ las pantallas con profundidad ══════════════════════ */
/* El marco de vidrio se inclina hacia el puntero (hasta 6°); en las tarjetas, además, la pieza de adelante y la
   pantalla de atrás se corren en sentidos opuestos: la profundidad sigue al mouse. */
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
   estimado) y las demos se montan y crecen. Un gesto del alumno corta el viaje. */
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
/* Todo sintetizado en el momento (no se descarga ningún archivo): campanitas afinadas en el acorde de la firma de
   la app (re · la · do# · mi · fa#), con variantes que rotan para no repetir. Arranca con el primer gesto (el
   navegador lo exige), se apaga con el botón (y lo recuerda), y calla con la pestaña oculta. */
(() => {
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
})();

/* ══════════════════════ la cortina entre páginas ══════════════════════ */
/* Los enlaces a las otras páginas del sitio: la página siguiente se pide apenas el puntero
   se acerca, y al tocar, el fondo se cierra en un círculo hacia el dedo antes de irse. */
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
  /* La imagen tocada SE TRANSFORMA en la pantalla grande (FLIP): sale de su lugar, con su escala, y llega con un
     resorte de segundo orden (amortiguación 0,9, unos 760 ms); al cerrar hace el camino inverso hasta su lugar. */
  const resorte = (() => {
    const z = 0.9, dur = 0.76, w = 4.6 / (z * dur), wd = w * Math.sqrt(1 - z * z), pts = [];
    for (let k = 0; k <= 48; k++) {
      const t = (k / 48) * dur;
      pts.push((1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))).toFixed(4));
    }
    pts[48] = "1";
    return CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)") ? `linear(${pts.join(", ")})` : "cubic-bezier(.2, 0, 0, 1)";
  })();
  let origen = null, animacion = null;
  const transformDesde = (el) => {
    const o = el.getBoundingClientRect(), f = visor.getBoundingClientRect();
    return `translate(${o.left - f.left}px, ${o.top - f.top}px) scale(${o.width / f.width}, ${o.height / f.height})`;
  };
  const abrirVisor = (src, alt, titulo, texto, desde) => {
    if (animacion) return;                                   // una a la vez
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
    animacion = visor.animate([{ transform: transformDesde(origen), borderRadius: "16px" }, { transform: "none", borderRadius: "22px" }],
      { duration: 760, easing: resorte, fill: "both" });
    if (texto) textoVisor.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 380, easing: "cubic-bezier(.05, .7, .1, 1)", fill: "both" });
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
    if (!t.dataset.grande) return;
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
