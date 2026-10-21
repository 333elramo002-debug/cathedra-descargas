/* La página de Cathedra · según el Manual de producción visual del dueño (20/10/2026; antes, identidad cuero 19/10).

   Las dos constantes que hay que tocar al publicar están arriba. El resto:
     · la carga: la estrella se enciende con lo que va llegando (las letras y la página) y se abre;
     · el héroe (manual §04, §14, 20/10): la entrada con GSAP (0,0 s el titular, 0,3 s la composición, 0,7 s el
       emblema, después el atlas), el emblema que flota con ciclos de 6 a 10 s, el paralaje de las capas con el puntero
       y al bajar (ScrollTrigger). En el teléfono, la composición arriba y sin puntero;
     · el atlas de materiales (§05): la ficha técnica de cada panel;
     · las apariencias Claro (marfil, la de fábrica) y Oscuro (cuero): siguen al sistema hasta que se elige una en la
       cabecera (se recuerda);
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

/* ══════════════════════ las apariencias: Claro (marfil) y Oscuro (cuero) ══════════════════════ */
/* Sin elegir, la página sigue al sistema (las imágenes también, con <source media>). Al elegir, <html data-tema>
   fija la apariencia (lo pone ya el guion de la cabecera antes de pintar) y las fuentes de las imágenes se ajustan. */
// (20/10, manual §02) la clara es la de fábrica: sin elegir, Claro, salvo que el sistema pida oscuro
const oscuroSistema = window.matchMedia("(prefers-color-scheme: dark)");
const temaActual = () => raiz.dataset.tema || (oscuroSistema.matches ? "cuero" : "marfil");
const COLOR_TEMA = { cuero: "#1A0F0B", marfil: "#F1ECE4" };
// el selector (20/10): «Oscuro» con la luna y «Claro» con el sol; por dentro siguen siendo cuero y marfil
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
    const ahora = temaActual();
    botonTema.querySelectorAll("[data-elegir]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.elegir === ahora)));
  }
}
fuentesSegunTema();
if (botonTema) {
  botonTema.hidden = false;
  botonTema.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-elegir]");
    if (!b) return;
    const nuevo = b.dataset.elegir;
    if (nuevo === temaActual() && raiz.dataset.tema === nuevo) return;
    const cambiar = () => {
      raiz.dataset.tema = nuevo;
      try { localStorage.setItem("cathedra-tema", nuevo); } catch (e) { /* sin almacenamiento: vale para esta visita */ }
      fuentesSegunTema();
    };
    if (!quieto && document.startViewTransition) document.startViewTransition(cambiar); else cambiar();
  });
  oscuroSistema.addEventListener("change", fuentesSegunTema);
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

/* la curva de la casa para lo que no anima GSAP (el viaje de los enlaces): sale rápido y frena */
const curva = (x) => { const t = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - t, 3); };
/* d80 · el movimiento lo coreografía GSAP + ScrollTrigger (lib/). Sin ellos, o quieto, todo queda puesto: los estados
   ocultos los pone sólo este archivo, nunca el CSS. */
