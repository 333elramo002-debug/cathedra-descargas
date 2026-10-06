/* La página de descarga de Cathedra.

   Tres cosas, y ninguna depende de nada de afuera:
     1. el enlace del botón (la única constante que hay que tocar al publicar);
     2. la bóveda: un tramo de bóveda estrellada dibujado una vez y repetido,
        en dos capas (el oro y la piedra) para que la llegada pueda correr el
        oro desde la llave del centro antes de que entre la piedra;
     3. la luz del rosetón: manchas de colores que tiemblan y recorren la
        bóveda despacio. Un lienzo chico (240 px) estirado sobre la piedra; se
        dibuja a lo sumo 30 veces por segundo, se detiene con la pestaña
        oculta y queda quieto con «reducir movimiento». */

const ENLACE_INSTALADOR = "https://github.com/333elramo002-debug/cathedra-descargas/releases/latest/download/Cathedra-Setup.exe";

(function () {
"use strict";

const PAGINA = { medida: { cuadros: 0, ms: 0, max: 0 } };
window.CATHEDRA_PAGINA = PAGINA;

/* ══════════════════════ el botón ══════════════════════ */
const boton = document.getElementById("descargar");
if (boton) boton.href = ENLACE_INSTALADOR;

const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ══════════════════════ la bóveda ══════════════════════ */
/* Una bóveda estrellada de verdad, en tres dimensiones, proyectada una vez al
   tamaño de la ventana: tramos cuadrados con su cúpula (las esquinas en los
   arranques, la llave arriba), y en cada uno los fajones y formeros, las
   diagonales, los espinazos, ocho terceletes y la estrella de ligaduras. Es el
   fondo principal de la app («la bóveda») sin el costo de calcularlo por
   píxel: acá es un dibujo fijo y lo único que se mueve es la luz.
   Dos capas: el oro (el filete de cada nervio, las llaves) y la piedra (los
   plementos, el cuerpo del nervio, su luz). La llegada corre el oro desde la
   llave que queda detrás del signo; la piedra entra después, con el acorde. */
const ALTO = 0.42;                                      // la flecha de la cúpula de cada tramo
const PN = [.5, .2], PS = [.5, .8], PO = [.2, .5], PE = [.8, .5];
const DL = .18 / Math.SQRT2;
const ESTRELLA = [PN, [.5 + DL, .5 - DL], PE, [.5 + DL, .5 + DL], PS, [.5 - DL, .5 + DL], PO, [.5 - DL, .5 - DL]];
const MAYORES = [[[0, 0], [1, 0]], [[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 1], [1, 1]],
                 [[0, 0], [1, 1]], [[1, 0], [0, 1]], [[.5, 0], [.5, 1]], [[0, .5], [1, .5]]];
const MENORES = [
  [[0, 0], PN], [[0, 0], PO], [[1, 0], PN], [[1, 0], PE], [[1, 1], PS], [[1, 1], PE], [[0, 1], PS], [[0, 1], PO],
  ...ESTRELLA.map((p, i) => [p, ESTRELLA[(i + 1) % 8]]),
];
const LLAVES = [[[.5, .5], .05], [PN, .022], [PS, .022], [PO, .022], [PE, .022]];

function camara(ancho, alto) {
  // mirando hacia arriba y a lo largo de la nave; más cerca en un teléfono
  const vertical = alto > ancho;
  const fi = (vertical ? 84 : 80) * Math.PI / 180;
  const F = [0, Math.cos(fi), Math.sin(fi)], U = [0, -Math.sin(fi), Math.cos(fi)];
  const pos = [vertical ? 0 : .5, 0, -1.3];
  const f = vertical ? alto * .5 : ancho * .5;
  return (x, y, z) => {
    const d = [x - pos[0], y - pos[1], z - pos[2]];
    const zc = d[1] * F[1] + d[2] * F[2];
    if (zc < .05) return null;
    return [f * d[0] / zc, -f * (d[1] * U[1] + d[2] * U[2]) / zc, zc, f];
  };
}

function boveda() {
  const caja = document.getElementById("boveda");
  if (!caja) return;
  const W = window.innerWidth || 1280, H = window.innerHeight || 800;
  const proy = camara(W, H);
  // la llave que va detrás del signo: el tramo (0, 1)
  const signo = document.querySelector(".signo")?.getBoundingClientRect();
  const destino = signo && signo.width ? [signo.left + signo.width / 2, signo.top + signo.height / 2] : [W / 2, H * .2];
  const ref = proy(.5 - .5, 1.5, ALTO);
  const ox = destino[0] - ref[0], oy = destino[1] - ref[1];
  const punto = (bx, by, u, v) => {
    const uu = 2 * u - 1, vv = 2 * v - 1;
    const p = proy(bx - .5 + u, by + v, ALTO * (1 - (uu * uu + vv * vv) / 2));
    return p && [p[0] + ox, p[1] + oy, p[2], p[3]];
  };
  const trazo = (bx, by, a, b) => {
    let d = "";
    for (let k = 0; k <= 14; k++) {
      const t = k / 14, p = punto(bx, by, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      if (!p) return "";
      d += (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }
    return d;
  };
  let oro = "", piedra = "", plementos = "";
  const cols = W > H ? 4 : 3;
  for (let by = -3; by < 12; by++) {
    for (let bx = -cols; bx <= cols; bx++) {
      const c = punto(bx, by, .5, .5);
      if (!c || c[2] > 11) continue;
      const fuera = (c[0] < -W * .9 || c[0] > W * 1.9 || c[1] < -H * 1.2 || c[1] > H * 1.6);
      if (fuera) continue;
      const k = c[3] / c[2];                              // píxeles por unidad a esa profundidad
      // la luz baja de la llave del signo hacia los bordes, y la piedra lejana se pierde
      const lejos = Math.hypot(c[0] - destino[0], (c[1] - destino[1]) * 1.3) / Math.max(W, H);
      const niebla = Math.max(0, Math.min(1, 1.5 - c[2] * .3)) * Math.max(.22, Math.min(1, 1.12 - lejos * 1.05));
      if (niebla <= .02) continue;
      const may = MAYORES.map(([a, b]) => trazo(bx, by, a, b)).join("");
      const men = MENORES.map(([a, b]) => trazo(bx, by, a, b)).join("");
      // el plemento: el contorno del tramo, con su sombra hacia los arranques
      let borde = "";
      for (const [a, b] of [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]]) {
        borde += trazo(bx, by, a, b).replace(/^M/, borde ? "L" : "M");
      }
      const wM = Math.max(1.1, k * .013), wm = Math.max(.8, k * .008);
      const filo = Math.max(.7, Math.min(1.8, k * .0026));
      const op = niebla.toFixed(3);
      const llaves = LLAVES.map(([p, r]) => {
        const q = punto(bx, by, p[0], p[1]);
        return q ? [q[0], q[1], Math.max(1.5, r * k)] : null;
      }).filter(Boolean);
      oro += `<g opacity="${op}"><path d="${may}" class="n-oro" stroke-width="${(wM + filo * 2).toFixed(2)}"/>` +
             `<path d="${men}" class="n-oro" stroke-width="${(wm + filo * 2).toFixed(2)}"/>` +
             llaves.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 3.2).toFixed(1)}" fill="url(#halo)"/>` +
                                         `<path d="${roseta(x, y, r)}" class="llave"/>`).join("") + `</g>`;
      plementos += `<path d="${borde}Z" fill="url(#plemento)" opacity="${op}"/>`;
      piedra += `<g opacity="${op}">` +
                `<path d="${may}" class="n-piedra" stroke-width="${wM.toFixed(2)}"/>` +
                `<path d="${men}" class="n-piedra" stroke-width="${wm.toFixed(2)}"/>` +
                `<path d="${may}${men}" class="n-luz" stroke-width="${Math.max(.6, wm * .22).toFixed(2)}"/>` +
                llaves.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * .5).toFixed(1)}" class="llave-boton"/>`).join("") +
                `</g>`;
    }
  }
  const caja_ = `viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"`;
  caja.innerHTML = `
<svg class="piedra" ${caja_}>
  <defs><radialGradient id="plemento" cx=".5" cy=".42" r=".62">
    <stop offset="0" style="stop-color: var(--piedra-centro)"/><stop offset="1" style="stop-color: var(--piedra-borde)"/>
  </radialGradient></defs>${plementos}</svg>
<svg class="oro" ${caja_}>
  <defs><radialGradient id="halo">
    <stop offset="0" style="stop-color: var(--oro-halo)"/><stop offset="1" style="stop-color: var(--oro-halo); stop-opacity: 0"/>
  </radialGradient></defs>${oro}</svg>
<svg class="piedra" ${caja_}>${piedra}</svg>
<div class="frente"></div>
<canvas class="roseton" width="300" height="300"></canvas>`;
  const sala = document.querySelector(".sala");
  sala?.style.setProperty("--llave-x", `${destino[0].toFixed(1)}px`);
  sala?.style.setProperty("--llave-y", `${destino[1].toFixed(1)}px`);
  if (!document.getElementById("estilo-boveda")) {
    const estilo = document.createElement("style");
    estilo.id = "estilo-boveda";
    estilo.textContent = `
.n-oro { fill: none; stroke: var(--oro); stroke-linecap: round; stroke-linejoin: round; }
.n-piedra { fill: none; stroke: var(--nervio); stroke-linecap: round; stroke-linejoin: round; }
.n-luz { fill: none; stroke: var(--nervio-luz); stroke-linecap: round; }
.llave { fill: var(--oro); }
.llave-boton { fill: var(--nervio); }`;
    document.head.appendChild(estilo);
  }
}

