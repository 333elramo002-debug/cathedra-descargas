/* La escena de Cathedra: la que acompaña a la página.

   Lo que pidió el dueño (7/10 08:25 y 08:40): materiales sólidos y nada líquido. La C de dovelas
   pesadas y biseladas: ónix pulido con micro-rayas, dos de cromo negro cepillado, una de cerámica
   mate Candy Blue con esmalte fino y una de titanio anodizado Candy cepillado; la clave tallada en
   Candy mate con el grabado en ónix. Todos los mapas de superficie (normales y rugosidad) se dibujan
   en el arranque; desgaste en los chaflanes y oclusión en las juntas por vértice; los reflejos salen
   de un estudio con cajas de luz de formas distintas. La voz son cientos de hilos de luz con volumen
   que llegan dispersos y entran ordenados en la C. La profundidad son planos de objetos: un campo
   lejano de dovelas fuera de foco, la C en foco, piezas cercanas desenfocadas; niebla mínima y neutra.

   Cómo se mueve: cada sección tiene un estado y la escena lo persigue con resortes de segundo orden.
   Encima, nada periódico: deriva con ruido, rotación con frecuencias no múltiplos, cada dovela con
   su fase, eventos esporádicos (una dovela se suelta y vuelve, los hilos se desordenan, un destello
   recorre un canto), temblor de mano mínimo y la luz que respira. El texto nunca va en el lienzo.

   Lo que cuida: densidad 1,5× en alto y 1× en liviano; foco, sombras y piezas cercanas sólo en alto;
   si un cuadro pasa 20 ms tres veces seguidas baja de nivel y lo recuerda; se detiene con la pestaña
   oculta; tope de 60 cuadros; libera todo al irse. */

import * as T from "./lib/three-r186.8668290d9f.min.js";

const PAGINA = window.CATHEDRA_PAGINA || (window.CATHEDRA_PAGINA = {});
const avisar = (p) => PAGINA.cargando && PAGINA.cargando(p);