const conGsap = !quieto && !!(gsap && ScrollTrigger);
if (conGsap) {
  raiz.classList.add("con-gsap");
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/* ══════════════════════ el brillo de la laca ══════════════════════ */
/* Una banda clara que recorre el botón al pasar (CSS) y, una vez, cuando el botón entra (brillar). Debajo de las letras. */
if (!quieto) document.querySelectorAll(".boton-descarga, .cab-nav .cab-ir").forEach((b) => {
  if (b.classList.contains("cab-ir")) {
    const t = document.createElement("span"); t.className = "cab-ir-t";
    while (b.firstChild) t.appendChild(b.firstChild);
    b.appendChild(t);
  }
  const l = document.createElement("span"); l.className = "laca-brillo"; l.setAttribute("aria-hidden", "true");
  l.appendChild(document.createElement("i"));
  b.prepend(l);
});
function brillar(boton) {
  const i = boton && boton.querySelector(".laca-brillo i");
  if (!i || !gsap) return;
  gsap.fromTo(i, { x: 0, xPercent: -140, skewX: -18, opacity: 1 }, { xPercent: 430, duration: 1.15, ease: "power2.inOut",
    onComplete: () => gsap.set(i, { clearProps: "all" }) });
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
  // apenas se baja, la cabecera toma su vidrio: lo que pasa por debajo (el titular, el emblema) no se cruza con la marca
  cabecera.classList.toggle("sobre", window.scrollY > 24);
}
window.addEventListener("scroll", cabeceraSegunScroll, { passive: true });
cabeceraSegunScroll();

/* ══════════════════════ el héroe (manual §04 y §14) ══════════════════════ */
/* d80 · La entrada por capas, a destiempo y superpuesta (nunca todo a la vez; cuaderno 4.3: fondo → objeto → titular →
   texto → botones, escalonado de 50–150 ms, curvas expo/power3 de salida), dentro de los tiempos del manual §14:
     0,00 s  la escena se abre como una ventana (recorte) y el fondo se acerca despacio (2,4 s); la barra baja
     0,12 s  el titular, palabra por palabra, sube con un giro mínimo dentro de la máscara de su línea
     0,30 s  la mesa sube y se asienta
     0,45 s  la bajada se descubre de arriba hacia abajo
     0,62 s  los botones; 0,86 s las tres claves
     0,70 s  el emblema sube, crece y endereza su giro con un rebote mínimo (seguimiento); 1,15 s el núcleo cereza se
             enciende y 1,2 s una luz le recorre los cantos; 1,5 s la luz cruza la laca del botón principal
     0,60 s  los paneles del atlas que se ven se descubren de abajo hacia arriba
   En reposo, una flotación mínima del emblema con ciclos de 6 a 10 s que no se repiten y, cada 8 a 10 s, un barrido de luz
   lento. Al bajar (scrub), las capas se separan, el texto sube más rápido que la escena y el emblema gira y se acerca.
   Cada elemento tiene un solo trabajo, así ninguna transformación pisa a otra:
     .heroe-escenario (recorte) › .heroe-lienzo (scroll) › .capa-fondo (puntero, acercamiento) › img (scroll)
                                                        › .capa-mesa (entrada, puntero)
                                                        › .capa-emblema (entrada) › .emblema-giro (scroll) › .emblema-mira (puntero)
                                                                                    › .emblema-flota (reposo) › .emblema-luz i, .emblema-nucleo
                                                        › .capa-frente (puntero) › img (scroll)
                                 › .heroe-barrido i (luz)
   Sólo transform, opacity y clip-path. Todo se frena cuando el héroe sale de la pantalla o la pestaña se oculta. */
(function heroe() {
  const sec = document.getElementById("portada");
  if (!sec || quieto || !gsap) return;           // quieto o sin GSAP: el héroe ya está puesto, con el emblema en su lugar
  const q = (s) => sec.querySelector(s);
  const escenario = q(".heroe-escenario"), lienzo = q(".heroe-lienzo"), texto = q(".heroe-texto");
  const fondo = q(".capa-fondo"), fondoImg = q(".capa-fondo img"), mesa = q(".capa-mesa");
  const emblema = q(".capa-emblema"), giro = q(".emblema-giro"), mira = q(".emblema-mira"), flota = q(".emblema-flota");
  const nucleo = q(".emblema-nucleo");
  const frente = q(".capa-frente"), frenteImg = q(".capa-frente img");
  const luzCantos = q(".emblema-luz i"), luzEscena = q(".heroe-barrido i");
  // el titular, palabra por palabra (el texto y su orden no cambian: el lector lo lee igual)
  const palabras = [];
  sec.querySelectorAll(".heroe-titular .linea > span").forEach((linea) => {
    [...linea.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(trozo)); return; }
          const p = document.createElement("span"); p.className = "hp"; p.textContent = trozo;
          frag.appendChild(p); palabras.push(p);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === Node.ELEMENT_NODE) { n.classList.add("hp"); palabras.push(n); }   // «profesor.», en cereza
    });
  });
  const rotulo = q(".rotulo"), bajada = q(".heroe-bajada"), requisito = q(".requisito");
  const botones = [...sec.querySelectorAll(".portada-acciones > a")], datos = [...sec.querySelectorAll(".heroe-datos li")];
  // la barra: la marca baja (sus piezas: la barra misma se compacta con CSS al bajar) y la cápsula aparece
  const marcaPiezas = [...document.querySelectorAll(".cab-marca > *")], capsula = document.querySelector(".cab-nav");
  const paneles = [...document.querySelectorAll(".atlas-panel")].filter((p) => p.getBoundingClientRect().top < window.innerHeight);
  PAGINA.atlasEnHeroe = new Set(paneles);
  const cuadros = paneles.map((p) => p.querySelector(".atlas-cuadro"));
  const fotos = paneles.map((p) => p.querySelector(".atlas-img")).filter(Boolean);
  const leyendas = paneles.flatMap((p) => [...p.querySelectorAll(".atlas-texto, .atlas-ver")]);
  const apilado = window.matchMedia("(max-width: 860px), (max-aspect-ratio: 11/10)").matches;
  const fino = window.matchMedia("(pointer: fine)").matches && !apilado;
  const FONDO = 1.08;                             // el margen del fondo (el mismo de estilos.css)

  // el estado de partida (mientras la carga tapa la página)
  gsap.set(palabras, { yPercent: 118, rotation: 6, transformOrigin: "0% 100%" });
  gsap.set([rotulo, requisito].filter(Boolean), { opacity: 0, y: 18 });
  if (bajada) gsap.set(bajada, { opacity: 0, y: 22, clipPath: "inset(0% 0% 100% 0%)" });
  gsap.set(botones, { opacity: 0, y: 26 });
  gsap.set(datos, { opacity: 0, y: 18 });
  gsap.set(marcaPiezas, { opacity: 0, y: -14 });
  if (capsula) gsap.set(capsula, { opacity: 0 });
  gsap.set(escenario, { clipPath: apilado ? "inset(7% 7% 9% 7%)" : "inset(9% 0% 12% 16%)" });
  gsap.set(fondo, { scale: FONDO + 0.16, transformOrigin: "55% 45%" });
  gsap.set(mesa, { opacity: 0, y: 60, scale: 1.06, transformOrigin: "55.4% 75%" });
  gsap.set(emblema, { opacity: 0, y: 90, rotation: -16, scale: 0.74, transformOrigin: "50% 55%" });
  if (nucleo) gsap.set(nucleo, { opacity: 0, scale: 0.4 });
  gsap.set([luzCantos, luzEscena], { xPercent: -110, opacity: 0 });
  if (cuadros.length) { gsap.set(cuadros, { clipPath: "inset(100% 0% 0% 0%)" }); gsap.set(fotos, { scale: 1.25 }); gsap.set(leyendas, { opacity: 0, y: 14 }); }

  let enVista = true;
  const vivos = [];
  // la luz: una franja que cruza los cantos del emblema (y, más tenue y más lenta, la composición)
  function barrido(conEscena) {
    const t = gsap.timeline();
    t.fromTo(luzCantos, { xPercent: -110, opacity: 0.9 }, { xPercent: 240, duration: 1.7, ease: "power1.inOut" }, 0)
      .set(luzCantos, { opacity: 0 });
    if (conEscena) t.fromTo(luzEscena, { xPercent: -110, opacity: 1 }, { xPercent: 300, duration: 3.2, ease: "sine.inOut" }, 0)
      .set(luzEscena, { opacity: 0 });
    return t;
  }
  const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
  tl.to(escenario, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power3.inOut" }, 0)      // 0,0 s · la escena se abre
    .to(fondo, { scale: FONDO, duration: 2.4, ease: "power3.out" }, 0)                                //        y el fondo se acerca
    .to(marcaPiezas, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.05)
    .to(capsula, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.15)
    .to(rotulo, { opacity: 1, y: 0, duration: 0.8 }, 0.08)
    .to(palabras, { yPercent: 0, rotation: 0, duration: 1.1, stagger: 0.06 }, 0.12)                    // el titular
    .to(mesa, { opacity: 1, y: 0, scale: 1.02, duration: 1.3, ease: "power3.out" }, 0.3)              // 0,3 s · la mesa
    .to(bajada, { opacity: 1, y: 0, clipPath: "inset(0% 0% -25% 0%)", duration: 1.1 }, 0.45)
    .to(botones, { opacity: 1, y: 0, duration: 1.0, stagger: 0.1 }, 0.62)
    .to(requisito, { opacity: 1, y: 0, duration: 0.8 }, 0.78)
    .to(datos, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.86)
    .to(emblema, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.7)                              // 0,7 s · el emblema
    .to(emblema, { y: 0, scale: 1, duration: 1.5 }, 0.7)
    .to(emblema, { rotation: 0, duration: 1.8, ease: "back.out(1.6)" }, 0.7)                          //        endereza con seguimiento
    .add(() => barrido(false), 1.2)                                                                    //        la luz en los cantos
    .add(() => brillar(botones[0]), 1.5);                                                              //        la luz en la laca
  if (nucleo) tl.to(nucleo, { opacity: 0.85, scale: 1, duration: 0.5, ease: "power2.out" }, 1.15)     //        el núcleo se enciende
    .to(nucleo, { opacity: 0, duration: 1.6, ease: "sine.inOut" }, 1.65);
  if (cuadros.length) tl.to(cuadros, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.07, ease: "power3.inOut" }, 0.6)    // 0,6 s · el atlas
    .to(fotos, { scale: 1, duration: 1.9, stagger: 0.07 }, 0.6)
    .to(leyendas, { opacity: 1, y: 0, duration: 0.9, stagger: 0.04 }, 0.85);
  tl.add(() => {
    gsap.set(escenario, { clearProps: "clipPath" }); gsap.set(emblema, { clearProps: "transform" });
    if (bajada) gsap.set(bajada, { clearProps: "clipPath" });
    if (cuadros.length) gsap.set(cuadros, { clearProps: "clipPath" });
    flotar(); luzCada();
  }, 2.8);

  // el reposo: cada tramo va a un punto nuevo al azar y dura la mitad de un ciclo de 6 a 10 s (nunca se repite)
  const amplitud = apilado ? 0.7 : 1;
  function flotar() {
    const paso = () => {
      const t = gsap.to(flota, {
        y: gsap.utils.random(-9, 3) * amplitud, x: gsap.utils.random(-3, 3) * amplitud, rotation: gsap.utils.random(-0.8, 0.8),
        duration: gsap.utils.random(3, 5), ease: "sine.inOut", onComplete: paso,
      });
      vivos[0] = t; if (!enVista || document.hidden) t.pause();
    };
    paso();
  }
  // el barrido lento: cada 8 a 10 s, sólo si el héroe se ve y la pestaña está a la vista
  function luzCada() {
    const espera = gsap.delayedCall(gsap.utils.random(8, 10), () => { if (enVista && !document.hidden) barrido(true); luzCada(); });
    vivos[1] = espera; if (!enVista || document.hidden) espera.pause();
  }

  // el puntero: profundidad por paralaje (sólo con mouse, sólo en escritorio): el fondo casi nada, la mesa un poco, el
  // emblema algo más y el primer plano más
  if (fino) {
    const a = (el, prop) => gsap.quickTo(el, prop, { duration: 1.2, ease: "power3.out" });
    const capas = [[fondo, 6], [mesa, 12], [mira, 16], [frente, 34]].map(([el, k]) => ({ x: a(el, "x"), y: a(el, "y"), k }));
    const giro = a(mira, "rotation");
    window.addEventListener("pointermove", (e) => {
      if (!enVista) return;
      const dx = e.clientX / window.innerWidth - 0.5, dy = e.clientY / window.innerHeight - 0.5;
      capas.forEach((c) => { c.x(-dx * c.k); c.y(-dy * c.k * 0.6); });
      giro(dx * 1.6);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { capas.forEach((c) => { c.x(0); c.y(0); }); giro(0); });
  }

  // el scroll: la composición se queda atrás (más lenta que el texto); dentro, el fondo se queda un poco más y el primer
  // plano sube más rápido: las capas se separan. El emblema gira y se acerca al irse (la primera transición de fase) y el
  // texto sube más rápido que la escena y se apaga un poco.
  if (ScrollTrigger) {
    const st = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: 0.8,
      onToggle: (s) => { enVista = s.isActive; vivos.forEach((t) => t && (enVista && !document.hidden ? t.resume() : t.pause())); } } });
    st.to(lienzo, { yPercent: apilado ? 6 : 9, ease: "none" }, 0)
      .to(fondoImg, { yPercent: apilado ? 1.5 : 2.5, ease: "none" }, 0)
      .to(frenteImg, { yPercent: -10, ease: "none" }, 0)
      .to(giro, { rotation: apilado ? 6 : 11, scale: 1.08, yPercent: -5, ease: "none", transformOrigin: "50% 55%" }, 0)
      .to(texto, { y: apilado ? -24 : -96, opacity: 0.35, ease: "none" }, 0);
  }
  document.addEventListener("visibilitychange", () => vivos.forEach((t) => t && (document.hidden || !enVista ? t.pause() : t.resume())));
  PAGINA.entrarHeroe = () => tl.play();
})();

