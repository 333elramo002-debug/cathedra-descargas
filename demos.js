/* Las demos de la página: la interfaz de Cathedra con los datos de una materia de ejemplo
   (Biología Celular, docente inventada), sin servidor y sin pedir nada afuera.

   · el cronograma: se arrastra (o se toca) el archivo y se arma la ficha de la materia;
   · la clase cruda contra la leída, y la línea de tiempo que se frota;
   · tres preguntas con su respuesta, la cita con la clase y el minuto, y la voz del navegador;
   · dos consignas del simulacro que se corrigen al instante, con la nota.

   Todo anda con teclado; con «reducir movimiento» las cosas aparecen ya puestas. Los textos
   de la interfaz son los de la aplicación. */

const MATERIA = {
  nombre: "Biología Celular", docente: "Dra. Laura Méndez", dias: "Martes 14:00–18:00",
  clases: [
    ["04/08", "clase", "La célula como unidad · Procariotas y eucariotas"],
    ["11/08", "clase", "Membrana plasmática · Modelo de mosaico fluido"],
    ["18/08", "clase", "Transporte a través de membrana · Ósmosis y difusión"],
    ["25/08", "clase", "Mitocondria · Respiración celular"],
    ["01/09", "clase", "Ciclo celular · Mitosis"],
    ["08/09", "clase", "Meiosis · Variabilidad genética"],
    ["13/10", "entrega", "TP1 Ósmosis en células vegetales"],
    ["20/10", "parcial", "Primer parcial (clases 1 a 6)"],
  ],
};

/* la clase 4, como se dijo y como queda leída (con su minuto) */
const CLASE = [
  { t: 200, dice: "Bueno, eh… la mitocondria, ¿se acuerdan?, tiene doble membrana y tiene su propio ADN, y eso apoya la teoría endosimbiótica.",
    bloque: { titulo: "Mitocondria y endosimbiosis", texto: "Doble membrana y ADN propio: la base de la teoría endosimbiótica." } },
  { t: 1300, dice: "La respiración celular tiene tres etapas, ¿sí? Glucólisis, ciclo de Krebs y la cadena de transporte de electrones. La glucólisis pasa en el citoplasma y no necesita oxígeno.",
    bloque: { titulo: "Etapas de la respiración", texto: "Glucólisis (citoplasma, sin oxígeno), ciclo de Krebs y cadena de transporte de electrones." } },
  { t: 2500, dice: "Y les adelanto: el parcial va a tener un verdadero o falso, dos minicasos y una pregunta a desarrollar, cada una vale veinticinco puntos.",
    bloque: { titulo: "Formato del parcial", texto: "Un verdadero o falso, dos minicasos y una a desarrollar; 25 puntos cada una.", indole: "examen" } },
  { t: 3100, dice: "Esto entra seguro, eh: el balance de ATP de la respiración y dónde ocurre cada etapa. Anótenlo.",
    bloque: { titulo: "Balance de ATP", texto: "Cuánto ATP rinde cada etapa y dónde ocurre.", toma: true } },
];
const DURA = 3360;

