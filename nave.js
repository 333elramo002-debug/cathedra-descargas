/* La escena de Cathedra: la que acompaña a la página.

   Lo que eligió el dueño (6/10 23:20) juntando las variantes de /direccion: la C de dovelas de
   ónix pulido (dos de cromo negro para que no sean todas iguales), sola en el agua negra; una
   tinta Candy Blue que nace en la C y se difunde (la profundidad); un haz de luz Candy en esa
   bruma, con rayos por dispersión y motas sólo adentro (nunca quemado a blanco); y la voz de la
   clase como cientos de hilos de luz con volumen, cada uno con su fase, que llegan dispersos de
   lejos y entran ORDENADOS en la C: caótico → ordenado, que es estudiar.

   Dos colores y nada más: ONYX #020202 (fondo y materia) y CANDY BLUE #B2D5E5 (la luz). El único
   blanco son los especulares mínimos del ónix.

   Cómo se mueve: la página baja con su scroll de siempre; cada sección tiene un estado de la
   escena y la escena lo persigue con resortes de segundo orden. Cinco planos (tinta, haz, C,
   hilos, motas) con parallax distinto al puntero y al scroll. El texto nunca va en el lienzo.

   Lo que cuida: densidad 1,5× en alto y 1× en liviano; si un cuadro pasa 20 ms tres veces
   seguidas baja de nivel (sin sombras, sin halo, tinta más simple) y lo recuerda; se detiene
   con la pestaña oculta; tope de 60 cuadros; libera todo al irse. */

import * as T from "./lib/three-r186.37b7d93c59.min.js";

const PAGINA = window.CATHEDRA_PAGINA || (window.CATHEDRA_PAGINA = {});
const avisar = (p) => PAGINA.cargando && PAGINA.cargando(p);

const ONYX = 0x020202, CANDY = 0xb2d5e5;
// la letra del grabado de la clave tiene que estar antes de dibujar su textura
try { await document.fonts.load('500 64px "IBM Plex Mono"'); } catch (e) { /* sigue con la de respaldo */ }
const PALETAS = {
  oscuro: { fondo: ONYX, exposicion: 0.92, entorno: 0.42, clave: 16, tinta: 1.0, haz: 1.0, sombra: 0.0, vineta: 0.5, umbral: 2.2, hilos: 1.0 },
  // tema claro: la pareja invertida (fondo Candy aclarado, materia Onyx); la luz pasa a ser sombra:
  // la tinta y los hilos restan en vez de sumar (trazos de Onyx sobre el claro) y el haz se apaga
  // (sin tono fílmico: el fondo sale igual al de la página, #eef6f9, y la tinta oscurece sin virar de color)
  claro: { fondo: 0xeef6f9, sinTono: true, exposicion: 1.0, entorno: 1.0, clave: 26, tinta: 1.7, haz: 0.0, sombra: 1.0, vineta: 0.1, umbral: 9, hilos: 2.4 },
};

/* ══════════════════════ los materiales ══════════════════════ */
function azarCon(semilla) {
  let s = semilla * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}
/* el ónix: casi negro, nubes de tono y vetas en capas apenas más claras (frías) */
function texturaOnix(semilla) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"); const azar = azarCon(semilla);
  g.fillStyle = "#050506"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24; i++) {
    const x = azar() * 512, y = azar() * 512, r = 45 + azar() * 130;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${14 + azar() * 6},${15 + azar() * 6},${17 + azar() * 6},.5)`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 7; i++) {
    let x = -10, y = azar() * 512, ang = (azar() - 0.5) * 0.6;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 60; k++) { ang += (azar() - 0.5) * 0.18; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; g.lineTo(x, y); }
    g.strokeStyle = `rgba(150,175,186,${0.05 + azar() * 0.09})`;
    g.lineWidth = 0.6 + azar() * 2.6; g.stroke();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* micro-variación de rugosidad por pieza */
function texturaRugosidad(semilla) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"); const azar = azarCon(semilla + 7);
  g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    const x = azar() * 128, y = azar() * 128, r = 3 + azar() * 18, v = Math.floor(20 + azar() * 90);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},.5)`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new T.CanvasTexture(c);
}
function materialOnix(i) {
  // pulido sin capa de barniz (la capa cortaba el dibujo en placas modestas): el pulido sale de la rugosidad baja
  return new T.MeshPhysicalMaterial({
    color: 0xffffff, map: texturaOnix(i + 1), roughnessMap: texturaRugosidad(i + 1),
    roughness: 0.2 + (i % 3) * 0.08, metalness: 0, specularIntensity: 1, ior: 1.6,
  });
}
function materialCromoNegro() {
  return new T.MeshPhysicalMaterial({ color: 0x08090a, metalness: 1, roughness: 0.38, envMapIntensity: 0.6 });
}
/* la marca de luz grabada en la clave: la clase y el minuto, Candy, que brilla desde adentro */
function grabadoDeLuz(texto) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#b2d5e5"; g.shadowColor = "#b2d5e5"; g.shadowBlur = 14;
  g.font = '500 64px "IBM Plex Mono", monospace'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(texto, 512, 256);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  return t;
}