/* ══════════════════════ el atlas: la versión técnica de cada material (§05) ══════════════════════ */
/* Con el mouse, la ficha aparece al pasar (CSS: se descubre de abajo hacia arriba y sus filas llegan una tras otra); con
   el dedo o el teclado, con «Ficha técnica». d80 · con el mouse, la imagen se inclina hacia el puntero (hasta 9° y 7°,
   perspectiva de 800 px, con inercia de 0,9 s) y un reflejo ancho la sigue: el material se mira como un objeto. */
if (!quieto && gsap && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".atlas-panel").forEach((p) => {
    const cuadro = p.querySelector(".atlas-cuadro"), img = p.querySelector(".atlas-img");
    if (!cuadro) return;
    const luz = document.createElement("i"); luz.className = "atlas-luz"; luz.setAttribute("aria-hidden", "true");
    cuadro.appendChild(luz);
    const a = (el, prop, d) => gsap.quickTo(el, prop, { duration: d, ease: "power3.out" });
    const lx = a(luz, "x", 0.6), ly = a(luz, "y", 0.6);
    let rx, ry, sc;
    if (img) { gsap.set(img, { transformPerspective: 800 }); rx = a(img, "rotationX", 0.9); ry = a(img, "rotationY", 0.9); sc = a(img, "scale", 1.1); }
    p.addEventListener("pointermove", (e) => {
      const r = cuadro.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      if (img) { ry(x * 9); rx(-y * 7); sc(1.08); }
      lx((x + 0.5) * r.width - r.width * 0.15); ly((y + 0.5) * r.height - r.height * 0.2);
    });
    p.addEventListener("pointerleave", () => { if (img) { rx(0); ry(0); sc(1); } });
  });
}
document.querySelectorAll(".atlas-ver").forEach((b) => {
  const panel = b.closest(".atlas-panel"), texto = b.querySelector("span");
  b.addEventListener("click", () => {
    const abrir = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(abrir));
    panel.classList.toggle("ficha-abierta", abrir);
    texto.textContent = abrir ? "Ver el material" : "Ficha técnica";
  });
});

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
   respalda; el sello vacío muestra que eso no está en el material. d80 · con animaciones, la escena se arma sola al
   llegar: la pregunta se escribe letra por letra con su cursor, las respuestas llegan una tras otra, cada sello aparece
   con un rebote mínimo y su minuto corre hasta el de la clase, y se ilumina el tramo del primero. */
