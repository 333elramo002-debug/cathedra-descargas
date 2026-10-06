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
const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches || /quieto/.test(location.search);
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
const cabecera = document.getElementById("cabecera");
const portada = document.getElementById("portada");
function cabeceraSegunScroll() {
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
  if (mostrado >= 1 || ahora - inicio > 7000) { abrir(); return; }
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
function quedarseQuieta() {
  sinNave = true;
  raiz.classList.add("sin-3d");
  medidoNave = 1;
}
PAGINA.nave = (iniciar) => {
  const lienzo = document.getElementById("nave");
  try {
    const motor = iniciar(lienzo, { quieto });
    if (!motor) { quedarseQuieta(); return; }
    PAGINA.motor = motor;
    naveLista = true;
    raiz.classList.add("con-3d");
    if (abierta) motor.arrancar();
  } catch (e) {
    quedarseQuieta();
  }
};
// si el módulo no llega (navegador viejo, archivo abierto sin servidor), la imagen quieta
if (document.getElementById("nave")) setTimeout(() => { if (!naveLista && !sinNave) quedarseQuieta(); }, 6000);
})();