/* ══════════════════════ la C y la clave ══════════════════════ */
const R = 1.0, r = 0.47, PROF = 0.46;
function dovela(a0, a1, i) {
  const f = new T.Shape();
  f.absarc(0, 0, R, a0, a1, false); f.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); f.absarc(0, 0, r, a1, a0, true); f.closePath();
  // chaflanes en todas las aristas: nada de arista viva de caja
  const geo = new T.ExtrudeGeometry(f, { depth: PROF, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 3, curveSegments: 28 });
  geo.translate(0, 0, -PROF / 2);
  const m = new T.Mesh(geo, i === 1 || i === 4 ? materialCromoNegro() : materialOnix(i));
  m.castShadow = m.receiveShadow = true;
  const am = (a0 + a1) / 2;
  m.userData.hacia = new T.Vector3(Math.cos(am), Math.sin(am), 0);
  return m;
}
/* la clave: una cuña trapezoidal de verdad (ancha afuera, angosta adentro), tallada con chaflán
   grueso; en su cara del frente, la clase y el minuto grabados en luz. Centrada en su origen. */
function clave() {
  const f = new T.Shape();
  f.moveTo(-0.34, 0.25); f.lineTo(0.34, 0.1); f.lineTo(0.34, -0.1); f.lineTo(-0.34, -0.25); f.closePath();
  const geo = new T.ExtrudeGeometry(f, { depth: PROF * 1.06, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4 });
  geo.translate(0, 0, -PROF * 0.53);
  const piedra = materialOnix(9);
  piedra.roughness = 0.34;
  const m = new T.Mesh(geo, piedra);
  m.castShadow = true;
  // la marca de luz va en una placa apenas delante de la cara frontal (la cara se ve tallada)
  const placa = new T.Mesh(new T.PlaneGeometry(0.62, 0.31), new T.MeshBasicMaterial({
    map: grabadoDeLuz("CLASE 4 · 00:51"), color: new T.Color(CANDY).multiplyScalar(1.6),
    transparent: true, blending: T.AdditiveBlending, depthWrite: false,
  }));
  placa.position.z = PROF * 0.53 + 0.051;
  m.add(placa);
  return m;
}

/* ══════════════════════ la voz: hilos de luz con volumen ══════════════════════ */
/* Una curva que entra ondulando y se aquieta en el ojo de la C; sobre ella, cientos de tubos
   instanciados, cada uno con su fase, su grosor y su brillo. uOrden (0..1) los junta: con 0
   están dispersos (la clase cruda); con 1 entran en haz (lo estudiado). */
class Onda extends T.Curve {
  constructor(desde, hasta, alto) { super(); this.d = desde; this.h = hasta; this.a = alto; }
  getPoint(t, o = new T.Vector3()) {
    const amp = this.a * Math.pow(1 - t, 1.6) * (0.55 + 0.45 * Math.sin(t * 9.0));
    return o.set(this.d.x + (this.h.x - this.d.x) * t, this.d.y + (this.h.y - this.d.y) * t + Math.sin(t * 46.0) * amp, this.d.z + (this.h.z - this.d.z) * t);
  }
}
function hilosDeLuz(curva, cuantos) {
  const base = new T.TubeGeometry(curva, 150, 1.0, 3, false);   // radio 1: el grosor real va por instancia
  const geo = new T.InstancedBufferGeometry();
  geo.index = base.index;
  for (const k of ["position", "normal", "uv"]) geo.setAttribute(k, base.attributes[k]);
  geo.instanceCount = cuantos;
  const azar = azarCon(5);
  const fase = new Float32Array(cuantos), radio = new Float32Array(cuantos), brillo = new Float32Array(cuantos), grosor = new Float32Array(cuantos);
  for (let i = 0; i < cuantos; i++) {
    fase[i] = azar() * 6.283; radio[i] = Math.pow(azar(), 1.4); brillo[i] = 0.3 + azar() * 0.7;
    grosor[i] = 0.0016 + Math.pow(azar(), 3) * 0.0075;     // muchos finos y unos pocos gruesos
  }
  geo.setAttribute("aFase", new T.InstancedBufferAttribute(fase, 1));
  geo.setAttribute("aRadio", new T.InstancedBufferAttribute(radio, 1));
  geo.setAttribute("aBrillo", new T.InstancedBufferAttribute(brillo, 1));
  geo.setAttribute("aGrosor", new T.InstancedBufferAttribute(grosor, 1));
  // el centro de la curva (para quitarlo y aplicar el grosor por instancia): position - normal
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: {
      uColor: { value: new T.Color(CANDY) }, uOnyx: { value: new T.Color(ONYX) },
      uOrden: { value: 0 }, uTiempo: { value: 0 }, uFuerza: { value: 1 }, uLatido: { value: 0 },
    },
    vertexShader: `attribute float aFase, aRadio, aBrillo, aGrosor; uniform float uOrden, uTiempo;
      varying float vT; varying float vB; varying float vBorde; varying float vDist;
      void main(){
        vT = uv.x; vB = aBrillo;
        vec3 centro = position - normal;                    // el tubo base tiene radio 1
        vec3 p = centro + normal * aGrosor;
        // dispersión: lejos y sin orden, los hilos se abren; cerca de la C y con orden, entran en haz
        float abre = (0.12 + 0.62 * (1.0 - uOrden)) * pow(1.0 - uv.x, 1.15) * aRadio;
        float f = aFase + uTiempo * (0.35 + 0.25 * aRadio);
        p += vec3(0.0, sin(uv.x * 26.0 + f) * abre, cos(uv.x * 21.0 + f * 1.3) * abre);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDist = -mv.z;
        vBorde = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor, uOnyx; uniform float uFuerza, uLatido, uTiempo; varying float vT; varying float vB; varying float vBorde; varying float vDist;
      void main(){
        // Candy al 100 % en el núcleo, mezclado con Onyx hacia los bordes; atenuación con la distancia
        vec3 c = mix(uOnyx, uColor, smoothstep(0.0, 0.85, vBorde));
        float a = smoothstep(0.0, 0.2, vT) * smoothstep(1.0, 0.86, vT) * vB * 0.16;
        a *= 1.0 / (1.0 + max(vDist - 6.0, 0.0) * 0.35);
        // el latido: un pulso que corre hacia la C cuando se pregunta
        a *= 1.0 + uLatido * 1.4 * smoothstep(0.9, 1.0, sin(vT * 14.0 - uTiempo * 3.0));
        gl_FragColor = vec4(c * a * uFuerza, 1.0);
      }`,
  });
  const m = new T.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