document.querySelectorAll("[data-cita-demo]").forEach((demo) => {
  const sellos = [...demo.querySelectorAll("button.sello")];
  const lineas = [...demo.querySelectorAll(".cd-clase li")];
  const encender = (clave) => {
    sellos.forEach((s) => s.classList.toggle("activo", s.dataset.cita === clave));
    lineas.forEach((l) => l.classList.toggle("encendida", !!clave && l.dataset.cita === clave));
  };
  let tocado = false;
  sellos.forEach((s) => {
    s.setAttribute("aria-pressed", "false");
    const en = () => { tocado = true; encender(s.dataset.cita); sellos.forEach((o) => o.setAttribute("aria-pressed", String(o === s))); };
    s.addEventListener("mouseenter", en); s.addEventListener("focus", en); s.addEventListener("click", en);
  });
  const primero = () => { if (tocado) return; encender("a"); sellos[0].setAttribute("aria-pressed", "true"); };
  if (!conGsap) { primero(); return; }                                  // de entrada, el primero encendido

  const preg = demo.querySelector(".cd-pregunta"), resp = [...demo.querySelectorAll(".cd-respuesta > p")];
  // la pregunta: entera para el lector; letra por letra para la vista (cada letra ya ocupa su lugar: nada se corre)
  const texto = preg.textContent.trim();
  preg.textContent = "";
  const lector = document.createElement("span"); lector.className = "solo-lector"; lector.textContent = texto;
  const vista = document.createElement("span"); vista.setAttribute("aria-hidden", "true");
  const letras = [...texto].map((ch) => { const s = document.createElement("span"); s.textContent = ch; s.style.opacity = "0"; vista.appendChild(s); return s; });
  const cursor = document.createElement("span"); cursor.className = "cursor-escribe";
  preg.append(lector, vista);
  // los minutos de los sellos corren desde 00:00 (cifras tabulares: el sello no cambia de ancho)
  const minutos = new Map();
  sellos.forEach((s) => {
    const m = s.textContent.match(/(\d{2}):(\d{2})/);
    if (!m) return;
    s.setAttribute("aria-label", s.textContent);
    const [antes, despues] = s.textContent.split(m[0]);
    const span = document.createElement("span"); span.className = "sello-min"; span.textContent = "00:00";
    s.textContent = ""; s.append(antes, span, despues);
    minutos.set(s, () => { const o = { v: 0 }, fin = Number(m[1]) * 60 + Number(m[2]);
      return gsap.to(o, { v: fin, duration: 0.9, ease: "expo.out", onUpdate: () => {
        const v = Math.round(o.v); span.textContent = `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; } }); });
  });
  gsap.set(resp, { opacity: 0, y: 14 });
  gsap.set(sellos, { opacity: 0, scale: 0.7, transformOrigin: "0% 50%" });
  const tl = gsap.timeline({ paused: true });
  vista.prepend(cursor);
  let t = 0.35;
  letras.forEach((s, i) => {
    tl.call(() => { s.style.opacity = "1"; s.after(cursor); }, null, t);
    t += 0.022 + Math.random() * 0.03 + (/[,¿?]/.test(texto[i]) ? 0.12 : 0) + (texto[i] === " " && Math.random() < 0.2 ? 0.08 : 0);
  });
  tl.call(() => cursor.remove(), null, t + 0.9);
  resp.forEach((p, i) => {
    const en = t + 0.3 + i * 0.55;
    tl.to(p, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, en);
    const s = p.querySelector(".sello");
    if (s) {
      tl.to(s, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(2.2)" }, en + 0.3);
      if (minutos.has(s)) tl.add(() => minutos.get(s)(), en + 0.3);
    }
    if (i === 0) tl.call(primero, null, en + 0.9);
  });
  tl.call(() => gsap.set(sellos, { clearProps: "transform" }), null, t + 0.3 + resp.length * 0.55 + 1);
  ScrollTrigger.create({ trigger: demo, start: "top 72%", once: true, onEnter: () => tl.play() });
});

/* ══════════════════════ los números que cuentan ══════════════════════ */
/* d80 · Cada [data-cuenta] es un contador de rodillo: cada cifra es una tira de 0 a 9 (dos vueltas) que gira dentro de su
   ventana hasta su valor cuando entra en pantalla (sólo transform; cada cifra un poco después de la anterior). Para el
   lector, el número entero. */
if (conGsap) document.querySelectorAll("[data-cuenta]").forEach((el) => {
  const fin = Number(el.dataset.cuenta), cifras = Math.max(Number(el.dataset.cifras || 0), String(fin).length);
  const txt = String(fin).padStart(cifras, "0");
  el.textContent = "";
  const lector = document.createElement("span"); lector.className = "solo-lector"; lector.textContent = txt;
  const odo = document.createElement("span"); odo.className = "odo"; odo.setAttribute("aria-hidden", "true");
  const tiras = [...txt].map((d) => {
    const c = document.createElement("span"); c.className = "odo-c";
    const medida = document.createElement("i"); medida.textContent = d;
    const tira = document.createElement("span"); tira.className = "odo-tira";
    for (let k = 0; k < 20; k++) { const i = document.createElement("i"); i.textContent = String(k % 10); tira.appendChild(i); }
    c.append(medida, tira); odo.appendChild(c);
    return [tira, Number(d)];
  });
  el.append(lector, odo);
  ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => tiras.forEach(([tira, d], i) =>
    gsap.fromTo(tira, { yPercent: 0 }, { yPercent: -(10 + d) * 5, duration: 1.3 + i * 0.15, delay: 0.15 + i * 0.07, ease: "expo.out" })) });
});

/* ══════════════════════ el desplazamiento: la rueda con inercia y los enlaces de la misma página ══════════════════════ */
/* d80 · UN SOLO conductor mueve la página. Antes eran dos bucles sueltos (la inercia de la rueda y el viaje de los
   enlaces) y el de la rueda podía no terminar nunca: el navegador redondea scrollTo al píxel, y cuando faltaban entre
   0,6 y unos 3,5 px el paso del 14 % se redondeaba a cero; el bucle quedaba vivo para siempre y, al tocar «Cómo
   funciona» o «Todo lo que hace», llevaba a la sección y enseguida devolvía la página a donde había parado la rueda
   (arriba). Ahora: un único bucle con dos modos (rueda / viaje), el paso de la rueda nunca es menor que un píxel, el
   bucle termina al llegar o si la página no se mueve, y suelta el mando ante cualquier otro gesto (tocar, teclado,
   la barra de desplazamiento). Si el contenido de arriba cambia de alto y el navegador corrige la posición (anclaje),
   la rueda corre su destino lo mismo. */
const conductor = (() => {
  let modo = null, raf = 0, escrito = -1, quietos = 0, destino = 0, viaje = null;
  const tope = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  // la sección puede pedir aire arriba (scroll-margin-top: en las legales, para no quedar bajo la cabecera)
  const arribaDe = (el) => el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
  const ir = (y) => { window.scrollTo(0, y); escrito = window.scrollY; };
  function parar() { cancelAnimationFrame(raf); raf = 0; modo = null; viaje = null; escrito = -1; quietos = 0; }
  function paso(ahora) {
    raf = 0;
    const y = window.scrollY;
    if (modo === "rueda") {
      if (escrito >= 0 && Math.abs(y - escrito) > 2) destino += y - escrito;     // el anclaje corrió la página
      destino = Math.max(0, Math.min(destino, tope()));
      const d = destino - y;
      if (Math.abs(d) < 1) { ir(destino); parar(); return; }
      const v = Math.sign(d) * Math.max(1, Math.abs(d) * 0.14);                  // nunca menos de un píxel
      ir(Math.abs(v) >= Math.abs(d) ? destino : y + v);
      if (Math.abs(escrito - y) < 0.5) { if (++quietos > 2) { parar(); return; } } else quietos = 0;   // no se mueve: listo
    } else if (modo === "viaje") {
      // el destino se vuelve a medir en cada cuadro: mientras se llega, las demos se montan y crecen
      const t = viaje.dura ? Math.min(1, (ahora - viaje.t0) / viaje.dura) : 1;
      const meta = Math.min(arribaDe(viaje.el), tope());
      if (t < 1) ir(viaje.desde + (meta - viaje.desde) * curva(t));
      else {
        if (Math.abs(y - meta) > 1) ir(meta);
        if (++viaje.asentando > 12) { parar(); return; }                          // unos cuadros más midiendo y suelta
      }
    } else return;
    raf = requestAnimationFrame(paso);
  }
  const arrancar = () => { if (!raf) raf = requestAnimationFrame(paso); };
  return {
    rueda(delta) {
      if (modo !== "rueda") { parar(); modo = "rueda"; destino = window.scrollY; }
      destino = Math.max(0, Math.min(tope(), destino + delta));
      arrancar();
    },
    viajar(el, dura) {
      parar(); modo = "viaje";
      viaje = { el, dura, desde: window.scrollY, t0: performance.now(), asentando: 0 };
      if (!dura) ir(Math.min(arribaDe(el), tope()));
      arrancar();
    },
    parar,
    get activo() { return modo; },
  };
})();
PAGINA.conductor = conductor;
// cualquier otro gesto toma el mando (la barra de desplazamiento y el clic llegan como pointerdown)
["pointerdown", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => conductor.parar(), { passive: true, capture: true }));
// la rueda con inercia: sólo con puntero fino y con animaciones (el táctil, el teclado y la barra son los del navegador)
if (!quieto && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.defaultPrevented || e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest && e.target.closest("dialog[open], textarea, select, [data-scroll-propio]")) return;
    e.preventDefault();
    conductor.rueda(e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY);
  }, { passive: false });
}

/* ══════════════════════ las pantallas con profundidad ══════════════════════ */
/* El marco de vidrio se inclina hacia el puntero (hasta 6°); en las tarjetas, además, la pieza de adelante y la
   pantalla de atrás se corren en sentidos opuestos: la profundidad sigue al mouse. */
if (!quieto && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".profundidad").forEach((fig) => {
    // d80 · un reflejo ancho sobre la pantalla sigue al puntero (como el vidrio de un monitor bajo la luz de la ventana)
    const luz = document.createElement("i"); luz.className = "pf-luz"; luz.setAttribute("aria-hidden", "true");
    fig.appendChild(luz);
    const lx = gsap ? gsap.quickTo(luz, "x", { duration: 0.7, ease: "power3.out" }) : null;
    const ly = gsap ? gsap.quickTo(luz, "y", { duration: 0.7, ease: "power3.out" }) : null;
    fig.addEventListener("pointermove", (e) => {
      const r = fig.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      fig.classList.add("mirando");
      if (!fig.classList.contains("con-escena")) {       // la composición 3D no se inclina: ya tiene su perspectiva
        fig.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
        fig.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
      }
      if (lx) { lx(x * r.width - r.width * 0.15); ly(y * r.height - r.height * 0.25); }
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

/* ══════════════════════ las secciones entran (d80) ══════════════════════ */
/* Cada sección tiene su coreografía, que corre al llegar (a 72 % de la pantalla) y se deshace, más rápida, si se vuelve
   a subir por arriba de su comienzo. Patrones del cuaderno 4.3: título por palabra en máscara (escalonado 55 ms), el
   texto a destiempo, la pantalla se descubre por recorte mientras se «desembala» (escala 1,26 → 1), la demo se levanta
   desde un leve giro en X; y mientras se baja, paralaje con scrub de 1 s: la pantalla viaja 160 px y el texto 60 (a
   distinta velocidad, como capas). Sólo transform, opacity y clip-path (el paralaje usa translate/scale con variables
   registradas para no pisar la inclinación hacia el puntero). */
(function secciones() {
  if (!conGsap) return;
  const angosta = window.matchMedia("(max-width: 900px)").matches;
  const k = angosta ? 0.35 : 1;
  const palabrasDe = (el) => (el ? [...el.querySelectorAll(".pal > span")] : []);
  const titulo = (tl, el, en) => {
    const p = palabrasDe(el);
    if (!p.length) return;
    gsap.set(p, { yPercent: 118, rotation: 5, transformOrigin: "0% 100%" });
    tl.to(p, { yPercent: 0, rotation: 0, duration: 1.05, ease: "expo.out", stagger: 0.055 }, en);
  };
  const desde = (els, estado) => { els = [...els].filter(Boolean); if (els.length) gsap.set(els, estado); return els; };
  const alLlegar = (sec, tl, start = "top 72%") => ScrollTrigger.create({ trigger: sec, start,
    onEnter: () => { sec.classList.add("entro"); tl.timeScale(1).play(); },
    onLeaveBack: () => { sec.classList.remove("entro"); tl.timeScale(1.8).reverse(); } });

  // los seis tramos de la película
  document.querySelectorAll(".tramo").forEach((t) => {
    const texto = t.querySelector(".tramo-texto"), fig = t.querySelector(".profundidad"), demo = t.querySelector(".demo");
    const img = fig && fig.querySelector(".pf-fondo");
    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    const num = desde(t.querySelectorAll(".paso-num"), { opacity: 0, x: -18 });
    tl.to(num, { opacity: 1, x: 0, duration: 0.8 }, 0);
    titulo(tl, t.querySelector(".titular"), 0.06);
    const baj = desde(t.querySelectorAll(".tramo-bajada, .nota-al-pie"), { opacity: 0, y: 28 });
    tl.to(baj, { opacity: 1, y: 0, duration: 1.0, stagger: 0.1 }, 0.26);
    const datos = desde(t.querySelectorAll(".datos li"), { opacity: 0, x: -16 });
    if (datos.length) tl.to(datos, { opacity: 1, x: 0, duration: 0.8, stagger: 0.07 }, 0.4);
    if (fig) {
      gsap.set(fig, { "--ps": 0.9, opacity: 0 });
      tl.to(fig, { "--ps": 1, opacity: 1, duration: 1.4 }, 0.08);
      if (img) {
        gsap.set(img, { clipPath: "inset(14% 12% 14% 12% round 15px)", scale: 1.26 });
        tl.to(img, { clipPath: "inset(0% 0% 0% 0% round 15px)", duration: 1.4, ease: "power3.inOut" }, 0.1)
          .to(img, { scale: 1, duration: 1.9 }, 0.1);
      }
    }
    if (demo) {
      gsap.set(demo, { opacity: 0, y: 70, rotationX: 9, transformPerspective: 1400, transformOrigin: "50% 0%" });
      tl.to(demo, { opacity: 1, y: 0, rotationX: 0, duration: 1.3 }, 0.34);
    }
    alLlegar(t, tl);
    // el paralaje: la pantalla y el texto a distinta velocidad
    const st = () => ({ trigger: t, start: "top bottom", end: "bottom top", scrub: 1 });
    if (fig) gsap.fromTo(fig, { "--py": `${80 * k}px` }, { "--py": `${-80 * k}px`, ease: "none", scrollTrigger: st() });
    const capa = [texto, demo].filter(Boolean);
    if (capa.length) gsap.fromTo(capa, { "--py": `${30 * k}px` }, { "--py": `${-30 * k}px`, ease: "none", scrollTrigger: st() });
  });

  // la cita al minuto: el texto y el panel (la escritura la arma su bloque)
  const cita = document.querySelector("section.cita");
  if (cita) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    tl.to(desde(cita.querySelectorAll(".paso-num"), { opacity: 0, x: -18 }), { opacity: 1, x: 0, duration: 0.8 }, 0);
    titulo(tl, cita.querySelector(".titular"), 0.06);
    tl.to(desde(cita.querySelectorAll(".tramo-bajada"), { opacity: 0, y: 28 }), { opacity: 1, y: 0, duration: 1.0 }, 0.3);
    const panel = cita.querySelector(".cita-demo");
    if (panel) {
      gsap.set(panel, { opacity: 0, y: 80, rotationX: 8, transformPerspective: 1600, transformOrigin: "50% 0%" });
      tl.to(panel, { opacity: 1, y: 0, rotationX: 0, duration: 1.4 }, 0.2);
    }
    alLlegar(cita, tl);
  }

  // «lo que también hace»: la cabecera y las tarjetas, de a tandas, que se levantan desde un giro en X
  const todo = document.querySelector("section.todo");
  if (todo) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    tl.to(desde(todo.querySelectorAll(".sec-cab .rotulo"), { opacity: 0, y: 16 }), { opacity: 1, y: 0, duration: 0.8 }, 0);
    titulo(tl, todo.querySelector(".titular"), 0.06);
    tl.to(desde(todo.querySelectorAll(".sec-cab .tramo-bajada"), { opacity: 0, y: 22 }), { opacity: 1, y: 0, duration: 1.0 }, 0.3);
    alLlegar(todo, tl, "top 70%");
    const fichas = [...todo.querySelectorAll(".tarjetas > li")];
    gsap.set(fichas, { opacity: 0, y: 90, rotationX: 14, transformPerspective: 1200, transformOrigin: "50% 0%" });
    ScrollTrigger.batch(fichas, { start: "top 90%",
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: "expo.out", stagger: 0.09, overwrite: true }),
      onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 90, rotationX: 14, duration: 0.5, ease: "power2.in", stagger: 0.03, overwrite: true }) });
  }

  // descargar: la tarjeta de cuero sube, el emblema baja girando a su lugar y la luz cruza la laca
  const desc = document.querySelector("section.descargar");
  if (desc) {
    const caja = desc.querySelector(".descargar-caja"), emb = desc.querySelector(".descargar-emblema");
    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    gsap.set(caja, { opacity: 0, y: 110, scale: 0.97, transformOrigin: "50% 100%" });
    tl.to(caja, { opacity: 1, y: 0, scale: 1, duration: 1.3 }, 0);
    if (emb) { gsap.set(emb, { opacity: 0, y: -70, rotation: -28, scale: 0.6 }); tl.to(emb, { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 1.5, ease: "back.out(1.5)" }, 0.3); }
    titulo(tl, caja.querySelector(".titular"), 0.3);
    const resto = desde(caja.querySelectorAll(":scope > :not(.titular):not(.descargar-emblema)"), { opacity: 0, y: 24 });
    tl.to(resto, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.45);
    tl.add(() => brillar(caja.querySelector(".boton-descarga")), 1.3);
    alLlegar(desc, tl, "top 65%");
  }

  // el atlas que no entró con el héroe (pantallas bajas, el teléfono)
  const resto = [...document.querySelectorAll(".atlas-panel")].filter((p) => !(PAGINA.atlasEnHeroe && PAGINA.atlasEnHeroe.has(p)));
  if (resto.length) {
    const cuadros = resto.map((p) => p.querySelector(".atlas-cuadro"));
    const fotos = resto.map((p) => p.querySelector(".atlas-img")).filter(Boolean);
    const ley = resto.flatMap((p) => [...p.querySelectorAll(".atlas-texto, .atlas-ver")]);
    gsap.set(cuadros, { clipPath: "inset(100% 0% 0% 0%)" }); gsap.set(fotos, { scale: 1.25 }); gsap.set(ley, { opacity: 0, y: 14 });
    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    tl.to(cuadros, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, stagger: 0.08, ease: "power3.inOut" }, 0)
      .to(fotos, { scale: 1, duration: 1.9, stagger: 0.08 }, 0)
      .to(ley, { opacity: 1, y: 0, duration: 0.9, stagger: 0.05 }, 0.25)
      .add(() => gsap.set(cuadros, { clearProps: "clipPath" }));
    ScrollTrigger.create({ trigger: document.getElementById("materiales"), start: "top 80%", once: true, onEnter: () => tl.play() });
  }

  // si el alto de la página cambia (las demos se montan y crecen, llegan las letras), ScrollTrigger vuelve a medir
  if ("ResizeObserver" in window) {
    let alto = document.documentElement.scrollHeight, espera = 0;
    new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - alto) < 2) return;
      alto = h; clearTimeout(espera);
      espera = setTimeout(() => ScrollTrigger.refresh(), 250);
    }).observe(document.body);
  }
})();

/* ══════════════════════ el emblema viajero (d80) ══════════════════════ */
/* La transición entre fases: a lo largo de los seis tramos, el emblema acompaña por la junta entre el texto y la
   pantalla. Como los tramos se alternan (la pantalla a la derecha, a la izquierda…), en cada cambio de tramo el emblema
   cruza a la otra junta en un arco, girando en el plano y en Y y achicándose un poco a mitad de camino; quieto en la
   junta mientras se lee. Ligado al scroll (persigue al objetivo con un suavizado de ~0,15 por cuadro, como un scrub).
   Es el mismo render del héroe (ya bajado). Sólo transform y opacity; sólo con espacio (>= 1180 px) y con animaciones. */
(function viajero() {
  if (!conGsap || window.matchMedia("(max-width: 1179px)").matches) return;
  const tramos = [...document.querySelectorAll(".tramo")];
  const modelo = document.querySelector(".capa-emblema picture");
  if (tramos.length < 2 || !modelo) return;
  const v = document.createElement("div"); v.className = "viajero"; v.setAttribute("aria-hidden", "true");
  const pic = modelo.cloneNode(true);
  pic.querySelectorAll("img").forEach((i) => { i.removeAttribute("fetchpriority"); i.alt = ""; });
  v.appendChild(pic); document.body.appendChild(v);
  fuentesSegunTema();                                  // la copia sigue a la apariencia elegida
  const facil = gsap.parseEase("power2.inOut");
  let marcas = [], mw = 0, mh = 0, pedido = 0, listo = false;
  const ahora = { x: 0, y: 0, rz: 0, ry: 0, s: 1, o: 0 };
  function medir() {
    const sy = window.scrollY;
    mw = v.offsetWidth / 2; mh = v.offsetHeight / 2;
    marcas = tramos.map((t) => {
      const r = t.getBoundingClientRect(), f = t.querySelector(".profundidad");
      const hueco = parseFloat(getComputedStyle(t).columnGap) || 0;
      const izq = r.left + f.offsetLeft;                // offsetLeft: sin el paralaje ni la escala del marco
      return { y: r.top + sy + r.height / 2 - window.innerHeight / 2,
        x: t.classList.contains("tramo-der") ? izq + f.offsetWidth + hueco / 2 : izq - hueco / 2 };
    });
    pedir();
  }
  function objetivo() {
    const s = window.scrollY, m = marcas, vh = window.innerHeight;
    let i = 0;
    while (i < m.length - 1 && s > m[i + 1].y) i++;
    const a = m[i], b = m[Math.min(i + 1, m.length - 1)];
    const p = b === a ? 0 : Math.min(1, Math.max(0, (s - a.y) / (b.y - a.y)));
    const e = p < 0.3 ? 0 : p > 0.7 ? 1 : facil((p - 0.3) / 0.4);   // quieto en la junta; cruza en el medio
    const arco = Math.sin(e * Math.PI), dir = Math.sign(b.x - a.x) || 1;
    const o = Math.max(0, Math.min(1, (s - (m[0].y - vh * 0.45)) / (vh * 0.25), ((m[m.length - 1].y + vh * 0.4) - s) / (vh * 0.25)));
    return { x: a.x + (b.x - a.x) * e - mw, y: vh / 2 - mh - arco * 48, rz: dir * arco * 18, ry: dir * arco * -32, s: 1 - arco * 0.18, o };
  }
  function paso() {
    pedido = 0;
    if (!marcas.length) return;
    const t = objetivo();
    let falta = 0;
    for (const c of Object.keys(t)) {
      ahora[c] = listo ? ahora[c] + (t[c] - ahora[c]) * 0.15 : t[c];
      falta = Math.max(falta, Math.abs(t[c] - ahora[c]));
    }
    listo = true;
    v.style.transform = `translate3d(${ahora.x.toFixed(1)}px, ${ahora.y.toFixed(1)}px, 0) perspective(700px) rotateY(${ahora.ry.toFixed(2)}deg) rotate(${ahora.rz.toFixed(2)}deg) scale(${ahora.s.toFixed(3)})`;
    v.style.opacity = ahora.o.toFixed(3);
    if (falta > 0.05) pedir();
  }
  function pedir() { if (!pedido) pedido = requestAnimationFrame(paso); }
  window.addEventListener("scroll", pedir, { passive: true });
  ScrollTrigger.addEventListener("refresh", medir);
  if (document.readyState === "complete") medir(); else window.addEventListener("load", medir);
  document.fonts && document.fonts.ready.then(medir);
})();

/* ══════════════════════ los enlaces de la misma página ══════════════════════ */
/* Se deslizan hasta la sección con el conductor (un viaje de 0,9 s que vuelve a medir el destino en cada cuadro).
   Un gesto del alumno corta el viaje. */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute("href").slice(1);
  if (!id) return;
  a.addEventListener("click", (e) => {
    const destino = document.getElementById(id);
    if (!destino) return;
    e.preventDefault();
    // lejos, el viaje dura un poco más (hasta 1,3 s); cerca, 0,7 s
    const lejos = Math.abs(destino.getBoundingClientRect().top) / Math.max(1, window.innerHeight);
    conductor.viajar(destino, quieto ? 0 : Math.round(Math.min(1300, 700 + lejos * 60)));
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

  // el botón: la onda dibujada, plana si está apagado. Se mueve sólo mientras cambia (al prender o apagar) y queda
  // quieta: fuera del héroe y del atlas no hay movimiento de reposo (manual §14)
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
        const y = 22 + Math.sin(amp * 4.2 + 1.2 + (i / 32) * 7) * 9 * amp * env;
        i ? c2.lineTo(x, y) : c2.moveTo(x, y);
      }
      c2.stroke();
      if (!quieto && Math.abs(amp - objetivo) > 0.004 && !document.hidden) requestAnimationFrame(pintar);
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
  const fuenteVisor = visor.querySelector("source");
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
  /* Cada pantalla de la app vive en imagenes/app/<nombre>-{1280,1920}.{avif,webp} (d60): el visor recibe la base y el
     navegador elige el tamaño y el formato (avif si lo entiende) con srcset y <source>. */
  const ponerPantalla = (base) => {
    const lista = (ext) => `${base}-1280.${ext} 1280w, ${base}-1920.${ext} 1920w`;
    if (fuenteVisor) fuenteVisor.srcset = lista("avif");
    imgVisor.srcset = lista("webp");
    imgVisor.src = `${base}-1920.webp`;
  };
  const abrirVisor = (base, alt, titulo, texto, desde) => {
    if (animacion) return;                                   // una a la vez
    ponerPantalla(base); imgVisor.alt = alt || "";
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
      abrirVisor(b.dataset.ampliar, img.alt, "", "", img);
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
  liviano: { nombre: "Liviano", lema: "En «Personalizar», conviene quitar el Motor local; lo demás se instala igual." },
  local_4b: { nombre: "Local", lema: "Con todo instalado: preguntas y voz también sin conexión." }
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
