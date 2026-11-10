"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, RotateCcw, Download, ArrowUpRight } from "lucide-react";
import timeline from "@/public/marketing/journey-timeline.json";
export default function LandingFilm() {
  const wrapper = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    previewAttempted = useRef(false);
  const [muted, setMuted] = useState(true),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  function load() {
    const v = video.current;
    if (v && !v.getAttribute("src")) v.src = "/marketing/kevvio-journey.mp4";
    return v;
  }
  useEffect(() => {
    const container = wrapper.current,
      v = video.current;
    if (!container || !v) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting;
        if (!visible) {
          v.pause();
          return;
        }
        if (
          !previewAttempted.current &&
          !media.matches &&
          !saveData &&
          !document.hidden
        ) {
          previewAttempted.current = true;
          if (!v.getAttribute("src")) v.src = "/marketing/kevvio-journey.mp4";
          v.muted = true;
          v.play().catch(() => {});
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(container);
    const pause = () => {
      if (document.hidden) v.pause();
    };
    const preference = () => {
      if (media.matches) v.pause();
    };
    document.addEventListener("visibilitychange", pause);
    media.addEventListener("change", preference);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", pause);
      media.removeEventListener("change", preference);
      v.pause();
    };
  }, []);
  async function playNarrated(start = 0) {
    const v = load();
    if (!v) return;
    previewAttempted.current = true;
    setError("");
    v.currentTime = start;
    v.muted = false;
    if (v.volume === 0) v.volume = 1;
    setMuted(false);
    try {
      await v.play();
    } catch {
      setError(
        "Pulsa reproducir en los controles del video para iniciar el recorrido.",
      );
    }
  }
  function seek(start: number) {
    const v = load();
    if (!v) return;
    previewAttempted.current = true;
    const apply = () => {
      v.currentTime = start;
      v.play().catch(() => {});
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
  }
  const current =
    time >= timeline.duration
      ? timeline.scenes.length - 1
      : timeline.scenes.findIndex((s) => time >= s.start && time < s.end);
  return (
    <section
      className="marketing-film"
      id="recorrido"
      aria-labelledby="film-title"
    >
      <div className="film-intro">
        <h2 id="film-title">
          Tu negocio crece.
          <br />
          Que el caos no crezca con él.
        </h2>
        <div>
          <p>
            Chats, fotos y pendientes por todas partes. En{" "}
            {Math.ceil(timeline.duration)} segundos, descubre otra forma de
            llevar tu día.
          </p>
          <button
            className="marketing-text-link"
            onClick={() => playNarrated()}
          >
            <Volume2 size={17} /> Ver con narración en español
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      <div className="film-screen" ref={wrapper}>
        <video
          ref={video}
          poster="/marketing/kevvio-poster.webp"
          muted={muted}
          controls
          playsInline
          preload="none"
          aria-label="Video de presentación: del caos de chats y pendientes a un trabajo conectado"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onError={() =>
            setError(
              "El video no se pudo cargar. Puedes leer el recorrido en la transcripción o descargar el MP4.",
            )
          }
        >
          <track
            kind="captions"
            src="/marketing/journey-es.vtt"
            srcLang="es"
            label="Español"
            default
          />
          Tu navegador no puede reproducir este video.
        </video>
        {muted && (
          <button className="film-sound-button" onClick={() => playNarrated()}>
            <Volume2 size={17} />
            <span>
              {playing
                ? "Escúchalo desde el inicio"
                : "Reproducir con narración"}
            </span>
          </button>
        )}
      </div>
      <div
        className="film-chapters"
        role="group"
        aria-label="Capítulos del video"
      >
        {timeline.scenes.map((s, i) => (
          <button
            key={s.chapter}
            aria-pressed={current === i}
            onClick={() => seek(s.start)}
          >
            <span>
              {String(Math.floor(s.start / 60)).padStart(2, "0")}:
              {String(Math.floor(s.start % 60)).padStart(2, "0")}
            </span>
            <strong>{s.chapter}</strong>
            <span className="chapter-track">
              <span
                style={{
                  transform: `scaleX(${current > i ? 1 : current === i ? Math.max(0, Math.min(1, (time - s.start) / s.duration)) : 0})`,
                }}
              />
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="film-error" role="status">
          {error}
        </p>
      )}
      <div className="film-meta">
        <span>Escenas ilustrativas · voz sintética en español</span>
        <div>
          <button onClick={() => playNarrated()}>
            <RotateCcw size={14} /> Volver a ver
          </button>
          <a href="/marketing/kevvio-journey.mp4" download="kevvio-recorrido.mp4">
            <Download size={14} /> Descargar video
          </a>
        </div>
      </div>
      <details className="film-transcript">
        <summary>Leer la transcripción</summary>
        <ol>
          {timeline.scenes.map((s) => (
            <li key={s.chapter}>
              <strong>{s.chapter}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