function roseta(x, y, r) {
  // la llave tallada: ocho hojas alrededor de un botón
  let d = "";
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, a1 = a - .3, a2 = a + .3;
    const f = (n) => n.toFixed(1);
    d += `M${f(x)} ${f(y)}Q${f(x + Math.cos(a1) * r * 1.15)} ${f(y + Math.sin(a1) * r * 1.15)} ${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}` +
         `Q${f(x + Math.cos(a2) * r * 1.15)} ${f(y + Math.sin(a2) * r * 1.15)} ${f(x)} ${f(y)}Z`;
  }
  return d;
}

/* El charco oscuro detrás del texto, a la altura del texto. */
function ubicar() {
  const sala = document.querySelector(".sala");
  const hoja = document.querySelector(".hoja");
  if (!sala || !hoja) return;
  const alto = window.innerHeight || 1;
  const m = hoja.getBoundingClientRect();
  sala.style.setProperty("--charco-y", `${Math.min(70, (m.top + Math.min(m.height, alto) * .5) / alto * 100).toFixed(1)}%`);
}

/* ══════════════════════ la luz del rosetón ══════════════════════ */
/* El rosetón proyectado: un ojo, doce pétalos ojivales partidos en dos
   vidrios y una corona de dieciséis tréboles, en ámbar, carmín, cobalto y
   verde, con los plomos entre vidrio y vidrio. Cada vidrio tiembla a su ritmo
   (el vidrio viejo, el aire caliente) y el polvo flota adentro del haz. El
   lienzo es chico (300 px) y cae estirado y sesgado sobre la piedra, como
   la luz que entra en diagonal; el sol lo pasea despacio por la bóveda. */
