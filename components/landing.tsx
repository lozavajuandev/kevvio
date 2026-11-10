"use client";
import BrandMark from "./brand-mark";
import { useEffect, useRef, useState } from "react";
import LandingFilm from "./landing-film";
import LandingCapabilities from "./landing-capabilities";
import filmTimeline from "@/public/marketing/journey-timeline.json";
import {
  Building2,
  ArrowUpRight,
  ArrowRight,
  Check,
  Camera,
  UsersRound,
  Film,
  MapPin,
  BedDouble,
  Maximize,
  Link2,
  CalendarDays,
  Play,
  Pause,
  Plus,
  ChevronRight,
  Menu,
  X,
  FileText,
  Wallet,
  ClipboardList,
} from "lucide-react";
const plans = [
  {
    name: "Esencial",
    line: "Tu portafolio, bien organizado.",
    description: "Para empezar a gestionar tus inmuebles con claridad.",
    features: [
      "Inmuebles, fotos e inventario completo",
      "Contratos de arriendo y documentos",
      "Control de cobros, pagos y cartera",
    ],
    note: "Una base para tu trabajo diario.",
  },
  {
    name: "Profesional",
    line: "Cada contacto tiene futuro.",
    description: "Para acompañar oportunidades de compra y arriendo.",
    features: [
      "Todo lo de Esencial",
      "CRM de interesados, compradores y arrendatarios",
      "Oportunidades, visitas y próximos contactos",
      "Anuncios con enlace público",
      "Descripciones asistidas por IA",
    ],
    note: "Del primer interés a una relación duradera.",
  },
  {
    name: "Studio",
    line: "Tu inmueble también se mueve.",
    description: "Para crear contenido desde las fotos que ya tienes.",
    features: [
      "Todo lo de Profesional",
      "Generación de videos a partir de fotos",
      "Elección entre modelos de video",
      "Escenas ordenadas y montaje en MP4",
      "Costo estimado antes de generar",
    ],
    note: "Video por consumo. Cupos y precios por definir.",
  },
];
export default function Landing() {
  const header = useRef<HTMLElement>(null);
  const [mode, setMode] = useState("property"),
    [playing, setPlaying] = useState(false),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () =>
      element.parentElement?.style.setProperty(
        "--marketing-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="marketing-page">
      <a className="skip" href="#marketing-main">
        Saltar al contenido
      </a>
      <header className="marketing-nav" ref={header}>
        <a href="/" className="marketing-brand" aria-label="Kevvio, inicio">
          <BrandMark size={25} />
          kevvio<span>.</span>
        </a>
        <nav
          aria-label="Navegación principal"
          className={menu ? "is-open" : ""}
        >
          <a href="#control" onClick={() => setMenu(false)}>
            La aplicación
          </a>
          <a href="#recorrido" onClick={() => setMenu(false)}>
            Ver video
          </a>
          <a href="#planes" onClick={() => setMenu(false)}>
            Planes
          </a>
        </nav>
        <a href="/app" className="marketing-login">
          Entrar
          <ArrowUpRight size={16} />
        </a>
        <button
          className="icon-button marketing-menu"
          aria-label={menu ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>
      <main id="marketing-main">
        <section className="marketing-hero" id="producto">
          <div className="marketing-hero-copy">
            <h1>
              Tus inmuebles.
              <br />
              Tus personas.
              <br />
              <em>Todo conectado.</em>
            </h1>
            <p>
              Controla todo tu portafolio, coordina interesados y arrendatarios,
              y sigue cada contrato, cobro y pago. Tu trabajo como agente
              inmobiliario independiente, en un solo lugar.
            </p>
            <div className="marketing-hero-actions">
              <a className="button primary" href="/app">
                Organizar mi portafolio
                <ArrowUpRight size={19} />
              </a>
              <a className="marketing-text-link" href="#recorrido">
                <Play size={16} /> Ver video ·{" "}
                {Math.ceil(filmTimeline.duration)} s
                <ArrowRight size={16} />
              </a>
            </div>
            <span className="marketing-availability">
              En preparación para agentes como tú. Explora la versión actual.
            </span>
          </div>
          <div className="marketing-demo">
            <div className="demo-toolbar">
              <span>
                <Building2 size={16} /> Mi portafolio
              </span>
              <span>Vista de ejemplo</span>
            </div>
            <div
              className="demo-tabs"
              role="group"
              aria-label="Explorar demostración"
            >
              {[
                ["property", "Presenta", Camera],
                ["people", "Conecta", UsersRound],
                ["video", "Crea", Film],
              ].map(([id, label, Icon]) => {
                const I = Icon as typeof Camera;
                return (
                  <button
                    key={String(id)}
                    aria-pressed={mode === id}
                    onClick={() => {
                      setMode(String(id));
                      setPlaying(false);
                    }}
                  >
                    <I size={16} />
                    {String(label)}
                  </button>
                );
              })}
            </div>
            {mode === "property" ? (
              <div className="demo-property">
                <div className="demo-property-image">
                  <img
                    src="/marketing/interior.webp"
                    alt="Sala y cocina abierta de un apartamento usado como ejemplo"
                    fetchPriority="high"
                    width={1400}
                    height={934}
                  />
                  <span>Disponible para arriendo</span>
                </div>
                <div className="demo-property-details">
                  <div>
                    <span>
                      <MapPin size={13} /> Ubicación de ejemplo
                    </span>
                    <h2>Un espacio para empezar.</h2>
                    <div className="demo-specs">
                      <span>
                        <Maximize size={14} /> 68 m²
                      </span>
                      <span>
                        <BedDouble size={14} /> 2 habitaciones
                      </span>
                    </div>
                  </div>
                  <div className="demo-share">
                    <Link2 size={18} />
                    <strong>
                      Una ficha.
                      <br />
                      Un enlace.
                    </strong>
                    <span>Fotos y detalles, listos para compartir.</span>
                  </div>
                </div>
              </div>
            ) : mode === "people" ? (
              <div className="demo-people">
                <div className="demo-person-title">
                  <span>LM</span>
                  <div>
                    <h2>Laura Martínez</h2>
                    <p>Interesada en arrendar · Persona de ejemplo</p>
                  </div>
                </div>
                <div className="demo-opportunity">
                  <img src="/marketing/interior.webp" alt="" />
                  <div>
                    <small>Inmueble de interés</small>
                    <strong>Un espacio para empezar.</strong>
                    <span>Visita programada</span>
                  </div>
                </div>
                <div className="demo-person-timeline">
                  <h3>Una conversación que continúa.</h3>
                  <div>
                    <Check size={16} />
                    <p>
                      <strong>Primer contacto</strong>
                      <span>Busca un espacio con cocina abierta.</span>
                    </p>
                  </div>
                  <div>
                    <CalendarDays size={16} />
                    <p>
                      <strong>El siguiente paso</strong>
                      <span>Confirmar la visita y resolver sus dudas.</span>
                    </p>
                  </div>
                  <div>
                    <FileText size={16} />
                    <p>
                      <strong>Cuando llegue el momento</strong>
                      <span>Conecta su contrato sin crear otra persona.</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="demo-video">
                <div
                  className={
                    "demo-video-frame " + (playing ? "is-playing" : "")
                  }
                >
                  <img
                    src="/marketing/interior.webp"
                    alt="Vista ilustrativa del movimiento de una foto"
                  />
                  <button
                    aria-label={
                      playing
                        ? "Pausar vista ilustrativa"
                        : "Ver movimiento ilustrativo"
                    }
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  <span>Vista ilustrativa · no es un video generado</span>
                </div>
                <div className="demo-video-copy">
                  <h2>Tus fotos, en movimiento.</h2>
                  <p>
                    Selecciona las escenas, elige un modelo y revisa el costo
                    antes de crear.
                  </p>
                  <div>
                    <span>
                      <Camera size={15} /> Fotos
                    </span>
                    <ChevronRight size={15} />
                    <span>
                      <Film size={15} /> Escenas
                    </span>
                    <ChevronRight size={15} />
                    <span>MP4</span>
                  </div>
                </div>
              </div>
            )}
            <div className="demo-footer">
              <span>Información ilustrativa. Tu portafolio empieza vacío.</span>
              <span>kevvio.</span>
            </div>
          </div>
        </section>
        <LandingFilm />
        <section className="marketing-manifesto" id="personas">
          <h2>
            Gestionas inmuebles.
            <br />
            <span>Acompañas personas.</span>
          </h2>
          <p>
            Un interesado hoy puede ser tu próximo comprador o arrendatario.
            Mantén sus conversaciones, visitas y oportunidades conectadas con
            los inmuebles. Cuando avance la relación, su historia sigue ahí.
          </p>
        </section>
        <LandingCapabilities />
        <section className="marketing-studio">
          <div>
            <h2>
              El potencial ya está
              <br />
              en tus fotos.
              <br />
              <em>Ponlo en movimiento.</em>
            </h2>
            <p>
              Studio reúne tus escenas en un recorrido que puedes descargar y
              compartir. Tú eliges las fotos, el modelo y el orden; la
              generación empieza cuando lo decides.
            </p>
            <a className="button primary" href="#planes">
              Descubrir Studio
              <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="studio-story">
            <div className="studio-story-title">
              <Film size={18} />
              <span>Del inmueble a tu próximo contenido</span>
            </div>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>Elige tus mejores ángulos</strong>
                  <p>
                    Hasta seis fotos por proyecto, en el orden que prefieras.
                  </p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Crea con un costo a la vista</strong>
                  <p>
                    Seedance, Grok o Kling. Compara alternativas antes de
                    generar.
                  </p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Revisa, une y descarga</strong>
                  <p>
                    Comprueba que el video represente el espacio y prepara tu
                    MP4.
                  </p>
                </div>
              </li>
            </ol>
            <p className="studio-story-note">
              La IA puede alterar detalles. Siempre revisas el resultado antes
              de compartirlo.
            </p>
          </div>
        </section>
        <section className="marketing-plans" id="planes">
          <div className="marketing-section-heading">
            <h2>
              Tu forma de trabajar.
              <br />
              Tu próximo plan.
            </h2>
            <p>
              Tres propuestas para acompañar tu crecimiento como agente
              independiente.
            </p>
          </div>
          <div className="marketing-plan-grid">
            {plans.map((p, i) => (
              <article
                className={
                  i === 2 ? "marketing-plan studio-plan" : "marketing-plan"
                }
                key={p.name}
              >
                <h3>{p.name}</h3>
                <strong>{p.line}</strong>
                <p>{p.description}</p>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={16} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div>
                  <small>{p.note}</small>
                  <a
                    href="/app"
                    className={i === 2 ? "button primary" : "button"}
                  >
                    Explorar la aplicación
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <p className="marketing-plan-notice">
            Planes y precios en preparación. La versión actual permite explorar
            las funciones disponibles; todavía no se venden suscripciones. Las
            funciones de IA requieren activar los servicios correspondientes y
            consumen saldo al generar.
          </p>
        </section>
        <section className="marketing-faq">
          <div>
            <h2>
              Las dudas también
              <br />
              tienen su lugar.
            </h2>
            <p>Lo esencial para empezar a conocer Kevvio.</p>
          </div>
          <div>
            {[
              [
                "¿Kevvio está pensado para un agente que trabaja solo?",
                "Sí. La experiencia está diseñada alrededor de tu portafolio y tus relaciones: presentar inmuebles, dar seguimiento y gestionar arriendos desde un mismo espacio.",
              ],
              [
                "¿Puedo gestionar compradores y personas interesadas en arrendar?",
                "Sí. Personas reúne los contactos y sus oportunidades de compra o arriendo. Puedes registrar etapas, conversaciones y próximos contactos, y conservar su historial cuando se conviertan en clientes.",
              ],
              [
                "¿Puedo controlar pagos y saldos pendientes?",
                "Sí. Puedes crear contratos de arriendo, generar cobros mensuales, registrar pagos y abonos parciales, consultar saldos pendientes y exportar la cartera. Los registros permanecen vinculados al inmueble y al arrendatario.",
              ],
              [
                "¿Qué tan detallado puede ser el inventario?",
                "Puedes organizarlo por espacios y crear los elementos que necesites: tomas, interruptores, lavabos, inodoros, clósets, muebles y otros. Cada elemento admite cantidades, estado, características, notas y fotos.",
              ],
              [
                "¿Qué incluye la ficha de un inmueble?",
                "Datos, fotos, inventario por espacios y elementos, documentos, contratos, anuncio público y proyectos de video. Las fotos y el inventario viven dentro del inmueble.",
              ],
              [
                "¿Los anuncios se publican automáticamente?",
                "No. Creas un borrador, eliges la información y las fotos que quieres mostrar y publicas cuando esté listo. Puedes desactivar el enlace. Para compartirlo fuera de este equipo, la aplicación debe estar alojada en internet.",
              ],
              [
                "¿Los videos son ilimitados?",
                "No. La generación consume saldo del proveedor y cada modelo tiene un costo diferente. Se muestra una estimación antes de enviar las fotos. Los cupos incluidos en Studio se definirán antes del lanzamiento comercial.",
              ],
              [
                "¿Qué sucede con mis datos y fotos?",
                "La versión actual guarda tu portafolio y archivos en la instalación del propietario. Los enlaces públicos solo exponen la información elegida para el anuncio. Al usar la IA, las fotos seleccionadas se envían a OpenAI para textos o a Kie.ai para videos. Ese envío ocurre cuando solicitas la generación.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="marketing-final">
          <h2>
            Más espacio para
            <br />
            tu próxima conexión.
          </h2>
          <a className="button primary" href="/app">
            Entrar a Kevvio
            <ArrowUpRight size={22} />
          </a>
        </section>
      </main>
      <footer className="marketing-footer">
        <a href="/" className="marketing-brand">
          <BrandMark size={23} />
          kevvio<span>.</span>
        </a>
        <p>Hecho para agentes inmobiliarios independientes.</p>
        <span>
          Fotografía ilustrativa de{" "}
          <a
            href="https://unsplash.com/photos/VUfe8alBlUo"
            target="_blank"
            rel="noreferrer"
          >
            Alex Tyson · Unsplash
          </a>
          .
        </span>
      </footer>
    </div>
  );
}