const ONYX = 0x020202, CANDY = 0xb2d5e5;
// la letra del grabado de la clave tiene que estar antes de dibujar su textura
try { await document.fonts.load('500 64px "IBM Plex Mono"'); } catch (e) { /* sigue con la de respaldo */ }
const PALETAS = {
  oscuro: { fondo: ONYX, exposicion: 0.95, entorno: 1.1, clave: 16, tinta: 1.0, haz: 1.0, sombra: 0.0, vineta: 0.5, umbral: 2.2, hilos: 1.0 },
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
/* ── los mapas de superficie, hechos en el arranque (nada se descarga) ──
   Una altura en un lienzo → normales por diferencias (Sobel) y rugosidad. Tres familias:
   micro-rayas para el ónix pulido, grano fino con poros para la cerámica, cepillado para el
   titanio. Se hacen una vez y las comparten todas las piezas. */
let LADO = 512;
function alturaDe(dibujar, semilla) {
  const c = document.createElement("canvas"); c.width = c.height = LADO;
  const g = c.getContext("2d"); dibujar(g, azarCon(semilla), LADO);
  const d = g.getImageData(0, 0, LADO, LADO).data;
  const h = new Float32Array(LADO * LADO);
  for (let k = 0; k < h.length; k++) h[k] = d[k * 4] / 255;
  return h;
}
function normalesDe(h, fuerza) {
  const n = LADO, c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), img = g.createImageData(n, n), o = img.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const xa = (x + n - 1) % n, xb = (x + 1) % n, ya = ((y + n - 1) % n) * n, yb = ((y + 1) % n) * n, yc = y * n;
    const dx = (h[ya + xb] + 2 * h[yc + xb] + h[yb + xb]) - (h[ya + xa] + 2 * h[yc + xa] + h[yb + xa]);
    const dy = (h[yb + xa] + 2 * h[yb + x] + h[yb + xb]) - (h[ya + xa] + 2 * h[ya + x] + h[ya + xb]);
    let nx = -dx * fuerza, ny = -dy * fuerza, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const k = (yc + x) * 4; o[k] = (nx * 0.5 + 0.5) * 255; o[k + 1] = (ny * 0.5 + 0.5) * 255; o[k + 2] = (nz * 0.5 + 0.5) * 255; o[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return repetir(new T.CanvasTexture(c));
}
function rugosidadDe(h, base, amp) {
  const n = LADO, c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), img = g.createImageData(n, n), o = img.data;
  for (let k = 0; k < h.length; k++) { const v = Math.max(0, Math.min(255, (base + (h[k] - 0.5) * amp) * 255)); o[k * 4] = o[k * 4 + 1] = o[k * 4 + 2] = v; o[k * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return repetir(new T.CanvasTexture(c));
}
function repetir(t) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.repeat.set(1.6, 1.6); return t; }
const DIBUJOS = {
  // ónix: casi liso, con micro-rayas finas en todas direcciones (de pulido y de uso)
  rayas(g, azar, n) {
    g.fillStyle = "#808080"; g.fillRect(0, 0, n, n);
    for (let k = 0; k < 900; k++) {
      const x = azar() * n, y = azar() * n, a = azar() * Math.PI, l = 6 + azar() * azar() * n * 0.22;
      g.strokeStyle = `rgba(${azar() < 0.5 ? "255,255,255" : "0,0,0"},${0.05 + azar() * 0.16})`;
      g.lineWidth = 0.4 + azar() * 0.9;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  },
  // cerámica: grano fino y algún poro
  grano(g, azar, n) {
    const img = g.createImageData(n, n), o = img.data;
    for (let k = 0; k < n * n; k++) { const v = 118 + (azar() + azar() + azar() - 1.5) * 34; o[k * 4] = o[k * 4 + 1] = o[k * 4 + 2] = v; o[k * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.filter = "blur(1.4px)"; g.drawImage(g.canvas, 0, 0); g.filter = "none";
    for (let k = 0; k < 420; k++) { const x = azar() * n, y = azar() * n, r = 1.2 + azar() * 2.8; g.fillStyle = `rgba(0,0,0,${0.25 + azar() * 0.4})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  },
  // titanio: cepillado en una sola dirección (líneas largas y finas, de intensidad variable)
  cepillado(g, azar, n) {
    g.fillStyle = "#808080"; g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 0.7) {
      g.strokeStyle = `rgba(${azar() < 0.5 ? "255,255,255" : "0,0,0"},${0.04 + azar() * 0.12})`;
      g.lineWidth = 0.5 + azar() * 0.8;
      const x0 = azar() * n * 0.3 - n * 0.15;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + n * (0.6 + azar() * 0.7), y + (azar() - 0.5) * 0.6); g.stroke();
    }
  },
};
const MAPAS = {};
function mapas() {
  if (MAPAS.listo) return MAPAS;
  const ra = alturaDe(DIBUJOS.rayas, 3), gr = alturaDe(DIBUJOS.grano, 5), ce = alturaDe(DIBUJOS.cepillado, 7);
  MAPAS.rayasN = normalesDe(ra, 2.2); MAPAS.rayasR = rugosidadDe(ra, 0.5, 0.5);
  MAPAS.granoN = normalesDe(gr, 2.2); MAPAS.granoR = rugosidadDe(gr, 0.62, 0.4);
  MAPAS.granoN.repeat.set(0.7, 0.7); MAPAS.granoR.repeat.set(0.7, 0.7);
  MAPAS.cepilladoN = normalesDe(ce, 1.6); MAPAS.cepilladoR = rugosidadDe(ce, 0.42, 0.45);
  MAPAS.listo = true;
  return MAPAS;
}
/* el desgaste en los chaflanes y la oclusión de contacto en las juntas, por vértice (ver dovela()) */
function conDetalle(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aDesgaste; attribute float aOcl; varying float vDesgaste; varying float vOcl;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDesgaste = aDesgaste; vOcl = aOcl;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vDesgaste; varying float vOcl;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + vDesgaste * 0.3, 0.0, 1.0);")
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vOcl; reflectedLight.indirectSpecular *= mix(1.0, vOcl, 0.8); reflectedLight.directDiffuse *= mix(1.0, vOcl, 0.45);");
  };
  mat.customProgramCacheKey = () => "detalle";
  return mat;
}
function materialOnix(i) {
  // pulido sin barniz (la capa cortaba el dibujo en placas modestas): el pulido sale de la rugosidad baja y las micro-rayas
  const M = mapas();
  return new T.MeshPhysicalMaterial({
    color: 0xffffff, map: texturaOnix(i + 1),
    normalMap: M.rayasN, normalScale: new T.Vector2(0.5, 0.5), roughnessMap: M.rayasR,
    roughness: 0.22 + (i % 3) * 0.05, metalness: 0, specularIntensity: 1, ior: 1.6,
  });
}
function materialCromoNegro() {
  const M = mapas();
  return new T.MeshPhysicalMaterial({ color: 0x0a0b0c, metalness: 1, roughness: 0.34, envMapIntensity: 0.7,
    normalMap: M.rayasN, normalScale: new T.Vector2(0.1, 0.1), roughnessMap: M.rayasR });
}
/* Candy Blue en la materia, no sólo en la luz: cerámica mate con capa de esmalte fina (poro y grano
   en las normales) y titanio anodizado cepillado (reflejo estirado en una dirección) */
// (el color va más hondo que el Candy de la marca: con la luz y el tono fílmico encima, sale Candy y no blanco)
const CANDY_MATERIA = new T.Color().setHSL(0.552, 0.38, 0.66, T.SRGBColorSpace);
function materialCeramicaCandy() {
  const M = mapas();
  return new T.MeshPhysicalMaterial({ color: CANDY_MATERIA, normalMap: M.granoN, normalScale: new T.Vector2(0.9, 0.9),
    roughnessMap: M.granoR, roughness: 0.7, metalness: 0, specularIntensity: 0.55,
    ...(/apagar=[^&]*barniz/.test(location.search) ? {} : { clearcoat: 0.45, clearcoatRoughness: 0.32 }) });
}
function materialAnodizado() {
  const M = mapas();
  return new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(0.552, 0.4, 0.66, T.SRGBColorSpace), metalness: 1, roughness: 0.32,
    envMapIntensity: 1.0, normalMap: M.cepilladoN, normalScale: new T.Vector2(0.6, 0.6), roughnessMap: M.cepilladoR,
    ...(/apagar=[^&]*cepillo/.test(location.search) ? {} : { anisotropy: 0.75, anisotropyRotation: 0 }) });
}
/* la marca de luz grabada en la clave: la clase y el minuto, Candy, que brilla desde adentro */
function grabadoDeLuz(texto, enOnix) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  if (enOnix) { g.fillStyle = "#020202"; }   // grabado oscuro sobre la clave Candy (fondo transparente)
  else { g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#b2d5e5"; g.shadowColor = "#b2d5e5"; g.shadowBlur = 14; }
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
  // por vértice: desgaste donde la normal es de chaflán (ni frente ni canto) y oclusión cerca de las juntas y del ojo
  const pos = geo.attributes.position, nor = geo.attributes.normal, nv = pos.count;
  const desg = new Float32Array(nv), ocl = new Float32Array(nv);
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const dang = (x, y) => { let d = Math.abs(x - y) % 6.2832; return d > 3.1416 ? 6.2832 - d : d; };
  for (let k = 0; k < nv; k++) {
    const x = pos.getX(k), y = pos.getY(k), rr = Math.hypot(x, y) || 1;
    const nx = nor.getX(k), ny = nor.getY(k), nz = nor.getZ(k);
    const lado = Math.hypot(nx, ny);
    desg[k] = suave(0.22, 0.55, Math.min(Math.abs(nz), lado));
    let ang = Math.atan2(y, x); if (ang < 0) ang += 6.2832;
    const junta = Math.min(dang(ang, a0), dang(ang, a1)) * rr;
    ocl[k] = (0.5 + 0.5 * suave(0.0, 0.14, junta)) * (0.82 + 0.18 * suave(r, r + 0.16, rr));
  }
  geo.setAttribute("aDesgaste", new T.BufferAttribute(desg, 1));
  geo.setAttribute("aOcl", new T.BufferAttribute(ocl, 1));
  // una de cada tres en Candy Blue: la de arriba a la derecha en cerámica, la de abajo a la izquierda anodizada
  const mat = conDetalle(i === 1 || i === 4 ? materialCromoNegro() : i === 0 ? materialCeramicaCandy() : i === 3 ? materialAnodizado() : materialOnix(i));
  const m = new T.Mesh(geo, mat);
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
  // la clave en Candy Blue mate con el grabado en ónix; con ?clave=onix, al revés (ónix con la marca de luz)
  const enOnix = !/clave=onix/.test(location.search);
  const piedra = enOnix ? materialCeramicaCandy() : materialOnix(9);
  if (!enOnix) piedra.roughness = 0.34;
  const m = new T.Mesh(geo, piedra);
  m.castShadow = true;
  // el grabado va en una placa apenas delante de la cara frontal (la cara se ve tallada)
  const placa = new T.Mesh(new T.PlaneGeometry(0.62, 0.31), enOnix
    ? new T.MeshBasicMaterial({ map: grabadoDeLuz("CLASE 4 · 00:51", true), transparent: true, depthWrite: false })
    : new T.MeshBasicMaterial({ map: grabadoDeLuz("CLASE 4 · 00:51"), color: new T.Color(CANDY).multiplyScalar(1.6),
      transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
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

/* ══════════════════════ los fondos de cada sección ══════════════════════ */
/* El cronograma: un campo lejano de dovelas chicas puestas como un calendario (5 semanas × 7 días);
   los días de clase, en cerámica Candy. Llegan desde atrás cuando la sección entra. */
function campoDeDovelas(onix, candy) {
  const f = new T.Shape();
  const l = 0.19, rr = 0.05;
  f.moveTo(-l + rr, -l); f.lineTo(l - rr, -l); f.quadraticCurveTo(l, -l, l, -l + rr); f.lineTo(l, l - rr);
  f.quadraticCurveTo(l, l, l - rr, l); f.lineTo(-l + rr, l); f.quadraticCurveTo(-l, l, -l, l - rr); f.lineTo(-l, -l + rr);
  f.quadraticCurveTo(-l, -l, -l + rr, -l);
  const geo = new T.ExtrudeGeometry(f, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 4 });
  const azar = azarCon(77);
  const celdas = [];
  for (let sem = 0; sem < 5; sem++) for (let dia = 0; dia < 7; dia++) {
    celdas.push({ x: (dia - 3) * 0.5, y: (2 - sem) * 0.5, clase: dia === 1 || dia === 3, demora: azar(), lejos: 3 + azar() * 6 });
  }
  const deClase = celdas.filter((c) => c.clase), resto = celdas.filter((c) => !c.clase);
  const mOnix = new T.InstancedMesh(geo, onix, resto.length), mCandy = new T.InstancedMesh(geo, candy, deClase.length);
  const g = new T.Group(); g.add(mOnix, mCandy);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), esc = new T.Vector3(1, 1, 1);
  g.userData.poner = (k, t) => {
    [[mOnix, resto], [mCandy, deClase]].forEach(([malla, lista]) => {
      lista.forEach((c, i) => {
        const llega = Math.min(1, Math.max(0, k * 1.6 - c.demora * 0.6));
        const s = llega * llega * (3 - 2 * llega);
        v.set(c.x, c.y + vaiven(t, c.demora * 31, 0.21) * 0.02, -(1 - s) * c.lejos);
        e.set((1 - s) * 1.2 + 0.08, (1 - s) * (c.demora - 0.5) * 2, 0); q.setFromEuler(e);
        esc.setScalar(0.001 + s);
        malla.setMatrixAt(i, m4.compose(v, q, esc));
      });
      malla.instanceMatrix.needsUpdate = true;
    });
  };
  return g;
}
/* Leer: un estante al fondo, láminas finas de ónix paradas como lomos (algunas en titanio Candy)
   que suben a su lugar una por una: lo leído, ordenado */
function estante(onix, candy) {
  const geo = new T.BoxGeometry(0.11, 1.5, 1.0, 1, 1, 1);
  const azar = azarCon(91), n = 16;
  const lista = [];
  for (let k = 0; k < n; k++) lista.push({ x: (k - n / 2) * 0.17 + (azar() - 0.5) * 0.03, alto: 0.75 + azar() * 0.45, inc: (azar() - 0.5) * 0.08, demora: azar(), candy: k % 4 === 1 });
  const deCandy = lista.filter((l) => l.candy), resto = lista.filter((l) => !l.candy);
  const mO = new T.InstancedMesh(geo, onix, resto.length), mC = new T.InstancedMesh(geo, candy, deCandy.length);
  const g = new T.Group(); g.add(mO, mC);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), esc = new T.Vector3();
  g.userData.poner = (k) => {
    [[mO, resto], [mC, deCandy]].forEach(([malla, ls]) => {
      ls.forEach((l, i) => {
        const llega = Math.min(1, Math.max(0, k * 1.5 - l.demora * 0.5)), s = llega * llega * (3 - 2 * llega);
        v.set(l.x, (l.alto * 1.5) / 2 - 0.75 - (1 - s) * 2.2, 0); e.set(0, 0, l.inc * s); q.setFromEuler(e);
        esc.set(1, l.alto, 1);
        malla.setMatrixAt(i, m4.compose(v, q, esc));
      });
      malla.instanceMatrix.needsUpdate = true;
    });
  };
  return g;
}
/* El campo lejano: dovelas sueltas muy atrás, fuera de foco (la profundidad son objetos, no bruma);
   una de cada tres en Candy. Cada una gira con su propio ritmo y su propio ruido. */
function piezaGeo() {
  const f = new T.Shape(), a0 = 0, a1 = 0.95;
  f.absarc(0, 0, R, a0, a1, false); f.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); f.absarc(0, 0, r, a1, a0, true); f.closePath();
  const geo = new T.ExtrudeGeometry(f, { depth: PROF, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 2, curveSegments: 10 });
  geo.translate(-0.65, -0.33, -PROF / 2);
  return geo;
}
function campoLejano(onix, candy, cuantas) {
  const geo = piezaGeo(), azar = azarCon(123);
  const lista = [];
  for (let k = 0; k < cuantas; k++) lista.push({
    p: new T.Vector3((azar() - 0.5) * 40, (azar() - 0.5) * 20, -20 - azar() * 16),
    rot: new T.Vector3(azar() * 6.28, azar() * 6.28, azar() * 6.28),
    vel: new T.Vector3((azar() - 0.5) * 0.11, (azar() - 0.5) * 0.09, (azar() - 0.5) * 0.07),
    esc: 1.1 + azar() * 1.3, semilla: k * 7.3, candy: k % 3 === 0,
  });
  const deCandy = lista.filter((l) => l.candy), resto = lista.filter((l) => !l.candy);
  const mO = new T.InstancedMesh(geo, onix, resto.length), mC = new T.InstancedMesh(geo, candy, deCandy.length);
  const g = new T.Group(); g.add(mO, mC);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), esc = new T.Vector3();
  g.userData.poner = (t, cuanto = 1) => {
    [[mO, resto], [mC, deCandy]].forEach(([malla, ls]) => {
      malla.count = Math.round(ls.length * Math.min(1, Math.max(0, cuanto)));
      ls.forEach((l, i) => {
        v.set(l.p.x + vaiven(t, l.semilla, 0.031) * 0.6, l.p.y + vaiven(t, l.semilla + 1, 0.027) * 0.5, l.p.z);
        e.set(l.rot.x + t * l.vel.x, l.rot.y + t * l.vel.y + vaiven(t, l.semilla + 2, 0.05) * 0.4, l.rot.z + t * l.vel.z); q.setFromEuler(e);
        esc.setScalar(l.esc);
        malla.setMatrixAt(i, m4.compose(v, q, esc));
      });
      malla.instanceMatrix.needsUpdate = true;
    });
  };
  return g;
}
/* Un estudio de fotografía para los reflejos: cajas de luz de formas distintas (un softbox grande
   arriba, una tira alta a la izquierda, un aro a la derecha, una ventanita atrás, una línea baja),
   así los reflejos del ónix y del titanio tienen dibujo y no son un gris parejo. */
function estudio() {
  const s = new T.Scene();
  s.add(new T.Mesh(new T.BoxGeometry(24, 24, 24), new T.MeshBasicMaterial({ color: 0x030405, side: T.BackSide })));
  const luz = (geo, color, int, pos, rot) => {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(int), side: T.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); s.add(m);
  };
  luz(new T.PlaneGeometry(7, 3.2), 0xffffff, 5, [0, 11, 1], [Math.PI / 2, 0, 0.2]);
  luz(new T.PlaneGeometry(0.8, 9), 0xffffff, 8, [-11, 1.5, 2], [0, Math.PI / 2, 0]);
  luz(new T.TorusGeometry(2.4, 0.14, 8, 72), CANDY, 7, [11, 2.5, -2], [0, -Math.PI / 2, 0]);
  luz(new T.PlaneGeometry(2.2, 2.2), 0xffffff, 3.5, [3.5, -1.5, -11]);
  luz(new T.PlaneGeometry(12, 0.35), CANDY, 3, [0, -2.2, 11], [0, Math.PI, 0]);
  // el softbox detrás de la cámara: lo que reflejan las caras de frente (el pulido del ónix se lee en ese degradé)
  luz(new T.PlaneGeometry(13, 7), 0xffffff, 6, [0.5, 0.6, 11.5], [0, Math.PI, 0]);
  // paneles anchos a los costados, con un degradé de intensidad (la cara girada del ónix los refleja)
  luz(new T.PlaneGeometry(9, 5), 0xffffff, 2.2, [11.5, 1.5, 5], [0, -Math.PI / 2, 0]);
  luz(new T.PlaneGeometry(9, 5), 0xdfeaf0, 1.4, [-11.5, 0.5, 5], [0, Math.PI / 2, 0]);
  luz(new T.PlaneGeometry(1.2, 6), 0xffffff, 10, [-5, 0, 10.5], [0, Math.PI * 0.85, 0]);
  return s;
}
/* ruido suave en el tiempo (nunca se repite: valor con interpolación, dos octavas de frecuencias no múltiplos) */
function ruido1(x, s) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const h = (n) => { const v = Math.sin((n + s * 57.31) * 127.13) * 43758.5453; return v - Math.floor(v); };
  return h(i) * (1 - u) + h(i + 1) * u;
}
function vaiven(t, s, f) {
  return (ruido1(t * f, s) * 2 - 1) * 0.5 + (ruido1(t * f * 2.137 + 3.3, s + 9.1) * 2 - 1) * 0.3 + (ruido1(t * f * 0.6180 + 7.7, s + 4.4) * 2 - 1) * 0.35;
}
/* La grilla: luz de ventana en la pared del fondo (paños con bordes blandos, en diagonal) y la
   sombra de hojas que se mueve despacio sobre ellos */
function ventana() {
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uColor: { value: new T.Color(CANDY) }, uV: { value: 0 }, uT: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uColor; uniform float uV, uT; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vU - vec2(0.5, 0.5);
        p.x += p.y * 0.45;                                   // la luz entra en diagonal
        vec2 q = (p + vec2(0.18, 0.2)) * vec2(3.0, 2.0);     // 3 × 2 paños
        vec2 c = fract(q); vec2 id = floor(q);
        float dentro = step(0.0, id.x) * step(id.x, 2.0) * step(0.0, id.y) * step(id.y, 1.0);
        float pano = smoothstep(0.0, 0.12, c.x) * smoothstep(1.0, 0.88, c.x) * smoothstep(0.0, 0.14, c.y) * smoothstep(1.0, 0.86, c.y);
        float hojas = 0.55 + 0.45 * ruido(vU * 7.0 + vec2(uT * 0.11, uT * 0.07)) * ruido(vU * 3.0 - uT * 0.05);
        float a = dentro * pano * hojas * 0.1 * uV;
        a += (h(gl_FragCoord.xy + uT) - 0.5) / 255.0;
        gl_FragColor = vec4(uColor * max(a, 0.0), 1.0);
      }`,
  });
  return new T.Mesh(new T.PlaneGeometry(18, 10), mat);
}

/* ══════════════════════ el recorrido ══════════════════════ */
/* Un estado por sección: dónde está la C (p, g, e), cuánto se abre, dónde va la clave (0 en su
   lugar, 1 afuera y adelante), cuánto orden tienen los hilos, el latido, y la fuerza de la tinta
   y del haz. Para pantallas apaisadas; en vertical se ajusta (ajustarVertical). */
// lo que no se dice en un estado vale lo de acá: luz clave normal desde la izquierda, cámara en su lugar
const LUZ_BLANCA = new T.Color(0xd8e9f0), LUZ_CANDY = new T.Color(CANDY);
const BASE = { abre: 0, clave: 0, orden: 1, latido: 0, tinta: 1, haz: 1, campo: 0, papel: 0, ventana: 0,
  expo: 1, luz: 1, luzX: -4.5, temp: 0, cx: 0, cy: 0, cz: 0, cerca: 1, lejos: 0.25 };
const ESTADOS = [
  // 0 portada: la C a la derecha, bruma + haz + hilos entrando ordenados
  { p: [1.75, 0.3, 0], g: [0.16, -0.58, 0.04], e: 0.95, lejos: 1 },
  // 1 el cronograma: la C chica arriba; al fondo, el calendario de dovelas (los días de clase en Candy); luz desde la derecha
  { p: [4.8, 3.0, -10.5], g: [0.4, -0.9, 0.1], e: 0.9, orden: 0.6, tinta: 0.2, haz: 0.12, campo: 1, luz: 0.85, luzX: 4.5, temp: 0.3, cx: -0.6, cy: 0.3, expo: 0.95 },
  // 2 grabar: la voz es la protagonista: el haz y las motas, los hilos llegan dispersos; la C se aleja arriba
  { p: [-4.4, 3.3, -11.5], g: [0.5, 0.4, 0.1], e: 0.9, abre: 0.04, orden: 0.15, tinta: 0.3, haz: 1.7, luzX: -2, cx: 0.5, cy: -0.2, expo: 1.0 },
  // 3 leer: la clave tallada sale; al fondo, el papel negro donde la tinta se vuelve renglones
  { p: [5.0, 3.7, -13.0], g: [0.6, -0.5, -0.1], e: 0.9, abre: 0.3, clave: 1, orden: 0.5, tinta: 0.35, haz: 0.12, papel: 1, luz: 0.9, luzX: -5.5, temp: 0.6, cx: -0.4, cz: -0.6 },
  // 4 preguntar: el hilo late; luz desde la derecha, más fría
  { p: [-4.2, 2.4, -8.5], g: [0.35, 0.8, 0.15], e: 1.05, abre: 0.08, orden: 0.8, latido: 1, tinta: 0.6, haz: 0.25, luzX: 3, temp: 0.2, cx: 0.5, cy: 0.2 },
  // 5 simulacro: las dovelas se reagrupan en la C, grande y lejos, detrás de la pantalla
  { p: [5.4, 2.2, -9.5], g: [0.15, -0.6, 0.0], e: 1.5, abre: 0.45, tinta: 0.3, haz: 0.6, luz: 1.1, luzX: -3, cx: -0.3 },
  // 6 repasar y «hoy»: la C abierta se va arriba; la clave afuera; luz cálida dentro del Candy
  { p: [0.0, 9.2, -14.0], g: [0.2, 0.3, 0.1], e: 1.0, abre: 1.0, clave: 1, orden: 0.6, tinta: 0.2, haz: 0.2, temp: 0.8, expo: 0.95 },
  // 7 todo lo demás (la grilla): luz de ventana en la pared del fondo, la C lejos a la derecha, casi sin bruma
  { p: [6.5, -1.6, -16.0], g: [0.3, -1.1, 0.2], e: 1.0, abre: 0.2, tinta: 0.05, haz: 0, ventana: 1, luz: 0.7, luzX: 5, temp: 0.4, cx: 0.3, cy: 0.4 },
  // 8 descargar: la cámara llega a la C: el ojo enmarca la caja como un portal
  { p: [0.0, 0.05, -1.05], g: [0.04, -0.16, 0.0], e: 4.3, tinta: 0.8, haz: 0.5, cerca: 0, lejos: 0.5 },
  // 9 pie: la cámara ya pasó por el ojo; el aro queda atrás, en los bordes
  { p: [0.0, 0.05, -1.05], g: [0.02, -0.08, 0.0], e: 8.0, tinta: 0.6, haz: 0.4, cerca: 0, lejos: 0.5 },
].map((e) => ({ ...BASE, ...e }));
const CANALES = Object.keys(BASE);

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
    // una niebla mínima y neutra, del color del fondo: sólo separa los planos (no es bruma de color)
    if (!escena.fog) escena.fog = new T.FogExp2(pal.fondo, 0.02); else escena.fog.color.set(pal.fondo);
    renderer.toneMapping = pal.sinTono ? 0 : T.ACESFilmicToneMapping;   // 0 = NoToneMapping
  };
  ponerFondo();
  const pmrem = new T.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(estudio(), 0.02).texture;
  escena.environment = entorno;
  escena.environmentIntensity = pal.entorno;
  const camara = new T.PerspectiveCamera(30, 1, 0.1, 60);
  camara.position.set(0, 0.25, 7.2);

  const nivelInicial = forzarBaja ? 0 : 2;
  LADO = nivelInicial > 0 ? 1024 : 512;   // los mapas de superficie: 1024 en alto, 512 en liviano
  mapas(); await respiro();

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
  /* la profundidad por planos de objetos: el campo lejano fuera de foco, la C en foco y dos piezas
     cercanas, grandes y desenfocadas, en las esquinas (sólo en alto, donde hay profundidad de campo) */
  const ceramicaLejana = materialCeramicaCandy(); ceramicaLejana.color.multiplyScalar(0.55);
  const lejano = campoLejano(materialOnix(5), ceramicaLejana, nivelInicial > 0 ? 26 : 12);
  escena.add(lejano);
  const cercanos = new T.Group();
  [[-1.95, 1.08, 3.1, 0.9, 0.3, 2.2, materialOnix(6)], [2.05, -1.02, 3.5, -0.5, 0.8, 0.5, materialAnodizado()]].forEach(([x, y, z, rx, ry, rz, mat]) => {
    const m = new T.Mesh(piezaGeo(), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.setScalar(0.9);
    m.userData.base = m.position.clone(); m.userData.rot = m.rotation.clone(); cercanos.add(m);
  });
  escena.add(cercanos);
  const elHaz = haz(); elHaz.position.set(0, 3.4, -0.6); escena.add(elHaz);
  const lasMotas = motas(220); lasMotas.position.set(0, 0.85, -0.4); escena.add(lasMotas);
  const curva = new Onda(new T.Vector3(-7.5, -0.05, -1.6), new T.Vector3(0, 0, 0), 0.32);
  const hilos = hilosDeLuz(curva, nivelInicial > 0 ? 260 : 80);
  escena.add(hilos);
  // una copia que sólo escribe distancia, dibujada justo después: los hilos se ven todos (no se tapan
  // entre sí) y el foco sabe que están a la distancia de la C
  const matProf = hilos.material.clone(); matProf.uniforms = hilos.material.uniforms;
  matProf.colorWrite = false; matProf.depthWrite = true;
  const hilosProf = new T.Mesh(hilos.geometry, matProf); hilosProf.frustumCulled = false;
  hilos.renderOrder = 1; hilosProf.renderOrder = 2; hilos.add(hilosProf);
  /* los fondos por sección: el calendario de dovelas, el papel de los renglones, la luz de ventana */
  const campo = campoDeDovelas(materialOnix(3), materialCeramicaCandy());
  campo.position.set(3.4, -2.5, -8.0); campo.visible = false; escena.add(campo);
  const onixEstante = materialOnix(7), titanioEstante = materialAnodizado();
  onixEstante.envMapIntensity = 0.35; titanioEstante.envMapIntensity = 0.3; titanioEstante.color.multiplyScalar(0.55);   // las caras planas no espejan el softbox
  const elPapel = estante(onixEstante, titanioEstante); elPapel.position.set(2.6, -0.4, -6.0); elPapel.rotation.y = -0.75; elPapel.visible = false; escena.add(elPapel);
  const laVentana = ventana(); laVentana.position.set(-2.0, 0.6, -7.0); laVentana.visible = false; escena.add(laVentana);

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
  const relleno = new T.DirectionalLight(0xeaf3f7, 0.55); relleno.position.set(3, 0.5, 6); escena.add(relleno);
  const luzHaz = new T.SpotLight(CANDY, 10, 0, 0.3, 0.9, 2); escena.add(luzHaz, luzHaz.target);
  const chispa = new T.PointLight(0xe8f4f8, 0, 2.6, 2); escena.add(chispa);   // el destello que recorre un canto
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
  /* el foco: la C nítida, lo de atrás y lo de adelante fuera de foco (sólo en alto). Lee la
     distancia del mismo dibujo (la textura de profundidad del cuadro) y difumina con un disco de
     16 muestras en ángulo áureo, que da un bokeh redondo. Los hilos y el haz no escriben
     profundidad: toman la de lo que tienen detrás. */
  composer.renderTarget1.depthTexture = new T.DepthTexture();
  composer.renderTarget2.depthTexture = new T.DepthTexture();
  const foco = new T.ShaderPass({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uFoco: { value: 8 }, uApertura: { value: 0.026 }, uMax: { value: 0.014 },
      uCerca: { value: 0.1 }, uLejos: { value: 60 }, uAspecto: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      #include <packing>
      uniform sampler2D tDiffuse, tDepth; uniform float uFoco, uApertura, uMax, uCerca, uLejos, uAspecto; varying vec2 vUv;
      float distancia(vec2 p){ return -perspectiveDepthToViewZ(texture2D(tDepth, p).x, uCerca, uLejos); }
      // un margen en foco alrededor de la C (toda la pieza queda nítida), y desde ahí crece
      float confusion(float z){ return clamp(max(abs(z - uFoco) - 1.2, 0.0) / max(z, 0.001) * uApertura, 0.0, uMax); }
      void main(){
        float z = distancia(vUv);
        float coc = confusion(z);
        if (coc < 0.0006) coc = 0.0006;
        vec3 suma = texture2D(tDiffuse, vUv).rgb; float peso = 1.0;
        // el disco gira por píxel (ruido) para que el desenfoque no haga bloques; 24 muestras
        float giro = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
        for (int i = 0; i < 24; i++) {
          float a = float(i) * 2.39996 + giro, rr = sqrt(float(i) + 0.5) / 4.9;
          vec2 q = vUv + vec2(cos(a), sin(a) * uAspecto) * rr * coc;
          // lo que está en foco adelante no se derrama sobre el fondo: sólo se junta lo igual de lejos o más
          // lo de más lejos siempre suma; lo de más cerca sólo si está desenfocado lo suficiente para llegar hasta acá
          float zs = distancia(q);
          float w = zs >= z - 0.6 ? 1.0 : clamp(confusion(zs) / max(rr * coc, 0.0001), 0.0, 1.0);
          suma += texture2D(tDiffuse, q).rgb * w; peso += w;
        }
        gl_FragColor = vec4(suma / peso, 1.0);   // (la suma arranca con el propio píxel)
      }`,
  });
  const dibujarFoco = foco.render.bind(foco);
  foco.render = (rend, escribir, leer, ...resto) => { foco.uniforms.tDepth.value = leer.depthTexture; dibujarFoco(rend, escribir, leer, ...resto); };
  composer.addPass(foco);
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
    uniforms: { tDiffuse: { value: null }, tRastro: { value: texRastro }, uPaso: { value: new T.Vector2(1 / 192, 1 / 108) }, uFuerza: { value: 1 }, uGrano: { value: 0.03 }, uVineta: { value: pal.vineta }, uDesenfoque: { value: 0 }, uDestello: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D tDiffuse, tRastro; uniform vec2 uPaso; uniform float uFuerza, uGrano, uVineta, uDesenfoque, uDestello; varying vec2 vUv;
      float h(vec2 p){ return texture2D(tRastro, p).r; }
      float granito(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) + fract(sin(dot(p + 0.37, vec2(39.346, 11.135))) * 24634.6345) - 1.0; }
      void main(){
        vec2 g = vec2(h(vUv + vec2(uPaso.x, 0.0)) - h(vUv - vec2(uPaso.x, 0.0)), h(vUv + vec2(0.0, uPaso.y)) - h(vUv - vec2(0.0, uPaso.y)));
        vec2 d = g * 0.05 * uFuerza;
        // aberración cromática mínima, sólo hacia los bordes
        vec2 borde = (vUv - 0.5) * 0.0025 * dot(vUv - 0.5, vUv - 0.5) * 4.0;
        vec3 c = vec3(texture2D(tDiffuse, vUv + d * 1.25 + borde).r, texture2D(tDiffuse, vUv + d).g, texture2D(tDiffuse, vUv + d * 0.75 - borde).b);
        // el cambio de foco entre secciones: ocho muestras en anillo, sólo mientras se viaja
        if (uDesenfoque > 0.02) {
          vec3 b = vec3(0.0);
          for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; b += texture2D(tDiffuse, vUv + d + vec2(cos(a), sin(a) * 1.78) * uDesenfoque * 0.0022).rgb; }
          c = mix(c, b / 8.0, min(uDesenfoque, 1.0) * 0.85);
        }
        // el destello de lente, mínimo: un fantasma de lo más brillante, espejado hacia el centro, en Candy
        if (uDestello > 0.0) {
          vec3 f = texture2D(tDiffuse, (0.5 - vUv) * 0.7 + 0.5).rgb;
          c += max(f - 0.82, 0.0) * vec3(0.70, 0.84, 0.90) * uDestello;
        }
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
    foco.enabled = nivel > 1 && !apagar.includes("foco");
    cercanos.visible = nivel > 1;
    luzClave.castShadow = nivel > 1;
    lente.uniforms.uFuerza.value = conMouse && !quieto && nivel > 0 ? 1 : 0;
    suavizado.enabled = nivel > 0;
    const pr = renderer.getPixelRatio();
    suavizado.material.uniforms.resolution.value.set(1 / (ancho * pr), 1 / (alto * pr));
    camara.aspect = ancho / alto;
    foco.uniforms.uAspecto.value = ancho / alto;
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
  const estadoFijo = (location.search.match(/estado=([\d.]+)/) || [])[1];   // para la dirección: ?estado=N
  function posicionScroll() {
    if (estadoFijo !== undefined) return parseFloat(estadoFijo);
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
    if (i >= 1 && i <= 7) return { ...e, p: [2.7 + e.p[0] * 0.05, e.p[1] + 2.95, e.p[2] - 0.6], e: e.e * 0.46 };
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
  const enfoque = { valor: 0 };
  /* los eventos esporádicos (cada 8 a 20 s, al azar): una dovela se suelta y vuelve, los hilos se
     desordenan y se reordenan, o un destello recorre un canto. Con resortes: llegan y vuelven con peso. */
  const eventos = {
    dovela: dovelas.map(() => new Resorte(0.9, 0.42, 0, 0)), objDov: dovelas.map(() => 0), kDov: -1, hasta: 0,
    hilos: new Resorte(0.6, 0.7, 0, 0), objHilos: 0, hastaH: 0, destello: -1,
    prox: saltar || medirDeVerdad ? Infinity : 6 + Math.random() * 8,
  };
  function pasarEventos(dt) {
    if (tiempo >= eventos.prox) {
      const tipo = Math.floor(Math.random() * 3);
      if (tipo === 0) { eventos.kDov = Math.floor(Math.random() * dovelas.length); eventos.objDov[eventos.kDov] = 1; eventos.hasta = tiempo + 1.5; }
      else if (tipo === 1) { eventos.objHilos = 0.55; eventos.hastaH = tiempo + 1.8; }
      else eventos.destello = tiempo;
      eventos.prox = tiempo + 8 + Math.random() * 12;
    }
    if (eventos.kDov >= 0 && tiempo > eventos.hasta) { eventos.objDov[eventos.kDov] = 0; eventos.kDov = -1; }
    if (eventos.hastaH && tiempo > eventos.hastaH) { eventos.objHilos = 0; eventos.hastaH = 0; }
    eventos.dovela.forEach((r, i) => r.paso(dt, eventos.objDov[i]));
    eventos.hilos.paso(dt, eventos.objHilos);
  }
  // el orden de los hilos al abrir: llegan dispersos y se ordenan en los primeros 3 segundos
  let ordenInicial = quieto || saltar ? 1 : 0;
  function aplicar(t) {
    // cinco planos con parallax distinto al puntero y al scroll: tinta, haz, C, hilos, motas
    const desp = (scrollSuave / Math.max(window.innerHeight, 1));
    const px = puntero.sx, py = puntero.sy;
    lejano.userData.poner(t, actual.lejos);
    lejano.position.set(-px * 0.25, py * 0.12 + desp * 0.15, 0);
    cercanos.children.forEach((m, i) => {
      m.position.set(m.userData.base.x + px * 0.12 + vaiven(t, 60 + i, 0.07) * 0.05, m.userData.base.y - py * 0.08 + vaiven(t, 70 + i, 0.06) * 0.04, m.userData.base.z);
      m.rotation.set(m.userData.rot.x + vaiven(t, 80 + i, 0.05) * 0.12, m.userData.rot.y + vaiven(t, 90 + i, 0.043) * 0.12, m.userData.rot.z);
    });
    cercanos.scale.setScalar(Math.max(0.0001, actual.cerca));
    elHaz.position.set(actual.p.x * 0.6 + px * 0.12, 3.4 + actual.p.y * 0.4 - py * 0.06, -0.6 + actual.p.z * 0.4);
    lasMotas.position.set(elHaz.position.x + px * 0.1, 0.85 + actual.p.y * 0.4 - py * 0.1 - desp * 0.08, elHaz.position.z + 0.2);
    luzHaz.position.set(elHaz.position.x + 0.2, 7.5, 0.2 + actual.p.z * 0.4); luzHaz.target.position.copy(actual.p);
    /* nada periódico: deriva por una curva de Lissajous con ruido, rotación en los tres ejes con
       frecuencias no múltiplos, cada dovela respira con su propia fase, y de vez en cuando un evento */
    grupo.position.set(actual.p.x + vaiven(t, 1, 0.09) * 0.07, actual.p.y + vaiven(t, 2, 0.071) * 0.05, actual.p.z + vaiven(t, 3, 0.057) * 0.04);
    grupo.rotation.set(actual.g.x + py * 0.08 + vaiven(t, 4, 0.083) * 0.05,
      actual.g.y + px * 0.14 + vaiven(t, 5, 0.061) * 0.09,
      actual.g.z + vaiven(t, 6, 0.103) * 0.03);
    grupo.scale.setScalar(actual.e);
    dovelas.forEach((d, i) => {
      const suelta = eventos.dovela[i].y;
      d.position.copy(d.userData.hacia).multiplyScalar(actual.abre * (0.35 + 0.12 * i) + vaiven(t, 10 + i, 0.27) * 0.012 + suelta * 0.24);
      d.position.z = -actual.abre * (0.4 + 0.3 * i) + suelta * 0.18;
      d.rotation.set(suelta * 0.25, suelta * -0.2, vaiven(t, 20 + i, 0.19) * 0.02 + suelta * 0.35);
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
        grupo.rotation.y * (1 - k) + (claveAfuera.g.y + vaiven(t, 7, 0.09) * 0.1 + px * 0.12) * k,
        grupo.rotation.z * (1 - k) + claveAfuera.g.z * k);
      laClave.scale.setScalar(actual.e * (1 - k) + claveAfuera.e * k);
    }
    // los hilos siguen a la C (entran en su ojo) con un poco más de parallax
    hilos.position.set(actual.p.x + px * 0.18, actual.p.y - py * 0.08, actual.p.z);
    const uh = hilos.material.uniforms;
    uh.uOrden.value = Math.max(0, Math.min(actual.orden, ordenInicial) - eventos.hilos.y);
    uh.uTiempo.value = t; uh.uLatido.value = actual.latido;
    // la niebla neutra, más o menos densa según la sección (nunca dos seguidas iguales)
    escena.fog.density = 0.014 + 0.014 * actual.tinta;
    foco.uniforms.uFoco.value = camara.position.distanceTo(grupo.position);
    elHaz.material.uniforms.uT.value = t;
    elHaz.material.uniforms.uFuerza.value = actual.haz * pal.haz;
    lasMotas.material.opacity = 0.32 * actual.haz * pal.haz;
    luzHaz.intensity = 10 * actual.haz;
    // los fondos de cada sección entran y salen con su canal (y no se dibujan cuando no están)
    campo.visible = actual.campo > 0.01;
    if (campo.visible) {
      campo.userData.poner(actual.campo, t);
      campo.rotation.set(-0.35 + py * 0.05, -0.3 + px * 0.08, 0.03);
    }
    elPapel.visible = actual.papel > 0.01;
    if (elPapel.visible) elPapel.userData.poner(actual.papel);
    elPapel.position.x = 2.6 - px * 0.08;
    laVentana.visible = actual.ventana > 0.01;
    laVentana.material.uniforms.uV.value = actual.ventana; laVentana.material.uniforms.uT.value = t;
    // la luz de cada sección: dirección, intensidad y temperatura (siempre dentro del Candy)
    luzClave.position.set(actual.luzX, 5.5, 5.2);
    luzClave.intensity = pal.clave * actual.luz * (1 + vaiven(t, 50, 0.11) * 0.06);   // la luz respira
    luzClave.color.lerpColors(LUZ_BLANCA, LUZ_CANDY, Math.min(Math.max(actual.temp, 0), 1));
    renderer.toneMappingExposure = pal.exposicion * actual.expo;
    // la cámara viaja: un poco de dolly y una órbita leve hacia el centro de la escena
    // con un temblor de mano mínimo (la cámara la lleva alguien)
    camara.position.set(actual.cx + vaiven(t, 40, 0.7) * 0.01, 0.25 + actual.cy + vaiven(t, 41, 0.63) * 0.008, 7.2 + actual.cz);
    camara.lookAt(actual.cx * 0.4 + vaiven(t, 42, 0.5) * 0.006, 0.25 + actual.cy * 0.4 + vaiven(t, 43, 0.55) * 0.005, 0);
    // el destello que recorre un canto
    if (eventos.destello >= 0) {
      const f = Math.min(1, (t - eventos.destello) / 1.4);
      const a = 0.75 + f * 4.8, rr = 1.04 * actual.e;
      chispa.position.set(grupo.position.x + Math.cos(a) * rr, grupo.position.y + Math.sin(a) * rr, grupo.position.z + 0.45 * actual.e);
      chispa.intensity = Math.sin(f * Math.PI) * 6;
      if (f >= 1) { eventos.destello = -1; chispa.intensity = 0; }
    }
    // el foco: entre una sección y la otra la imagen se desenfoca apenas y vuelve a enfocar al llegar
    lente.uniforms.uDesenfoque.value = nivel > 0 ? enfoque.valor : 0;
    lente.uniforms.uDestello.value = nivel > 1 && !pal.sinTono ? 0.35 : 0;
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
    pasarEventos(dt);
    if (ordenInicial < 1) ordenInicial = Math.min(1, ordenInicial + dt / 2.8);
    const sPos = posicionScroll();
    estadoEn(sPos);
    const fr = sPos - Math.floor(sPos);
    enfoque.valor += ((saltar ? 0 : 4 * fr * (1 - fr)) - enfoque.valor) * (1 - Math.exp(-4 * dt));
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
    for (const m of [hilos.material, laVentana.material]) {
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
  [campo, elPapel, laVentana, cercanos].forEach((o) => { o.visible = true; });   // compilar también lo que está escondido
  renderer.compile(escena, camara);
  [campo, elPapel, laVentana].forEach((o) => { o.visible = false; });
  cercanos.visible = nivel > 1;
  unCuadro();
  avisar(1);

  return {
    arrancar, parar, unCuadro, repintarTema,
    get nivel() { return nivel; },
  };
}
