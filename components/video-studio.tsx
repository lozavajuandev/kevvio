"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Film,
  Plus,
  Check,
  ArrowUp,
  ArrowDown,
  X,
  LoaderCircle,
  RefreshCw,
  Download,
  Play,
  Camera,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  videoModels,
  videoMotions,
  type VideoProject,
} from "@/lib/video-models";
import type { PropertyPhoto } from "@/lib/types";
const usd = (v: number | string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 3,
  }).format(Number(v));
const statuses: Record<string, string> = {
  preparing: "Preparando foto",
  queued: "En cola",
  processing: "Generando",
  ready: "Listo",
  failed: "No generado",
  unknown: "Envío por confirmar",
};
type Catalog = {
  enabled: boolean;
  studio: boolean;
  models: typeof videoModels;
  daily_budget_usd: number;
  prices_checked_on: string;
};
export default function VideoStudio({
  propertyId,
  photos,
  readonly,
  onPhotos,
  onDirtyChange,
}: {
  propertyId: string;
  photos: PropertyPhoto[];
  readonly: boolean;
  onPhotos: () => void;
  onDirtyChange: (v: boolean) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [projects, setProjects] = useState<VideoProject[]>([]),
    [selection, setSelection] = useState<string[]>([]),
    [modelKey, setModelKey] = useState("seedance-fast"),
    [aspect, setAspect] = useState("16:9"),
    [motion, setMotion] = useState("push"),
    [busy, setBusy] = useState(false),
    [working, setWorking] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const available = photos.filter(
      (p) => !p.archived_at && !p.inventory_item_id,
    ),
    model = (catalog?.models || videoModels).find((m) => m.key === modelKey)!,
    estimate = Number((selection.length * model.usd).toFixed(4));
  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      api("videos/catalog"),
      api("videos/" + propertyId),
    ]);
    setCatalog(c);
    setProjects(p.projects);
  }, [propertyId]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    onDirtyChange(selection.length > 0 || busy);
    return () => onDirtyChange(false);
  }, [selection.length, busy, onDirtyChange]);
  const pending = projects
    .filter((p) =>
      p.clips.some((c) =>
        ["preparing", "queued", "processing"].includes(c.status),
      ),
    )
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (!pending || busy || working) return;
    let alive = true;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        for (const id of pending.split(",")) {
          const r = await api("videos/" + id + "/sync", "POST", {});
          if (alive && r.projects) setProjects(r.projects);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pending, busy, working]);
  function toggle(id: string) {
    setError("");
    setRequestKey(crypto.randomUUID());
    setSelection((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 6
          ? [...old, id]
          : old,
    );
  }
  function move(index: number, delta: number) {
    setSelection((old) => {
      const a = [...old];
      [a[index], a[index + delta]] = [a[index + delta], a[index]];
      return a;
    });
    setRequestKey(crypto.randomUUID());
  }
  async function generate() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api("videos/" + propertyId, "POST", {
        creation_key: requestKey,
        photo_ids: selection,
        model_key: modelKey,
        aspect_ratio: aspect,
        motion,
        accepted_estimate: estimate,
      });
      setProjects(r.projects);
      setSelection([]);
      setRequestKey(crypto.randomUUID());
      setNotice(
        "Proyecto guardado. Puedes consultar el avance aquí aunque cierres esta página.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(id: string, kind: string) {
    setWorking(id);
    setError("");
    try {
      const r = await api("videos/" + id + "/" + kind, "POST", {});
      if (r.projects) setProjects(r.projects);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking("");
    }
  }
  return (
    <div className="video-studio">
      <header className="video-heading">
        <div>
          <h2>De fotos a una nueva perspectiva.</h2>
          <p>
            Elige los espacios, dales movimiento y une el recorrido en un video.
          </p>
        </div>
        <span className="badge blue">
          <Film size={13} /> Studio
        </span>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          {!catalog && (
            <button
              className="button"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="success-message" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      {!catalog ? (
        <p className="inline-loading">
          <LoaderCircle size={16} className="spin" /> Cargando estudio…
        </p>
      ) : (
        <>
          <div className="video-create-layout">
            <section>
              <h3>Elige hasta 6 fotos</h3>
              <p className="muted video-help">
                Usa fotos generales, sin personas ni documentos visibles. El
                orden será el del recorrido.
              </p>
              {available.length ? (
                <div className="video-photo-picker">
                  {available.map((p) => {
                    const n = selection.indexOf(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        disabled={
                          busy || readonly || (n < 0 && selection.length >= 6)
                        }
                        aria-pressed={n >= 0}
                        aria-label={
                          (n >= 0 ? "Quitar " : "Elegir ") +
                          (p.caption || p.original_filename)
                        }
                        onClick={() => toggle(p.id)}
                      >
                        <img
                          src={"/api/photos/" + p.id + "/thumbnail"}
                          alt={p.caption || p.original_filename}
                        />
                        <span>{n >= 0 ? n + 1 : <Plus size={16} />}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="crm-quiet-empty">
                  <Camera size={30} />
                  <div>
                    <p>Agrega fotos generales para crear tu primer video.</p>
                    <button className="text-button" onClick={onPhotos}>
                      Ir a fotos
                    </button>
                  </div>
                </div>
              )}
              {selection.length > 0 && (
                <ol className="video-storyboard">
                  {selection.map((id, i) => {
                    const p = available.find((p) => p.id === id);
                    return (
                      <li key={id}>
                        <span>{i + 1}</span>
                        <img src={"/api/photos/" + id + "/thumbnail"} alt="" />
                        <strong>{p?.caption || `Escena ${i + 1}`}</strong>
                        <small>{model.seconds} s</small>
                        <button
                          className="icon-button"
                          disabled={i === 0 || busy}
                          aria-label={"Adelantar escena " + (i + 1)}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={i === selection.length - 1 || busy}
                          aria-label={"Retrasar escena " + (i + 1)}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={"Quitar escena " + (i + 1)}
                          onClick={() => toggle(id)}
                        >
                          <X size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            <aside className="video-settings">
              <h3>Tu próxima pieza</h3>
              <fieldset disabled={busy || readonly}>
                <label className="field">
                  <span>Modelo</span>
                  <select
                    value={modelKey}
                    onChange={(e) => {
                      setModelKey(e.target.value);
                      setRequestKey(crypto.randomUUID());
                    }}
                  >
                    {catalog.models.map((m) => (
                      <option value={m.key} key={m.key}>
                        {m.name} · {m.resolution}
                      </option>
                    ))}
                  </select>
                  <small>
                    {model.detail} · {model.seconds} segundos por foto
                  </small>
                </label>
                <label className="field">
                  <span>Movimiento</span>
                  <select
                    value={motion}
                    onChange={(e) => {
                      setMotion(e.target.value);
                      setRequestKey(crypto.randomUUID());
                    }}
                  >
                    {videoMotions.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Formato del video final</span>
                  <select
                    value={aspect}
                    onChange={(e) => {
                      setAspect(e.target.value);
                      setRequestKey(crypto.randomUUID());
                    }}
                  >
                    <option value="16:9">Horizontal · 16:9</option>
                    <option value="9:16">Vertical · 9:16</option>
                  </select>
                  <small>
                    Se conserva el encuadre completo con márgenes cuando haga
                    falta. El montaje final no lleva audio.
                  </small>
                </label>
                <div className="video-estimate">
                  <span>Costo estimado del proveedor</span>
                  <strong>{usd(estimate)}</strong>
                  <small>
                    {selection.length} fotos ·{" "}
                    {selection.length * model.seconds} segundos aprox.
                  </small>
                </div>
                {!catalog.studio ? (
                  <p className="video-help">
                    La generación de video forma parte de Studio.
                  </p>
                ) : !catalog.enabled ? (
                  <p className="video-help">
                    El estudio está listo para configurar. La generación se
                    habilitará cuando se active el servicio de video.
                  </p>
                ) : (
                  <p className="video-help">
                    Al generar, enviaremos las fotos seleccionadas a Kie.ai y se
                    consumirá saldo de ese servicio. Límite diario:{" "}
                    {usd(catalog.daily_budget_usd)}.
                  </p>
                )}
                <button
                  className="button primary"
                  disabled={
                    !catalog.enabled ||
                    !catalog.studio ||
                    !selection.length ||
                    busy ||
                    readonly
                  }
                  onClick={generate}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Film size={17} />
                  )}{" "}
                  {busy
                    ? "Enviando tus escenas…"
                    : "Generar por ≈ " + usd(estimate)}
                </button>
                <small className="video-rate-note">
                  Estimación, no tarifa garantizada.{" "}
                  <a href={model.source} target="_blank" rel="noreferrer">
                    Ver tarifa del modelo
                  </a>
                  .
                </small>
              </fieldset>
            </aside>
          </div>
          <p className="video-review-note">
            La IA puede modificar detalles del espacio. Revisa cada clip antes
            de compartirlo; los videos se guardan de forma privada.
          </p>
        </>
      )}
      <section className="video-projects">
        <div className="section-line">
          <h2>Tus proyectos de video</h2>
          <button
            className="button"
            disabled={busy || !!working}
            onClick={() => load().catch((e) => setError(e.message))}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
        {!projects.length ? (
          <div className="video-history-empty">
            <Film size={28} />
            <p>Tu primer recorrido empieza con las fotos de arriba.</p>
          </div>
        ) : (
          projects.map((p) => {
            const m = videoModels.find((m) => m.key === p.model_key),
              allReady = p.clips.every((c) => c.status === "ready");
            return (
              <article className="video-project" key={p.id}>
                <header>
                  <div>
                    <h3>
                      {m?.name || p.model_key} · {p.clips.length} escenas
                    </h3>
                    <p>
                      {new Date(p.created_at).toLocaleDateString("es-CO")} ·{" "}
                      {p.aspect_ratio} · estimado {usd(p.estimated_usd)}
                    </p>
                  </div>
                  {working === p.id ? (
                    <span className="inline-loading">
                      <LoaderCircle className="spin" size={16} /> Procesando…
                    </span>
                  ) : (
                    <button
                      className="button"
                      disabled={!!working || busy}
                      onClick={() =>
                        action(p.id, allReady ? "assemble" : "sync")
                      }
                    >
                      {allReady ? <Play size={15} /> : <RefreshCw size={15} />}{" "}
                      {allReady
                        ? p.has_file
                          ? "Video preparado"
                          : "Unir y preparar MP4"
                        : "Consultar avance"}
                    </button>
                  )}
                </header>
                {p.has_file && (
                  <div className="video-finished">
                    <video
                      controls
                      preload="metadata"
                      src={"/api/videos/" + p.id + "/file"}
                    />
                    <a
                      className="button primary"
                      href={"/api/videos/" + p.id + "/file?download=1"}
                    >
                      <Download size={16} /> Descargar video completo
                    </a>
                  </div>
                )}
                <div className="video-clips">
                  {p.clips.map((c, i) => (
                    <div key={c.id}>
                      {c.has_file ? (
                        <video
                          controls
                          preload="none"
                          poster={"/api/photos/" + c.photo_id + "/thumbnail"}
                          src={"/api/videos/" + p.id + "/file?clip=" + c.id}
                        />
                      ) : (
                        <img
                          src={"/api/photos/" + c.photo_id + "/thumbnail"}
                          alt={"Foto de la escena " + (i + 1)}
                        />
                      )}
                      <div>
                        <strong>Escena {i + 1}</strong>
                        <span
                          className={
                            "badge " +
                            (c.status === "ready" ? "green" : "neutral")
                          }
                        >
                          {statuses[c.status]}
                        </span>
                      </div>
                      {c.error && <p role="status">{c.error}</p>}
                      {c.has_file && (
                        <a
                          href={
                            "/api/videos/" +
                            p.id +
                            "/file?clip=" +
                            c.id +
                            "&download=1"
                          }
                          className="text-button"
                        >
                          Descargar clip
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
