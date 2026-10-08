/* La página de Cathedra: lo que no es la nave.

   Las dos constantes que hay que tocar al publicar están arriba. El resto:
     · la carga: la C de dovelas se arma con lo que va llegando (las letras y la
       nave) y, al cerrarse, la luz se abre en un círculo desde el signo;
     · las entradas: los títulos llegan palabra por palabra y los bloques suben
       con la curva de la casa cuando entran en pantalla (y vuelven a su lugar
       quietos con «reducir movimiento»);
     · la cabecera, que cambia de fondo apenas se deja la portada;
     · el arranque de la nave (nave.js) o, si no hay 3D, la imagen quieta.
   Todo funciona sin la nave: el texto, los enlaces y los botones son HTML. */

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
if (quieto) raiz.classList.add("quieto");
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
  let pedido = 0;
  const actualizar = () => {
    pedido = 0;
    const vh = window.innerHeight;
    activos.forEach((el) => {
      const r = el.getBoundingClientRect();
      const entra = el.dataset.rev === "salida" ? 1 : curva((vh - r.top) / (vh * 0.3));
      const sale = curva((r.bottom - vh * 0.04) / (vh * 0.26));
      el.style.setProperty("--v", Math.min(entra, sale).toFixed(3));
    });
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
const trazo = carga && carga.querySelector(".cs-trazo");
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
  mostrado = Math.min(mostrado, (ahora - inicio) / 1000);
  if (medido >= 0.999 && mostrado > 0.985) mostrado = 1;
  if (trazo) trazo.style.strokeDashoffset = String(100 - mostrado * 100);
  if (cifra) cifra.textContent = String(Math.round(mostrado * 100)).padStart(3, "0");
  // tope: a los 1,8 s se abre igual; si la nave no llegó, mientras tanto se ve la imagen quieta
  if (mostrado >= 1 || ahora - inicio > 1800) {
    if (!naveLista && !sinNave) raiz.classList.add("esperando-nave");
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

/* ══════════════════════ la nave ══════════════════════ */
/* Por etapas (lo de Bruno, bi-03 / bm-70): 1, la marca y el texto (ya están: son HTML);
   2, la biblioteca 3D, pedida recién después del primer dibujo; 3, la nave, que es sólo
   geometría (no baja archivos); 4, las capturas, por tramo con lazy; 5, el sonido, con el
   primer gesto. Sin animaciones o sin 3D: la imagen quieta, sin pedir la biblioteca. */
function quedarseQuieta() {
  sinNave = true;
  raiz.classList.add("sin-3d");
  raiz.classList.remove("con-3d");
  medidoNave = 1;
}
PAGINA.sinNave = quedarseQuieta;
const hayLienzo = !!document.getElementById("nave");
// sin placa de verdad (dibujo por software) la escena traba la página: ni se pide la biblioteca
function placaDeVerdad() {
  if (/calidad=|medir|saltar|[?&]3d/.test(location.search)) return true;
  try {
    const c = document.createElement("canvas").getContext("webgl");
    if (!c) return false;
    const d = c.getExtension("WEBGL_debug_renderer_info");
    const quien = d ? String(c.getParameter(d.UNMASKED_RENDERER_WEBGL)) : "";
    const soltar = c.getExtension("WEBGL_lose_context");
    if (soltar) soltar.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(quien);
  } catch (e) {
    return false;
  }
}
function pedirNave() {
  if (!hayLienzo || quieto || sinNave) return;
  if (!placaDeVerdad()) { quedarseQuieta(); return; }
  medidoNave = Math.max(medidoNave, 0.1);
  import("./nave.js")
    .then((m) => { medidoNave = Math.max(medidoNave, 0.6); PAGINA.nave(m.iniciar); })
    .catch(() => quedarseQuieta());
}
if (hayLienzo && quieto) quedarseQuieta();
else if (hayLienzo) {
  // la escena se pide cuando la página ya está quieta (o con el primer gesto): no compite con el
  // texto ni con la carga; mientras tanto se ve la imagen quieta de la misma escena
  let pedida = false;
  const pedirUnaVez = () => { if (!pedida) { pedida = true; pedirNave(); } };
  const cuandoQuieta = () => {
    if ("requestIdleCallback" in window) requestIdleCallback(pedirUnaVez, { timeout: 2500 });
    else setTimeout(pedirUnaVez, 600);
  };
  if (document.readyState === "complete") cuandoQuieta(); else window.addEventListener("load", cuandoQuieta, { once: true });
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) => window.addEventListener(ev, pedirUnaVez, { once: true, passive: true }));
}
PAGINA.nave = async (iniciar) => {
  const lienzo = document.getElementById("nave");
  try {
    const motor = await iniciar(lienzo, { quieto: false });
    if (!motor) { quedarseQuieta(); return; }
    PAGINA.motor = motor;
    naveLista = true;
    raiz.classList.add("con-3d");
    setTimeout(() => raiz.classList.remove("esperando-nave"), 1300);
    if (abierta) motor.arrancar();
  } catch (e) {
    quedarseQuieta();
  }
};
// si el módulo no llega (navegador viejo, archivo abierto sin servidor), la imagen quieta
if (hayLienzo) setTimeout(() => { if (!naveLista && !sinNave) quedarseQuieta(); }, 20000);

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
/* Se deslizan hasta la sección (sólo al tocarlos: el resto del desplazamiento es nativo). */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute("href").slice(1);
  if (!id) return;
  a.addEventListener("click", (e) => {
    const destino = document.getElementById(id);
    if (!destino) return;
    e.preventDefault();
    destino.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#" + id);
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
  const abrirVisor = (src, alt, titulo, texto) => {
    imgVisor.src = src; imgVisor.alt = alt || "";
    visor.classList.toggle("con-texto", !!texto);
    textoVisor.hidden = !texto;
    textoVisor.innerHTML = "";
    if (texto) {
      const b = document.createElement("b"); b.textContent = titulo || ""; textoVisor.append(b, document.createTextNode(texto));
    }
    visor.showModal();
  };
  document.querySelectorAll("[data-ampliar]").forEach((b) => {
    b.addEventListener("click", () => {
      const img = b.closest(".profundidad").querySelector(".pf-fondo");
      abrirVisor(b.dataset.ampliar || img.currentSrc || img.src, img.alt);
    });
  });
  // las tarjetas crecen hasta pantalla completa, con lo que hace esa pantalla
  document.querySelectorAll(".tarjeta").forEach((t) => {
    t.addEventListener("click", () => {
      const titulo = t.querySelector("b").textContent;
      abrirVisor(t.dataset.grande, "La pantalla de Cathedra: " + titulo, titulo, t.dataset.texto);
    });
  });
  visor.addEventListener("click", (e) => { if (e.target === visor || e.target.closest("[data-cerrar]")) visor.close(); });
} else {
  document.querySelectorAll("[data-ampliar]").forEach((b) => { b.hidden = true; });
}
/* ══════════════════════ tu computadora ══════════════════════
   Estimación con lo que el navegador deja ver (memoria, núcleos, tarjeta de video);
   el instalador mide la de verdad. Espejo de app/paquetes.json de la app: los ids
   son fijos, los textos se pueden editar. «Local plus» sólo lo propone el instalador. */
const PAQUETES = {
  liviano: { nombre: "Liviano", lema: "Todo anda por conexión y casi no ocupa lugar." },
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
  document.getElementById("te-nombre").textContent = "Te conviene «" + p.nombre + "».";
  document.getElementById("te-lema").textContent = p.lema;
  caja.hidden = false;
})();
})();
