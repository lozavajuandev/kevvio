"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  Building2,
  UsersRound,
  Wallet,
  ClipboardList,
  ArrowUpRight,
  Check,
  ArrowRight,
  FileText,
  CalendarDays,
  MapPin,
  Search,
} from "lucide-react";
const capabilities = [
  {
    id: "portfolio",
    label: "Todos tus inmuebles",
    icon: Building2,
    title: "Un portafolio completo. Una vista clara.",
    description:
      "Centraliza tus apartamentos, casas, oficinas, locales, bodegas y lotes. Encuentra cada inmueble y abre su ficha con toda la información que necesitas para gestionarlo.",
    items: [
      "Datos, ubicación, características y estado del inmueble.",
      "Fotos y portada para presentar cada espacio.",
      "Anuncio con información seleccionada y enlace público.",
      "Descripción asistida por IA y proyectos de video en Studio.",
    ],
    action: "Explorar inmuebles",
    href: "/app",
  },
  {
    id: "people",
    label: "Personas y arrendatarios",
    icon: UsersRound,
    title: "Antes de un contrato, hay una persona.",
    description:
      "Gestiona interesados en comprar o arrendar, compradores y arrendatarios actuales o anteriores. Conserva el contexto de la relación, incluso cuando cambien sus necesidades.",
    items: [
      "Una ficha con datos de contacto, preferencias y notas.",
      "Oportunidades vinculadas a uno o varios inmuebles.",
      "Etapas desde el primer contacto hasta el cierre.",
      "Historial de conversaciones, visitas y próximo seguimiento.",
    ],
    action: "Conocer el CRM",
    href: "/app?vista=tenants",
  },
  {
    id: "rentals",
    label: "Arriendos, cobros y pagos",
    icon: Wallet,
    title: "Acompaña el arriendo de principio a fin.",
    description:
      "Vincula a cada arrendatario con su inmueble y contrato. Revisa las vigencias, el canon y la administración; registra los pagos y entiende qué queda pendiente por cobrar.",
    items: [
      "Contratos con fechas, canon y condiciones del arriendo.",
      "Cobros mensuales y fecha de vencimiento.",
      "Pagos completos o abonos parciales, con su referencia.",
      "Cartera, historial de ingresos y exportación de datos.",
    ],
    action: "Ver gestión de arriendos",
    href: "/app?vista=leases",
  },
  {
    id: "details",
    label: "Inventario y documentos",
    icon: ClipboardList,
    title: "Hasta el detalle que nadie quiere olvidar.",
    description:
      "Registra lo que hay dentro de cada espacio y guarda sus documentos junto al inmueble. Una ficha útil tanto para la gestión diaria como para consultar el historial.",
    items: [
      "Espacios y elementos de inventario personalizados.",
      "Tomas, interruptores, lavabos, inodoros, clósets y más.",
      "Cantidades, estado, materiales, notas y fotografías.",
      "Contratos, escrituras y soportes vinculados al inmueble.",
    ],
    action: "Organizar mis documentos",
    href: "/app?vista=documents",
  },
];
function PortfolioPreview() {
  return (
    <div className="cap-preview cap-portfolio">
      <header>
        <Building2 size={18} />
        <strong>Mi portafolio</strong>
        <span>Ejemplo</span>
      </header>
      <div className="cap-search">
        <Search size={14} />
        <span>Un nombre, una ciudad, un espacio…</span>
      </div>
      {[
        ["Apartamento Cedritos", "Apartamento · Bogotá", "Disponible"],
        ["Casa en la ciudad", "Casa · Bogotá", "Arrendado"],
        ["Oficina Centro", "Oficina · Medellín", "Disponible"],
      ].map(([name, location, state], i) => (
        <div className="cap-property-row" key={name}>
          <img
            src="/marketing/interior.webp"
            alt=""
            loading="lazy"
            style={{
              objectPosition:
                i === 1 ? "80% center" : i === 2 ? "20% center" : "center",
            }}
          />
          <div>
            <strong>{name}</strong>
            <small>
              <MapPin size={11} />
              {location}
            </small>
          </div>
          <span
            className={
              state === "Arrendado" ? "cap-status rented" : "cap-status"
            }
          >
            {state}
          </span>
        </div>
      ))}
      <footer>
        <span>Fotos</span>
        <span>Inventario</span>
        <span>Contratos</span>
        <span>Documentos</span>
      </footer>
    </div>
  );
}
function PeoplePreview() {
  return (
    <div className="cap-preview cap-people">
      <header>
        <UsersRound size={18} />
        <strong>Personas</strong>
        <span>Ejemplo</span>
      </header>
      <div className="cap-contact">
        <span>LM</span>
        <div>
          <h4>Laura Martínez</h4>
          <p>Interesada en arrendar</p>
        </div>
      </div>
      <div className="cap-stages">
        {["Nuevo", "Contactado", "Visita", "Propuesta"].map((s, i) => (
          <span
            className={i === 2 ? "is-current" : i < 2 ? "is-done" : ""}
            key={s}
          >
            {i < 2 ? <Check size={12} /> : null}
            {s}
          </span>
        ))}
      </div>
      <div className="cap-person-property">
        <img src="/marketing/interior.webp" alt="" loading="lazy" />
        <div>
          <small>Inmueble de interés</small>
          <strong>Apartamento Cedritos</strong>
          <span>Prefiere cocina abierta y buena luz.</span>
        </div>
      </div>
      <div className="cap-followup">
        <CalendarDays size={22} />
        <div>
          <strong>El siguiente paso está claro.</strong>
          <span>Confirmar visita y resolver sus dudas.</span>
        </div>
      </div>
      <p className="cap-continuity">
        Interesado
        <ArrowRight size={13} />
        Cliente
        <ArrowRight size={13} />
        Una misma historia
      </p>
    </div>
  );
}
function RentalPreview() {
  return (
    <div className="cap-preview cap-rentals">
      <header>
        <Wallet size={18} />
        <strong>Cobros del mes</strong>
        <span>Ejemplo · COP</span>
      </header>
      <div className="cap-lease-title">
        <span>Contrato de arriendo</span>
        <h4>Apartamento Cedritos</h4>
        <p>Laura Martínez · Canon mensual $ 1.800.000</p>
      </div>
      <div className="cap-ledger">
        <div>
          <span>Concepto</span>
          <span>Valor</span>
          <span>Estado</span>
        </div>
        <div>
          <strong>Canon de noviembre</strong>
          <span>$ 1.800.000</span>
          <span className="cap-status rented">Pagado</span>
        </div>
        <div>
          <strong>Administración</strong>
          <span>$ 250.000</span>
          <span className="cap-status pending">Pendiente</span>
        </div>
      </div>
      <div className="cap-payment">
        <span>
          <Check size={15} /> Pago registrado
        </span>
        <strong>$ 1.800.000</strong>
        <small>Transferencia · referencia y soporte vinculados</small>
      </div>
    </div>
  );
}
function DetailPreview() {
  return (
    <div className="cap-preview cap-details">
      <header>
        <ClipboardList size={18} />
        <strong>Dentro del inmueble</strong>
        <span>Ejemplo</span>
      </header>
      <div className="cap-inventory-heading">
        <h4>Cada espacio cuenta.</h4>
        <span>Cocina y baños</span>
      </div>
      {[
        ["Tomas e interruptores", "12 unidades"],
        ["Lavabos e inodoros", "4 unidades"],
        ["Clósets y mobiliario", "6 unidades"],
      ].map(([name, n]) => (
        <div className="cap-inventory-row" key={name}>
          <span>{name}</span>
          <strong>{n}</strong>
          <Check size={15} />
        </div>
      ))}
      <div className="cap-documents">
        <span>Documentación del inmueble</span>
        {["Contrato de arriendo.pdf", "Inventario de entrega.pdf"].map(
          (name) => (
            <div key={name}>
              <FileText size={19} />
              <strong>{name}</strong>
              <span>PDF</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
export default function LandingCapabilities() {
  const [selected, setSelected] = useState(0),
    tabs = useRef<(HTMLButtonElement | null)[]>([]),
    c = capabilities[selected];
  function key(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (i + 1) % capabilities.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i + capabilities.length - 1) % capabilities.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = capabilities.length - 1;
    else return;
    e.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return (
    <section
      className="marketing-capabilities"
      id="control"
      aria-labelledby="capabilities-title"
    >
      <div className="capability-heading">
        <h2 id="capabilities-title">
          Control de todo.
          <br />
          <span>Contexto para cada decisión.</span>
        </h2>
        <p>
          Desde la vista general de tu portafolio hasta el último detalle del
          inmueble. Explora lo que puedes gestionar en Kevvio.
        </p>
      </div>
      <div
        className="capability-tabs"
        role="tablist"
        aria-label="Módulos de la aplicación"
      >
        {capabilities.map((c, i) => (
          <button
            key={c.id}
            id={"cap-tab-" + c.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            aria-selected={selected === i}
            aria-controls={"cap-panel-" + c.id}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => key(e, i)}
          >
            <c.icon size={19} />
            <span>{c.label}</span>
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <div
        className="capability-panel"
        id={"cap-panel-" + c.id}
        key={c.id}
        role="tabpanel"
        aria-labelledby={"cap-tab-" + c.id}
        tabIndex={0}
      >
        <div className="capability-copy">
          <h3>{c.title}</h3>
          <p>{c.description}</p>
          <ul>
            {c.items.map((item) => (
              <li key={item}>
                <Check size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a href={c.href} className="marketing-text-link">
            {c.action}
            <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="capability-example">
          {selected === 0 ? (
            <PortfolioPreview />
          ) : selected === 1 ? (
            <PeoplePreview />
          ) : selected === 2 ? (
            <RentalPreview />
          ) : (
            <DetailPreview />
          )}
          <p>Vista ilustrativa. Tu información permanece en tu portafolio.</p>
        </div>
      </div>
    </section>
  );
}