const VIDRIOS = ["230,166,87", "163,50,74", "53,87,168", "62,125,98", "246,206,128"];
const VIDRIOS_DIA = ["206,128,52", "160,48,80", "52,88,180", "52,128,94", "214,170,90"];

function roseton() {
  const lienzo = document.querySelector(".roseton");
  if (!lienzo) return;
  const cx = lienzo.getContext("2d", { alpha: true });
  if (!cx) return;
  const dia = window.matchMedia("(prefers-color-scheme: light)").matches;
  const colores = dia ? VIDRIOS_DIA : VIDRIOS;
  const M = 150;
  const vidrios = [];
  // el ojo
  vidrios.push({ forma: (c) => { c.arc(M, M, 19, 0, 2 * Math.PI); }, c: 4 });
  // doce vidrios en anillo alrededor del ojo, con el plomo entre uno y otro
  const sector = (r0, r1, a0, a1) => (c) => {
    c.moveTo(M + Math.cos(a0) * r0, M + Math.sin(a0) * r0);
    c.arc(M, M, r1, a0, a1);
    c.arc(M, M, r0, a1, a0, true);
    c.closePath();
  };
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    vidrios.push({ c: k % 2 ? 1 : 0, forma: sector(23, 58, a + .035, a + Math.PI / 6 - .035) });
  }
  // doce lancetas ojivales, partidas en dos vidrios por su parteluz
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6 + Math.PI / 12;
    for (const [lado, col] of [[-1, k % 2 ? 2 : 3], [1, k % 2 ? 3 : 2]]) {
      vidrios.push({ c: col, forma: (c) => {
        const p = (r, da) => [M + Math.cos(a + da) * r, M + Math.sin(a + da) * r];
        const b0 = p(62, lado * .012), b1 = p(62, lado * .2), h = p(92, lado * .19), cima = p(106, lado * .012);
        c.moveTo(...b0); c.lineTo(...b1); c.lineTo(...h);
        c.quadraticCurveTo(...p(103, lado * .14), ...cima); c.closePath();
      } });
    }
  }
  // la corona: dieciséis tréboles
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8;
    vidrios.push({ c: (k + 1) % 4, forma: (c) => {
      const x = M + Math.cos(a) * 124, y = M + Math.sin(a) * 124;
      c.moveTo(x + 9, y); c.arc(x, y, 9, 0, 2 * Math.PI);
    } });
  }
  /* Los vidrios se reparten en seis grupos que tiemblan cada uno a su ritmo.
     Cada grupo se dibuja UNA vez, blando (la luz atraviesa el vidrio y se
     abre en la piedra) y apagándose hacia el borde del haz: después, cada
     cuadro sólo estampa seis imágenes con su brillo. */
  const GRUPOS = 6;
  const grupos = Array.from({ length: GRUPOS }, () => {
    const c = document.createElement("canvas");
    c.width = c.height = 300;
    return { lienzo: c, x: c.getContext("2d"), f: Math.random() * 6.3, w: .45 + Math.random() * .9 };
  });
  vidrios.forEach((v, i) => {
    const g = grupos[(i * 7 + (i >> 2)) % GRUPOS];
    const camino = new Path2D();
    v.forma(camino);
    g.x.filter = "blur(2.2px)";
    g.x.fillStyle = `rgb(${colores[v.c]})`;
    g.x.fill(camino);
  });
  for (const g of grupos) {
    g.x.filter = "none";
    g.x.globalCompositeOperation = "destination-in";
    const caida = g.x.createRadialGradient(M, M, 10, M, M, 140);
    caida.addColorStop(0, "rgba(0,0,0,1)");
    caida.addColorStop(.6, "rgba(0,0,0,.85)");
    caida.addColorStop(1, "rgba(0,0,0,.25)");
    g.x.fillStyle = caida;
    g.x.fillRect(0, 0, 300, 300);
  }
  const polvo = Array.from({ length: 30 }, () => ({
    a: Math.random() * 6.3, r: Math.random() * 120, v: .02 + Math.random() * .05, f: Math.random() * 6.3,
  }));
  // el halo blando de todo el haz, dibujado una sola vez
  const halo = document.createElement("canvas");
  halo.width = halo.height = 300;
  {
    const h = halo.getContext("2d");
    const g = h.createRadialGradient(M, M, 0, M, M, 148);
    g.addColorStop(0, dia ? "rgba(214,170,90,.30)" : "rgba(255,226,170,.30)");
    g.addColorStop(.25, dia ? "rgba(214,170,90,.2)" : "rgba(255,214,150,.16)");
    g.addColorStop(.7, dia ? "rgba(214,170,90,.1)" : "rgba(230,166,87,.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    h.fillStyle = g; h.fillRect(0, 0, 300, 300);
  }

  const t0 = performance.now();
  let ultimo = 0, pedido = 0;

  function dibujar(ahora) {
    const ini = performance.now();
    const t = (ahora - t0) / 1000;
    cx.clearRect(0, 0, 300, 300);
    cx.globalAlpha = 1;
    cx.drawImage(halo, 0, 0);
    for (const g of grupos) {
      // temblor: dos senos que no coinciden, como el vidrio viejo y el aire caliente
      const b = .64 + .22 * Math.sin(t * g.w + g.f) + .1 * Math.sin(t * g.w * 2.7 + g.f * 1.3);
      cx.globalAlpha = Math.max(.2, Math.min(1, b)) * (dia ? .36 : .62);
      cx.drawImage(g.lienzo, 0, 0);
    }
    if (!dia) {
      cx.fillStyle = "#FFE9C0";
      for (const p of polvo) {
        const a = p.a + t * p.v, r = (p.r + t * 2.5) % 130;
        cx.globalAlpha = .25 + .3 * Math.sin(t * 1.3 + p.f);
        cx.fillRect(M + Math.cos(a) * r, M + Math.sin(a) * r, 1.2, 1.2);
      }
    }
    cx.globalAlpha = 1;
    // el sol se mueve: el rosetón recorre la bóveda (dos períodos que no se
    // sincronizan, 3 y 5 minutos) y gira apenas
    const W = window.innerWidth, H = window.innerHeight;
    const px = W * (W > H ? .8 : .86) + Math.sin(t * 2 * Math.PI / 180 + .6) * W * .12 - 300;
    const py = H * (W > H ? .2 : .0) + Math.sin(t * 2 * Math.PI / 300 + 1.9) * H * .06 - 300;
    const giro = -24 + Math.sin(t / 37) * 5;
    lienzo.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${giro.toFixed(2)}deg) skewX(-14deg) scale(1.25, .78)`;
    const ms = performance.now() - ini;
    PAGINA.medida.cuadros++;
    PAGINA.medida.ms += ms;
    PAGINA.medida.max = Math.max(PAGINA.medida.max, ms);
  }

  function cuadro(ahora) {
    pedido = 0;
    if (ahora - ultimo >= 32) { ultimo = ahora; dibujar(ahora); }
    if (!document.hidden && !quieto.matches) pedido = requestAnimationFrame(cuadro);
  }
  function seguir() {
    if (pedido || document.hidden) return;
    if (quieto.matches) { dibujar(t0 + 20000); return; }   // quieto: un solo cuadro
    pedido = requestAnimationFrame(cuadro);
  }
  function parar() { if (pedido) cancelAnimationFrame(pedido); pedido = 0; }

  document.addEventListener("visibilitychange", () => (document.hidden ? parar() : seguir()));
  quieto.addEventListener?.("change", () => { parar(); seguir(); });
  PAGINA.andando = () => pedido !== 0;
  PAGINA.parar = parar;
  seguir();
}

boveda();
ubicar();
roseton();
/* la llegada termina a los 2,9 s (o enseguida, con «reducir movimiento») */
setTimeout(() => { document.documentElement.dataset.llego = "si"; }, quieto.matches ? 0 : 2900);
/* al cambiar el tamaño se vuelve a proyectar (sin llegada: ya pasó) */
let espera = 0;
window.addEventListener("resize", () => {
  clearTimeout(espera);
  espera = setTimeout(() => {
    PAGINA.parar?.();
    document.documentElement.dataset.llego = "si";
    boveda(); ubicar(); roseton();
  }, 180);
}, { passive: true });
})();
