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
  el.setAttribute("aria-label", texto);
  el.textContent = "";
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

/* ══════════════════════ las entradas ══════════════════════ */
const observador = "IntersectionObserver" in window ? new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (e.isIntersecting) { e.target.classList.add("visto"); observador.unobserve(e.target); }
  }
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }) : null;
document.querySelectorAll(".sec-cab, .paso, .virtudes li, .descargar-caja, .pie").forEach((el) => {
  el.classList.add("entra");
  if (observador && !quieto) observador.observe(el); else el.classList.add("visto");
});

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
let medidoLetras = 0, medidoNave = 0, mostrado = 0, abierta = false, naveLista = false, sinNave = false;
PAGINA.cargando = (p) => { medidoNave = Math.max(medidoNave, p); };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medidoLetras = 1; });
else medidoLetras = 1;
setTimeout(() => { medidoLetras = 1; }, 2500);

function pasoCarga(ahora) {
  if (abierta) return;
  const medido = medidoLetras * 0.3 + medidoNave * 0.7;
  const dt = 1 / 60;
  mostrado += (medido - mostrado) * (1 - Math.exp(-7 * dt));
  // nunca más rápido que 1 por segundo: la carga mínima es de un segundo
  mostrado = Math.min(mostrado, (ahora - inicio) / 1000);
  if (medido >= 0.999 && mostrado > 0.985) mostrado = 1;
  if (trazo) trazo.style.strokeDashoffset = String(100 - mostrado * 100);
  if (cifra) cifra.textContent = String(Math.round(mostrado * 100)).padStart(3, "0");
  // tope: a los 2,5 s se abre igual; si la nave no llegó, mientras tanto se ve la imagen quieta
  if (mostrado >= 1 || ahora - inicio > 2500) {
    if (mostrado < 1 && !naveLista) raiz.classList.add("esperando-nave");
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
function pedirNave() {
  if (!hayLienzo || quieto || sinNave) return;
  medidoNave = Math.max(medidoNave, 0.1);
  import("./nave.js")
    .then((m) => { medidoNave = Math.max(medidoNave, 0.6); PAGINA.nave(m.iniciar); })
    .catch(() => quedarseQuieta());
}
if (hayLienzo && quieto) quedarseQuieta();
else if (hayLienzo) {
  // la biblioteca se pide recién después del primer dibujo con contenido (no compite con el texto)
  let pedida = false;
  const pedirUnaVez = () => { if (!pedida) { pedida = true; pedirNave(); } };
  try {
    new PerformanceObserver((l) => { if (l.getEntriesByName("first-contentful-paint").length) pedirUnaVez(); })
      .observe({ type: "paint", buffered: true });
  } catch (e) { /* navegador sin el observador: el respaldo de abajo */ }
  setTimeout(pedirUnaVez, 1200);
}
PAGINA.nave = (iniciar) => {
  const lienzo = document.getElementById("nave");
  try {
    const motor = iniciar(lienzo, { quieto: false });
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
if (hayLienzo) setTimeout(() => { if (!naveLista && !sinNave) quedarseQuieta(); }, 9000);

/* ══════════════════════ las pantallas con profundidad ══════════════════════ */
/* El marco se inclina hacia el puntero (hasta 6°) y el brillo del vidrio lo sigue. */
if (!quieto && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".pantalla").forEach((fig) => {
    const marco = fig.querySelector(".pantalla-marco");
    fig.addEventListener("pointermove", (e) => {
      const r = fig.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      fig.classList.add("mirando");
      fig.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
      fig.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
      if (marco) { marco.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); marco.style.setProperty("--my", (y * 100).toFixed(1) + "%"); }
    });
    fig.addEventListener("pointerleave", () => {
      fig.classList.remove("mirando");
      fig.style.removeProperty("--ry"); fig.style.removeProperty("--rx");
    });
  });
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
  document.querySelectorAll("[data-ampliar]").forEach((b) => {
    b.addEventListener("click", () => {
      const img = b.closest(".pantalla").querySelector(".pantalla-marco img");
      imgVisor.src = img.currentSrc || img.src;
      imgVisor.alt = img.alt;
      visor.showModal();
    });
  });
  visor.addEventListener("click", (e) => { if (e.target === visor || e.target.closest("[data-cerrar]")) visor.close(); });
} else {
  document.querySelectorAll("[data-ampliar]").forEach((b) => { b.hidden = true; });
}
})();