/* ══════════════════════ la tinta en agua negra ══════════════════════ */
/* Un fluido 2D por capas: un campo de ruido que se advecta por su propia corriente y se difunde;
   nace en la C y se abre hacia la izquierda. Con granito de ruido para que nunca haga bandas. */
function tinta(octavas) {
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    defines: { OCTAVAS: octavas },
    uniforms: { uColor: { value: new T.Color(CANDY) }, uT: { value: 0 }, uFuerza: { value: 1 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uColor; uniform float uT, uFuerza; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCTAVAS; i++){ s += a * ruido(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      void main(){
        vec2 p = vU * vec2(3.2, 1.6);
        vec2 q = vec2(fbm(p + vec2(0.0, uT * 0.06)), fbm(p + vec2(5.2, 1.3) - uT * 0.03));
        vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + uT * 0.04), fbm(p + 3.0 * q + vec2(8.3, 2.8)));
        float d = fbm(p + 3.4 * r);
        float origen = smoothstep(0.0, 0.9, vU.x) * smoothstep(1.0, 0.82, vU.x);
        float banda = exp(-pow((vU.y - 0.5 - (d - 0.5) * 0.6) * 4.2, 2.0));
        float a = smoothstep(0.42, 0.95, d) * banda * origen * 0.75;
        a += (h(gl_FragCoord.xy + uT) - 0.5) / 255.0;          // granito: sin bandas
        gl_FragColor = vec4(uColor * max(a, 0.0) * uFuerza, 1.0);
      }`,
  });
  return new T.Mesh(new T.PlaneGeometry(9.5, 3.4), mat);
}

/* ══════════════════════ el haz y sus motas ══════════════════════ */
function haz() {
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    uniforms: { uColor: { value: new T.Color(CANDY) }, uT: { value: 0 }, uFuerza: { value: 1 } },
    vertexShader: "varying vec3 vN; varying vec3 vV; varying vec2 vU; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }",
    fragmentShader: `uniform vec3 uColor; uniform float uT, uFuerza; varying vec3 vN; varying vec3 vV; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float b = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float rayos = 0.55 + 0.45 * ruido(vec2(vU.x * 38.0 + uT * 0.05, vU.y * 2.0));   // rayos por dispersión
        float bruma = 0.7 + 0.3 * ruido(vU * vec2(9.0, 14.0) + vec2(0.0, uT * 0.03));
        float a = b * rayos * bruma * smoothstep(0.0, 0.7, vU.y) * 0.14;               // nunca a blanco
        gl_FragColor = vec4(uColor * a * uFuerza, 1.0);
      }`,
  });
  return new T.Mesh(new T.ConeGeometry(2.3, 9, 64, 1, true), mat);
}
function motas(cuantos) {
  // pocas y sólo adentro del haz (no partículas por todo el cuadro)
  const pos = new Float32Array(cuantos * 3); const azar = azarCon(13);
  for (let i = 0; i < cuantos; i++) {
    const y = azar() * 5.5, rr = 1.6 * (y / 5.5) * Math.sqrt(azar()), a = azar() * 6.283;
    pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = 2.75 - y; pos[i * 3 + 2] = Math.sin(a) * rr;
  }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3));
  return new T.Points(g, new T.PointsMaterial({ color: CANDY, size: 0.011, transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false }));
}

/* ══════════════════════ el recorrido ══════════════════════ */
/* Un estado por sección: dónde está la C (p, g, e), cuánto se abre, dónde va la clave (0 en su
   lugar, 1 afuera y adelante), cuánto orden tienen los hilos, el latido, y la fuerza de la tinta
   y del haz. Para pantallas apaisadas; en vertical se ajusta (ajustarVertical). */
const ESTADOS = [
  // 0 portada: la C a la derecha, bruma + haz + hilos entrando ordenados
  { p: [1.75, 0.3, 0], g: [0.16, -0.58, 0.04], e: 0.95, abre: 0, clave: 0, orden: 1, latido: 0, tinta: 1, haz: 1 },
  // 1 grabar: la voz es la protagonista: los hilos llegan dispersos; la C se aleja arriba
  { p: [-4.4, 3.3, -11.5], g: [0.5, 0.4, 0.1], e: 0.9, abre: 0.04, clave: 0, orden: 0.15, latido: 0, tinta: 0.5, haz: 0.4 },
  // 2 la guía: la clave tallada sale, con la clase y el minuto
  { p: [5.0, 3.7, -13.0], g: [0.6, -0.5, -0.1], e: 0.9, abre: 0.3, clave: 1, orden: 0.5, latido: 0, tinta: 0.3, haz: 0.3 },
  // 3 preguntar: el hilo late
  { p: [-5.0, 3.7, -13.0], g: [0.4, 0.9, 0.2], e: 0.9, abre: 0.08, clave: 0, orden: 0.8, latido: 1, tinta: 0.35, haz: 0.3 },
  // 4 simulacro: las dovelas se reagrupan en la C, grande y lejos, detrás de la pantalla
  { p: [5.4, 2.2, -9.5], g: [0.15, -0.6, 0.0], e: 1.5, abre: 0, clave: 0, orden: 1, latido: 0, tinta: 0.6, haz: 0.6 },
  // 5 lo distinto: la C se abre y se va arriba; la clave sale con lo grabado a la vista
  { p: [0.0, 9.2, -14.0], g: [0.2, 0.3, 0.1], e: 1.0, abre: 1.0, clave: 1, orden: 0.6, latido: 0, tinta: 0.2, haz: 0.2 },
  // 6 las cuatro razones
  { p: [0.0, 9.2, -14.0], g: [0.2, 0.5, 0.1], e: 1.0, abre: 1.0, clave: 0, orden: 0.6, latido: 0, tinta: 0.2, haz: 0.2 },
  // 7 descargar: la cámara llega a la C: el ojo enmarca la caja como un portal
  { p: [0.0, 0.05, -1.05], g: [0.04, -0.16, 0.0], e: 4.3, abre: 0, clave: 0, orden: 1, latido: 0, tinta: 0.8, haz: 0.5 },
  // 8 pie: la cámara ya pasó por el ojo; el aro queda atrás, en los bordes
  { p: [0.0, 0.05, -1.05], g: [0.02, -0.08, 0.0], e: 8.0, abre: 0, clave: 0, orden: 1, latido: 0, tinta: 0.6, haz: 0.4 },
];
const CANALES = ["abre", "clave", "orden", "latido", "tinta", "haz"];

/* un resorte de segundo orden (frecuencia f, amortiguación z, respuesta r), como los de Lusion:
   cada cosa persigue a su objetivo con masa y un asentamiento natural */
class Resorte {
  constructor(f, z, r, x0) {
    this.k1 = z / (Math.PI * f); this.k2 = 1 / ((2 * Math.PI * f) ** 2); this.k3 = r * z / (2 * Math.PI * f);
    this.x = x0; this.y = x0; this.v = 0;
  }
  paso(dt, x) {
    const xd = (x - this.x) / Math.max(dt, 1e-4); this.x = x;
    const k2 = Math.max(this.k2, 1.1 * (dt * dt / 4 + dt * this.k1 / 2));
    this.y += dt * this.v;
    this.v += dt * (x + this.k3 * xd - this.y - this.k1 * this.v) / k2;
    return this.y;
  }
  fijar(x) { this.x = this.y = x; this.v = 0; }
}

// un respiro entre etapas: el hilo principal queda libre para el texto y el puntero
const respiro = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 16)));

export async function iniciar(lienzo, opciones = {}) {
  const quieto = !!opciones.quieto;
  const forzarAlta = /calidad=alta/.test(location.search);
  const forzarBaja = /calidad=baja/.test(location.search);
  const medirDeVerdad = /medir/.test(location.search);
  const saltar = /saltar/.test(location.search);
  // ¿hay 3D en este navegador? (si no, sin errores: la imagen quieta)
  try {
    const prueba = document.createElement("canvas");
    const ctxPrueba = prueba.getContext("webgl2") || prueba.getContext("webgl");
    if (!ctxPrueba) return null;
    // sin placa de verdad (dibujo por software), la escena traba la página: queda la imagen quieta
    const datos = ctxPrueba.getExtension("WEBGL_debug_renderer_info");
    const quien = datos ? String(ctxPrueba.getParameter(datos.UNMASKED_RENDERER_WEBGL)) : "";
    const forzar3d = /calidad=|medir|saltar|[?&]3d/.test(location.search);
    if (!forzar3d && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(quien)) return null;
    const soltar = ctxPrueba.getExtension("WEBGL_lose_context");
    if (soltar) soltar.loseContext();
  } catch (e) {
    return null;
  }
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  const gl = renderer.getContext();
  if (!gl) return null;
  avisar(0.15);

  const claroMQ = window.matchMedia("(prefers-color-scheme: light)");
  const esClaro = () => (document.documentElement.dataset.tema ? document.documentElement.dataset.tema === "claro" : claroMQ.matches);
  let pal = esClaro() ? PALETAS.claro : PALETAS.oscuro;

  renderer.info.autoReset = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = pal.exposicion;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.type = T.PCFShadowMap;

  const escena = new T.Scene();
  escena.background = new T.Color();
  const ponerFondo = () => {
    escena.background.set(pal.fondo);
    renderer.toneMapping = pal.sinTono ? 0 : T.ACESFilmicToneMapping;   // 0 = NoToneMapping
  };
  ponerFondo();
  const pmrem = new T.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  escena.environmentIntensity = pal.entorno;
  const camara = new T.PerspectiveCamera(30, 1, 0.1, 60);
  camara.position.set(0, 0.25, 7.2);

  const nivelInicial = forzarBaja ? 0 : 2;

  /* la C */
  const grupo = new T.Group();
  const dovelas = [];
  const abre = 0.72, gap = 0.022, hueco = 0.2;
  const arriba = [abre, Math.PI - hueco], abajo = [Math.PI + hueco, Math.PI * 2 - abre];
  const segs = [];
  for (let i = 0; i < 3; i++) segs.push([arriba[0] + (arriba[1] - arriba[0]) * i / 3, arriba[0] + (arriba[1] - arriba[0]) * (i + 1) / 3]);
  for (let i = 0; i < 2; i++) segs.push([abajo[0] + (abajo[1] - abajo[0]) * i / 2, abajo[0] + (abajo[1] - abajo[0]) * (i + 1) / 2]);
  segs.forEach(([a, b], i) => { const d = dovela(a + gap, b - gap, i); dovelas.push(d); grupo.add(d); });
  const laClave = clave();
  const claveEnLugar = new T.Vector3(-0.8, 0, 0);
  laClave.position.copy(claveEnLugar);
  grupo.add(laClave);
  escena.add(grupo);
  avisar(0.45);
  await respiro();
  // la clave, cuando sale, viene adelante con la cara grabada hacia la cámara
  const claveAfuera = { p: new T.Vector3(1.1, -0.72, 0.6), g: new T.Vector3(0.12, -0.72, 0.16), e: 1.55 };

  /* la tinta (plano del fondo), el haz y las motas (plano medio), los hilos (plano delantero) */
  const laTinta = tinta(nivelInicial > 0 ? 6 : 4);
  laTinta.position.set(-1.2, 0.15, -1.4);
  escena.add(laTinta);
  const elHaz = haz(); elHaz.position.set(0, 3.4, -0.6); escena.add(elHaz);
  const lasMotas = motas(220); lasMotas.position.set(0, 0.85, -0.4); escena.add(lasMotas);
  const curva = new Onda(new T.Vector3(-7.5, -0.05, -1.6), new T.Vector3(0, 0, 0), 0.32);
  const hilos = hilosDeLuz(curva, nivelInicial > 0 ? 260 : 80);
  escena.add(hilos);

  /* la luz: una clave suave, el borde Candy, relleno mínimo; las sombras con color (el entorno) */
  const luzClave = new T.SpotLight(0xd8e9f0, pal.clave, 0, 0.5, 0.95, 2);
  luzClave.position.set(-4.5, 5.5, 5.2);
  luzClave.target.position.set(0, 0, 0);
  luzClave.shadow.mapSize.set(1024, 1024);
  luzClave.shadow.bias = -0.0004;
  luzClave.shadow.radius = 5;
  escena.add(luzClave, luzClave.target);
  const borde = new T.DirectionalLight(CANDY, 0.45); borde.position.set(1.5, 4.5, -5); escena.add(borde);
  const borde2 = new T.DirectionalLight(CANDY, 1.0); borde2.position.set(-4, -2, -4); escena.add(borde2);
  const relleno = new T.DirectionalLight(CANDY, 0.12); relleno.position.set(4, -1, 3); escena.add(relleno);
  const luzHaz = new T.SpotLight(CANDY, 10, 0, 0.3, 0.9, 2); escena.add(luzHaz, luzHaz.target);
  const apagar = (new URLSearchParams(location.search).get("apagar") || "").split(",");
  if (apagar.includes("clave")) luzClave.visible = false;
  if (apagar.includes("borde")) { borde.visible = false; borde2.visible = false; }
  if (apagar.includes("haz")) { elHaz.visible = false; }
  if (apagar.includes("entorno")) escena.environmentIntensity = 0;
  avisar(0.6);
  await respiro();

  /* ── el dibujo: escena → halo contenido (sólo la marca de luz) → tono → suavizado → lente, viñeta,
     aberración mínima en los bordes y granito ── */
  const composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(escena, camara));
  const halo = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.12, 0.3, pal.umbral);
  composer.addPass(halo);

  /* el cursor como lente: el puntero deja una estela invisible (un lienzo chico que se borra
     solo) que tuerce la imagen como un dedo sobre un vidrio. Sólo con mouse y en alto o medio. */
  const rastro = document.createElement("canvas");
  rastro.width = 192; rastro.height = 108;
  const rctx = rastro.getContext("2d");
  rctx.fillStyle = "#000"; rctx.fillRect(0, 0, rastro.width, rastro.height);
  const texRastro = new T.CanvasTexture(rastro);
  const lente = new T.ShaderPass({
    uniforms: { tDiffuse: { value: null }, tRastro: { value: texRastro }, uPaso: { value: new T.Vector2(1 / 192, 1 / 108) }, uFuerza: { value: 1 }, uGrano: { value: 0.03 }, uVineta: { value: pal.vineta } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D tDiffuse, tRastro; uniform vec2 uPaso; uniform float uFuerza, uGrano, uVineta; varying vec2 vUv;
      float h(vec2 p){ return texture2D(tRastro, p).r; }
      float granito(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) + fract(sin(dot(p + 0.37, vec2(39.346, 11.135))) * 24634.6345) - 1.0; }
      void main(){
        vec2 g = vec2(h(vUv + vec2(uPaso.x, 0.0)) - h(vUv - vec2(uPaso.x, 0.0)), h(vUv + vec2(0.0, uPaso.y)) - h(vUv - vec2(0.0, uPaso.y)));
        vec2 d = g * 0.05 * uFuerza;
        // aberración cromática mínima, sólo hacia los bordes
        vec2 borde = (vUv - 0.5) * 0.0025 * dot(vUv - 0.5, vUv - 0.5) * 4.0;
        vec3 c = vec3(texture2D(tDiffuse, vUv + d * 1.25 + borde).r, texture2D(tDiffuse, vUv + d).g, texture2D(tDiffuse, vUv + d * 0.75 - borde).b);
        float v = smoothstep(1.15, 0.25, length((vUv - 0.5) * vec2(1.25, 1.0)));
        c *= mix(1.0 - uVineta, 1.0, v);
        c += granito(gl_FragCoord.xy) * uGrano;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const conMouse = window.matchMedia("(pointer: fine)").matches;
  composer.addPass(new T.OutputPass());
  const suavizado = new T.ShaderPass(T.FXAAShader);
  composer.addPass(suavizado);
  composer.addPass(lente);
  const estela = { x: -1, y: -1, carga: 0 };
  function pintarRastro(dt) {
    rctx.globalCompositeOperation = "source-over";
    rctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 2.6)})`;
    rctx.fillRect(0, 0, rastro.width, rastro.height);
    if (estela.x >= 0 && estela.carga > 0.01) {
      const x = estela.x * rastro.width, y = estela.y * rastro.height;
      const rr = 6 + 18 * Math.min(estela.carga, 1);
      const gr = rctx.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(255,255,255,${Math.min(0.9, estela.carga)})`);
      gr.addColorStop(1, "rgba(255,255,255,0)");
      rctx.globalCompositeOperation = "lighter";
      rctx.fillStyle = gr;
      rctx.beginPath(); rctx.arc(x, y, rr, 0, Math.PI * 2); rctx.fill();
    }
    estela.carga *= Math.exp(-6 * dt);
    texRastro.needsUpdate = true;
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const x = e.clientX / window.innerWidth, y = e.clientY / window.innerHeight;
    if (estela.x >= 0) estela.carga = Math.min(1.2, estela.carga + Math.hypot(x - estela.x, y - estela.y) * 9);
    estela.x = x; estela.y = y;
  }, { passive: true });

  /* niveles: 2 = alto (1,5×, sombras 1024), 1 = medio (1,25×, sin sombras), 0 = liviano (1×, sin suavizado ni lente) */
  let recordado = 2;
  try { recordado = Math.min(2, Math.max(0, parseInt(localStorage.getItem("cathedra-nivel") ?? "2", 10))); } catch (e) { recordado = 2; }
  let nivel = forzarBaja ? 0 : forzarAlta ? 2 : recordado;
  const DENSIDAD = [1.0, 1.25, 1.5];
  let ancho = 1, alto = 1;
  function medir() {
    ancho = lienzo.clientWidth || window.innerWidth;
    alto = lienzo.clientHeight || window.innerHeight;
    const d = Math.min(window.devicePixelRatio || 1, DENSIDAD[nivel]);
    const tope = Math.min(1, Math.sqrt((2560 * 1440) / (ancho * alto * d * d)));
    renderer.setPixelRatio(d * tope);
    renderer.setSize(ancho, alto, false);
    composer.setPixelRatio(d * tope);
    composer.setSize(ancho, alto);
    renderer.shadowMap.enabled = nivel > 1;
    halo.enabled = nivel > 0;
    luzClave.castShadow = nivel > 1;
    lente.uniforms.uFuerza.value = conMouse && !quieto && nivel > 0 ? 1 : 0;
    suavizado.enabled = nivel > 0;
    const pr = renderer.getPixelRatio();
    suavizado.material.uniforms.resolution.value.set(1 / (ancho * pr), 1 / (alto * pr));
    camara.aspect = ancho / alto;
    camara.fov = ancho < alto ? 42 : 30;
    // en vertical la clave sale al centro, abajo del texto (a la derecha se cortaba)
    if (ancho < alto) claveAfuera.p.set(0.1, -1.1, 0.6);
    else claveAfuera.p.set(1.1, -0.72, 0.6);
    camara.updateProjectionMatrix();
  }
  medir();

  /* ── el recorrido por el scroll ── */
  let tramos = [];
  function medirTramos() {
    const y0 = window.scrollY;
    tramos = Array.from(document.querySelectorAll("[data-tramo]")).map((s) => {
      const rr = s.getBoundingClientRect();
      return { desde: rr.top + y0, alto: Math.max(rr.height, 1), i: parseFloat(s.dataset.tramo) };
    });
  }
  medirTramos();
  function posicionScroll() {
    // el estado de cada sección vale exacto cuando su centro pasa por el centro de la pantalla
    const c = window.scrollY + window.innerHeight * 0.5;
    if (!tramos.length) return 0;
    const centro = (t) => t.desde + t.alto / 2;
    if (c <= centro(tramos[0])) return tramos[0].i;
    for (let k = 0; k < tramos.length - 1; k++) {
      const a = tramos[k], b = tramos[k + 1];
      if (c < centro(b)) return a.i + (b.i - a.i) * ((c - centro(a)) / Math.max(centro(b) - centro(a), 1));
    }
    return tramos[tramos.length - 1].i;
  }
  // en vertical (teléfono): la C arriba y al centro, más chica
  // en las secciones del medio el texto ocupa todo el ancho: la C, más chica y arriba, sin tapar títulos
  function ajustarVertical(e, i) {
    if (ancho >= alto) return e;
    if (i >= 1 && i <= 6) return { ...e, p: [e.p[0] * 0.2, e.p[1] + 2.3, e.p[2] - 0.6], e: e.e * 0.55 };
    return { ...e, p: [e.p[0] * 0.25, e.p[1] + 0.95, e.p[2] - 0.6], e: e.e * 0.8 };
  }
  const suave = (t) => t * t * (3 - 2 * t);
  const objetivo = { p: new T.Vector3(), g: new T.Vector3(), e: 1 };
  for (const k of CANALES) objetivo[k] = 0;
  const tmp = new T.Vector3();
  function estadoEn(s) {
    const n = ESTADOS.length - 1;
    const i = Math.min(Math.max(Math.floor(s), 0), n), j = Math.min(i + 1, n);
    const f = suave(Math.min(Math.max(s - i, 0), 1));
    const a = ajustarVertical(ESTADOS[i], i), b = ajustarVertical(ESTADOS[j], j);
    objetivo.p.set(...a.p).lerp(tmp.set(...b.p), f);
    objetivo.g.set(...a.g).lerp(tmp.set(...b.g), f);
    objetivo.e = a.e + (b.e - a.e) * f;
    for (const k of CANALES) objetivo[k] = a[k] + (b[k] - a[k]) * f;
  }
  estadoEn(posicionScroll());
  // un resorte de segundo orden por cada número del estado (la C con algo de peso; lo demás, suave)
  const resortes = {};
  ["px", "py", "pz", "gx", "gy", "gz", "e"].forEach((k) => { resortes[k] = new Resorte(0.55, 0.85, 0.6, 0); });
  CANALES.forEach((k) => { resortes[k] = new Resorte(0.45, 1.0, 0.4, 0); });
  const actual = { p: new T.Vector3(), g: new T.Vector3(), e: 1 };
  function fijarActual() {
    actual.p.copy(objetivo.p); actual.g.copy(objetivo.g); actual.e = objetivo.e;
    for (const k of CANALES) actual[k] = objetivo[k];
    resortes.px.fijar(actual.p.x); resortes.py.fijar(actual.p.y); resortes.pz.fijar(actual.p.z);
    resortes.gx.fijar(actual.g.x); resortes.gy.fijar(actual.g.y); resortes.gz.fijar(actual.g.z); resortes.e.fijar(actual.e);
    for (const k of CANALES) resortes[k].fijar(actual[k]);
  }
  fijarActual();

  const puntero = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    puntero.x = (e.clientX / window.innerWidth) * 2 - 1;
    puntero.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  let scrollSuave = window.scrollY;

  const enLugar = new T.Vector3();
  // el orden de los hilos al abrir: llegan dispersos y se ordenan en los primeros 3 segundos
  let ordenInicial = quieto || saltar ? 1 : 0;
  function aplicar(t) {
    // cinco planos con parallax distinto al puntero y al scroll: tinta, haz, C, hilos, motas
    const desp = (scrollSuave / Math.max(window.innerHeight, 1));
    const px = puntero.sx, py = puntero.sy;
    laTinta.position.set(-1.2 - px * 0.08, 0.15 + py * 0.04 + desp * 0.05, -1.4);
    elHaz.position.set(actual.p.x * 0.6 + px * 0.12, 3.4 + actual.p.y * 0.4 - py * 0.06, -0.6 + actual.p.z * 0.4);
    lasMotas.position.set(elHaz.position.x + px * 0.1, 0.85 + actual.p.y * 0.4 - py * 0.1 - desp * 0.08, elHaz.position.z + 0.2);
    luzHaz.position.set(elHaz.position.x + 0.2, 7.5, 0.2 + actual.p.z * 0.4); luzHaz.target.position.copy(actual.p);
    grupo.position.copy(actual.p);
    grupo.rotation.set(actual.g.x + py * 0.08, actual.g.y + px * 0.14 + Math.sin(t * 0.25) * 0.05, actual.g.z);
    grupo.scale.setScalar(actual.e);
    dovelas.forEach((d, i) => {
      d.position.copy(d.userData.hacia).multiplyScalar(actual.abre * (0.35 + 0.12 * i));
      d.position.z = -actual.abre * (0.4 + 0.3 * i);
    });
    const k = Math.min(Math.max(actual.clave, 0), 1);
    grupo.updateMatrixWorld();
    if (k < 0.001) {
      if (laClave.parent !== grupo) grupo.add(laClave);
      laClave.position.copy(claveEnLugar); laClave.rotation.set(0, 0, 0); laClave.scale.setScalar(1);
    } else {
      if (laClave.parent !== escena) escena.add(laClave);
      enLugar.copy(claveEnLugar).applyMatrix4(grupo.matrixWorld);
      laClave.position.copy(enLugar).lerp(claveAfuera.p, k);
      laClave.position.x += px * 0.05 * k; laClave.position.y -= py * 0.03 * k;
      laClave.rotation.set(grupo.rotation.x * (1 - k) + claveAfuera.g.x * k,
        grupo.rotation.y * (1 - k) + (claveAfuera.g.y + Math.sin(t * 0.3) * 0.1 + px * 0.12) * k,
        grupo.rotation.z * (1 - k) + claveAfuera.g.z * k);
      laClave.scale.setScalar(actual.e * (1 - k) + claveAfuera.e * k);
    }
    // los hilos siguen a la C (entran en su ojo) con un poco más de parallax
    hilos.position.set(actual.p.x + px * 0.18, actual.p.y - py * 0.08, actual.p.z);
    const uh = hilos.material.uniforms;
    uh.uOrden.value = Math.min(actual.orden, ordenInicial);
    uh.uTiempo.value = t; uh.uLatido.value = actual.latido;
    laTinta.material.uniforms.uT.value = t;
    laTinta.material.uniforms.uFuerza.value = actual.tinta * pal.tinta;
    elHaz.material.uniforms.uT.value = t;
    elHaz.material.uniforms.uFuerza.value = actual.haz * pal.haz;
    lasMotas.material.opacity = 0.32 * actual.haz * pal.haz;
    luzHaz.intensity = 10 * actual.haz;
  }

  /* ── el bucle ── */
  let corriendo = false, ultimo = 0, lentos = 0, cuadros = 0, sumaMs = 0, maxMs = 0, sumaIntervalo = 0, tiempo = 0;
  const intervalos = [];
  PAGINA.medida = { cuadros: 0, ms: 0, max: 0, nivel };
  function cuadro(ahora) {
    if (!corriendo) return;
    requestAnimationFrame(cuadro);
    if (ultimo && ahora - ultimo < 15.5) return;        // tope de 60 cuadros por segundo
    const intervalo = ultimo ? ahora - ultimo : 16.7;
    const dt = Math.min(intervalo / 1000, 1 / 20);
    ultimo = ahora;
    pasar(dt);
    if (lente.uniforms.uFuerza.value > 0) pintarRastro(dt);
    const t0 = performance.now();
    renderer.info.reset();
    composer.render();
    if (medirDeVerdad) gl.finish();
    const ms = performance.now() - t0;
    cuadros++; sumaMs += ms; maxMs = Math.max(maxMs, ms); sumaIntervalo += intervalo;
    intervalos.push(intervalo); if (intervalos.length > 240) intervalos.shift();
    PAGINA.medida = { cuadros, ms: sumaMs / cuadros, max: maxMs, nivel, ultimo: ms, intervalo: sumaIntervalo / cuadros,
      llamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles, intervalos };
    // el nivel baja si el envío o el intervalo real pasa 20 ms (22 por el ritmo de la pantalla) tres veces seguidas
    if (!forzarAlta && cuadros > 30 && (ms > 20 || intervalo > 22)) {
      if (++lentos >= 3 && nivel > 0) {
        nivel--; lentos = 0; medir();
        try { localStorage.setItem("cathedra-nivel", String(nivel)); } catch (e) { /* sin almacenamiento */ }
      }
    } else lentos = 0;
  }
  function pasar(dt) {
    tiempo += dt;
    if (ordenInicial < 1) ordenInicial = Math.min(1, ordenInicial + dt / 2.8);
    estadoEn(posicionScroll());
    scrollSuave += (window.scrollY - scrollSuave) * (1 - Math.exp(-6 * dt));
    if (saltar) fijarActual();
    else {
      actual.p.set(resortes.px.paso(dt, objetivo.p.x), resortes.py.paso(dt, objetivo.p.y), resortes.pz.paso(dt, objetivo.p.z));
      actual.g.set(resortes.gx.paso(dt, objetivo.g.x), resortes.gy.paso(dt, objetivo.g.y), resortes.gz.paso(dt, objetivo.g.z));
      actual.e = resortes.e.paso(dt, objetivo.e);
      for (const c of CANALES) actual[c] = resortes[c].paso(dt, objetivo[c]);
    }
    puntero.sx += (puntero.x - puntero.sx) * (1 - Math.exp(-2.5 * dt));
    puntero.sy += (puntero.y - puntero.sy) * (1 - Math.exp(-2.5 * dt));
    aplicar(tiempo);
  }
  function arrancar() {
    if (corriendo || quieto || document.hidden) return;
    corriendo = true; ultimo = 0;
    requestAnimationFrame(cuadro);
  }
  function parar() { corriendo = false; }
  function unCuadro() {
    estadoEn(posicionScroll());
    fijarActual();
    aplicar(tiempo);
    composer.render();
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? parar() : arrancar()));
  let esperaResize = 0;
  window.addEventListener("resize", () => {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(() => { medir(); medirTramos(); if (!corriendo) unCuadro(); }, 120);
  });
  window.addEventListener("load", medirTramos);
  let esperaTramos = 0;
  if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(esperaTramos); esperaTramos = setTimeout(medirTramos, 150); }).observe(document.body);
  // si la placa pierde el contexto, la página no se rompe: queda la imagen quieta
  lienzo.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    parar();
    if (PAGINA.sinNave) PAGINA.sinNave();
  });
  // al irse de la página, liberar lo que ocupa la placa
  window.addEventListener("pagehide", (e) => {
    parar();
    if (e.persisted) return;
    escena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const v of Object.values(o.material)) if (v && v.isTexture) v.dispose();
        o.material.dispose();
      }
    });
    entorno.dispose(); pmrem.dispose(); texRastro.dispose(); renderer.dispose();
  });

  const RESTA = 3;   // SubtractiveBlending de three (la biblioteca recortada no lo exporta)
  // en claro la tinta y los hilos oscurecen (restan luz al fondo); en oscuro, suman luz Candy
  function materiaSegunTema() {
    const claro = !!pal.sinTono;
    for (const m of [laTinta.material, hilos.material]) {
      m.blending = claro ? RESTA : T.AdditiveBlending;
      m.premultipliedAlpha = claro;
      m.uniforms.uColor.value.set(claro ? 0xffffff : CANDY);
      m.needsUpdate = true;
    }
    hilos.material.uniforms.uFuerza.value = pal.hilos;
  }
  materiaSegunTema();

  function repintarTema() {
    pal = esClaro() ? PALETAS.claro : PALETAS.oscuro;
    ponerFondo();
    materiaSegunTema();
    lente.uniforms.uVineta.value = pal.vineta;
    halo.threshold = pal.umbral;
    escena.environmentIntensity = pal.entorno;
    luzClave.intensity = pal.clave;
    renderer.toneMappingExposure = pal.exposicion;
    if (!corriendo) unCuadro();
  }
  claroMQ.addEventListener("change", repintarTema);

  // compilar todo antes de mostrar (sin tirones en el primer movimiento)
  renderer.compile(escena, camara);
  unCuadro();
  avisar(1);

  return {
    arrancar, parar, unCuadro, repintarTema,
    get nivel() { return nivel; },
  };
}
