/* La nave de Cathedra: la escena que se recorre bajando la página.

   Una sala de lectura de piedra, hecha toda con geometría (nada se descarga
   salvo el código): pilares en haz, arcos apuntados, la bóveda de crucería con
   el filete de oro en cada nervio, las mesas con sus lámparas y, al fondo, el
   rosetón que tiñe la piedra con su luz. Es la misma familia que el fondo
   principal de la aplicación («la bóveda»): negro piedra, pizarra, oro en los
   filos y las manchas del vitral en ámbar, carmín, cobalto y verde.

   Cómo se mueve: la página baja con su scroll de siempre (se puede agrandar,
   usar el teclado, leer); la cámara persigue a ese scroll con un resorte suave
   y recorre la nave tramo por tramo, una sección por tramo. El texto nunca va
   dentro del lienzo: está en la página, encima.

   Lo que cuida: densidad de píxeles con tope; si un cuadro tarda más de 20 ms
   tres veces seguidas baja solo de nivel (menos resolución y sin halo); se
   detiene con la pestaña oculta; con «reducir movimiento» dibuja un cuadro y
   se queda quieta. */

import * as T from "./lib/three-cathedra.min.js";

const PAGINA = window.CATHEDRA_PAGINA || (window.CATHEDRA_PAGINA = {});
const avisar = (p) => PAGINA.cargando && PAGINA.cargando(p);

/* ══════════════════════ medidas de la nave ══════════════════════ */
const TRAMO = 6;                 // largo de cada tramo (entre pilares)
const TRAMOS = 12;
const MEDIA = 5;                 // media luz de la nave (eje a pilar)
const LARGO = TRAMO * TRAMOS;
const Z_FONDO = -LARGO - 4;      // el muro del rosetón
const ARRANQUE_ARCO = 8.6;       // donde arrancan los arcos de los pilares
const ARRANQUE_BOVEDA = 19.5;    // donde arranca la bóveda
const FLECHA = 5.2;              // cuánto sube la bóveda desde el arranque
const ROSA = { y: 16.5, r: 6.2 };

/* ══════════════════════ la paleta ══════════════════════ */
const PALETAS = {
  oscuro: {
    fondo: 0x060607, niebla: 0x07080b, piedra: 0x6a6056, piedraFria: 0x3c4456, suelo: 0x1c1c20,
    sueloVeta: 0x34343b, oro: 0xd4a64c, lampara: 0xe6a657, densidad: 0.019, ambiente: 0.16,
    vitral: [0xe6a657, 0xa3324a, 0x3557a8, 0x3e7d62], fuerzaVitral: 1.0, exposicion: 1.05,
  },
  claro: {
    fondo: 0xeee8dc, niebla: 0xe9e2d4, piedra: 0xd8c8a8, piedraFria: 0x8e98ac, suelo: 0xcfc4b0,
    sueloVeta: 0xb9ad97, oro: 0xa9843a, lampara: 0xe6a657, densidad: 0.017, ambiente: 0.62,
    vitral: [0xe6a657, 0xc0566a, 0x5f7fc4, 0x6a9e84], fuerzaVitral: 0.55, exposicion: 0.95,
  },
};

/* ══════════════════════ los sombreadores ══════════════════════ */
/* La piedra: un solo material para pilares, arcos, muros y bóveda. Luz del
   rosetón (con sus manchas de color que tiemblan), el calor de las lámparas
   desde abajo, el frío de las ventanas altas, hiladas de sillares con tono
   propio y la niebla que se come lo lejano. Las sombras nunca son negras:
   caen a pizarra. */
const COMUN = /* glsl */`
  uniform float uTiempo;
  uniform vec3 uNiebla;
  uniform float uDensidad;
  uniform vec3 uVitral0, uVitral1, uVitral2, uVitral3;
  uniform float uFuerzaVitral;
  uniform vec3 uRosa;
  uniform vec3 uLampara;
  uniform float uAmbiente;
  float hash1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash1(i), hash1(i+vec2(1,0)), f.x), mix(hash1(i+vec2(0,1)), hash1(i+vec2(1,1)), f.x), f.y);
  }
  vec3 colorVitral(vec2 p){
    // manchas de luz de colores: cuatro vidrios que se reparten la piedra y tiemblan
    float a = ruido(p*0.35 + vec2(uTiempo*0.020, -uTiempo*0.013));
    float b = ruido(p*0.80 - vec2(uTiempo*0.031, uTiempo*0.017));
    float k = a*0.75 + b*0.25;
    vec3 c = mix(uVitral0, uVitral1, smoothstep(0.30, 0.45, k));
    c = mix(c, uVitral2, smoothstep(0.50, 0.62, k));
    c = mix(c, uVitral3, smoothstep(0.70, 0.80, k));
    return c;
  }
  float calorLamparas(vec3 w){
    // las lámparas de las mesas: dos filas a los lados del pasillo, una por tramo
    float dz = mod(w.z + ${TRAMO / 2}.0, ${TRAMO}.0) - ${TRAMO / 2}.0;
    float dx = abs(w.x) - 2.3;
    vec3 d = vec3(dx, (w.y - 1.25)*1.3, dz*0.55);
    return exp(-dot(d, d)*0.22) * step(w.z, 2.0) * step(${-LARGO + 2}.0, w.z);
  }
  vec3 niebla(vec3 c, float dist){
    float f = 1.0 - exp(-uDensidad*uDensidad*dist*dist);
    return mix(c, uNiebla, clamp(f, 0.0, 1.0));
  }
`;

const VERT_PIEDRA = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying float vDist;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vN = normalize(mat3(modelMatrix) * normal);
    #endif
    vW = w.xyz;
    vec4 v = viewMatrix * w;
    vDist = -v.z;
    gl_Position = projectionMatrix * v;
  }
