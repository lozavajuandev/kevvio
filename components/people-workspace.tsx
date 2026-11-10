"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserRound,
  UsersRound,
  Pencil,
  X,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  stages,
  interests,
  type Opportunity,
  type Activity,
} from "@/lib/crm-domain";
import type { Snapshot, Tenant } from "@/lib/types";
import { cop } from "./property-board";
type CRM = { people: Tenant[]; opportunities: Opportunity[] };
const when = (s: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(s.length === 10 ? s + "T12:00:00Z" : s));
export default function PeopleWorkspace({
  data,
  onChanged,
  onProperty,
  onLease,
  onDirtyChange,
  createRequest = 0,
}: {
  data: Snapshot;
  onChanged: () => Promise<unknown>;
  onProperty: (id: string) => void;
  onLease: (personId: string, propertyId?: string) => void;
  onDirtyChange: (v: boolean) => void;
  createRequest?: number;
}) {
  const [crm, setCrm] = useState<CRM | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [activities, setActivities] = useState<Activity[]>([]),
    [tab, setTab] = useState("people"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loadingActivity, setLoadingActivity] = useState(false);
  const [personEditor, setPersonEditor] = useState<Tenant | "new" | null>(null),
    [opportunityEditor, setOpportunityEditor] = useState<
      Opportunity | "new" | null
    >(null),
    [note, setNote] = useState(""),
    [noteKind, setNoteKind] = useState("Nota"),
    [dirty, setDirty] = useState(false);
  const reload = useCallback(async () => {
    setCrm(await api("crm"));
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);
  useEffect(() => {
    if (createRequest) {
      setPersonEditor("new");
      setSelected(null);
      setDirty(false);
    }
  }, [createRequest]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!selected) {
      setActivities([]);
      return;
    }
    let live = true;
    setLoadingActivity(true);
    api("crm/people/" + selected)
      .then((r) => {
        if (live) setActivities(r.activities);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoadingActivity(false);
      });
    return () => {
      live = false;
    };
  }, [selected]);
  function canLeave() {
    if (
      dirty &&
      !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")
    )
      return false;
    setDirty(false);
    setNote("");
    return true;
  }
  function choose(id: string | null) {
    if (!canLeave()) return;
    setSelected(id);
    setPersonEditor(null);
    setOpportunityEditor(null);
    setError("");
    setNotice("");
  }
  async function mutate(
    path: string,
    method: string,
    values: unknown,
    success: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api(path, method, values);
      await Promise.all([reload(), onChanged()]);
      if (selected)
        setActivities((await api("crm/people/" + selected)).activities);
      setNotice(success);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const person = crm?.people.find((p) => p.id === selected);
  function roles(p: Tenant) {
    const ls = data.leases.filter((l) => l.tenant_id === p.id),
      ops = crm?.opportunities.filter((o) => o.person_id === p.id) || [];
    const labels: string[] = [];
    if (
      ls.some(
        (l) =>
          l.status === "active" &&
          l.start_date <= data.today &&
          l.end_date >= data.today,
      )
    )
      labels.push("En arriendo");
    else if (ls.length) labels.push("Arriendo anterior");
    if (ops.some((o) => o.interest === "Compra" && o.stage === "Cerrado"))
      labels.push("Comprador");
    if (ops.some((o) => !["Cerrado", "Descartado"].includes(o.stage)))
      labels.push("Interesado");
    return labels.length ? labels : ["Contacto"];
  }
  const allPeople = crm?.people || [],
    allOps = crm?.opportunities || [],
    matching = (p: Tenant) =>
      [p.name, p.email, p.phone, p.document]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es"));
  const shown = allPeople.filter(
    (p) =>
      matching(p) &&
      (filter === "all" ||
        (filter === "leads" && roles(p).includes("Interesado")) ||
        (filter === "tenants" &&
          roles(p).some(
            (r) => r.includes("arriendo") || r.includes("Arriendo"),
          )) ||
        (filter === "buyers" && roles(p).includes("Comprador"))),
  );
  const ops = selected
    ? allOps.filter((o) => o.person_id === selected)
    : allOps.filter((o) =>
        allPeople.some((p) => p.id === o.person_id && matching(p)),
      );
  const followups = allOps
    .filter(
      (o) => o.next_contact_on && !["Cerrado", "Descartado"].includes(o.stage),
    )
    .sort((a, b) => a.next_contact_on!.localeCompare(b.next_contact_on!));
  const overdue = followups.filter(
    (o) => o.next_contact_on! <= data.today,
  ).length;
  async function savePerson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const editing =
      personEditor && personEditor !== "new" ? personEditor : null;
    const r = await mutate(
      "crm/people" + (editing ? "/" + editing.id : ""),
      editing ? "PATCH" : "POST",
      Object.fromEntries(new FormData(e.currentTarget)),
      editing ? "Persona actualizada." : "Persona agregada.",
    );
    if (r) {
      setDirty(false);
      setPersonEditor(null);
      setSelected(r.id);
    }
  }
  async function saveOpportunity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const editing =
      opportunityEditor && opportunityEditor !== "new"
        ? opportunityEditor
        : null;
    const r = await mutate(
      "crm/opportunities" + (editing ? "/" + editing.id : ""),
      editing ? "PATCH" : "POST",
      {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        person_id: selected,
      },
      editing ? "Oportunidad actualizada." : "Oportunidad creada.",
    );
    if (r) {
      setDirty(false);
      setOpportunityEditor(null);
    }
  }
  async function logActivity(e: FormEvent) {
    e.preventDefault();
    const r = await mutate(
      "crm/activities",
      "POST",
      { person_id: selected, kind: noteKind, body: note },
      "Actividad registrada.",
    );
    if (r) {
      setNote("");
      setDirty(false);
    }
  }
  if (!crm && !error)
    return (
      <p className="inline-loading">
        <LoaderCircle size={18} className="spin" /> Abriendo tus relaciones…
      </p>
    );
  return (
    <section className="people-workspace">
      {(selected || personEditor) && (
        <button className="back-to-properties" onClick={() => choose(null)}>
          <ArrowLeft size={17} /> Todas las personas
        </button>
      )}
      <header className="studio-heading">
        <div>
          <h1>
            {personEditor === "new"
              ? "Una nueva relación empieza aquí."
              : person
                ? person.name
                : "Personas, antes que negocios."}
          </h1>
          <p>
            {person
              ? roles(person).join(" · ")
              : "Interesados, compradores y arrendatarios. Una sola historia por persona."}
          </p>
        </div>
        {!personEditor && (
          <button
            className="button primary"
            onClick={() => {
              if (canLeave()) {
                setPersonEditor(person || "new");
                setOpportunityEditor(null);
              }
            }}
          >
            {person ? <Pencil size={17} /> : <Plus size={17} />}{" "}
            {person ? "Editar persona" : "Nueva persona"}
          </button>
        )}
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          {!crm && (
            <button
              className="button"
              onClick={() => {
                setError("");
                reload().catch((e) => setError(e.message));
              }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      {personEditor ? (
        <form
          className="crm-person-form"
          onSubmit={savePerson}
          onChange={() => setDirty(true)}
        >
          <fieldset disabled={busy}>
            <div className="form-grid">
              <label className="field wide">
                <span>Nombre completo *</span>
                <input
                  autoFocus
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={personEditor === "new" ? "" : personEditor.name}
                />
              </label>
              <label className="field">
                <span>Teléfono / WhatsApp</span>
                <input
                  name="phone"
                  type="tel"
                  maxLength={50}
                  placeholder="+57 300 123 4567"
                  defaultValue={
                    personEditor === "new" ? "" : personEditor.phone
                  }
                />
              </label>
              <label className="field">
                <span>Correo electrónico</span>
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  defaultValue={
                    personEditor === "new" ? "" : personEditor.email
                  }
                />
              </label>
              <label className="field wide">
                <span>Identificación</span>
                <input
                  name="document"
                  maxLength={200}
                  defaultValue={
                    personEditor === "new" ? "" : personEditor.document || ""
                  }
                />
                <small>
                  Opcional para un primer contacto. Puedes completarla cuando
                  avance la relación.
                </small>
              </label>
              <label className="field wide">
                <span>Notas de la persona</span>
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={5000}
                  defaultValue={
                    personEditor === "new" ? "" : personEditor.notes
                  }
                  placeholder="Preferencias, contexto y detalles para darle continuidad…"
                />
              </label>
            </div>
            <div className="crm-form-actions">
              <button
                type="button"
                className="button"
                onClick={() => {
                  if (canLeave()) setPersonEditor(null);
                }}
              >
                Cancelar
              </button>
              <button className="button primary">
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}{" "}
                Guardar persona
              </button>
            </div>
          </fieldset>
        </form>
      ) : person ? (
        <div className="person-detail-layout">
          <aside className="person-contact">
            <span className="person-monogram">
              {person.name.slice(0, 1).toUpperCase()}
            </span>
            <h2>{person.name}</h2>
            {person.phone && (
              <a href={"tel:" + person.phone}>
                <Phone size={16} />
                {person.phone}
              </a>
            )}
            {person.email && (
              <a href={"mailto:" + person.email}>
                <Mail size={16} />
                {person.email}
              </a>
            )}
            {person.phone.replace(/\D/g, "").length >= 10 && (
              <a
                className="button"
                target="_blank"
                rel="noopener noreferrer"
                href={
                  "https://wa.me/" +
                  (person.phone.replace(/\D/g, "").length === 10 ? "57" : "") +
                  person.phone.replace(/\D/g, "")
                }
              >
                <MessageCircle size={17} /> Abrir WhatsApp
              </a>
            )}
            <dl>
              <dt>Identificación</dt>
              <dd>{person.document || "Sin registrar"}</dd>
            </dl>
            {person.notes && <p className="person-notes">{person.notes}</p>}
            <h3>Relación contractual</h3>
            {data.leases
              .filter((l) => l.tenant_id === person.id)
              .map((l) => (
                <div className="person-lease" key={l.id}>
                  <button
                    className="text-button"
                    onClick={() => onProperty(l.property_id)}
                  >
                    {l.property_name}
                    <ArrowUpRight size={14} />
                  </button>
                  <p>
                    {l.status === "active" && l.end_date >= data.today
                      ? "Contrato activo"
                      : "Contrato anterior"}{" "}
                    · {cop(l.rent)}/mes
                  </p>
                </div>
              ))}
            {!data.leases.some((l) => l.tenant_id === person.id) && (
              <p className="muted">Todavía no tiene contratos de arriendo.</p>
            )}
            <button className="button" onClick={() => onLease(person.id)}>
              <FileText size={16} /> Crear contrato
            </button>
          </aside>
          <div className="person-history">
            <div className="section-line">
              <h2>Oportunidades</h2>
              <button
                className="button"
                onClick={() => {
                  if (canLeave()) setOpportunityEditor("new");
                }}
              >
                <Plus size={16} /> Nueva oportunidad
              </button>
            </div>
            {opportunityEditor && (
              <form
                className="crm-opportunity-form"
                key={opportunityEditor === "new" ? "new" : opportunityEditor.id}
                onSubmit={saveOpportunity}
                onChange={() => setDirty(true)}
              >
                <fieldset disabled={busy}>
                  <h3>
                    {opportunityEditor === "new"
                      ? "¿Qué está buscando?"
                      : "Actualiza la oportunidad"}
                  </h3>
                  <div className="form-grid">
                    <label className="field">
                      <span>Interés</span>
                      <select
                        name="interest"
                        defaultValue={
                          opportunityEditor === "new"
                            ? "Arriendo"
                            : opportunityEditor.interest
                        }
                      >
                        {interests.map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Etapa</span>
                      <select
                        name="stage"
                        defaultValue={
                          opportunityEditor === "new"
                            ? "Nuevo"
                            : opportunityEditor.stage
                        }
                      >
                        {stages.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field wide">
                      <span>Inmueble de interés</span>
                      <select
                        name="property_id"
                        defaultValue={
                          opportunityEditor === "new"
                            ? ""
                            : opportunityEditor.property_id || ""
                        }
                      >
                        <option value="">
                          Búsqueda general, sin inmueble todavía
                        </option>
                        {data.properties
                          .filter(
                            (p) =>
                              !p.archived_at ||
                              (opportunityEditor !== "new" &&
                                p.id === opportunityEditor.property_id),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.archived_at ? " (archivado)" : ""}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Presupuesto (COP)</span>
                      <input
                        name="budget"
                        type="number"
                        min="0"
                        max="9999999999999"
                        defaultValue={
                          opportunityEditor === "new"
                            ? 0
                            : opportunityEditor.budget
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Próximo contacto</span>
                      <input
                        name="next_contact_on"
                        type="date"
                        min="1900-01-01"
                        max="2200-12-31"
                        defaultValue={
                          opportunityEditor === "new"
                            ? ""
                            : opportunityEditor.next_contact_on || ""
                        }
                      />
                    </label>
                    <label className="field wide">
                      <span>Próxima acción</span>
                      <input
                        name="next_action"
                        maxLength={300}
                        placeholder="Ej. Coordinar visita o enviar información"
                        defaultValue={
                          opportunityEditor === "new"
                            ? ""
                            : opportunityEditor.next_action
                        }
                      />
                    </label>
                    <label className="field wide">
                      <span>Notas de la oportunidad</span>
                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={5000}
                        defaultValue={
                          opportunityEditor === "new"
                            ? ""
                            : opportunityEditor.notes
                        }
                      />
                    </label>
                  </div>
                  <p className="crm-form-help">
                    Marca una compra como Cerrado cuando se haya concretado.
                    Para un arriendo, registra también su contrato para
                    gestionar cobros y pagos.
                  </p>
                  <div className="crm-form-actions">
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        if (canLeave()) setOpportunityEditor(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="button primary" type="submit">
                      {busy ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}{" "}
                      Guardar oportunidad
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
            {ops.length ? (
              <div className="person-opportunities">
                {ops.map((o) => (
                  <article key={o.id}>
                    <div>
                      <span
                        className={
                          "badge " + (o.stage === "Cerrado" ? "green" : "blue")
                        }
                      >
                        {o.interest} · {o.stage}
                      </span>
                      <h3>{o.property_name || "Búsqueda general"}</h3>
                      {o.budget > 0 && <p>Presupuesto: {cop(o.budget)}</p>}
                      {o.next_contact_on &&
                        !["Cerrado", "Descartado"].includes(o.stage) && (
                          <p
                            className={
                              o.next_contact_on <= data.today
                                ? "followup-due"
                                : ""
                            }
                          >
                            <CalendarDays size={14} />
                            {when(o.next_contact_on)} ·{" "}
                            {o.next_action || "Contactar"}
                          </p>
                        )}
                      {o.notes && (
                        <p className="opportunity-notes">{o.notes}</p>
                      )}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={
                        "Editar oportunidad de " +
                        (o.property_name || o.interest)
                      }
                      onClick={() => {
                        if (canLeave()) setOpportunityEditor(o);
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    {o.interest === "Arriendo" &&
                      o.stage === "Cerrado" &&
                      !data.leases.some(
                        (l) =>
                          l.tenant_id === person.id &&
                          l.property_id === o.property_id,
                      ) && (
                        <button
                          className="text-button"
                          onClick={() =>
                            onLease(person.id, o.property_id || undefined)
                          }
                        >
                          Crear contrato
                          <ArrowUpRight size={15} />
                        </button>
                      )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="crm-quiet-empty">
                <Building2 size={25} />
                <p>
                  Registra lo que busca y acompáñalo desde el primer contacto
                  hasta el cierre.
                </p>
              </div>
            )}
            <section className="person-timeline">
              <h2>Conversaciones y seguimiento</h2>
              <form className="activity-composer" onSubmit={logActivity}>
                <select
                  aria-label="Tipo de actividad"
                  value={noteKind}
                  onChange={(e) => setNoteKind(e.target.value)}
                >
                  {["Nota", "Llamada", "WhatsApp", "Correo", "Visita"].map(
                    (k) => (
                      <option key={k}>{k}</option>
                    ),
                  )}
                </select>
                <label className="sr-only" htmlFor="crm-note">
                  Detalle de la actividad
                </label>
                <textarea
                  id="crm-note"
                  disabled={!!opportunityEditor || busy}
                  required
                  rows={3}
                  maxLength={5000}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setDirty(!!e.target.value);
                  }}
                  placeholder="¿Qué conversaron? Registra el contexto y los acuerdos."
                />
                <button
                  className="button primary"
                  disabled={busy || !!opportunityEditor || !note.trim()}
                >
                  <Plus size={16} /> Registrar actividad
                </button>
              </form>
              {loadingActivity ? (
                <p className="inline-loading">
                  <LoaderCircle className="spin" size={16} /> Cargando
                  historial…
                </p>
              ) : activities.length ? (
                <ol className="activity-list">
                  {activities.map((a) => (
                    <li key={a.id}>
                      <span className="activity-dot" />
                      <div>
                        <header>
                          <strong>{a.kind}</strong>
                          <time dateTime={a.created_at}>
                            {when(a.created_at)}
                          </time>
                        </header>
                        <p>{a.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">
                  Aquí quedará el historial de la relación.
                </p>
              )}
            </section>
          </div>
        </div>
      ) : (
        <>
          <div className="crm-navigation">
            <div className="segmented">
              {[
                ["people", "Personas"],
                ["pipeline", "Oportunidades"],
                ["followups", `Seguimientos${overdue ? " · " + overdue : ""}`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o correo…"
                aria-label="Buscar personas"
              />
            </label>
          </div>
          {tab === "people" && (
            <>
              <div className="crm-role-filters">
                {[
                  ["all", "Todas"],
                  ["leads", "Interesados"],
                  ["tenants", "Arrendatarios"],
                  ["buyers", "Compradores"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {shown.length ? (
                <div className="section-box table-scroll">
                  <table className="people-table">
                    <thead>
                      <tr>
                        <th>Persona</th>
                        <th>Relación</th>
                        <th>Oportunidades</th>
                        <th>Próximo contacto</th>
                        <th>
                          <span className="sr-only">Abrir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((p) => {
                        const own = allOps.filter((o) => o.person_id === p.id),
                          next = followups.find((o) => o.person_id === p.id);
                        return (
                          <tr key={p.id}>
                            <td>
                              <button
                                className="person-row-button"
                                onClick={() => choose(p.id)}
                              >
                                <span>{p.name.slice(0, 1)}</span>
                                <div>
                                  <strong>{p.name}</strong>
                                  <small>
                                    {p.email ||
                                      p.phone ||
                                      "Sin contacto registrado"}
                                  </small>
                                </div>
                              </button>
                            </td>
                            <td>
                              <div className="person-role-labels">
                                {roles(p).map((r) => (
                                  <span
                                    className={
                                      "badge " +
                                      (r === "Interesado"
                                        ? "blue"
                                        : r === "Contacto"
                                          ? "neutral"
                                          : "green")
                                    }
                                    key={r}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {
                                own.filter(
                                  (o) =>
                                    !["Cerrado", "Descartado"].includes(
                                      o.stage,
                                    ),
                                ).length
                              }{" "}
                              abiertas
                            </td>
                            <td>
                              {next ? (
                                <>
                                  <span
                                    className={
                                      next.next_contact_on! <= data.today
                                        ? "followup-due"
                                        : ""
                                    }
                                  >
                                    {when(next.next_contact_on!)}
                                  </span>
                                  <small>
                                    {next.next_action || "Contactar"}
                                  </small>
                                </>
                              ) : (
                                <span className="muted">Sin programar</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={"Abrir ficha de " + p.name}
                                onClick={() => choose(p.id)}
                              >
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="portfolio-empty">
                  <UsersRound size={48} strokeWidth={1} />
                  <h2>
                    {allPeople.length
                      ? "No hay personas en esta vista"
                      : "Tu próxima relación empieza aquí"}
                  </h2>
                  <p>
                    {allPeople.length
                      ? "Prueba otra búsqueda o filtro."
                      : "Agrega interesados en comprar o arrendar. Después conecta sus oportunidades, contratos y seguimiento."}
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setPersonEditor("new")}
                  >
                    <Plus size={17} /> Nueva persona
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "pipeline" && (
            <div className="crm-pipeline">
              {stages.map((stage) => (
                <section key={stage}>
                  <header>
                    <h2>{stage}</h2>
                    <span>{ops.filter((o) => o.stage === stage).length}</span>
                  </header>
                  {ops
                    .filter((o) => o.stage === stage)
                    .map((o) => (
                      <article key={o.id}>
                        <button onClick={() => choose(o.person_id)}>
                          <strong>{o.person_name}</strong>
                          <span>
                            {o.interest} ·{" "}
                            {o.property_name || "Búsqueda general"}
                          </span>
                        </button>
                        {o.budget > 0 && <p>{cop(o.budget)}</p>}
                        <select
                          aria-label={
                            "Etapa de " +
                            o.person_name +
                            " para " +
                            (o.property_name || o.interest)
                          }
                          value={o.stage}
                          disabled={busy}
                          onChange={(e) =>
                            mutate(
                              "crm/opportunities/" + o.id,
                              "PATCH",
                              { ...o, stage: e.target.value },
                              "Etapa actualizada.",
                            )
                          }
                        >
                          {stages.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        {o.next_contact_on &&
                          !["Cerrado", "Descartado"].includes(o.stage) && (
                            <small>{when(o.next_contact_on)}</small>
                          )}
                      </article>
                    ))}
                  {!ops.some((o) => o.stage === stage) && (
                    <p className="pipeline-empty">Sin oportunidades</p>
                  )}
                </section>
              ))}
            </div>
          )}
          {tab === "followups" &&
            (followups.filter((o) =>
              allPeople.some((p) => p.id === o.person_id && matching(p)),
            ).length ? (
              <div className="followup-list">
                {followups
                  .filter((o) =>
                    allPeople.some((p) => p.id === o.person_id && matching(p)),
                  )
                  .map((o) => (
                    <button key={o.id} onClick={() => choose(o.person_id)}>
                      <CalendarDays size={22} />
                      <div>
                        <strong>
                          {o.next_action || "Contactar a " + o.person_name}
                        </strong>
                        <span>
                          {o.person_name} · {o.interest} ·{" "}
                          {o.property_name || "Búsqueda general"}
                        </span>
                      </div>
                      <time
                        className={
                          o.next_contact_on! <= data.today ? "followup-due" : ""
                        }
                      >
                        {when(o.next_contact_on!)}
                      </time>
                      <ChevronRight size={18} />
                    </button>
                  ))}
              </div>
            ) : (
              <div className="portfolio-empty">
                <CalendarDays size={45} strokeWidth={1} />
                <h2>Tu agenda está despejada</h2>
                <p>
                  Programa el próximo contacto en cada oportunidad para darle
                  continuidad a la relación.
                </p>
              </div>
            ))}
        </>
      )}
    </section>
  );
}
