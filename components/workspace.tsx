"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Building2,
  ClipboardList,
  Camera,
  LayoutDashboard,
  UsersRound,
  FileText,
  FolderOpen,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Search,
  Download,
  LogOut,
  X,
  Check,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Menu,
  MapPin,
  MoreHorizontal,
  LockKeyhole,
  LoaderCircle,
  Pencil,
  Archive,
  Paperclip,
  CalendarDays,
  ReceiptText,
  ShieldCheck,
  RefreshCw,
  Banknote,
  SquareArrowOutUpRight,
} from "lucide-react";
import type {
  Snapshot,
  Property,
  Lease,
  Charge,
  Tenant,
  Payment,
  Document,
} from "@/lib/types";
import PropertyInventory from "./property-inventory";
import { api } from "@/lib/client-api";
const money = (v: string | number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v));
const date = (v: string) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(v.slice(0, 10) + "T12:00:00Z"));
const monthName = (v: string) =>
  new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(v.slice(0, 7) + "-01T12:00:00Z"));
const localToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
type View =
  | "overview"
  | "properties"
  | "inventory"
  | "tenants"
  | "leases"
  | "charges"
  | "payments"
  | "documents";
type Panel = {
  type:
    | "property"
    | "tenant"
    | "lease"
    | "payment"
    | "document"
    | "detail"
    | "end"
    | "void"
    | "archive";
  item?: Property | Tenant | Lease | Charge | Payment;
  propertyId?: string;
};
const nav = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "properties", label: "Inmuebles", icon: Building2 },
  { id: "inventory", label: "Fotos e inventario", icon: ClipboardList },
  { id: "tenants", label: "Arrendatarios", icon: UsersRound },
  { id: "leases", label: "Contratos", icon: FileText },
  { id: "charges", label: "Cobros", icon: Wallet },
  { id: "payments", label: "Pagos", icon: ReceiptText },
  { id: "documents", label: "Documentos", icon: FolderOpen },
] as const;
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={"badge " + tone}>
      <span />
      {children}
    </span>
  );
}
function Empty({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
}: {
  icon?: typeof FolderOpen;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <label className={"field " + (wide ? "wide" : "")}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Submit({
  busy,
  label = "Guardar",
}: {
  busy: boolean;
  label?: string;
}) {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{" "}
      {busy ? "Guardando…" : label}
    </button>
  );
}
export default function Workspace() {
  const [session, setSession] = useState<{
    user: { id: string; name: string } | null;
    setupRequired: boolean;
  } | null>(null);
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("overview"),
    [panel, setPanel] = useState<Panel | null>(null),
    [mobileNav, setMobileNav] = useState(false);
  const [inventoryPropertyId, setInventoryPropertyId] = useState("");
  const [search, setSearch] = useState(""),
    [month, setMonth] = useState(localToday().slice(0, 7)),
    [filter, setFilter] = useState("all"),
    [showArchived, setShowArchived] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    try {
      const d = await api("snapshot");
      setData(d);
      return d;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);
  useEffect(() => {
    api("session")
      .then(async (s) => {
        setSession(s);
        if (s.user) await refresh();
      })
      .catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!panel) return;
    lastFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const timeout = setTimeout(
      () =>
        dialog.current
          ?.querySelector<HTMLElement>("button,input,select")
          ?.focus(),
      0,
    );
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setPanel(null);
      if (event.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      lastFocus.current?.focus();
    };
  }, [panel, busy]);
  function go(v: View) {
    setView(v);
    setSearch("");
    setFilter("all");
    setMobileNav(false);
  }
  function open(p: Panel) {
    setError("");
    setPanel(p);
  }
  async function mutate(
    path: string,
    method: string,
    values: unknown,
    message: string,
  ) {
    setBusy(true);
    setError("");
    try {
      const result = await api(path, method, values);
      await refresh();
      setPanel(null);
      setToast(message);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function auth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api(
        session?.setupRequired ? "setup" : "login",
        "POST",
        Object.fromEntries(f),
      );
      setSession({ user: result.user, setupRequired: false });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <div className="loading-screen">
        <Building2 size={30} />
        <p>{error || "Abriendo tu portafolio…"}</p>
        {error ? (
          <button className="button" onClick={() => location.reload()}>
            Reintentar
          </button>
        ) : (
          <LoaderCircle className="spin" size={20} />
        )}
      </div>
    );
  if (!session.user)
    return (
      <main className="auth-page">
        <div className="auth-story">
          <a className="brand" href="/">
            <span className="brand-mark">
              <Building2 size={23} />
            </span>
            raíz<span className="brand-dot">.</span>
          </a>
          <div>
            <h1>
              Un lugar para
              <br />
              todo lo que
              <br />
              <em>construyes.</em>
            </h1>
            <p>
              Tus inmuebles, arriendos y documentos.
              <br />
              En orden. Bajo tu control.
            </p>
          </div>
          <span className="auth-foot">
            <ShieldCheck size={17} /> Tu información se guarda en este equipo.
          </span>
        </div>
        <div className="auth-form-wrap">
          <form onSubmit={auth} className="auth-form">
            <span className="auth-symbol">
              <LockKeyhole size={25} />
            </span>
            <h2>
              {session.setupRequired
                ? "Tu portafolio empieza aquí"
                : "Bienvenido a casa"}
            </h2>
            <p>
              {session.setupRequired
                ? "Crea tu acceso personal. Después podrás ingresar tu primer inmueble."
                : "Ingresa tu contraseña para abrir tu portafolio."}
            </p>
            {session.setupRequired && (
              <Field label="Tu nombre">
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="¿Cómo te llamas?"
                  required
                  maxLength={100}
                />
              </Field>
            )}
            <Field
              label={
                session.setupRequired ? "Crea una contraseña" : "Contraseña"
              }
              hint={
                session.setupRequired
                  ? "Usa al menos 10 caracteres."
                  : undefined
              }
            >
              <input
                name="password"
                type="password"
                autoComplete={
                  session.setupRequired ? "new-password" : "current-password"
                }
                minLength={session.setupRequired ? 10 : undefined}
                maxLength={200}
                required
                placeholder={
                  session.setupRequired
                    ? "Mínimo 10 caracteres"
                    : "Tu contraseña"
                }
              />
            </Field>
            {error && (
              <div role="alert" className="error">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
            <Submit
              busy={busy}
              label={
                session.setupRequired
                  ? "Crear mi portafolio"
                  : "Entrar al portafolio"
              }
            />
            <div className="auth-note">
              <LockKeyhole size={13} /> Acceso personal · Sin datos de
              demostración
            </div>
          </form>
        </div>
      </main>
    );
  if (!data)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>{error || "Cargando tus inmuebles…"}</p>
        {error && (
          <button className="button" onClick={() => refresh().catch(() => {})}>
            Reintentar
          </button>
        )}
      </div>
    );
  const today = data.today,
    activeProperties = data.properties.filter((p) => !p.archived_at);
  const activeLeases = data.leases.filter(
    (l) =>
      l.status === "active" && l.start_date <= today && l.end_date >= today,
  );
  const occupied = new Set(activeLeases.map((l) => l.property_id));
  const periodCharges = data.charges.filter((c) => c.period.startsWith(month));
  const totalDue = periodCharges.reduce((a, c) => a + Number(c.amount), 0),
    collected = periodCharges.reduce((a, c) => a + Number(c.paid), 0),
    pending = totalDue - collected;
  const overdue = data.charges.filter(
    (c) => Number(c.balance) > 0 && c.due_date < today,
  );
  const in30 = new Date(today + "T12:00:00Z");
  in30.setUTCDate(in30.getUTCDate() + 30);
  const until = in30.toISOString().slice(0, 10);
  const expiring = data.leases.filter(
    (l) => l.status === "active" && l.end_date >= today && l.end_date <= until,
  );
  const expiringDocs = data.documents.filter(
    (d) => d.expires_on && d.expires_on <= until,
  );
  const matches = (...values: (string | number | null)[]) =>
    values
      .join(" ")
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es"));
  const status = (c: Charge) =>
    Number(c.balance) === 0
      ? "paid"
      : c.due_date < today
        ? "overdue"
        : Number(c.paid) > 0
          ? "partial"
          : "pending";
  const chargeLabel = (c: Charge) =>
    ({
      paid: "Pagado",
      overdue: "Vencido",
      partial: "Abono parcial",
      pending: "Pendiente",
    })[status(c)];
  const chargeTone = (c: Charge) =>
    ({ paid: "green", overdue: "red", partial: "blue", pending: "amber" })[
      status(c)
    ];
  const primary = () => {
    if (view === "tenants") open({ type: "tenant" });
    else if (view === "leases") open({ type: "lease" });
    else if (view === "documents") open({ type: "document" });
    else if (view === "charges" || view === "payments")
      open({ type: "payment" });
    else open({ type: "property" });
  };
  const primaryLabel =
    view === "tenants"
      ? "Nuevo arrendatario"
      : view === "leases"
        ? "Nuevo contrato"
        : view === "documents"
          ? "Subir documento"
          : view === "charges" || view === "payments"
            ? "Registrar pago"
            : "Nuevo inmueble";
  const titles: Record<View, { title: string; description: string }> = {
    overview: {
      title: "Tu portafolio, en perspectiva",
      description: "Lo que tienes. Lo que ingresa. Lo que viene.",
    },
    properties: {
      title: "Inmuebles",
      description: "Cada espacio, con toda su información a mano.",
    },
    inventory: {
      title: "Fotos e inventario",
      description:
        "Cada espacio, cada elemento y su estado, con evidencia fotográfica.",
    },
    tenants: {
      title: "Arrendatarios",
      description: "Las personas detrás de cada contrato.",
    },
    leases: {
      title: "Contratos de arriendo",
      description: "Vigencias, cánones y condiciones en un solo lugar.",
    },
    charges: {
      title: "Cobros y cartera",
      description: "Revisa los saldos y registra cada abono.",
    },
    payments: {
      title: "Historial de pagos",
      description: "Un registro claro de los ingresos de tu portafolio.",
    },
    documents: {
      title: "Archivo documental",
      description:
        "Contratos, escrituras y soportes vinculados a tus inmuebles.",
    },
  };
  const pendingCharges = data.charges.filter((c) => Number(c.balance) > 0);
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={"sidebar " + (mobileNav ? "is-open" : "")}>
        <a className="brand" href="/" aria-label="Raíz, inicio">
          <span className="brand-mark">
            <Building2 size={23} />
          </span>
          raíz<span className="brand-dot">.</span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">
            {data.user.name[0].toUpperCase()}
          </span>
          <div>
            <strong>Mi portafolio</strong>
            <small>Espacio personal</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <nav aria-label="Navegación principal">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={view === id ? "nav-link active" : "nav-link"}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "charges" && overdue.length > 0 && (
                <span className="nav-count">{overdue.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span /> Almacenamiento local
          </div>
          <button
            className="profile"
            onClick={async () => {
              try {
                await api("logout", "POST", {});
                setSession({ user: null, setupRequired: false });
                setData(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
            title="Cerrar sesión"
          >
            <span className="profile-avatar">
              {data.user.name[0].toUpperCase()}
            </span>
            <span>
              <strong>{data.user.name}</strong>
              <small>Cerrar sesión</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <span>Mi portafolio</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <span className="top-date">
            <CalendarDays size={15} />
            {date(today)}
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <h1>{titles[view].title}</h1>
              <p>{titles[view].description}</p>
            </div>
            {view !== "inventory" && (
              <button className="button primary" onClick={primary}>
                <Plus size={17} />
                {primaryLabel}
              </button>
            )}
          </div>
          {error && !panel && (
            <div role="alert" className="error">
              <AlertCircle size={18} />
              {error}
              <button
                aria-label="Cerrar error"
                className="icon-button"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "inventory" ? (
            <PropertyInventory
              key={inventoryPropertyId || data.properties[0]?.id || "empty"}
              properties={data.properties}
              propertyId={
                inventoryPropertyId ||
                data.properties.find((p) => !p.archived_at)?.id ||
                data.properties[0]?.id ||
                ""
              }
              onPropertyChange={setInventoryPropertyId}
              onChanged={refresh}
              onCreateProperty={() => open({ type: "property" })}
            />
          ) : view === "overview" ? (
            <>
              <div className="section-line">
                <h2>Balance del mes</h2>
                <label className="month-control">
                  <CalendarDays size={16} />
                  <input
                    type="month"
                    aria-label="Mes del resumen"
                    value={month}
                    onChange={(e) => e.target.value && setMonth(e.target.value)}
                  />
                </label>
              </div>
              <section className="metrics" aria-label="Resumen del portafolio">
                <div>
                  <span>Ingresos recaudados</span>
                  <strong>{money(collected)}</strong>
                  <small>de {money(totalDue)} por cobrar este mes</small>
                </div>
                <div>
                  <span>Saldo pendiente</span>
                  <strong>{money(pending)}</strong>
                  <small>
                    {periodCharges.filter((c) => Number(c.balance) > 0).length}{" "}
                    cobros abiertos del mes
                  </small>
                </div>
                <div>
                  <span>Ocupación actual</span>
                  <strong>
                    {activeProperties.length
                      ? Math.round(
                          (occupied.size / activeProperties.length) * 100,
                        )
                      : 0}
                    <em>%</em>
                  </strong>
                  <small>
                    {occupied.size} de {activeProperties.length} inmuebles
                    ocupados
                  </small>
                </div>
                <div>
                  <span>Canon mensual vigente</span>
                  <strong>
                    {money(
                      activeLeases.reduce((a, l) => a + Number(l.rent), 0),
                    )}
                  </strong>
                  <small>
                    {activeLeases.length} contratos vigentes · sin
                    administración
                  </small>
                </div>
              </section>
              {!activeProperties.length ? (
                <section className="onboarding">
                  <div className="onboarding-intro">
                    <div className="outline-mark">
                      <Building2 size={35} strokeWidth={1.2} />
                    </div>
                    <h2>
                      Dale un lugar a tu
                      <br />
                      primer inmueble.
                    </h2>
                    <p>
                      Tu portafolio está listo para crecer. Empieza por
                      registrar un espacio; aquí se conectarán sus contratos,
                      pagos y documentos.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => open({ type: "property" })}
                    >
                      Agregar mi primer inmueble
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="steps">
                    <div>
                      <span className="step-number">1</span>
                      <div>
                        <h3>Registra el inmueble</h3>
                        <p>Nombre, ubicación y características del espacio.</p>
                      </div>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <span className="step-number">2</span>
                      <div>
                        <h3>Vincula un contrato</h3>
                        <p>Arrendatario, canon y fechas de vigencia.</p>
                      </div>
                      <FileText size={20} />
                    </div>
                    <div>
                      <span className="step-number">3</span>
                      <div>
                        <h3>Lleva los pagos al día</h3>
                        <p>Registra abonos y consulta el saldo pendiente.</p>
                      </div>
                      <Wallet size={20} />
                    </div>
                  </div>
                </section>
              ) : (
                <section className="section-box">
                  <div className="box-heading">
                    <h2>Cobros por atender</h2>
                    <button
                      className="text-button"
                      onClick={() => go("charges")}
                    >
                      Ver cartera
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {pendingCharges.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Inmueble / arrendatario</th>
                            <th>Vencimiento</th>
                            <th>Estado</th>
                            <th className="numeric">Pendiente</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pendingCharges.slice(0, 5).map((c) => (
                            <tr key={c.id}>
                              <td>
                                <strong>{c.property_name}</strong>
                                <small>{c.tenant_name}</small>
                              </td>
                              <td>{date(c.due_date)}</td>
                              <td>
                                <Badge tone={chargeTone(c)}>
                                  {chargeLabel(c)}
                                </Badge>
                              </td>
                              <td className="numeric">{money(c.balance)}</td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    open({ type: "payment", item: c })
                                  }
                                >
                                  Registrar pago
                                  <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      icon={CheckCircle2}
                      title="Todo en orden"
                      description={
                        data.leases.length
                          ? "No hay saldos pendientes en los cobros generados."
                          : "Crea un arrendatario y un contrato para empezar a llevar tus cobros."
                      }
                      action={
                        !data.leases.length ? (
                          <button
                            className="button"
                            onClick={() =>
                              go(data.tenants.length ? "leases" : "tenants")
                            }
                          >
                            {data.tenants.length
                              ? "Crear contrato"
                              : "Registrar arrendatario"}
                            <ArrowRight size={15} />
                          </button>
                        ) : (
                          <button
                            className="text-button"
                            onClick={() => go("charges")}
                          >
                            Revisar generación de cobros
                            <ArrowRight size={15} />
                          </button>
                        )
                      }
                    />
                  )}
                </section>
              )}
              <div className="overview-bottom">
                <section className="section-box">
                  <div className="box-heading">
                    <h2>Próximos vencimientos</h2>
                    <Clock3 size={18} />
                  </div>
                  {expiring.length || expiringDocs.length ? (
                    <div className="alert-list">
                      {expiring.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            go("leases");
                            setSearch(l.property_name);
                          }}
                        >
                          <span className="small-icon">
                            <FileText size={18} />
                          </span>
                          <span>
                            <strong>{l.property_name}</strong>
                            <small>Contrato · {date(l.end_date)}</small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      {expiringDocs.map((d) => (
                        <a key={d.id} href={"/api/documents/" + d.id}>
                          <span className="small-icon">
                            <FolderOpen size={18} />
                          </span>
                          <span>
                            <strong>{d.title}</strong>
                            <small>
                              {d.expires_on! < today ? "Vencido" : "Documento"}{" "}
                              · {date(d.expires_on!)}
                            </small>
                          </span>
                          <Download size={16} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="quiet-empty">
                      <CalendarDays size={25} strokeWidth={1.4} />
                      <div>
                        <strong>Sin vencimientos próximos</strong>
                        <p>
                          Aquí verás contratos y documentos por vencer en los
                          próximos 30 días.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <section className="section-box">
                  <div className="box-heading">
                    <h2>Tu archivo, organizado</h2>
                    <FolderOpen size={18} />
                  </div>
                  <div className="archive-summary">
                    <div>
                      <strong>{data.documents.length}</strong>
                      <span>documentos guardados</span>
                    </div>
                    <p>
                      Un expediente para cada inmueble.
                      <br />
                      Todo listo para cuando lo necesites.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => go("documents")}
                    >
                      Abrir documentos
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="toolbar">
                <label className="search">
                  <Search size={17} />
                  <input
                    placeholder={
                      view === "properties"
                        ? "Buscar por nombre, ciudad o dirección…"
                        : "Buscar en " +
                          nav.find((n) => n.id === view)?.label.toLowerCase() +
                          "…"
                    }
                    aria-label="Buscar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="toolbar-actions">
                  {view === "charges" && (
                    <>
                      <select
                        aria-label="Filtrar estado de cobro"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Con saldo pendiente</option>
                        <option value="overdue">Vencidos</option>
                        <option value="paid">Pagados</option>
                      </select>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={async () => {
                          const r = await mutate(
                            "charges/generate",
                            "POST",
                            { month: today.slice(0, 7) },
                            "Cobros actualizados.",
                          );
                          if (r)
                            setToast(
                              r.created
                                ? `${r.created} cobros nuevos generados.`
                                : "Los cobros ya están al día.",
                            );
                        }}
                      >
                        <RefreshCw size={15} />
                        Generar cobros del mes
                      </button>
                      <a
                        className="button icon-button"
                        href="/api/export"
                        aria-label="Exportar cartera CSV"
                        title="Exportar cartera CSV"
                      >
                        <Download size={17} />
                      </a>
                    </>
                  )}
                  {view === "properties" && (
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                      />
                      Ver archivados
                    </label>
                  )}
                  {view === "documents" && (
                    <select
                      aria-label="Filtrar categoría"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">Todas las categorías</option>
                      {[
                        "Contrato",
                        "Escritura",
                        "Certificado",
                        "Recibo",
                        "Inventario",
                        "Póliza",
                        "Otro",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  {view === "payments" && (
                    <a className="button" href="/api/export">
                      <Download size={16} />
                      Exportar cartera
                    </a>
                  )}
                </div>
              </div>
              {view === "properties" &&
                (() => {
                  const items = data.properties.filter(
                    (p) =>
                      (showArchived || !p.archived_at) &&
                      matches(p.name, p.address, p.city),
                  );
                  return items.length ? (
                    <div className="property-grid">
                      {items.map((p) => (
                        <button
                          className="property-card"
                          key={p.id}
                          onClick={() => open({ type: "detail", item: p })}
                        >
                          {p.cover_photo_id && (
                            <img
                              className="property-cover"
                              src={
                                "/api/photos/" + p.cover_photo_id + "/thumbnail"
                              }
                              alt={"Vista de " + p.name}
                              loading="lazy"
                            />
                          )}
                          <div className="property-card-top">
                            <span className="property-type">
                              <Building2 size={19} />
                              {p.kind}
                            </span>
                            <Badge
                              tone={
                                p.archived_at
                                  ? "neutral"
                                  : occupied.has(p.id)
                                    ? "green"
                                    : "blue"
                              }
                            >
                              {p.archived_at
                                ? "Archivado"
                                : occupied.has(p.id)
                                  ? "Arrendado"
                                  : "Disponible"}
                            </Badge>
                          </div>
                          <h2>{p.name}</h2>
                          <p>
                            <MapPin size={14} />
                            {p.city} · {p.address}
                          </p>
                          <div className="property-features">
                            <span>
                              {Number(p.area).toLocaleString("es-CO")} m²
                            </span>
                            <span>{p.bedrooms} hab.</span>
                            <span>{p.bathrooms} baños</span>
                          </div>
                          <div className="property-card-bottom">
                            <span>
                              {activeLeases.find((l) => l.property_id === p.id)
                                ?.tenant_name || "Sin arrendatario vigente"}
                            </span>
                            <ArrowUpRight size={17} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="section-box">
                      <Empty
                        icon={Building2}
                        title={
                          search
                            ? "No encontramos ese inmueble"
                            : "Tu primer inmueble empieza aquí"
                        }
                        description={
                          search
                            ? "Prueba con otro nombre, dirección o ciudad."
                            : "Registra los espacios que quieres administrar."
                        }
                        action={
                          !search ? (
                            <button
                              className="button primary"
                              onClick={() => open({ type: "property" })}
                            >
                              <Plus size={16} />
                              Agregar inmueble
                            </button>
                          ) : undefined
                        }
                      />
                    </div>
                  );
                })()}
              {view === "tenants" && (
                <DataTable
                  headers={[
                    "Arrendatario",
                    "Identificación",
                    "Contacto",
                    "Contratos",
                    "",
                  ]}
                  empty={
                    <Empty
                      icon={UsersRound}
                      title={
                        search
                          ? "Sin coincidencias"
                          : "Aún no hay arrendatarios"
                      }
                      description="Registra los datos de contacto de quienes arriendan tus inmuebles."
                      action={
                        <button
                          className="button"
                          onClick={() => open({ type: "tenant" })}
                        >
                          <Plus size={16} />
                          Nuevo arrendatario
                        </button>
                      }
                    />
                  }
                  rows={data.tenants
                    .filter((t) =>
                      matches(t.name, t.document, t.email, t.phone),
                    )
                    .map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="person">
                            <span>{t.name.slice(0, 1)}</span>
                            <strong>{t.name}</strong>
                          </div>
                        </td>
                        <td>{t.document}</td>
                        <td>
                          {t.email || "Sin correo"}
                          <small>{t.phone || "Sin teléfono"}</small>
                        </td>
                        <td>
                          {
                            data.leases.filter((l) => l.tenant_id === t.id)
                              .length
                          }
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={"Editar " + t.name}
                            onClick={() => open({ type: "tenant", item: t })}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                />
              )}
              {view === "leases" && (
                <DataTable
                  headers={[
                    "Inmueble / arrendatario",
                    "Vigencia",
                    "Canon + administración",
                    "Estado",
                    "",
                  ]}
                  empty={
                    <Empty
                      icon={FileText}
                      title={
                        search
                          ? "Sin coincidencias"
                          : "Arriendos con todo en orden"
                      }
                      description="Crea un contrato para vincular un inmueble, un arrendatario y sus cobros mensuales."
                      action={
                        <button
                          className="button"
                          onClick={() => open({ type: "lease" })}
                        >
                          <Plus size={16} />
                          Nuevo contrato
                        </button>
                      }
                    />
                  }
                  rows={data.leases
                    .filter((l) => matches(l.property_name, l.tenant_name))
                    .map((l) => (
                      <tr key={l.id}>
                        <td>
                          <strong>{l.property_name}</strong>
                          <small>{l.tenant_name}</small>
                        </td>
                        <td>
                          {date(l.start_date)}
                          <small>hasta {date(l.end_date)}</small>
                        </td>
                        <td>
                          {money(Number(l.rent) + Number(l.administration))}
                          <small>Pago el día {l.due_day}</small>
                        </td>
                        <td>
                          <Badge
                            tone={
                              l.status === "ended"
                                ? "neutral"
                                : l.end_date < today
                                  ? "amber"
                                  : l.start_date > today
                                    ? "blue"
                                    : "green"
                            }
                          >
                            {l.status === "ended"
                              ? "Finalizado"
                              : l.end_date < today
                                ? "Vencido"
                                : l.start_date > today
                                  ? "Próximo"
                                  : "Vigente"}
                          </Badge>
                        </td>
                        <td>
                          {l.status === "active" && l.start_date <= today && (
                            <button
                              className="text-button"
                              onClick={() => open({ type: "end", item: l })}
                            >
                              Finalizar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                />
              )}
              {view === "charges" && (
                <>
                  <p className="table-note">
                    Los cobros se generan al crear un contrato y con «Generar
                    cobros del mes». Incluyen el canon completo y la
                    administración, sin prorrateo automático.
                  </p>
                  <DataTable
                    headers={[
                      "Inmueble / arrendatario",
                      "Período / vencimiento",
                      "Valor del cobro",
                      "Abonado",
                      "Saldo",
                      "Estado",
                      "",
                    ]}
                    empty={
                      <Empty
                        icon={Wallet}
                        title={
                          search || filter !== "all"
                            ? "No hay cobros con este filtro"
                            : "Sin cobros todavía"
                        }
                        description="Al crear un contrato se generan los cobros desde su inicio hasta el mes actual."
                        action={
                          <button
                            className="button"
                            onClick={() => go("leases")}
                          >
                            Ir a contratos
                            <ArrowRight size={16} />
                          </button>
                        }
                      />
                    }
                    rows={data.charges
                      .filter(
                        (c) =>
                          matches(c.property_name, c.tenant_name, c.period) &&
                          (filter === "all" ||
                            (filter === "pending" && Number(c.balance) > 0) ||
                            (filter === "overdue" && status(c) === "overdue") ||
                            (filter === "paid" && status(c) === "paid")),
                      )
                      .map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.property_name}</strong>
                            <small>{c.tenant_name}</small>
                          </td>
                          <td className="capitalize">
                            {monthName(c.period)}
                            <small>{date(c.due_date)}</small>
                          </td>
                          <td className="numeric">{money(c.amount)}</td>
                          <td className="numeric muted">{money(c.paid)}</td>
                          <td className="numeric">
                            <strong>{money(c.balance)}</strong>
                          </td>
                          <td>
                            <Badge tone={chargeTone(c)}>{chargeLabel(c)}</Badge>
                          </td>
                          <td>
                            {Number(c.balance) > 0 && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  open({ type: "payment", item: c })
                                }
                              >
                                Abonar
                                <Plus size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  />
                </>
              )}
              {view === "payments" && (
                <DataTable
                  headers={[
                    "Fecha",
                    "Inmueble / arrendatario",
                    "Valor",
                    "Medio / referencia",
                    "Estado",
                    "",
                  ]}
                  empty={
                    <Empty
                      icon={ReceiptText}
                      title={search ? "Sin coincidencias" : "Cada pago cuenta"}
                      description="Los abonos que registres aparecerán aquí con su fecha, medio de pago y referencia."
                      action={
                        <button
                          className="button"
                          onClick={() => open({ type: "payment" })}
                        >
                          <Plus size={16} />
                          Registrar pago
                        </button>
                      }
                    />
                  }
                  rows={data.payments
                    .filter((p) =>
                      matches(
                        p.property_name,
                        p.tenant_name,
                        p.reference,
                        p.method,
                      ),
                    )
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          {date(p.paid_on)}
                          <small className="capitalize">
                            {monthName(p.period)}
                          </small>
                        </td>
                        <td>
                          <strong>{p.property_name}</strong>
                          <small>{p.tenant_name}</small>
                        </td>
                        <td
                          className={"numeric " + (p.voided_at ? "voided" : "")}
                        >
                          {money(p.amount)}
                        </td>
                        <td>
                          {p.method}
                          <small>{p.reference || "Sin referencia"}</small>
                        </td>
                        <td>
                          <Badge tone={p.voided_at ? "neutral" : "green"}>
                            {p.voided_at ? "Anulado" : "Registrado"}
                          </Badge>
                          {p.void_reason && <small>{p.void_reason}</small>}
                        </td>
                        <td>
                          {!p.voided_at && (
                            <button
                              className="text-button danger-text"
                              onClick={() => open({ type: "void", item: p })}
                            >
                              Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                />
              )}
              {view === "documents" && (
                <>
                  <p className="table-note">
                    PDF, JPG o PNG · Máximo 10 MB por archivo
                  </p>
                  <DataTable
                    headers={[
                      "Documento",
                      "Inmueble",
                      "Categoría",
                      "Vencimiento",
                      "",
                    ]}
                    empty={
                      <Empty
                        icon={FolderOpen}
                        title={
                          search || filter !== "all"
                            ? "Sin coincidencias"
                            : "Tu archivo comienza aquí"
                        }
                        description="Guarda contratos, escrituras y soportes para encontrarlos junto a su inmueble."
                        action={
                          <button
                            className="button"
                            onClick={() => open({ type: "document" })}
                          >
                            <Plus size={16} />
                            Subir documento
                          </button>
                        }
                      />
                    }
                    rows={data.documents
                      .filter(
                        (d) =>
                          matches(d.title, d.property_name, d.filename) &&
                          (filter === "all" || d.category === filter),
                      )
                      .map((d) => (
                        <tr key={d.id}>
                          <td>
                            <div className="document-cell">
                              <span className="file-icon">
                                <FileText size={20} />
                              </span>
                              <div>
                                <strong>{d.title}</strong>
                                <small>
                                  {d.filename} ·{" "}
                                  {(Number(d.size_bytes) / 1024).toFixed(0)} KB
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>{d.property_name}</td>
                          <td>{d.category}</td>
                          <td>
                            {d.expires_on ? (
                              <span
                                className={
                                  d.expires_on < today ? "danger-text" : ""
                                }
                              >
                                {date(d.expires_on)}
                              </span>
                            ) : (
                              "Sin vencimiento"
                            )}
                          </td>
                          <td>
                            <a
                              href={"/api/documents/" + d.id}
                              className="icon-button"
                              aria-label={"Descargar " + d.title}
                            >
                              <Download size={17} />
                            </a>
                          </td>
                        </tr>
                      ))}
                  />
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Raíz · Tu patrimonio, en orden.</span>
            <span>Valores en pesos colombianos (COP)</span>
          </footer>
        </main>
      </div>
      {panel && (
        <div className="panel-layer">
          <button
            className="panel-backdrop"
            aria-label="Cerrar panel"
            disabled={busy}
            onClick={() => {
              setPanel(null);
              setError("");
            }}
          />
          <div
            ref={dialog}
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            <div className="panel-header">
              <div>
                <h2 id="panel-title">
                  {
                    {
                      property: panel.item
                        ? "Editar inmueble"
                        : "Nuevo inmueble",
                      tenant: panel.item
                        ? "Editar arrendatario"
                        : "Nuevo arrendatario",
                      lease: "Nuevo contrato",
                      payment: "Registrar pago",
                      document: "Subir documento",
                      detail: (panel.item as Property)?.name,
                      end: "Finalizar contrato",
                      void: "Anular pago",
                      archive: "Archivar inmueble",
                    }[panel.type]
                  }
                </h2>
                <p>
                  {panel.type === "detail"
                    ? "Expediente del inmueble"
                    : "Completa la información para mantener todo en orden."}
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar panel"
                disabled={busy}
                onClick={() => {
                  setPanel(null);
                  setError("");
                }}
              >
                <X size={22} />
              </button>
            </div>
            {error && (
              <div role="alert" className="error panel-error">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
            <PanelContent
              key={panel.type + (panel.item?.id || "")}
              panel={panel}
              data={data}
              busy={busy}
              mutate={mutate}
              open={open}
              money={money}
              onInventory={(id) => {
                setPanel(null);
                setInventoryPropertyId(id);
                go("inventory");
              }}
            />
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[];
  empty: ReactNode;
}) {
  return (
    <div className="section-box">
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      ) : (
        empty
      )}
    </div>
  );
}
type PanelProps = {
  onInventory: (id: string) => void;
  panel: Panel;
  data: Snapshot;
  busy: boolean;
  mutate: (
    path: string,
    method: string,
    values: unknown,
    message: string,
  ) => Promise<unknown>;
  open: (p: Panel) => void;
  money: (v: string | number) => string;
};
function PanelContent({
  panel,
  data,
  busy,
  mutate,
  open,
  onInventory,
}: PanelProps) {
  const p = panel.item as Property | undefined,
    t = panel.item as Tenant | undefined,
    l = panel.item as Lease | undefined,
    payment = panel.item as Payment | undefined;
  const [selectedProperty, setSelectedProperty] = useState(
    panel.propertyId || ((panel.item as Property)?.id ?? ""),
  );
  const [chargeId, setChargeId] = useState(
    panel.type === "payment" ? panel.item?.id || "" : "",
  );
  const [filename, setFilename] = useState("");
  const [paymentKey] = useState(() => crypto.randomUUID());
  const available = data.properties.filter((p) => !p.archived_at),
    charges = data.charges.filter((c) => Number(c.balance) > 0),
    charge = charges.find((c) => c.id === chargeId);
  const submit =
    (
      path: string,
      method: string,
      message: string,
      transform?: (values: Record<string, FormDataEntryValue>) => unknown,
    ) =>
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.currentTarget));
      mutate(path, method, transform ? transform(values) : values, message);
    };
  const footer = (label = "Guardar") => (
    <div className="form-footer">
      <span>Los cambios se guardan en tu portafolio.</span>
      <Submit busy={busy} label={label} />
    </div>
  );
  if (panel.type === "property")
    return (
      <form
        onSubmit={submit(
          "properties" + (p ? "/" + p.id : ""),
          p ? "PATCH" : "POST",
          p ? "Inmueble actualizado." : "Inmueble creado.",
        )}
        className="panel-form"
      >
        <div className="form-grid">
          <Field label="Nombre del inmueble *" wide>
            <input
              name="name"
              required
              maxLength={200}
              placeholder="Ej. Apartamento Cedritos 302"
              defaultValue={p?.name}
            />
          </Field>
          <Field label="Tipo de inmueble *">
            <select name="kind" defaultValue={p?.kind || "Apartamento"}>
              {[
                "Apartamento",
                "Casa",
                "Local",
                "Oficina",
                "Bodega",
                "Lote",
                "Otro",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad *">
            <input
              name="city"
              required
              placeholder="Ej. Bogotá"
              maxLength={200}
              defaultValue={p?.city}
            />
          </Field>
          <Field label="Dirección *" wide>
            <input
              name="address"
              required
              maxLength={200}
              placeholder="Calle, carrera, número y unidad"
              defaultValue={p?.address}
            />
          </Field>
          <Field label="Área (m²)">
            <input
              name="area"
              type="number"
              min="0"
              max="99999999"
              step="0.01"
              defaultValue={p?.area || 0}
            />
          </Field>
          <Field label="Valor de adquisición (COP)">
            <input
              name="purchase_value"
              type="number"
              min="0"
              max="9999999999999"
              step="1"
              defaultValue={p?.purchase_value || 0}
            />
          </Field>
          <Field label="Habitaciones">
            <input
              name="bedrooms"
              type="number"
              min="0"
              max="999"
              defaultValue={p?.bedrooms || 0}
            />
          </Field>
          <Field label="Baños">
            <input
              name="bathrooms"
              type="number"
              min="0"
              max="999"
              defaultValue={p?.bathrooms || 0}
            />
          </Field>
          <Field label="Notas" wide>
            <textarea
              name="notes"
              rows={4}
              maxLength={5000}
              placeholder="Matrícula inmobiliaria, parqueadero u otros detalles…"
              defaultValue={p?.notes}
            />
          </Field>
        </div>
        {footer(p ? "Guardar cambios" : "Crear inmueble")}
      </form>
    );
  if (panel.type === "tenant")
    return (
      <form
        className="panel-form"
        onSubmit={submit(
          "tenants" + (t ? "/" + t.id : ""),
          t ? "PATCH" : "POST",
          "Arrendatario guardado.",
        )}
      >
        <div className="form-grid">
          <Field label="Nombre completo o razón social *" wide>
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={t?.name}
            />
          </Field>
          <Field label="Cédula o NIT *" wide>
            <input
              name="document"
              required
              maxLength={200}
              defaultValue={t?.document}
            />
          </Field>
          <Field label="Correo electrónico">
            <input name="email" type="email" defaultValue={t?.email} />
          </Field>
          <Field label="Teléfono">
            <input
              name="phone"
              type="tel"
              maxLength={50}
              defaultValue={t?.phone}
            />
          </Field>
          <Field label="Notas" wide>
            <textarea
              name="notes"
              rows={4}
              maxLength={5000}
              defaultValue={t?.notes}
            />
          </Field>
        </div>
        {footer()}
      </form>
    );
  if (panel.type === "lease")
    return !available.length || !data.tenants.length ? (
      <Empty
        icon={FileText}
        title="Preparemos el contrato"
        description={
          !available.length
            ? "Primero registra el inmueble que vas a arrendar."
            : "Primero registra los datos del arrendatario."
        }
        action={
          <button
            className="button primary"
            onClick={() =>
              open({ type: !available.length ? "property" : "tenant" })
            }
          >
            <Plus size={16} />
            {!available.length ? "Crear inmueble" : "Crear arrendatario"}
          </button>
        }
      />
    ) : (
      <form
        className="panel-form"
        onSubmit={submit(
          "leases",
          "POST",
          "Contrato creado y cobros generados.",
        )}
      >
        <div className="form-grid">
          <Field label="Inmueble *" wide>
            <select
              name="property_id"
              required
              defaultValue={panel.propertyId || ""}
            >
              <option value="" disabled>
                Selecciona un inmueble
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arrendatario *" wide>
            <select name="tenant_id" required defaultValue="">
              <option value="" disabled>
                Selecciona un arrendatario
              </option>
              {data.tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.document}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de inicio *">
            <input
              type="date"
              name="start_date"
              required
              min="1900-01-01"
              max="2200-12-31"
              defaultValue={data.today}
            />
          </Field>
          <Field label="Fecha de finalización *">
            <input
              type="date"
              name="end_date"
              required
              min="1900-01-01"
              max="2200-12-31"
            />
          </Field>
          <Field label="Canon mensual (COP) *">
            <input
              type="number"
              name="rent"
              required
              min="1"
              max="9999999999999"
              step="1"
              placeholder="1500000"
            />
          </Field>
          <Field label="Administración (COP)">
            <input
              type="number"
              name="administration"
              min="0"
              max="9999999999999"
              step="1"
              defaultValue="0"
            />
          </Field>
          <Field label="Día de pago *" hint="Día del mes, entre 1 y 28." wide>
            <input
              type="number"
              name="due_day"
              min="1"
              max="28"
              required
              defaultValue="5"
            />
          </Field>
          <div className="form-info wide">
            <CalendarDays size={18} />
            <p>
              Se generará un cobro por cada mes desde el inicio hasta el mes
              actual. Cada cobro incluye el canon completo y la administración;
              no se prorratean meses parciales.
            </p>
          </div>
          <Field label="Condiciones y notas" wide>
            <textarea name="notes" rows={3} maxLength={5000} />
          </Field>
        </div>
        {footer("Crear contrato")}
      </form>
    );
  if (panel.type === "payment")
    return !charges.length ? (
      <Empty
        icon={CheckCircle2}
        title="Sin saldos pendientes"
        description="No tienes cobros abiertos para registrar un pago."
      />
    ) : (
      <form
        className="panel-form"
        onSubmit={submit(
          "payments",
          "POST",
          "Pago registrado. Saldo actualizado.",
          (v) => ({ ...v, idempotency_key: paymentKey }),
        )}
      >
        <div className="form-grid">
          <Field label="Cobro al que corresponde *" wide>
            <select
              name="charge_id"
              required
              value={chargeId}
              onChange={(e) => setChargeId(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un cobro
              </option>
              {charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.property_name} · {monthName(c.period)} · {money(c.balance)}
                </option>
              ))}
            </select>
          </Field>
          {charge && (
            <div className="balance-box wide">
              <span>Saldo pendiente</span>
              <strong>{money(charge.balance)}</strong>
              <small>
                {charge.tenant_name} · vence {date(charge.due_date)}
              </small>
            </div>
          )}
          <Field label="Valor del abono (COP) *">
            <input
              key={chargeId}
              name="amount"
              type="number"
              min="1"
              step="1"
              max={charge?.balance || 9999999999999}
              required
              defaultValue={charge?.balance}
            />
          </Field>
          <Field label="Fecha del pago *">
            <input
              name="paid_on"
              type="date"
              max={data.today}
              required
              defaultValue={data.today}
            />
          </Field>
          <Field label="Medio de pago *">
            <select name="method">
              {["Transferencia", "Efectivo", "Consignación", "Otro"].map(
                (m) => (
                  <option key={m}>{m}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="Referencia">
            <input
              name="reference"
              maxLength={200}
              placeholder="Número de comprobante"
            />
          </Field>
          <Field label="Notas" wide>
            <textarea name="notes" rows={3} maxLength={5000} />
          </Field>
        </div>
        {footer("Registrar pago")}
      </form>
    );
  if (panel.type === "document")
    return !available.length ? (
      <Empty
        icon={FolderOpen}
        title="Primero, un inmueble"
        description="Los documentos se guardan en el expediente de un inmueble."
        action={
          <button
            className="button primary"
            onClick={() => open({ type: "property" })}
          >
            Crear inmueble
            <Plus size={16} />
          </button>
        }
      />
    ) : (
      <form
        className="panel-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutate(
            "documents",
            "POST",
            new FormData(e.currentTarget),
            "Documento guardado.",
          );
        }}
      >
        <div className="form-grid">
          <Field label="Inmueble *" wide>
            <select
              name="property_id"
              required
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un inmueble
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contrato asociado (opcional)" wide>
            <select name="lease_id" key={selectedProperty}>
              <option value="">Documento general del inmueble</option>
              {data.leases
                .filter((l) => l.property_id === selectedProperty)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.tenant_name} · {date(l.start_date)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Nombre del documento *" wide>
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Ej. Contrato de arrendamiento 2026"
            />
          </Field>
          <Field label="Categoría *">
            <select name="category">
              {[
                "Contrato",
                "Escritura",
                "Certificado",
                "Recibo",
                "Inventario",
                "Póliza",
                "Otro",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vencimiento (opcional)">
            <input name="expires_on" type="date" />
          </Field>
          <label className="upload-zone wide">
            <Paperclip size={27} />
            <strong>{filename || "Selecciona un documento"}</strong>
            <span>PDF, JPG o PNG · Hasta 10 MB</span>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 10 * 1024 * 1024) {
                  e.target.setCustomValidity(
                    "Selecciona un archivo de hasta 10 MB.",
                  );
                } else e.target.setCustomValidity("");
                setFilename(f?.name || "");
              }}
            />
          </label>
        </div>
        {footer("Guardar documento")}
      </form>
    );
  if (panel.type === "detail" && p) {
    const contracts = data.leases.filter((l) => l.property_id === p.id),
      docs = data.documents.filter((d) => d.property_id === p.id);
    return (
      <div className="detail-content">
        {p.cover_photo_id && (
          <img
            className="detail-cover"
            src={"/api/photos/" + p.cover_photo_id + "/file"}
            alt={"Vista de " + p.name}
          />
        )}
        <button
          className="inventory-dossier-link"
          onClick={() => onInventory(p.id)}
        >
          <span>
            <Camera size={20} />
            <strong>Fotos e inventario</strong>
          </span>
          <span>
            Ver espacios y elementos
            <ChevronRight size={16} />
          </span>
        </button>
        <div className="detail-tools">
          <Badge tone={p.archived_at ? "neutral" : "green"}>
            {p.kind}
            {p.archived_at ? " · Archivado" : ""}
          </Badge>
          <button
            className="button"
            onClick={() => open({ type: "property", item: p })}
          >
            <Pencil size={15} />
            Editar
          </button>
        </div>
        <p className="detail-address">
          <MapPin size={17} />
          {p.address}, {p.city}
        </p>
        <div className="detail-stats">
          <span>
            <strong>{Number(p.area)} m²</strong>Área
          </span>
          <span>
            <strong>{p.bedrooms}</strong>Habitaciones
          </span>
          <span>
            <strong>{p.bathrooms}</strong>Baños
          </span>
        </div>
        <dl>
          <dt>Valor de adquisición</dt>
          <dd>{money(p.purchase_value)}</dd>
        </dl>
        {p.notes && <p className="notes">{p.notes}</p>}
        <div className="section-line">
          <h3>Contratos</h3>
          {!p.archived_at && (
            <button
              className="text-button"
              onClick={() => open({ type: "lease", propertyId: p.id })}
            >
              <Plus size={15} />
              Agregar
            </button>
          )}
        </div>
        {contracts.length ? (
          contracts.map((l) => (
            <div className="detail-row" key={l.id}>
              <FileText size={19} />
              <div>
                <strong>{l.tenant_name}</strong>
                <small>
                  {date(l.start_date)} — {date(l.end_date)}
                </small>
              </div>
              <span>
                {money(l.rent)}
                <small>+ {money(l.administration)} adm.</small>
              </span>
            </div>
          ))
        ) : (
          <p className="muted">Aún no hay contratos para este inmueble.</p>
        )}
        <div className="section-line">
          <h3>Documentos</h3>
          {!p.archived_at && (
            <button
              className="text-button"
              onClick={() => open({ type: "document", propertyId: p.id })}
            >
              <Plus size={15} />
              Subir
            </button>
          )}
        </div>
        {docs.length ? (
          docs.map((d) => (
            <a
              className="detail-row"
              href={"/api/documents/" + d.id}
              key={d.id}
            >
              <FileText size={19} />
              <div>
                <strong>{d.title}</strong>
                <small>{d.category}</small>
              </div>
              <Download size={17} />
            </a>
          ))
        ) : (
          <p className="muted">Todavía no se han adjuntado documentos.</p>
        )}
        {!p.archived_at && (
          <button
            className="text-button archive-action"
            onClick={() => open({ type: "archive", item: p })}
          >
            <Archive size={16} />
            Archivar inmueble
          </button>
        )}
      </div>
    );
  }
  if (panel.type === "end" && l)
    return (
      <form
        className="panel-form"
        onSubmit={submit("leases/" + l.id, "PATCH", "Contrato finalizado.")}
      >
        <p>
          Vas a finalizar el contrato de <strong>{l.property_name}</strong> con{" "}
          {l.tenant_name}. Se conservarán sus cobros, saldos y pagos.
        </p>
        <Field label="Fecha de finalización *">
          <input
            name="end_date"
            type="date"
            required
            min={l.start_date}
            max={l.end_date < data.today ? l.end_date : data.today}
            defaultValue={l.end_date < data.today ? l.end_date : data.today}
          />
        </Field>
        {footer("Finalizar contrato")}
      </form>
    );
  if (panel.type === "void" && payment)
    return (
      <form
        className="panel-form"
        onSubmit={submit(
          "payments/" + payment.id,
          "PATCH",
          "Pago anulado. El saldo fue actualizado.",
        )}
      >
        <div className="form-info">
          <AlertCircle size={20} />
          <p>
            Se anulará el pago de <strong>{money(payment.amount)}</strong> de{" "}
            {payment.property_name}. El valor volverá al saldo pendiente. El
            movimiento original se conservará.
          </p>
        </div>
        <Field label="Motivo de anulación *">
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={4}
            placeholder="Explica por qué se anula este pago"
          />
        </Field>
        {footer("Confirmar anulación")}
      </form>
    );
  if (panel.type === "archive" && p)
    return (
      <form
        className="panel-form"
        onSubmit={submit("properties/" + p.id, "DELETE", "Inmueble archivado.")}
      >
        <p>
          <strong>{p.name}</strong> dejará de aparecer en el portafolio activo.
          Sus contratos, pagos y documentos se conservarán. Puedes consultarlo
          activando «Ver archivados».
        </p>
        {footer("Archivar inmueble")}
      </form>
    );
  return null;
}