// la frase como queda en la cita: sin las muletillas de la clase hablada
const limpiar = (s) => s.replace(/^(Bueno, eh… |Y les adelanto: )/, "").replace(/, eh:/, ":").replace(/, ¿sí\? /, ": ").replace(/, ¿se acuerdan\?,/, "").replace(/: ([A-ZÁÉÍÓÚ])/g, (m, c) => ": " + c.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
const reloj = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function montar(raiz, { quieto = false } = {}) {
  const calma = quieto || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  raiz.querySelectorAll("[data-demo]").forEach((d) => {
    const tipo = d.dataset.demo;
    if (tipo === "crono") cronograma(d, calma);
    else if (tipo === "lee") lee(d);
    else if (tipo === "preg") preguntar(d, calma);
    else if (tipo === "sim") simulacro(d);
  });
}

/* ══════════ el cronograma ══════════ */
function cronograma(d, calma) {
  const archivo = d.querySelector("[data-arrastrable]");
  const zona = d.querySelector("[data-zona]");
  const ficha = d.querySelector("[data-ficha]");
  let hecho = false;
  const armar = () => {
    if (hecho) return; hecho = true;
    archivo.hidden = true;
    zona.querySelector(".dc-zona-tit").textContent = "Leyendo las fechas, los temas y las evaluaciones…";
    zona.querySelector(".dc-zona-sub").textContent = "cronograma_biologia.pdf";
    ficha.hidden = false;
    ficha.innerHTML = "";
    ficha.append(el("h4", null, MATERIA.nombre), el("p", "dc-meta", `${MATERIA.dias} · ${MATERIA.docente} · Leído de cronograma_biologia.pdf`));
    const ul = el("ul", "dc-clases");
    MATERIA.clases.forEach(([f, tipo, tema], i) => {
      const li = el("li", tipo === "clase" ? "" : "parcial");
      li.append(el("span", "dc-fecha", f), el("span", "dc-tipo", tipo), el("span", null, tema));
      ul.append(li);
      setTimeout(() => li.classList.add("llego"), calma ? 0 : 260 + i * 140);
    });
    ficha.append(ul);
    const crear = el("button", "dc-crear", "Crear la materia");
    crear.type = "button";
    crear.addEventListener("click", () => { crear.textContent = "Listo: Biología Celular, con sus 8 fechas"; crear.disabled = true; });
    setTimeout(() => {
      ficha.append(crear);
      zona.querySelector(".dc-zona-tit").textContent = "1 materia lista";
      zona.querySelector(".dc-zona-sub").textContent = "Soltá otro para sumar más";
    }, calma ? 0 : 260 + MATERIA.clases.length * 140);
  };
  archivo.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", "cronograma"); e.dataTransfer.effectAllowed = "copy"; });
  zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("encima"); armar(); });
  // con el dedo o con el teclado: tocar el archivo es soltarlo
  archivo.addEventListener("click", armar);
}

/* ══════════ la lee: cruda o leída, y la línea de tiempo ══════════ */
function lee(d) {
  const cuerpo = d.querySelector("[data-cuerpo]");
  const botones = d.querySelectorAll("[data-ver]");
  const pintar = (modo) => {
    botones.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ver === modo)));
    cuerpo.innerHTML = "";
    if (modo === "cruda") {
      const caja = el("div", "dl-cruda");
      CLASE.forEach((c) => {
        const p = el("p");
        const s = el("span", "dice", c.dice);
        s.tabIndex = 0;
        if (c.bloque.toma || c.bloque.indole) {
          s.title = c.bloque.toma ? "Dijo que lo toma" : "Sobre el examen";
          s.addEventListener("mouseenter", () => marcar(s, c));
          s.addEventListener("focus", () => marcar(s, c));
        }
        p.append(el("span", "t", reloj(c.t)), s);
        caja.append(p);
      });
      cuerpo.append(caja);
    } else {
      CLASE.forEach((c) => {
        const b = el("div", "dl-bloque" + (c.bloque.indole ? " examen" : ""));
        if (c.bloque.toma) b.append(el("span", "insignia", "Dijo que lo toma"));
        if (c.bloque.indole) b.append(el("span", "insignia suave", "Sobre el examen · no entra como tema"));
        b.append(el("h4", null, c.bloque.titulo), el("p", null, c.bloque.texto));
        const cita = el("p", "cita", `«${limpiar(c.dice)}»`);
        cita.append(el("small", null, `Clase 4 · ${reloj(c.t)}`));
        b.append(cita);
        cuerpo.append(b);
      });
    }
  };
  const marcar = (s, c) => {
    if (s.nextSibling) return;
    s.after(document.createTextNode(" "), el("span", "insignia", c.bloque.toma ? "Dijo que lo toma" : "Sobre el examen"));
  };
  botones.forEach((b) => b.addEventListener("click", () => pintar(b.dataset.ver)));
  pintar("cruda");

  // la línea de tiempo: frotás y ves qué se decía en ese minuto y en qué bloque de la guía quedó
  const rango = d.querySelector("[data-tiempo]");
  const marcas = d.querySelector("[data-marcas]");
  const par = d.querySelector("[data-par]");
  CLASE.forEach((c) => { const i = el("i", c.bloque.indole || c.bloque.toma ? "examen" : ""); i.style.left = (c.t / DURA * 100) + "%"; marcas.append(i); });
  const izq = el("div"), der = el("div");
  par.append(izq, der);
  const mover = () => {
    const t = +rango.value;
    let c = CLASE[0];
    for (const x of CLASE) if (x.t <= t + 120) c = x;
    rango.setAttribute("aria-valuetext", `minuto ${reloj(t)}: ${c.bloque.titulo}`);
    izq.innerHTML = ""; der.innerHTML = "";
    izq.append(el("p", "demo-rotulo", `Lo que se dijo · ${reloj(t)}`), el("span", null, c.dice));
    der.append(el("p", "demo-rotulo", "En la guía"));
    if (c.bloque.toma) der.append(el("span", "insignia", "Dijo que lo toma"));
    if (c.bloque.indole) der.append(el("span", "insignia suave", "Sobre el examen"));
    der.append(el("b", null, c.bloque.titulo), el("br"), el("span", null, c.bloque.texto));
  };
  rango.addEventListener("input", mover);
  mover();
}

