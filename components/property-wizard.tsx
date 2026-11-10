"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type DragEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Maximize,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Building2,
  BedDouble,
  Bath,
  X,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { cop } from "./property-board";
type Upload = { id: string; file: File; url: string };
type Suggestion = {
  title: string;
  description: string;
  highlights: string[];
  review_notes: string[];
};
const steps = ["Fotos", "Datos", "Descripción", "Revisión"];
export default function PropertyWizard({
  onCancel,
  onCreated,
  onDirtyChange,
}: {
  onCancel: () => void;
  onCreated: (id: string) => Promise<void>;
  onDirtyChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState(0),
    [files, setFiles] = useState<Upload[]>([]),
    [dragging, setDragging] = useState(false),
    [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState(false),
    [error, setError] = useState(""),
    [aiEnabled, setAiEnabled] = useState(false),
    [aiStatusError, setAiStatusError] = useState(false),
    [suggestion, setSuggestion] = useState<Suggestion | null>(null),
    [tone, setTone] = useState("Profesional"),
    [features, setFeatures] = useState("");
  const [values, setValues] = useState({
    name: "",
    kind: "Apartamento",
    city: "",
    address: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    monthly_rent: "",
    administration: "",
    neighborhood: "",
    title: "",
    description: "",
  });
  const [creationKey] = useState(() => crypto.randomUUID());
  const form = useRef<HTMLFormElement>(null),
    title = useRef<HTMLHeadingElement>(null),
    urls = useRef(new Set<string>());
  const dirty =
    files.length > 0 ||
    Object.entries(values).some(([k, v]) => k !== "kind" && !!v) ||
    !!features;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const current = urls.current;
    return () => current.forEach(URL.revokeObjectURL);
  }, []);
  useEffect(() => {
    let alive = true;
    api("ai/status")
      .then((r) => {
        if (alive) setAiEnabled(r.enabled);
      })
      .catch(() => {
        if (alive) setAiStatusError(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    title.current?.focus();
  }, [step]);
  function set(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }
  function addFiles(incoming: File[]) {
    setError("");
    const unique = incoming.filter(
      (f) =>
        !files.some(
          (p) =>
            p.file.name === f.name &&
            p.file.size === f.size &&
            p.file.lastModified === f.lastModified,
        ),
    );
    if (
      files.length + unique.length > 12 ||
      unique.some((f) => f.size > 10 * 1024 * 1024) ||
      [...files.map((p) => p.file), ...unique].reduce((n, f) => n + f.size, 0) >
        50 * 1024 * 1024
    ) {
      setError(
        "Agrega hasta 12 fotos, máximo 10 MB por foto y 50 MB en total.",
      );
      return;
    }
    if (
      unique.some(
        (f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type),
      )
    ) {
      setError("Usa fotos JPG, PNG o WebP.");
      return;
    }
    setFiles((old) => [
      ...old,
      ...unique.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { id: crypto.randomUUID(), file, url };
      }),
    ]);
  }
  function remove(id: string) {
    const image = files.find((f) => f.id === id);
    if (image) {
      URL.revokeObjectURL(image.url);
      urls.current.delete(image.url);
    }
    setFiles((old) => old.filter((f) => f.id !== id));
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) addFiles(Array.from(e.dataTransfer.files));
  }
  async function generate() {
    setGenerating(true);
    setError("");
    setSuggestion(null);
    try {
      const f = new FormData();
      f.set(
        "facts",
        JSON.stringify({
          kind: values.kind,
          city: values.city,
          neighborhood: values.neighborhood,
          area: Number(values.area),
          bedrooms: Number(values.bedrooms),
          bathrooms: Number(values.bathrooms),
          features,
          tone,
        }),
      );
      files.slice(0, 6).forEach((p) => f.append("files", p.file));
      setSuggestion(await api("ai/description", "POST", f));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const f = new FormData();
      f.set("creation_key", creationKey);
      f.set(
        "data",
        JSON.stringify({
          ...values,
          area: Number(values.area),
          bedrooms: Number(values.bedrooms),
          bathrooms: Number(values.bathrooms),
          listing: {
            title: values.title || values.name,
            description: values.description,
            monthly_rent: Number(values.monthly_rent),
            administration: Number(values.administration),
            neighborhood: values.neighborhood,
          },
        }),
      );
      files.forEach((p) => f.append("files", p.file));
      const p = await api("properties/create", "POST", f);
      onDirtyChange(false);
      await onCreated(p.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="property-wizard">
      <header className="wizard-header">
        <button
          className="back-to-properties"
          disabled={busy || generating}
          onClick={onCancel}
        >
          <ArrowLeft size={17} /> Volver a inmuebles
        </button>
        <span>Nuevo inmueble</span>
        <button
          className="icon-button"
          aria-label="Cerrar asistente"
          disabled={busy || generating}
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </header>
      <nav
        className="wizard-progress"
        aria-label="Pasos para crear el inmueble"
      >
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={i > step || busy || generating}
            onClick={() => {
              setStep(i);
              setError("");
            }}
            aria-current={step === i ? "step" : undefined}
          >
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="wizard-layout">
        <form ref={form} onSubmit={next} className="wizard-form">
          <fieldset disabled={busy}>
            <div className="wizard-step-heading">
              <h1 ref={title} tabIndex={-1}>
                {
                  [
                    "Empecemos por lo que lo hace único.",
                    "Dale un lugar en tu portafolio.",
                    "Las fotos abren la puerta. Tus palabras invitan a entrar.",
                    "Todo listo para tu próximo inmueble.",
                  ][step]
                }
              </h1>
              <p>
                {
                  [
                    "Sube las fotos de tu inmueble. La primera será su portada.",
                    "Solo los datos esenciales. Puedes completar los demás detalles después.",
                    "Crea un borrador con IA o escribe tu descripción. Tú tienes la última palabra.",
                    "Revisa la información antes de guardarla. El anuncio quedará como borrador.",
                  ][step]
                }
              </p>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {step === 0 && (
              <>
                <label
                  className={"wizard-dropzone " + (dragging ? "dragging" : "")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={drop}
                >
                  <span className="wizard-upload-icon">
                    <ImagePlus size={32} />
                  </span>
                  <strong>
                    {files.length
                      ? "Agrega más perspectivas"
                      : "Arrastra tus fotos aquí"}
                  </strong>
                  <span>o haz clic para elegirlas</span>
                  <small>JPG, PNG o WebP · Hasta 12 fotos</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    aria-label="Elegir fotos del nuevo inmueble"
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                  />
                </label>
                {files.length > 0 && (
                  <div className="wizard-photo-grid">
                    {files.map((p, i) => (
                      <div key={p.id}>
                        <img src={p.url} alt={p.file.name} />
                        <span className="wizard-photo-number">
                          {i === 0 ? "Portada" : i + 1}
                        </span>
                        <div>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={"Eliminar " + p.file.name}
                            onClick={() => remove(p.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                          {i > 0 && (
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={"Usar como portada " + p.file.name}
                              onClick={() =>
                                setFiles((old) => [
                                  p,
                                  ...old.filter((f) => f.id !== p.id),
                                ])
                              }
                            >
                              <Star size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="wizard-help">
                  Una vista general, la zona social, las habitaciones y los
                  detalles ayudan a contar mejor la historia del espacio.
                </p>
              </>
            )}
            {step === 1 && (
              <div className="wizard-fields">
                <label className="field">
                  <span>¿Cómo lo identificarás? *</span>
                  <input
                    required
                    maxLength={200}
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ej. Apartamento Cedritos 302"
                  />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>Tipo de inmueble</span>
                    <select
                      value={values.kind}
                      onChange={(e) => set("kind", e.target.value)}
                    >
                      {[
                        "Apartamento",
                        "Casa",
                        "Local",
                        "Oficina",
                        "Bodega",
                        "Lote",
                        "Otro",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Ciudad *</span>
                    <input
                      required
                      maxLength={200}
                      value={values.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Ej. Bogotá"
                    />
                  </label>
                  <label className="field wide">
                    <span>Dirección *</span>
                    <input
                      required
                      maxLength={200}
                      value={values.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Calle, número y unidad"
                    />
                    <small>
                      La dirección exacta permanece privada hasta que decidas
                      mostrarla.
                    </small>
                  </label>
                  <label className="field">
                    <span>Barrio o sector</span>
                    <input
                      value={values.neighborhood}
                      maxLength={120}
                      onChange={(e) => set("neighborhood", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Área (m²)</span>
                    <input
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      value={values.area}
                      onChange={(e) => set("area", e.target.value)}
                      placeholder="Ej. 80"
                    />
                  </label>
                  <label className="field">
                    <span>Habitaciones</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={values.bedrooms}
                      onChange={(e) => set("bedrooms", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Baños</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={values.bathrooms}
                      onChange={(e) => set("bathrooms", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Canon de arriendo (COP)</span>
                    <input
                      type="number"
                      min="0"
                      max="9999999999999"
                      value={values.monthly_rent}
                      onChange={(e) => set("monthly_rent", e.target.value)}
                      placeholder="Puedes agregarlo después"
                    />
                  </label>
                  <label className="field">
                    <span>Administración (COP)</span>
                    <input
                      type="number"
                      min="0"
                      max="9999999999999"
                      value={values.administration}
                      onChange={(e) => set("administration", e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
            {step === 2 && (
              <>
                <div className="wizard-ai">
                  <div className="section-line">
                    <h2>
                      <Sparkles size={20} /> Tu asistente de redacción
                    </h2>
                    <span className="badge blue">IA</span>
                  </div>
                  <label className="field">
                    <span>¿Qué más quieres destacar?</span>
                    <textarea
                      rows={3}
                      maxLength={2500}
                      value={features}
                      onChange={(e) => setFeatures(e.target.value)}
                      placeholder="Ej. Balcón, cocina abierta, parqueadero cubierto… Usa características que hayas confirmado."
                    />
                  </label>
                  <div className="wizard-ai-controls">
                    <label className="field">
                      <span>Tono</span>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                      >
                        {["Profesional", "Cercano", "Breve"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button primary"
                      type="button"
                      disabled={
                        !aiEnabled ||
                        generating ||
                        (!files.length && !features.trim())
                      }
                      onClick={generate}
                    >
                      {generating ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}{" "}
                      {generating
                        ? "Creando tu borrador…"
                        : "Generar descripción"}
                    </button>
                  </div>
                  <small>
                    {aiEnabled
                      ? "Se enviarán hasta 6 fotos y estos datos a OpenAI para preparar el texto. Revisa los detalles antes de usarlos."
                      : aiStatusError
                        ? "No pudimos consultar el asistente. Puedes continuar escribiendo tu texto."
                        : "La IA estará disponible cuando se active el servicio. Puedes escribir tu descripción desde ahora."}
                  </small>
                </div>
                {suggestion && (
                  <div className="wizard-suggestion" role="status">
                    <h3>{suggestion.title}</h3>
                    <p>{suggestion.description}</p>
                    {suggestion.review_notes.length > 0 && (
                      <details>
                        <summary>Detalles por confirmar</summary>
                        <ul>
                          {suggestion.review_notes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        setValues((v) => ({
                          ...v,
                          title: suggestion.title,
                          description: suggestion.description,
                        }));
                        setSuggestion(null);
                      }}
                    >
                      <Check size={16} /> Usar este borrador
                    </button>
                  </div>
                )}
                <div className="wizard-fields">
                  <label className="field">
                    <span>Título para el anuncio</span>
                    <input
                      maxLength={160}
                      value={values.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder={values.name || "Un título claro y atractivo"}
                    />
                  </label>
                  <label className="field">
                    <span>Descripción</span>
                    <textarea
                      rows={7}
                      maxLength={5000}
                      value={values.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Cuenta cómo es el inmueble y qué lo hace especial…"
                    />
                    <small>
                      {values.description.length.toLocaleString("es-CO")} /
                      5.000 caracteres
                    </small>
                  </label>
                </div>
              </>
            )}
            {step === 3 && (
              <div className="wizard-review">
                <div className="wizard-review-title">
                  <Check size={24} />
                  <div>
                    <h2>{values.name}</h2>
                    <p>
                      {values.kind} · {values.city}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    Editar
                  </button>
                </div>
                <dl>
                  <div>
                    <dt>Fotos</dt>
                    <dd>
                      {files.length
                        ? `${files.length} fotos · portada seleccionada`
                        : "Puedes agregarlas después"}
                    </dd>
                  </div>
                  <div>
                    <dt>Dirección privada</dt>
                    <dd>{values.address}</dd>
                  </div>
                  <div>
                    <dt>Características</dt>
                    <dd>
                      {values.area || "—"} m² · {values.bedrooms || "—"}{" "}
                      habitaciones · {values.bathrooms || "—"} baños
                    </dd>
                  </div>
                  <div>
                    <dt>Canon mensual</dt>
                    <dd>
                      {Number(values.monthly_rent) > 0
                        ? cop(values.monthly_rent)
                        : "Por definir"}
                    </dd>
                  </div>
                </dl>
                <h3>{values.title || values.name}</h3>
                <p className="wizard-review-description">
                  {values.description ||
                    "La descripción se puede completar desde el anuncio del inmueble."}
                </p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setStep(2)}
                >
                  Editar descripción
                </button>
                <div className="form-info">
                  El inmueble quedará en tu portafolio con sus fotos y un
                  borrador de anuncio. Podrás completar el inventario y publicar
                  cuando quieras.
                </div>
              </div>
            )}
            <footer className="wizard-actions">
              <button
                type="button"
                className="button"
                disabled={step === 0 || generating}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <ArrowLeft size={16} /> Atrás
              </button>
              <span>
                Paso {step + 1} de {steps.length}
              </span>
              <button
                className="button primary"
                type="submit"
                disabled={generating}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : step === 3 ? (
                  <Check size={17} />
                ) : null}
                {busy
                  ? "Guardando tu inmueble…"
                  : step === 3
                    ? "Crear inmueble"
                    : step === 0 && !files.length
                      ? "Continuar sin fotos"
                      : "Continuar"}
                {step < 3 && <ArrowRight size={16} />}
              </button>
            </footer>
          </fieldset>
        </form>
        <aside className="wizard-preview">
          <div className="wizard-preview-image">
            {files[0] ? (
              <img src={files[0].url} alt="Portada seleccionada" />
            ) : (
              <div>
                <Building2 size={55} strokeWidth={1} />
                <span>Tu inmueble empieza aquí</span>
              </div>
            )}
            <span>Borrador privado</span>
          </div>
          <div className="wizard-preview-copy">
            <small>{values.kind}</small>
            <h2>
              {values.title ||
                values.name ||
                "El próximo espacio de tu portafolio"}
            </h2>
            <p>
              <MapPin size={15} />
              {[values.neighborhood, values.city].filter(Boolean).join(", ") ||
                "Ubicación por agregar"}
            </p>
            <div className="property-specs">
              <span>
                <Maximize size={15} />
                {values.area || "—"} m²
              </span>
              <span>
                <BedDouble size={15} />
                {values.bedrooms || "—"} hab.
              </span>
              <span>
                <Bath size={15} />
                {values.bathrooms || "—"} baños
              </span>
            </div>
            {Number(values.monthly_rent) > 0 && (
              <strong className="wizard-preview-price">
                {cop(values.monthly_rent)}
                <small> / mes</small>
              </strong>
            )}
            {values.description && (
              <p className="wizard-preview-description">{values.description}</p>
            )}
          </div>
          <footer>
            <Camera size={15} />
            {files.length} fotos · Todo en un solo lugar
          </footer>
        </aside>
      </div>
    </section>
  );
}