`;

const FRAG_PIEDRA = /* glsl */`
  ${COMUN}
  uniform vec3 uPiedra, uPiedraFria;
  uniform float uHiladas;
  uniform float uTinte;
  varying vec3 vW; varying vec3 vN; varying float vDist;
  void main(){
    vec3 n = normalize(vN);
    // sillares: hiladas horizontales, cada piedra con su tono
    float hil = vW.y / 0.62;
    float fila = floor(hil);
    float junta = smoothstep(0.0, 0.06, fract(hil)) * smoothstep(1.0, 0.94, fract(hil));
    float largoP = (vW.x + vW.z) / 1.15 + fila * 0.5;
    float juntaV = smoothstep(0.0, 0.04, fract(largoP)) * smoothstep(1.0, 0.96, fract(largoP));
    float tono = 0.82 + 0.3 * hash1(vec2(fila, floor(largoP)));
    float grano = 0.9 + 0.2 * ruido(vW.xy * 3.1 + vW.zx * 2.3);
    vec3 alb = uPiedra * uTinte * tono * grano * mix(1.0, junta * juntaV * 0.55 + 0.45, uHiladas);

    // la luz del rosetón: viene del fondo, alta; manchas de colores
    vec3 aR = uRosa - vW;
    float dR = length(aR);
    float lamR = max(dot(n, aR / dR), 0.0);
    float alcance = 1.0 / (1.0 + dR * dR * 0.0005);
    vec3 manchas = colorVitral(vW.xy * 0.22 + vW.zx * 0.11);
    vec3 luzRosa = manchas * lamR * alcance * 3.0 * uFuerzaVitral;

    // el calor de las lámparas, desde abajo
    float cal = calorLamparas(vW);
    vec3 luzLampara = uLampara * cal * (0.35 + 0.65 * max(dot(n, normalize(vec3(-sign(vW.x)*0.2, -1.0, 0.0))*-1.0), 0.0)) * 2.3;

    // el frío de las ventanas altas: luz de arriba, apenas
    float cielo = max(n.y, 0.0) * 0.15 + max(-n.y, 0.0) * 0.10;
    vec3 sombra = uPiedraFria * (uAmbiente + cielo);
    // el rebote: la luz de las lámparas que vuelve del piso y de las mesas a la bóveda
    sombra += uLampara * max(-n.y, 0.0) * 0.07 * smoothstep(30.0, 6.0, vW.y);

    vec3 c = alb * (sombra + luzRosa + luzLampara);
    gl_FragColor = vec4(niebla(c, vDist), 1.0);
  }
`;

/* El oro de los filetes y las llaves: metal que agarra la luz del rosetón y
   brilla un poco por sí solo (eso es lo único, con el vitral, que llega al halo). */
const FRAG_ORO = /* glsl */`
  ${COMUN}
  uniform vec3 uOro;
  uniform float uBrillo;
  varying vec3 vW; varying vec3 vN; varying float vDist;
  void main(){
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 aR = normalize(uRosa - vW);
    float spec = pow(max(dot(reflect(-aR, n), v), 0.0), 18.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float pulso = 0.85 + 0.15 * sin(uTiempo * 0.6 + vW.z * 0.21);
    float cal = calorLamparas(vW);
    vec3 c = uOro * (0.30 + 0.9 * spec + 0.5 * fres + cal * 1.6) * pulso * uBrillo;
    gl_FragColor = vec4(niebla(c, vDist), 1.0);
  }
`;

/* El suelo: losas de mármol negro con vetas, el reflejo blando del rosetón por
   el pasillo central y los charcos de luz de las lámparas. */
const FRAG_SUELO = /* glsl */`
  ${COMUN}
  uniform vec3 uSuelo, uVeta;
  varying vec3 vW; varying vec3 vN; varying float vDist;
  void main(){
    vec2 p = vW.xz;
    vec2 losa = floor(p / 1.5);
    float tablero = mod(losa.x + losa.y, 2.0);
    vec2 f = fract(p / 1.5);
    float junta = smoothstep(0.0, 0.02, f.x) * smoothstep(1.0, 0.98, f.x) * smoothstep(0.0, 0.02, f.y) * smoothstep(1.0, 0.98, f.y);
    float veta = smoothstep(0.55, 0.9, ruido(p * vec2(0.6, 2.2) + ruido(p * 1.3) * 2.0));
    vec3 alb = mix(uSuelo, uVeta, tablero * 0.3 + veta * 0.45) * (0.6 + 0.4 * junta);
    // el reflejo del rosetón: una franja que se aviva hacia el fondo
    float pasillo = exp(-p.x * p.x * 0.12);
    float hacia = smoothstep(4.0, ${Z_FONDO}.0, p.y);
    vec3 refl = colorVitral(vec2(p.x * 0.4, p.y * 0.05)) * pasillo * hacia * 0.32 * uFuerzaVitral;
    float cal = calorLamparas(vec3(vW.x, 0.9, vW.z));
    vec3 c = alb * (uAmbiente * 1.4 + 0.08) + refl * (0.5 + 0.5 * tablero) + uLampara * cal * 0.55 * alb * 6.0;
    gl_FragColor = vec4(niebla(c, vDist), 1.0);
  }
`;

/* El rosetón: doce pétalos, dos anillos de tracería, vidrios de cuatro
   colores con plomos oscuros; cada vidrio respira apenas, como el aire. */
const FRAG_ROSA = /* glsl */`
  ${COMUN}
  uniform float uEncendido;
  varying vec2 vUv;
  varying float vDist;
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float sector = 3.14159265 / 6.0;
    float as = mod(a + sector * 0.5, sector) - sector * 0.5;     // ángulo dentro del pétalo
    float idx = floor((a + 3.14159265) / sector);
    // tracería: anillos y radios
    float plomo = 0.0;
    plomo += smoothstep(0.035, 0.0, abs(r - 0.98));
    plomo += smoothstep(0.03, 0.0, abs(r - 0.62));
    plomo += smoothstep(0.03, 0.0, abs(r - 0.26));
    plomo += smoothstep(0.022, 0.0, abs(as) * r) * step(0.26, r);
    // círculos de los pétalos exteriores
    vec2 cen = vec2(cos(idx * sector - 3.14159265 + sector * 0.5), sin(idx * sector - 3.14159265 + sector * 0.5)) * 0.80;
    float dc = length(p - cen);
    plomo += smoothstep(0.03, 0.0, abs(dc - 0.15));
    // una red fina de plomos dentro de los vidrios
    float red = smoothstep(0.012, 0.0, abs(fract(r * 9.0) - 0.5) * 0.11) * 0.5;
    plomo = clamp(plomo + red, 0.0, 1.0);
    // el color de cada vidrio
    float anillo = r < 0.26 ? 0.0 : (r < 0.62 ? 1.0 : 2.0);
    float sel = hash1(vec2(idx + anillo * 13.0, anillo + (dc < 0.15 ? 7.0 : 0.0)));
    vec3 c = sel < 0.3 ? uVitral2 : (sel < 0.55 ? uVitral1 : (sel < 0.8 ? uVitral0 : uVitral3));
    if (r < 0.26) c = mix(uVitral0, vec3(1.0, 0.9, 0.7), 0.4);
    float resp = 0.82 + 0.18 * sin(uTiempo * (0.7 + sel) + sel * 30.0);
    vec3 luz = c * (2.6 + 1.4 * sel) * resp * uEncendido;
    vec3 col = mix(luz, vec3(0.012, 0.011, 0.01), plomo);
    // el aro de piedra
    col = mix(col, vec3(0.02), smoothstep(0.97, 1.0, r));
    gl_FragColor = vec4(niebla(col, vDist * 0.6), 1.0);
  }
