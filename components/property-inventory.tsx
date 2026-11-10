"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Plus,
  Search,
  Download,
  Pencil,
  Archive,
  RotateCcw,
  ClipboardList,
  DoorOpen,
  Camera,
  Check,
  LoaderCircle,
  X,
  AlertCircle,
  ChevronRight,
  History,
  Copy,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  categories,
  conditions,
  units,
  quickCatalog,
} from "@/lib/inventory-domain";
import { PhotoGallery } from "./photo-gallery";
import type {
  Property,
  PropertyInventoryData,
  InventoryItem,
  PropertySpace,
  InventoryHistory,
} from "@/lib/types";
const formatMoney = (n: number | string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n));
const tone = (s: string) =>
  s === "Bueno" || s === "Nuevo"
    ? "green"
    : s === "Malo" || s === "No funciona"
      ? "red"
      : s === "Regular"
        ? "amber"
        : "neutral";
const dateLabel = (s: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(s.length === 10 ? s + "T12:00:00Z" : s));
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"field " + (wide ? "wide" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}
type Action =
  | { type: "item"; item?: InventoryItem; duplicate?: boolean }
  | { type: "space"; space?: PropertySpace }
  | { type: "bulk" }
  | { type: "archive"; item: InventoryItem };
export default function PropertyInventory({
  properties,
  propertyId,
  onPropertyChange,
  onChanged,
  onCreateProperty,
  embedded = false,
}: {
  embedded?: boolean;
  properties: Property[];
  propertyId: string;
  onPropertyChange: (id: string) => void;
  onChanged: () => Promise<unknown>;
  onCreateProperty: () => void;
}) {
  const [data, setData] = useState<PropertyInventoryData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [space, setSpace] = useState("all"),
    [search, setSearch] = useState(""),
    [condition, setCondition] = useState("all"),
    [category, setCategory] = useState("all"),
    [archived, setArchived] = useState(false),
    [action, setAction] = useState<Action | null>(null);
  const [history, setHistory] = useState<InventoryHistory[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [historyError, setHistoryError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    api("inventory/" + propertyId)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [propertyId]);
  useEffect(() => {
    if (action) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [action]);
  const editingId =
    action?.type === "item" && !action.duplicate ? action.item?.id : null;
  useEffect(() => {
    let alive = true;
    setHistory([]);
    setHistoryError("");
    if (!editingId) return;
    setHistoryLoading(true);
    api("inventory-items/" + editingId + "/history")
      .then((h) => {
        if (alive) setHistory(h);
      })
      .catch((e) => {
        if (alive) setHistoryError(e.message);
      })
      .finally(() => {
        if (alive) setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [editingId, data]);
  async function reload() {
    const d = await api("inventory/" + propertyId);
    setData(d);
    await onChanged();
  }
  function open(value: Action) {
    setError("");
    setNotice("");
    setAction(value);
  }
  async function mutate(
    path: string,
    method: string,
    body: unknown,
    message: string,
    keepItem = false,
  ) {
    setBusy(true);
    setError("");
    try {
      const result = await api(path, method, body);
      setNotice(message);
      if (keepItem) setAction({ type: "item", item: result });
      else setAction(null);
      try {
        await reload();
      } catch {
        setError(
          "El cambio quedó guardado. Recarga la página para actualizar la lista.",
        );
      }
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!properties.length)
    return (
      <section className="section-box">
        <div className="empty">
          <div className="empty-icon">
            <ClipboardList size={27} />
          </div>
          <h3>Un inventario para cada inmueble</h3>
          <p>
            Primero registra el inmueble. Después podrás organizar sus espacios,
            elementos y fotos.
          </p>
          <button className="button primary" onClick={onCreateProperty}>
            <Plus size={16} />
            Crear inmueble
          </button>
        </div>
      </section>
    );
  const readonly = !!data?.property.archived_at;
  const active = data?.items.filter((i) => !i.archived_at) || [];
  const filtered = (data?.items || []).filter(
    (i) =>
      (archived ? !!i.archived_at : !i.archived_at) &&
      (space === "all" ||
        (space === "none" && !i.space_id) ||
        i.space_id === space) &&
      (condition === "all" || i.condition === condition) &&
      (category === "all" || i.category === category) &&
      [
        i.name,
        i.category,
        i.brand,
        i.model,
        i.serial_number,
        i.space_name,
        i.notes,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const selectedSpace = data?.spaces.find((s) => s.id === space);
  return (
    <div className="inventory-page">
      <div className="inventory-property-bar">
        {!embedded && (
          <Field label="Inmueble">
            <select
              aria-label="Inmueble del inventario"
              value={propertyId}
              disabled={busy}
              onChange={(e) => {
                setSpace("all");
                setSearch("");
                setCondition("all");
                setCategory("all");
                setArchived(false);
                onPropertyChange(e.target.value);
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.archived_at ? " · Archivado" : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <a className="button" href={"/api/inventory/" + propertyId + "/export"}>
          <Download size={16} />
          Exportar inventario
        </a>
      </div>
      {error && !action && (
        <div className="error" role="alert">
          <AlertCircle size={17} />
          {error}
          <button
            className="text-button"
            onClick={() => reload().catch((e) => setError(e.message))}
          >
            Reintentar
          </button>
        </div>
      )}
      {loading ? (
        <div className="inventory-loading">
          <LoaderCircle className="spin" size={23} />
          Cargando el expediente…
        </div>
      ) : (
        data && (
          <>
            {readonly && (
              <p className="form-info">
                Este inmueble está archivado. Sus fotos e inventario se
                conservan para consulta.
              </p>
            )}
            {!embedded && (
              <PhotoGallery
                propertyId={propertyId}
                photos={data.photos}
                readonly={readonly}
                onChanged={reload}
              />
            )}
            <div className="inventory-section-heading">
              <div>
                <h2>Inventario completo</h2>
                <p>
                  {active.length} registros · {data.spaces.length} espacios ·{" "}
                  {active.filter((i) => i.condition === "Por revisar").length}{" "}
                  por revisar
                </p>
              </div>
              {!readonly && (
                <div className="toolbar-actions">
                  <button
                    className="button"
                    onClick={() => open({ type: "bulk" })}
                  >
                    <ClipboardList size={16} />
                    Agregar varios
                  </button>
                  <button
                    className="button primary"
                    onClick={() => open({ type: "item" })}
                  >
                    <Plus size={16} />
                    Nuevo elemento
                  </button>
                </div>
              )}
            </div>
            {notice && (
              <p className="inventory-notice" role="status">
                <Check size={16} />
                {notice}
              </p>
            )}
            <div className="inventory-layout">
              <aside
                className="spaces-sidebar"
                aria-label="Espacios del inmueble"
              >
                <div className="section-line">
                  <h3>Espacios</h3>
                  {!readonly && (
                    <button
                      className="icon-button"
                      aria-label="Crear espacio"
                      title="Crear espacio"
                      onClick={() => open({ type: "space" })}
                    >
                      <Plus size={17} />
                    </button>
                  )}
                </div>
                <nav aria-label="Filtrar por espacio">
                  <button
                    className={space === "all" ? "selected" : ""}
                    onClick={() => setSpace("all")}
                  >
                    <ClipboardList size={16} />
                    <span>Todo el inmueble</span>
                    <small>{active.length}</small>
                  </button>
                  {data.spaces.map((s) => (
                    <button
                      key={s.id}
                      className={space === s.id ? "selected" : ""}
                      onClick={() => setSpace(s.id)}
                    >
                      <DoorOpen size={16} />
                      <span>
                        {s.name}
                        {s.floor && <small>{s.floor}</small>}
                      </span>
                      <small>
                        {active.filter((i) => i.space_id === s.id).length}
                      </small>
                    </button>
                  ))}
                  <button
                    className={space === "none" ? "selected" : ""}
                    onClick={() => setSpace("none")}
                  >
                    <span>Sin espacio asignado</span>
                    <small>{active.filter((i) => !i.space_id).length}</small>
                  </button>
                </nav>
                {!data.spaces.length && (
                  <p className="spaces-help">
                    Crea espacios como cocina, baño, habitación o zona exterior
                    para organizar cada detalle.
                  </p>
                )}
              </aside>
              <div className="inventory-list">
                <div className="inventory-list-heading">
                  <h3>
                    {selectedSpace?.name ||
                      (space === "none"
                        ? "Sin espacio asignado"
                        : "Todos los elementos")}
                  </h3>
                  {selectedSpace && !readonly && (
                    <button
                      className="text-button"
                      onClick={() =>
                        open({ type: "space", space: selectedSpace })
                      }
                    >
                      <Pencil size={14} />
                      Editar espacio
                    </button>
                  )}
                </div>
                {selectedSpace?.notes && (
                  <p className="space-notes">{selectedSpace.notes}</p>
                )}
                <div className="inventory-filters">
                  <label className="search">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Buscar elemento"
                      placeholder="Buscar elemento, marca o serial…"
                    />
                  </label>
                  <select
                    aria-label="Filtrar estado del inventario"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    {conditions.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar categoría del inventario"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">Todas las categorías</option>
                    {Array.from(new Set(data.items.map((i) => i.category)))
                      .sort()
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </div>
                <label className="checkbox inventory-archived">
                  <input
                    type="checkbox"
                    checked={archived}
                    onChange={(e) => setArchived(e.target.checked)}
                  />
                  Ver elementos archivados
                </label>
                {filtered.length ? (
                  <div className="table-scroll">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Elemento</th>
                          <th>Cantidad</th>
                          <th>Estado</th>
                          <th>
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((i) => {
                          const image = data.photos.find(
                            (p) =>
                              p.inventory_item_id === i.id && !p.archived_at,
                          );
                          return (
                            <tr key={i.id}>
                              <td>
                                <button
                                  className="inventory-item-link"
                                  onClick={() =>
                                    open({ type: "item", item: i })
                                  }
                                >
                                  {image ? (
                                    <img
                                      src={
                                        "/api/photos/" + image.id + "/thumbnail"
                                      }
                                      width={40}
                                      height={40}
                                      loading="lazy"
                                      alt=""
                                    />
                                  ) : (
                                    <span className="inventory-item-icon">
                                      <ClipboardList size={18} />
                                    </span>
                                  )}
                                  <span>
                                    <strong>{i.name}</strong>
                                    <small>
                                      {i.space_name || "Sin espacio"} ·{" "}
                                      {i.category}
                                    </small>
                                    {i.brand && (
                                      <small>
                                        {i.brand}
                                        {i.model ? " · " + i.model : ""}
                                      </small>
                                    )}
                                  </span>
                                </button>
                              </td>
                              <td className="inventory-quantity">
                                {Number(i.quantity).toLocaleString("es-CO")}
                                <small>{i.unit}</small>
                              </td>
                              <td>
                                <span className={"badge " + tone(i.condition)}>
                                  <span />
                                  {i.condition}
                                </span>
                                {i.inspected_on && (
                                  <small>
                                    Revisado {dateLabel(i.inspected_on)}
                                  </small>
                                )}
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={"Ver " + i.name}
                                  onClick={() =>
                                    open({ type: "item", item: i })
                                  }
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
                  <div className="empty inventory-empty">
                    <ClipboardList size={30} strokeWidth={1.4} />
                    <h3>
                      {search || category !== "all" || condition !== "all"
                        ? "Sin coincidencias"
                        : archived
                          ? "Sin elementos archivados"
                          : "Cada detalle tiene su lugar"}
                    </h3>
                    <p>
                      {search || category !== "all" || condition !== "all"
                        ? "Prueba otro filtro o término de búsqueda."
                        : "Registra tomas, interruptores, lavabos, inodoros, clósets, acabados y cualquier otro elemento. Las categorías y los nombres son personalizables."}
                    </p>
                    {!readonly && !archived && (
                      <button
                        className="button"
                        onClick={() => open({ type: "item" })}
                      >
                        <Plus size={16} />
                        Agregar elemento
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
      <dialog
        className="inventory-dialog"
        aria-labelledby={dialogTitleId}
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setAction(null);
        }}
        onClose={() => setAction(null)}
      >
        {action && data && (
          <>
            <div className="panel-header">
              <div>
                <h2 id={dialogTitleId}>
                  {action.type === "item"
                    ? action.duplicate
                      ? "Duplicar elemento"
                      : action.item
                        ? "Ficha del elemento"
                        : "Nuevo elemento"
                    : action.type === "space"
                      ? action.space
                        ? "Editar espacio"
                        : "Nuevo espacio"
                      : action.type === "bulk"
                        ? "Agregar varios elementos"
                        : "Archivar elemento"}
                </h2>
                <p>{data.property.name}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar inventario"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                <X size={22} />
              </button>
            </div>
            {error && (
              <div className="error panel-error" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
            {notice && (
              <p className="inventory-notice" role="status">
                <Check size={16} />
                {notice}
              </p>
            )}
            {action.type === "item" && (
              <>
                <ItemForm
                  key={(action.item?.id || "new") + !!action.duplicate}
                  item={action.item}
                  duplicate={action.duplicate}
                  propertyId={propertyId}
                  spaces={data.spaces}
                  initialSpace={
                    space === "all" || space === "none" ? "" : space
                  }
                  readonly={
                    readonly ||
                    (!!action.item?.archived_at && !action.duplicate)
                  }
                  busy={busy}
                  onSave={(values) =>
                    mutate(
                      "inventory-items" +
                        (action.item && !action.duplicate
                          ? "/" + action.item.id
                          : ""),
                      action.item && !action.duplicate ? "PATCH" : "POST",
                      values,
                      "Elemento guardado.",
                      true,
                    )
                  }
                />
                {action.item && !action.duplicate && (
                  <div className="inventory-dialog-extra">
                    <PhotoGallery
                      propertyId={propertyId}
                      itemId={action.item.id}
                      photos={data.photos}
                      title="Fotos del elemento"
                      readonly={readonly || !!action.item.archived_at}
                      onChanged={reload}
                    />
                    <details className="inventory-history">
                      <summary>
                        <History size={16} />
                        Historial de cambios
                      </summary>
                      {historyLoading ? (
                        <p>Cargando historial…</p>
                      ) : historyError ? (
                        <p role="alert">{historyError}</p>
                      ) : (
                        history.map((h) => (
                          <details key={h.id} className="history-entry">
                            <summary>
                              <strong>{h.action}</strong>
                              <span>{dateLabel(h.created_at)}</span>
                            </summary>
                            <dl>
                              <dt>Elemento</dt>
                              <dd>{h.snapshot.name}</dd>
                              <dt>Cantidad</dt>
                              <dd>
                                {h.snapshot.quantity} {h.snapshot.unit}
                              </dd>
                              <dt>Estado</dt>
                              <dd>{h.snapshot.condition}</dd>
                              <dt>Espacio</dt>
                              <dd>
                                {data.spaces.find(
                                  (s) => s.id === h.snapshot.space_id,
                                )?.name || "Sin espacio"}
                              </dd>
                              <dt>Notas</dt>
                              <dd>{h.snapshot.notes || "Sin notas"}</dd>
                            </dl>
                            <dl>
                              {[
                                ["Marca", h.snapshot.brand],
                                ["Modelo", h.snapshot.model],
                                ["Serial", h.snapshot.serial_number],
                                ["Material", h.snapshot.material],
                                ["Color", h.snapshot.color],
                                ["Medidas", h.snapshot.dimensions],
                                ["Categoría", h.snapshot.category],
                                [
                                  "Valor unitario",
                                  formatMoney(h.snapshot.unit_value),
                                ],
                                ["Pertenece a", h.snapshot.ownership],
                                ...h.snapshot.attributes.map((a) => [
                                  a.name,
                                  a.value,
                                ]),
                              ]
                                .filter(([, v]) => v)
                                .map(([k, v], idx) => (
                                  <div className="history-field" key={idx}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                  </div>
                                ))}
                            </dl>
                          </details>
                        ))
                      )}
                    </details>
                    {!readonly && (
                      <div className="inventory-record-actions">
                        {action.item.archived_at ? (
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() =>
                              mutate(
                                "inventory-items/" + action.item!.id,
                                "PATCH",
                                { archived: false },
                                "Elemento restaurado.",
                              )
                            }
                          >
                            <RotateCcw size={16} />
                            Restaurar elemento
                          </button>
                        ) : (
                          <>
                            <button
                              className="button"
                              onClick={() =>
                                open({
                                  type: "item",
                                  item: action.item,
                                  duplicate: true,
                                })
                              }
                            >
                              <Copy size={15} />
                              Duplicar elemento
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                open({ type: "archive", item: action.item! })
                              }
                            >
                              <Archive size={15} />
                              Archivar elemento
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {action.type === "space" && (
              <SpaceForm
                space={action.space}
                busy={busy}
                onSave={(values) =>
                  mutate(
                    "spaces" + (action.space ? "/" + action.space.id : ""),
                    action.space ? "PATCH" : "POST",
                    { ...values, property_id: propertyId },
                    "Espacio guardado.",
                  )
                }
                onDelete={
                  action.space
                    ? () =>
                        mutate(
                          "spaces/" + action.space!.id,
                          "DELETE",
                          undefined,
                          "Espacio eliminado.",
                        )
                    : undefined
                }
              />
            )}
            {action.type === "bulk" && (
              <BulkForm
                spaces={data.spaces}
                initialSpace={space === "all" || space === "none" ? "" : space}
                busy={busy}
                onSave={(items) =>
                  mutate(
                    "inventory-items/batch",
                    "POST",
                    {
                      items: items.map((i) => ({
                        ...i,
                        property_id: propertyId,
                      })),
                    },
                    `${items.length} elementos agregados.`,
                  )
                }
              />
            )}
            {action.type === "archive" && (
              <div className="panel-form">
                <p>
                  Se archivará <strong>{action.item.name}</strong>. Sus fotos e
                  historial se conservarán y podrás restaurarlo desde «Ver
                  elementos archivados».
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      "inventory-items/" + action.item.id,
                      "PATCH",
                      { archived: true },
                      "Elemento archivado.",
                    )
                  }
                >
                  <Archive size={16} />
                  Confirmar archivo
                </button>
              </div>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
function ItemForm({
  item,
  duplicate,
  propertyId,
  spaces,
  initialSpace,
  readonly,
  busy,
  onSave,
}: {
  item?: InventoryItem;
  duplicate?: boolean;
  propertyId: string;
  spaces: PropertySpace[];
  initialSpace: string;
  readonly: boolean;
  busy: boolean;
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
}) {
  const [attributes, setAttributes] = useState(item?.attributes || []);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    onSave({ ...values, property_id: propertyId, attributes });
  };
  return (
    <form className="panel-form inventory-item-form" onSubmit={submit}>
      <fieldset disabled={readonly || busy}>
        <div className="form-grid">
          <Field label="Nombre del elemento *" wide>
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={
                item ? item.name + (duplicate ? " (copia)" : "") : ""
              }
              placeholder="Ej. Tomacorriente doble, clóset, lavabo…"
            />
          </Field>
          <Field label="Espacio">
            <select
              name="space_id"
              defaultValue={item?.space_id || initialSpace}
            >
              <option value="">Sin espacio asignado</option>
              {spaces.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoría *">
            <input
              name="category"
              list="inventory-categories"
              required
              maxLength={100}
              defaultValue={item?.category || "General"}
            />
            <datalist id="inventory-categories">
              {categories.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Cantidad *">
            <input
              type="number"
              name="quantity"
              required
              min="0.01"
              max="9999999999.99"
              step="0.01"
              defaultValue={item?.quantity || 1}
            />
          </Field>
          <Field label="Unidad *">
            <input
              name="unit"
              required
              maxLength={30}
              list="inventory-units"
              defaultValue={item?.unit || "unidad"}
            />
            <datalist id="inventory-units">
              {units.map((u) => (
                <option value={u} key={u} />
              ))}
            </datalist>
          </Field>
          <Field label="Estado *">
            <select
              name="condition"
              defaultValue={item?.condition || "Por revisar"}
            >
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de revisión">
            <input
              type="date"
              name="inspected_on"
              min="1900-01-01"
              max={new Intl.DateTimeFormat("sv-SE", {
                timeZone: "America/Bogota",
              }).format(new Date())}
              defaultValue={duplicate ? "" : item?.inspected_on || ""}
            />
          </Field>
          <Field label="Observaciones" wide>
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              defaultValue={item?.notes}
              placeholder="Ubicación exacta, daños, piezas faltantes, funcionamiento…"
            />
          </Field>
        </div>
        <details className="inventory-extra-fields">
          <summary>Marca, medidas y otros detalles</summary>
          <div className="form-grid">
            {(
              [
                { name: "brand", label: "Marca" },
                { name: "model", label: "Modelo" },
                { name: "serial_number", label: "Serial / identificador" },
                { name: "material", label: "Material" },
                { name: "color", label: "Color" },
                { name: "dimensions", label: "Medidas" },
              ] as const
            ).map((f) => (
              <Field key={f.name} label={f.label}>
                <input
                  name={f.name}
                  maxLength={200}
                  defaultValue={
                    duplicate && f.name === "serial_number"
                      ? ""
                      : item?.[f.name]
                  }
                />
              </Field>
            ))}
            <Field label="Valor por unidad (COP)">
              <input
                name="unit_value"
                type="number"
                min="0"
                max="9999999999999"
                step="1"
                defaultValue={item?.unit_value || 0}
              />
            </Field>
            <Field label="Pertenece a">
              <select
                name="ownership"
                defaultValue={item?.ownership || "Propietario"}
              >
                <option>Propietario</option>
                <option>Arrendatario</option>
                <option>Otro</option>
              </select>
            </Field>
          </div>
        </details>
        <section className="custom-attributes">
          <h3>Detalles personalizados</h3>
          <p>
            Agrega cualquier característica: voltaje, número de llaves, acabado,
            lectura del medidor…
          </p>
          {attributes.map((a, i) => (
            <div className="attribute-row" key={i}>
              <input
                aria-label={"Nombre del detalle " + (i + 1)}
                placeholder="Característica"
                required
                maxLength={80}
                value={a.name}
                onChange={(e) =>
                  setAttributes(
                    attributes.map((v, j) =>
                      j === i ? { ...v, name: e.target.value } : v,
                    ),
                  )
                }
              />
              <input
                aria-label={"Valor del detalle " + (i + 1)}
                placeholder="Valor o descripción"
                maxLength={500}
                value={a.value}
                onChange={(e) =>
                  setAttributes(
                    attributes.map((v, j) =>
                      j === i ? { ...v, value: e.target.value } : v,
                    ),
                  )
                }
              />
              <button
                className="icon-button"
                type="button"
                aria-label={"Quitar detalle " + (i + 1)}
                onClick={() =>
                  setAttributes(attributes.filter((_, j) => i !== j))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {!readonly && attributes.length < 30 && (
            <button
              className="text-button"
              type="button"
              onClick={() =>
                setAttributes([...attributes, { name: "", value: "" }])
              }
            >
              <Plus size={15} />
              Agregar característica
            </button>
          )}
        </section>
        {!readonly && (
          <div className="form-footer">
            <span>
              {item && !duplicate
                ? "Conservaremos el historial del cambio."
                : "Después de guardar podrás agregar fotos."}
            </span>
            <button className="button primary" disabled={busy}>
              <Check size={16} />
              {busy
                ? "Guardando…"
                : item && !duplicate
                  ? "Guardar cambios"
                  : "Crear elemento"}
            </button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
function SpaceForm({
  space,
  busy,
  onSave,
  onDelete,
}: {
  space?: PropertySpace;
  busy: boolean;
  onSave: (v: Record<string, FormDataEntryValue>) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      className="panel-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <fieldset disabled={busy}>
        <div className="form-grid">
          <Field label="Nombre del espacio *" wide>
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={space?.name}
              list="space-names"
              placeholder="Ej. Baño principal, cocina, habitación 2"
            />
            <datalist id="space-names">
              {[
                "Cocina",
                "Sala",
                "Comedor",
                "Baño principal",
                "Baño social",
                "Habitación principal",
                "Habitación 2",
                "Zona de ropas",
                "Balcón",
                "Terraza",
                "Garaje",
                "Jardín",
                "Fachada",
                "Áreas comunes",
              ].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Piso o zona" wide>
            <input
              name="floor"
              maxLength={80}
              defaultValue={space?.floor}
              placeholder="Ej. Primer piso / zona exterior"
            />
          </Field>
          <Field label="Descripción" wide>
            <textarea
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={space?.notes}
            />
          </Field>
        </div>
        <div className="form-footer">
          <span>Organiza cada rincón del inmueble.</span>
          <button className="button primary" disabled={busy}>
            <Check size={16} />
            Guardar espacio
          </button>
        </div>
        {onDelete && (
          <div className="space-delete">
            {confirm ? (
              <>
                <p>
                  Solo se eliminará si no contiene elementos, incluidos los
                  archivados.
                </p>
                <button className="button" type="button" onClick={onDelete}>
                  Confirmar eliminación
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setConfirm(false)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                className="text-button"
                type="button"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} />
                Eliminar espacio vacío
              </button>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}
function BulkForm({
  spaces,
  initialSpace,
  busy,
  onSave,
}: {
  spaces: PropertySpace[];
  initialSpace: string;
  busy: boolean;
  onSave: (items: Record<string, unknown>[]) => Promise<unknown>;
}) {
  const [selected, setSelected] = useState<
    Record<string, { name: string; category: string; quantity: string }>
  >({});
  const [search, setSearch] = useState("");
  return (
    <form
      className="panel-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave(
          Object.values(selected).map((i) => ({
            ...i,
            space_id: f.get("space_id"),
            condition: f.get("condition"),
            unit: "unidad",
          })),
        );
      }}
    >
      <fieldset disabled={busy}>
        <p className="table-note">
          Selecciona únicamente los elementos que existen y confirma sus
          cantidades. Siempre puedes crear elementos y categorías
          personalizados.
        </p>
        <div className="form-grid">
          <Field label="Espacio">
            <select name="space_id" defaultValue={initialSpace}>
              <option value="">Sin espacio asignado</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado inicial">
            <select name="condition">
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="search quick-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en la lista rápida…"
            aria-label="Buscar en lista rápida"
          />
        </label>
        <div className="quick-catalog">
          {Object.entries(quickCatalog).map(([category, names]) => {
            const filtered = names.filter((n) =>
              (n + " " + category)
                .toLocaleLowerCase("es")
                .includes(search.toLocaleLowerCase("es")),
            );
            return filtered.length ? (
              <section key={category}>
                <h3>{category}</h3>
                {filtered.map((name) => {
                  const key = category + ":" + name;
                  return (
                    <div className="quick-option" key={key}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={!!selected[key]}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelected({
                                ...selected,
                                [key]: { name, category, quantity: "1" },
                              });
                            else {
                              const next = { ...selected };
                              delete next[key];
                              setSelected(next);
                            }
                          }}
                        />
                        {name}
                      </label>
                      {selected[key] && (
                        <label className="quick-quantity">
                          <span>Cantidad</span>
                          <input
                            type="number"
                            required
                            min="0.01"
                            max="9999999999.99"
                            step="0.01"
                            aria-label={"Cantidad de " + name}
                            value={selected[key].quantity}
                            onChange={(e) =>
                              setSelected({
                                ...selected,
                                [key]: {
                                  ...selected[key],
                                  quantity: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </section>
            ) : null;
          })}
        </div>
        <div className="form-footer">
          <span>
            {Object.keys(selected).length} elementos seleccionados · Unidad
            inicial: unidad; editable después.
          </span>
          <button
            className="button primary"
            disabled={busy || !Object.keys(selected).length}
          >
            <Plus size={16} />
            {busy ? "Guardando…" : "Agregar selección"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