/* ══════════ preguntar ══════════ */
const PREGUNTAS = [
  { q: "¿Dónde pasa la glucólisis?",
    r: "En el citoplasma, y no necesita oxígeno: rinde 2 ATP por glucosa. Después, en la mitocondria, vienen el ciclo de Krebs y la cadena de transporte de electrones.",
    cita: CLASE[1] },
  { q: "¿Qué entra en el parcial?",
    r: "La profesora dijo que entra seguro el balance de ATP de la respiración y dónde ocurre cada etapa. Y anunció el formato: un verdadero o falso, dos minicasos y una a desarrollar, de 25 puntos cada una.",
    cita: CLASE[3] },
  { q: "Dame un ejemplo de ósmosis",
    r: "En la clase 3 la explicó como el paso del agua a través de la membrana, del lado con menos solutos al lado con más.",
    propio: "Una lechuga en agua con sal se pone mustia: el agua sale de sus células hacia el lado con más sal.",
    cita: { t: 1830, dice: "La ósmosis es el pasaje de agua a través de la membrana, desde donde hay menos solutos hacia donde hay más.", clase: 3 } },
];
function preguntar(d, calma) {
  const hilo = d.querySelector("[data-hilo]");
  const chips = d.querySelectorAll("[data-p]");
  const hayVoz = "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
  let escribiendo = 0;
  const decir = (texto, boton) => {
    if (!hayVoz) return;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); boton.setAttribute("aria-pressed", "false"); return; }
    const u = new SpeechSynthesisUtterance(texto);
    const voces = speechSynthesis.getVoices();
    u.voice = voces.find((v) => /es[-_]AR/i.test(v.lang)) || voces.find((v) => /^es/i.test(v.lang)) || null;
    u.lang = u.voice ? u.voice.lang : "es-AR";
    u.rate = 1.02;
    u.onend = u.onerror = () => boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("aria-pressed", "true");
    speechSynthesis.speak(u);
  };
  const responder = (i) => {
    const P = PREGUNTAS[i];
    chips.forEach((c) => c.setAttribute("aria-pressed", String(+c.dataset.p === i)));
    if (hayVoz) speechSynthesis.cancel();
    clearInterval(escribiendo);
    hilo.innerHTML = "";
    hilo.append(el("div", "dp-vos", P.q));
    const resp = el("div", "dp-resp");
    const p = el("p");
    resp.append(p);
    hilo.append(resp);
    const final = () => {
      p.classList.remove("cursor-escribe");
      p.textContent = P.r;
      if (P.propio) {
        const pr = el("div", "dp-propio");
        pr.append(el("span", "rot", "Esto no lo dijo la profe: es de Voz 1"), el("span", null, P.propio));
        resp.append(pr);
      }
      const c = P.cita;
      const caja = el("div", "dp-cita");
      caja.append(el("p", "cab", "Cómo lo dijo la profesora"), el("blockquote", null, `«${limpiar(c.dice)}»`));
      const pie = el("div", "pie");
      pie.append(el("span", null, `Clase ${c.clase || 4}`), el("span", "ir", `Leer la clase desde el minuto ${reloj(c.t)}`));
      caja.append(pie);
      resp.append(caja);
      if (hayVoz) {
        const v = el("button", "dp-voz", "Escuchar la respuesta");
        v.type = "button"; v.setAttribute("aria-pressed", "false");
        v.addEventListener("click", () => decir(P.r + (P.propio ? " Esto no lo dijo la profe, pero: " + P.propio : ""), v));
        resp.append(v);
      }
    };
    if (calma) return final();
    let n = 0;
    p.classList.add("cursor-escribe");
    escribiendo = setInterval(() => {
      n += 3;
      p.textContent = P.r.slice(0, n);
      if (n >= P.r.length) { clearInterval(escribiendo); final(); }
    }, 18);
  };
  chips.forEach((c) => c.addEventListener("click", () => responder(+c.dataset.p)));
}