`;

/* Las ventanas altas (lancetas): un arco apuntado de vidrio frío con plomos
   en rombo; desde lejos se ven como rendijas de luz. */
const FRAG_LANCETA = /* glsl */`
  ${COMUN}
  uniform vec3 uColor;
  uniform float uFuerza;
  varying vec2 vUv;
  varying float vDist;
  varying vec3 vW;
  void main(){
    vec2 p = vUv * 2.0 - 1.0;          // x: -1..1, y: -1..1
    // arco apuntado arriba: dos círculos de radio 1.6 centrados a los lados
    float arriba = p.y - 0.25;
    if (arriba > 0.0) {
      float d1 = length(vec2(p.x + 0.6, arriba)), d2 = length(vec2(p.x - 0.6, arriba));
      if (max(d1, d2) > 1.6) discard;
    }
    if (abs(p.x) > 1.0) discard;
    vec2 q = vec2(p.x * 3.0 + p.y * 6.0, p.x * 3.0 - p.y * 6.0);
    float plomo = smoothstep(0.08, 0.0, abs(fract(q.x) - 0.5) * 0.3) + smoothstep(0.08, 0.0, abs(fract(q.y) - 0.5) * 0.3);
    vec3 mezcla = colorVitral(vW.zy * 0.3);
    vec3 c = mix(uColor, mezcla, 0.35) * uFuerza * (0.8 + 0.2 * sin(uTiempo * 0.5 + vW.z));
    c = mix(c, vec3(0.01), clamp(plomo, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(niebla(c, vDist), 1.0);
  }
`;

const VERT_UV = /* glsl */`
  varying vec2 vUv; varying float vDist; varying vec3 vW;
  void main(){
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #endif
    vW = w.xyz;
    vec4 v = viewMatrix * w;
    vDist = -v.z;
    gl_Position = projectionMatrix * v;
  }
`;

/* Los haces del rosetón: conos abiertos, aditivos, que se apagan hacia los
   bordes y hacia el piso; el polvo es un ruido que viaja dentro. */
const VERT_HAZ = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying float vT; varying float vDist;
  void main(){
    vT = uv.y;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 v = viewMatrix * w;
    vDist = -v.z;
    gl_Position = projectionMatrix * v;
  }
`;
const FRAG_HAZ = /* glsl */`
  ${COMUN}
  uniform vec3 uColor;
  uniform float uFuerza;
  varying vec3 vW; varying vec3 vN; varying float vT; varying float vDist;
  void main(){
    vec3 v = normalize(cameraPosition - vW);
    float borde = pow(abs(dot(normalize(vN), v)), 2.2);
    float largo = smoothstep(0.0, 0.25, vT) * smoothstep(1.0, 0.55, vT);
    float polvo = 0.7 + 0.6 * ruido(vW.xy * 1.7 + vec2(0.0, uTiempo * 0.12)) * ruido(vW.zy * 0.9 - uTiempo * 0.05);
    float cerca = smoothstep(1.5, 9.0, vDist);
    float a = borde * largo * polvo * uFuerza * cerca;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

/* ══════════════════════ geometrías ══════════════════════ */
/* Un arco apuntado (dos arcos de círculo que se cortan en la clave), en un
   plano vertical, entre dos puntos a la misma altura. */
class ArcoApuntado extends T.Curve {
  constructor(a, b, flecha, puntiagudo = 1.5) {
    super();
    this.a = a; this.b = b; this.flecha = flecha; this.k = puntiagudo;
  }
  getPoint(t, destino = new T.Vector3()) {
    const s = 1 - Math.pow(Math.abs(2 * t - 1), this.k);   // 0 en los arranques, 1 en la clave
    return destino.set(
      this.a.x + (this.b.x - this.a.x) * t,
      this.a.y + this.flecha * Math.sqrt(Math.max(s, 0)) * (0.35 + 0.65 * s),
      this.a.z + (this.b.z - this.a.z) * t,
    );
  }
}
/* el perfil de la bóveda: 0 en el arranque, 1 en la clave (apuntado) */
const perfil = (t) => {
  const s = 1 - Math.pow(Math.abs(2 * t - 1), 1.5);
  return Math.sqrt(Math.max(s, 0)) * (0.35 + 0.65 * s);
};

function pilar() {
  // un pilar en haz: el núcleo, ocho columnillas, la basa y el capitel
  const partes = [];
  const alto = ARRANQUE_ARCO;
  const nucleo = new T.CylinderGeometry(0.5, 0.5, alto, 20, 1, true);
  nucleo.translate(0, alto / 2, 0);
  partes.push(nucleo);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = new T.CylinderGeometry(0.13, 0.13, alto, 8, 1, true);
    c.translate(Math.cos(a) * 0.52, alto / 2, Math.sin(a) * 0.52);
    partes.push(c);
  }
  const basa = new T.CylinderGeometry(0.82, 0.9, 0.55, 20);
  basa.translate(0, 0.27, 0);
  partes.push(basa);
  const toro = new T.CylinderGeometry(0.72, 0.82, 0.25, 20);
  toro.translate(0, 0.66, 0);
  partes.push(toro);
  const capitel = new T.CylinderGeometry(0.85, 0.62, 0.7, 20);
  capitel.translate(0, alto + 0.35, 0);
  partes.push(capitel);
  const abaco = new T.BoxGeometry(1.8, 0.22, 1.8);
  abaco.translate(0, alto + 0.8, 0);
  partes.push(abaco);
  // el haz sigue arriba del capitel hasta la bóveda (los baquetones del muro)
  const fuste = new T.CylinderGeometry(0.22, 0.22, ARRANQUE_BOVEDA - alto - 0.9, 10, 1, true);
  fuste.translate(0.35, alto + 0.9 + (ARRANQUE_BOVEDA - alto - 0.9) / 2, 0);
  partes.push(fuste);
  return unir(partes);
}

/* para unir mallas: sólo posición y normal (la piedra no usa coordenadas de textura) */
function limpia(g) {
  const s = g.index ? g.toNonIndexed() : g;
  for (const nombre of Object.keys(s.attributes)) if (nombre !== "position" && nombre !== "normal") s.deleteAttribute(nombre);
  return s;
}
const unir = (lista) => T.mergeGeometries(lista.map(limpia));

function tubo(curva, radio, segmentos = 48, lados = 7) {
  return new T.TubeGeometry(curva, segmentos, radio, lados, false).toNonIndexed();
}

function construir(escena, mat) {
  const piedras = [], oros = [];
  const V = (x, y, z) => new T.Vector3(x, y, z);

  // pilares: dos filas
  const geoPilar = pilar();
  const nPilares = (TRAMOS + 1) * 2;
  const pilares = new T.InstancedMesh(geoPilar, mat.piedraInst, nPilares);
  const m = new T.Matrix4();
  let k = 0;
  for (let i = 0; i <= TRAMOS; i++) {
    const z = -i * TRAMO;
    for (const lado of [-1, 1]) {
      m.makeRotationY(lado < 0 ? Math.PI : 0);
      m.setPosition(lado * MEDIA, 0, z);
      pilares.setMatrixAt(k++, m);
    }
  }
  escena.add(pilares);

  for (let i = 0; i < TRAMOS; i++) {
    const z0 = -i * TRAMO, z1 = z0 - TRAMO, zc = (z0 + z1) / 2;
    for (const lado of [-1, 1]) {
      const x = lado * MEDIA;
      // arcos de la arquería (a lo largo de la nave)
      const arco = new ArcoApuntado(V(x, ARRANQUE_ARCO + 0.9, z0), V(x, ARRANQUE_ARCO + 0.9, z1), 3.6);
      piedras.push(tubo(arco, 0.34, 40, 8));
      const filete = new ArcoApuntado(V(x - lado * 0.36, ARRANQUE_ARCO + 0.75, z0), V(x - lado * 0.36, ARRANQUE_ARCO + 0.75, z1), 3.6);
      oros.push(tubo(filete, 0.045, 40, 5));
      // nervio formero (contra el muro alto)
      const formero = new ArcoApuntado(V(x * 1.02, ARRANQUE_BOVEDA, z0), V(x * 1.02, ARRANQUE_BOVEDA, z1), FLECHA * 0.62);
      piedras.push(tubo(formero, 0.16, 32, 6));
    }
    // nervios diagonales de la crucería, con su filete de oro debajo
    for (const [xa, xb] of [[-MEDIA, MEDIA], [MEDIA, -MEDIA]]) {
      const d = new ArcoApuntado(V(xa, ARRANQUE_BOVEDA, z0), V(xb, ARRANQUE_BOVEDA, z1), FLECHA);
      piedras.push(tubo(d, 0.19, 56, 7));
      const f = new ArcoApuntado(V(xa * 0.99, ARRANQUE_BOVEDA - 0.2, z0 - 0.03), V(xb * 0.99, ARRANQUE_BOVEDA - 0.2, z1 + 0.03), FLECHA);
      oros.push(tubo(f, 0.04, 56, 5));
    }
    // la llave de la clave: un disco de oro
    const llave = new T.CylinderGeometry(0.42, 0.42, 0.16, 16);
    llave.translate(0, ARRANQUE_BOVEDA + FLECHA - 0.2, zc);
    oros.push(llave.toNonIndexed());
    // la plementería: superficie de crucería (mínimo de las dos bóvedas que se cruzan)
    const N = 22;
    const pos = [], idx = [];
    for (let a = 0; a <= N; a++) {
      for (let b = 0; b <= N; b++) {
        const u = a / N, v = b / N;
        const h = Math.min(perfil(u), perfil(v));
        pos.push(-MEDIA + 2 * MEDIA * u, ARRANQUE_BOVEDA + FLECHA * h + 0.12, z0 - TRAMO * v);
      }
    }
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const p = a * (N + 1) + b;
        idx.push(p, p + 1, p + N + 1, p + 1, p + N + 2, p + N + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // las normales miran hacia abajo (adentro de la nave)
    const nn = g.attributes.normal;
    for (let q = 0; q < nn.count; q++) if (nn.getY(q) > 0) nn.setXYZ(q, -nn.getX(q), -nn.getY(q), -nn.getZ(q));
    piedras.push(g.toNonIndexed());
  }
  // arcos fajones (de lado a lado, en cada línea de pilares)
  for (let i = 0; i <= TRAMOS; i++) {
    const z = -i * TRAMO;
    const f = new ArcoApuntado(V(-MEDIA, ARRANQUE_BOVEDA, z), V(MEDIA, ARRANQUE_BOVEDA, z), FLECHA * 0.92);
    piedras.push(tubo(f, 0.26, 48, 8));
    const fo = new ArcoApuntado(V(-MEDIA, ARRANQUE_BOVEDA - 0.3, z), V(MEDIA, ARRANQUE_BOVEDA - 0.3, z), FLECHA * 0.92);
    oros.push(tubo(fo, 0.05, 48, 5));
  }
  // los muros altos (sobre la arquería) y los de las naves laterales
  for (const lado of [-1, 1]) {
    const alto = ARRANQUE_BOVEDA - (ARRANQUE_ARCO + 4.4);
    const muro = new T.PlaneGeometry(LARGO + 8, alto, 1, 1);
    muro.rotateY(-lado * Math.PI / 2);
    muro.translate(lado * (MEDIA + 0.25), ARRANQUE_ARCO + 4.4 + alto / 2, -LARGO / 2);
    piedras.push(muro.toNonIndexed());
    const lateral = new T.PlaneGeometry(LARGO + 8, ARRANQUE_ARCO + 4, 1, 1);
    lateral.rotateY(-lado * Math.PI / 2);
    lateral.translate(lado * 10.5, (ARRANQUE_ARCO + 4) / 2, -LARGO / 2);
    piedras.push(lateral.toNonIndexed());
    const techoLat = new T.PlaneGeometry(LARGO + 8, 5.6, 1, 1);
    techoLat.rotateX(Math.PI / 2);
    techoLat.rotateY(-lado * Math.PI / 2);
    techoLat.translate(lado * 7.9, ARRANQUE_ARCO + 4.4, -LARGO / 2);
    piedras.push(techoLat.toNonIndexed());
  }
  // el muro del fondo, con el hueco del rosetón detrás del vidrio
  const fondo = new T.PlaneGeometry(22, ARRANQUE_BOVEDA + FLECHA + 2, 1, 1);
  fondo.translate(0, (ARRANQUE_BOVEDA + FLECHA + 2) / 2, Z_FONDO - 0.05);
  piedras.push(fondo.toNonIndexed());
  // el aro moldurado del rosetón
  const aro = new T.TubeGeometry(new (class extends T.Curve {
    getPoint(t, d = new T.Vector3()) { const a = t * Math.PI * 2; return d.set(Math.cos(a) * (ROSA.r + 0.2), ROSA.y + Math.sin(a) * (ROSA.r + 0.2), Z_FONDO + 0.1); }
  })(), 96, 0.32, 8, true);
  piedras.push(aro.toNonIndexed());
  const aroOro = new T.TubeGeometry(new (class extends T.Curve {
    getPoint(t, d = new T.Vector3()) { const a = t * Math.PI * 2; return d.set(Math.cos(a) * (ROSA.r - 0.1), ROSA.y + Math.sin(a) * (ROSA.r - 0.1), Z_FONDO + 0.25); }
  })(), 96, 0.05, 5, true);
  oros.push(aroOro.toNonIndexed());

  // las mesas de lectura: largas, a los dos lados del pasillo, una por tramo
  const mesas = [];
  for (let i = 0; i < TRAMOS - 1; i++) {
    const zc = -i * TRAMO - TRAMO / 2;
    for (const lado of [-1, 1]) {
      const tabla = new T.BoxGeometry(1.25, 0.09, 3.6);
      tabla.translate(lado * 2.3, 0.8, zc);
      mesas.push(tabla.toNonIndexed());
      const pata = new T.BoxGeometry(1.0, 0.75, 0.1).toNonIndexed();
      pata.translate(lado * 2.3, 0.38, zc - 1.6);
      mesas.push(pata);
      const pata2 = pata.clone(); pata2.translate(0, 0, 3.2);
      mesas.push(pata2);
      const banco = new T.BoxGeometry(0.4, 0.06, 3.4).toNonIndexed();
      banco.translate(lado * 3.25, 0.48, zc);
      mesas.push(banco);
      const banco2 = banco.clone(); banco2.translate(-lado * 1.9, 0, 0);
      mesas.push(banco2);
    }
  }
  escena.add(new T.Mesh(unir(mesas), mat.madera));

  escena.add(new T.Mesh(unir(piedras), mat.piedra));
  escena.add(new T.Mesh(unir(oros), mat.oro));

  // las lámparas: la pantalla de bronce y la luz que cae
  const lamp = [];
  const luces = [];
  for (let i = 0; i < TRAMOS - 1; i++) {
    const zc = -i * TRAMO - TRAMO / 2;
    for (const lado of [-1, 1]) {
      for (const dz of [-0.9, 0.9]) {
        const pie = new T.CylinderGeometry(0.02, 0.02, 0.38, 6);
        pie.translate(lado * 2.3, 1.03, zc + dz);
        lamp.push(pie.toNonIndexed());
        const pantalla = new T.CylinderGeometry(0.1, 0.22, 0.18, 14, 1, true);
        pantalla.translate(lado * 2.3, 1.25, zc + dz);
        lamp.push(pantalla.toNonIndexed());
        const luz = new T.CircleGeometry(0.2, 14);
        luz.rotateX(Math.PI / 2);
        luz.translate(lado * 2.3, 1.16, zc + dz);
        luces.push(luz.toNonIndexed());
      }
    }
  }
  escena.add(new T.Mesh(unir(lamp), mat.bronce));
  escena.add(new T.Mesh(unir(luces), mat.luzLampara));

  // el suelo
  const suelo = new T.PlaneGeometry(24, LARGO + 30, 1, 1);
  suelo.rotateX(-Math.PI / 2);
  suelo.translate(0, 0, -LARGO / 2 + 6);
  escena.add(new T.Mesh(suelo, mat.suelo));

  // el rosetón
  const rosa = new T.Mesh(new T.CircleGeometry(ROSA.r, 96), mat.rosa);
  rosa.position.set(0, ROSA.y, Z_FONDO + 0.02);
  escena.add(rosa);
  // cinco lancetas bajo el rosetón y dos por tramo en los muros altos
  const geoLanceta = new T.PlaneGeometry(1, 1);
  const lancetasFondo = new T.InstancedMesh(geoLanceta, mat.lancetaFondo, 5);
  for (let i = 0; i < 5; i++) {
    const alto = 7.5 - Math.abs(i - 2) * 1.1;
    m.makeScale(1.25, alto, 1);
    m.setPosition((i - 2) * 1.9, 4.2 + alto / 2, Z_FONDO + 0.03);
    lancetasFondo.setMatrixAt(i, m);
  }
  escena.add(lancetasFondo);
  const lancetasAltas = new T.InstancedMesh(geoLanceta, mat.lancetaAlta, TRAMOS * 4);
  k = 0;
  const giro = new T.Matrix4();
  for (let i = 0; i < TRAMOS; i++) {
    for (const lado of [-1, 1]) {
      for (const dz of [-1.1, 1.1]) {
        giro.makeRotationY(-lado * Math.PI / 2);
        m.makeScale(0.95, 4.0, 1);
        m.premultiply(giro);
        m.setPosition(lado * (MEDIA + 0.2), ARRANQUE_ARCO + 4.4 + 2.6, -i * TRAMO - TRAMO / 2 + dz);
        lancetasAltas.setMatrixAt(k++, m);
      }
    }
  }
  escena.add(lancetasAltas);
  // las ventanas de las naves laterales, vistas a través de la arquería
  const lancetasBajas = new T.InstancedMesh(geoLanceta, mat.lancetaBaja, TRAMOS * 2);
  k = 0;
  for (let i = 0; i < TRAMOS; i++) {
    for (const lado of [-1, 1]) {
      giro.makeRotationY(-lado * Math.PI / 2);
      m.makeScale(1.1, 4.6, 1);
      m.premultiply(giro);
      m.setPosition(lado * 10.45, 5.6, -i * TRAMO - TRAMO / 2);
      lancetasBajas.setMatrixAt(k++, m);
    }
  }
  escena.add(lancetasBajas);

  // los haces del rosetón: conos abiertos desde el vidrio hacia el piso de la nave
  const haces = new T.Group();
  const HACES = [
    { hasta: [0.0, 0, -42], r: 3.6, c: 0, f: 0.22 },
    { hasta: [-3.0, 0, -50], r: 2.6, c: 1, f: 0.16 },
    { hasta: [3.2, 0, -47], r: 2.8, c: 2, f: 0.16 },
    { hasta: [1.0, 0, -30], r: 4.2, c: 3, f: 0.10 },
  ];
  for (const h of HACES) {
    const desde = new T.Vector3(h.hasta[0] * 0.25, ROSA.y, Z_FONDO + 0.5);
    const hasta = new T.Vector3(...h.hasta);
    const largo = desde.distanceTo(hasta);
    const cono = new T.CylinderGeometry(ROSA.r * 0.35, h.r, largo, 24, 1, true);
    // uv.y: 0 en el vidrio, 1 en el piso
    cono.translate(0, -largo / 2, 0);
    const uv = cono.attributes.uv;
    for (let q = 0; q < uv.count; q++) uv.setY(q, 1 - uv.getY(q));
    const malla = new T.Mesh(cono, mat.haz(h.c, h.f));
    malla.position.copy(desde);
    malla.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), hasta.clone().sub(desde).normalize());
    haces.add(malla);
  }
  escena.add(haces);
}

/* ══════════════════════ el recorrido ══════════════════════ */
/* Un punto de cámara por sección (y algunos intermedios): dónde está y adónde
   mira. La sección i de la página corresponde al tramo i del recorrido. */
const RECORRIDO = [
  // portada: en la entrada, la nave entera y el rosetón al fondo
  { p: [0, 2.3, 9], m: [0, 9.5, -70] },
  // cómo funciona: cuatro pasos entre los pilares
  { p: [-1.6, 2.6, -6], m: [1.8, 5.0, -40] },
  { p: [1.7, 3.0, -16], m: [-2.2, 6.5, -52] },
  { p: [-1.4, 3.4, -26], m: [2.6, 7.5, -60] },
  { p: [1.5, 3.8, -36], m: [-1.5, 10, -70] },
  // lo distinto: la cámara mira hacia arriba, a la bóveda (como el fondo de la app)
  { p: [0, 4.2, -42], m: [0, 40, -56] },
  // descargar: bajo el rosetón
  { p: [0, 5.2, -58], m: [0, ROSA.y - 1.5, Z_FONDO] },
  // pie: un paso atrás, la luz entera
  { p: [0, 3.2, -52], m: [0, ROSA.y - 2, Z_FONDO] },
];

/* ══════════════════════ arranque ══════════════════════ */
export function iniciar(lienzo, opciones = {}) {
  const quieto = !!opciones.quieto;
  const forzarAlta = /calidad=alta/.test(location.search);
  const forzarBaja = /calidad=baja/.test(location.search);
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;
  avisar(0.15);

  const claroMQ = window.matchMedia("(prefers-color-scheme: light)");
  const temaForzado = () => document.documentElement.dataset.tema;
  const esClaro = () => (temaForzado() ? temaForzado() === "claro" : claroMQ.matches);
  let pal = esClaro() ? PALETAS.claro : PALETAS.oscuro;

  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = pal.exposicion;
  renderer.outputColorSpace = T.SRGBColorSpace;

  const escena = new T.Scene();
  escena.background = new T.Color(pal.fondo);
  const camara = new T.PerspectiveCamera(52, 1, 0.1, 180);

  // los uniformes comunes: un solo objeto compartido por todos los materiales
  const comunes = {
    uTiempo: { value: 0 },
    uNiebla: { value: new T.Color(pal.niebla) },
    uDensidad: { value: pal.densidad },
    uVitral0: { value: new T.Color(pal.vitral[0]) },
    uVitral1: { value: new T.Color(pal.vitral[1]) },
    uVitral2: { value: new T.Color(pal.vitral[2]) },
    uVitral3: { value: new T.Color(pal.vitral[3]) },
    uFuerzaVitral: { value: pal.fuerzaVitral },
    uRosa: { value: new T.Vector3(0, ROSA.y, Z_FONDO + 2) },
    uLampara: { value: new T.Color(pal.lampara) },
    uAmbiente: { value: pal.ambiente },
  };
  const propios = {
    uPiedra: { value: new T.Color(pal.piedra) },
    uPiedraFria: { value: new T.Color(pal.piedraFria) },
    uOro: { value: new T.Color(pal.oro) },
    uSuelo: { value: new T.Color(pal.suelo) },
    uVeta: { value: new T.Color(pal.sueloVeta) },
    uEncendido: { value: quieto ? 1 : 0 },
  };
  const material = (vert, frag, extra = {}, mas = {}) => new T.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { ...comunes, ...propios, ...extra },
    ...mas,
  });
  const mat = {
    piedra: material(VERT_PIEDRA, FRAG_PIEDRA, { uHiladas: { value: 1 }, uTinte: { value: 1 } }),
    piedraInst: material(VERT_PIEDRA, FRAG_PIEDRA, { uHiladas: { value: 0.5 }, uTinte: { value: 1 } }),
    madera: material(VERT_PIEDRA, FRAG_PIEDRA, { uHiladas: { value: 0 }, uTinte: { value: 0.32 } }),
    oro: material(VERT_PIEDRA, FRAG_ORO, { uBrillo: { value: 1 } }),
    bronce: material(VERT_PIEDRA, FRAG_ORO, { uBrillo: { value: 0.28 } }),
    suelo: material(VERT_PIEDRA, FRAG_SUELO),
    rosa: material(VERT_UV, FRAG_ROSA),
    lancetaFondo: material(VERT_UV, FRAG_LANCETA, { uColor: { value: new T.Color(0x9fb4e6) }, uFuerza: { value: 1.5 } }),
    lancetaAlta: material(VERT_UV, FRAG_LANCETA, { uColor: { value: new T.Color(0x7d93c8) }, uFuerza: { value: 0.4 } }),
    lancetaBaja: material(VERT_UV, FRAG_LANCETA, { uColor: { value: new T.Color(0x56679a) }, uFuerza: { value: 0.16 } }),
    luzLampara: new T.MeshBasicMaterial({ color: new T.Color(pal.lampara).multiplyScalar(6), fog: false }),
    haz: (i, f) => material(VERT_HAZ, FRAG_HAZ,
      { uColor: { value: new T.Color(pal.vitral[i]) }, uFuerza: { value: f } },
      { transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }),
  };
  construir(escena, mat);
  avisar(0.55);

  /* ── el dibujo: escena → halo (sólo lo que brilla) → tono y color ── */
  const composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(escena, camara));
  const halo = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.55, 0.92);
  composer.addPass(halo);
  composer.addPass(new T.OutputPass());

  /* niveles: 2 = alto (densidad hasta 1,5, con halo), 1 = medio, 0 = bajo (sin halo) */
  let nivel = forzarBaja ? 0 : 2;
  const DENSIDAD = [0.6, 1.0, 1.5];
  let ancho = 1, alto = 1;
  function medir() {
    ancho = lienzo.clientWidth || window.innerWidth;
    alto = lienzo.clientHeight || window.innerHeight;
    const d = Math.min(window.devicePixelRatio || 1, DENSIDAD[nivel]);
    // tope de píxeles: 2560 × 1440 como mucho
    const tope = Math.min(1, Math.sqrt((2560 * 1440) / (ancho * alto * d * d)));
    renderer.setPixelRatio(d * tope);
    renderer.setSize(ancho, alto, false);
    composer.setPixelRatio(d * tope);
    composer.setSize(ancho, alto);
    halo.enabled = nivel > 0;
    halo.resolution.set(ancho / 2, alto / 2);
    camara.aspect = ancho / alto;
    camara.fov = ancho < alto ? 66 : 52;
    camara.updateProjectionMatrix();
  }
  medir();

  /* ── el recorrido por el scroll ── */
  const secciones = () => Array.from(document.querySelectorAll("[data-tramo]"));
  let tramos = [];
  function medirTramos() {
    const y0 = window.scrollY;
    tramos = secciones().map((s) => {
      const r = s.getBoundingClientRect();
      return { desde: r.top + y0, alto: Math.max(r.height, 1), i: parseFloat(s.dataset.tramo) };
    });
  }
  medirTramos();
  function posicionScroll() {
    // qué parte del recorrido corresponde al centro de la pantalla
    const c = window.scrollY + window.innerHeight * 0.5;
    if (!tramos.length) return 0;
    if (c <= tramos[0].desde) return tramos[0].i;
    for (let j = 0; j < tramos.length; j++) {
      const t = tramos[j];
      if (c < t.desde + t.alto) {
        const sig = tramos[j + 1] ? tramos[j + 1].i : t.i + 1;
        const f = (c - t.desde) / t.alto;
        return t.i + (sig - t.i) * f;
      }
    }
    return tramos[tramos.length - 1].i + 1;
  }
  const curvaP = new T.CatmullRomCurve3(RECORRIDO.map((k) => new T.Vector3(...k.p)), false, "centripetal");
  const curvaM = new T.CatmullRomCurve3(RECORRIDO.map((k) => new T.Vector3(...k.m)), false, "centripetal");
  const N = RECORRIDO.length - 1;
  const objP = new T.Vector3(), objM = new T.Vector3();
  const camP = new T.Vector3(), camM = new T.Vector3();
  function objetivo(s) {
    const t = Math.min(Math.max(s / N, 0), 1);
    curvaP.getPoint(t, objP);
    curvaM.getPoint(t, objM);
  }
  objetivo(posicionScroll());
  camP.copy(objP); camM.copy(objM);

  /* el puntero: la cámara gira apenas hacia él, como quien gira la cabeza */
  const puntero = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    puntero.x = (e.clientX / window.innerWidth) * 2 - 1;
    puntero.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── el bucle ── */
  let corriendo = false, ultimo = 0, lentos = 0, cuadros = 0, sumaMs = 0, maxMs = 0;
  let tiempo = 0, encendido = quieto ? 1 : 0, objetivoEncendido = 1;
  PAGINA.medida = { cuadros: 0, ms: 0, max: 0, nivel };
  function cuadro(ahora) {
    if (!corriendo) return;
    requestAnimationFrame(cuadro);
    const dt = Math.min((ahora - (ultimo || ahora)) / 1000, 1 / 20);
    ultimo = ahora;
    pasar(dt);
    const t0 = performance.now();
    composer.render();
    const ms = performance.now() - t0;
    cuadros++; sumaMs += ms; maxMs = Math.max(maxMs, ms);
    PAGINA.medida = { cuadros, ms: sumaMs / cuadros, max: maxMs, nivel, ultimo: ms };
    if (!forzarAlta && ms > 20) {
      if (++lentos >= 3 && nivel > 0) { nivel--; lentos = 0; medir(); }
    } else lentos = 0;
  }
  function pasar(dt) {
    tiempo += dt;
    comunes.uTiempo.value = tiempo;
    encendido += (objetivoEncendido - encendido) * (1 - Math.exp(-1.6 * dt));
    propios.uEncendido.value = encendido;
    objetivo(posicionScroll());
    const k = 1 - Math.exp(-3.2 * dt);       // el resorte que persigue al scroll
    camP.lerp(objP, k); camM.lerp(objM, k);
    puntero.sx += (puntero.x - puntero.sx) * (1 - Math.exp(-2.5 * dt));
    puntero.sy += (puntero.y - puntero.sy) * (1 - Math.exp(-2.5 * dt));
    camara.position.copy(camP);
    camara.lookAt(camM);
    camara.rotateY(-puntero.sx * 0.05);
    camara.rotateX(-puntero.sy * 0.03);
  }
  function arrancar() {
    if (corriendo || quieto || document.hidden) return;
    corriendo = true; ultimo = 0;
    requestAnimationFrame(cuadro);
  }
  function parar() { corriendo = false; }
  function unCuadro() {
    pasar(0);
    camP.copy(objP); camM.copy(objM);
    camara.position.copy(camP); camara.lookAt(camM);
    composer.render();
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? parar() : arrancar()));
  window.addEventListener("resize", () => { medir(); medirTramos(); if (!corriendo) unCuadro(); });
  window.addEventListener("load", medirTramos);
  if (window.ResizeObserver) new ResizeObserver(() => medirTramos()).observe(document.body);
  if (quieto) window.addEventListener("scroll", () => requestAnimationFrame(unCuadro), { passive: true });

  function repintarTema() {
    pal = esClaro() ? PALETAS.claro : PALETAS.oscuro;
    escena.background.set(pal.fondo);
    comunes.uNiebla.value.set(pal.niebla);
    comunes.uDensidad.value = pal.densidad;
    pal.vitral.forEach((c, i) => comunes["uVitral" + i].value.set(c));
    comunes.uFuerzaVitral.value = pal.fuerzaVitral;
    comunes.uAmbiente.value = pal.ambiente;
    propios.uPiedra.value.set(pal.piedra);
    propios.uPiedraFria.value.set(pal.piedraFria);
    propios.uOro.value.set(pal.oro);
    propios.uSuelo.value.set(pal.suelo);
    propios.uVeta.value.set(pal.sueloVeta);
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
    encender() { objetivoEncendido = 1; },
  };
}