/* ══════════ el simulacro ══════════ */
const tiene = (texto, palabras) => palabras.some((p) => texto.includes(p));
const sinTildes = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function simulacro(f) {
  const corrVf = f.querySelector('[data-corr="vf"]');
  const corrCaso = f.querySelector('[data-corr="caso"]');
  const nota = f.querySelector("[data-nota]");
  const caja = (destino, puntos, total, estado, falto, sale, minuto) => {
    destino.innerHTML = "";
    const res = el("div", "res");
    res.append(el("span", null, estado), el("span", null, `${puntos} de ${total} pts`));
    destino.append(res);
    if (falto.length) {
      const p = el("p", "falto");
      p.append(el("b", null, "No dijiste: "), document.createTextNode(falto.join(" · ")));
      p.style.margin = "0";
      destino.append(p);
    }
    const s = el("p", "sale", `De dónde sale: «${sale}»`);
    s.append(el("small", null, ` · ${minuto}`));
    s.style.margin = "6px 0 0";
    destino.append(s);
  };
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    // verdadero o falso con justificación: es falso (en una solución hipertónica la célula pierde agua y se arruga)
    const vf = (f.querySelector('input[name="vf"]:checked') || {}).value;
    const just = sinTildes(f.just.value);
    let pv = 0; const faltaV = [];
    if (vf === "f") pv += 15; else faltaV.push("es falso");
    if (tiene(just, ["pierde agua", "sale agua", "sale el agua", "pierde el agua", "se arruga", "crenac", "se encoge", "se achica", "deshidrat"])) pv += 10;
    else faltaV.push("en una solución hipertónica la célula pierde agua y se arruga");
    if (vf !== "f") pv = 0;
    const estV = !vf && !just.trim() ? "En blanco" : pv >= 25 ? "Bien" : pv > 0 ? "A medias" : "Mal";
    caja(corrVf, pv, 25, estV, faltaV, "Ojo con la ósmosis en el parcial: siempre pongo un verdadero o falso sobre ósmosis, con justificación.", "Clase 3 · 30:30");
    // minicaso: sin oxígeno sigue la glucólisis, aparece la fermentación láctica y rinde 2 ATP por glucosa
    const caso = sinTildes(f.caso.value);
    const claves = [
      [["glucolisis"], "la glucólisis sigue (no necesita oxígeno)"],
      [["fermentacion", "lactic", "lactato", "acido lactico"], "fermentación láctica"],
      [["2 atp", "dos atp", "2atp"], "2 ATP por glucosa"],
      [["krebs", "cadena", "transporte de electrones"], "el ciclo de Krebs y la cadena se frenan sin oxígeno"],
    ];
    let pc = 0; const faltaC = [];
    claves.forEach(([pal, dicho]) => { if (tiene(caso, pal)) pc += 6.25; else faltaC.push(dicho); });
    pc = Math.round(pc);
    const estC = !caso.trim() ? "En blanco" : pc >= 25 ? "Bien" : pc > 0 ? "A medias" : "Mal";
    caja(corrCaso, pc, 25, estC, faltaC, "Esto entra seguro: el balance de ATP de la respiración y dónde ocurre cada etapa.", "Clase 4 · 51:40");
    // la nota, sobre 100, como en la aplicación
    const total = Math.round((pv + pc) * 2);
    nota.innerHTML = "";
    nota.append(el("b", null, String(total)), el("small", null, "de 100"),
      el("span", null, total >= 80 ? "Lo tenés" : total >= 60 ? "Aprobado, con agujeros" : "Todavía no"));
  });
}
