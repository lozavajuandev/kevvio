# Video de presentación de Kevvio

`public/marketing/kevvio-journey.mp4` es una pieza de lanzamiento de 28 segundos centrada en el problema del agente: conversaciones, fotos y pendientes dispersos que terminan dependiendo de su memoria. El relato pasa de esa carga a una operación conectada y más espacio para atender personas. Usa tipografía cinética, recortes fotográficos, entradas direccionales y transiciones de color; no es un tutorial ni una grabación de pantallas. Se sirve como archivo estático, sin API ni gasto por reproducción.

## Fuentes y derechos

- Guion: `narration.json`. Seis escenas: el ruido, la carga, todo conecta, tu alcance, tu control y más espacio. La narración se centra en el agente; la marca Kevvio aparece en los fotogramas y en la portada.
- Voz: `ef_dora`, español, velocidad 1.10, ejecutada localmente con [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0) y [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) 0.6.1 (MIT). Los pesos y archivos temporales permanecen en `.data/`, fuera de Git. No requiere claves OpenAI/Kie.
- Tipografía: [Manrope de Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope), con su licencia OFL incluida en `OFL.txt`.
- Fotografía de ejemplo: Alex Tyson en [Unsplash](https://unsplash.com/photos/VUfe8alBlUo), licencia Unsplash. Fuente y transformación en `public/marketing/interior.webp.json`.
- Geometría, animaciones, montaje y textos: `render.py`. La voz no imita a una persona identificable y se identifica como sintética en la landing. El mismo script sintetiza una base sonora discreta con pulsos y transiciones originales; reduce su nivel durante la voz. No utiliza canciones ni muestras externas.

## Reproducir

Requiere Python 3.11, FFmpeg y `uv`. Desde la raíz del proyecto:

```sh
uv venv --python 3.11 .data/marketing-venv
uv pip install --python .data/marketing-venv/bin/python kokoro-onnx==0.6.1 soundfile==0.14.0 Pillow==13.0.0
mkdir -p .data/marketing-film
curl -L --fail https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.int8.onnx -o .data/marketing-film/kokoro.onnx
curl -L --fail https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin -o .data/marketing-film/voices.bin
.data/marketing-venv/bin/python scripts/marketing/narrate.py
.data/marketing-venv/bin/python scripts/marketing/render.py
```

`narrate.py` genera el audio, los tiempos reales de escenas (`journey-timeline.json`) y los subtítulos (`journey-es.vtt`). Los subtítulos se dividen por frases con tiempos proporcionales dentro de la narración de cada escena. `render.py` produce el MP4 H.264/AAC, 1280×720 a 30 fps, audio mono a 48 kHz, mezcla con sonido original, reproducción progresiva `faststart` y portada WebP. Escribe el MP4 temporal antes de reemplazar el público. Guarda fotogramas de inspección en `.data/marketing-film/frames` y una hoja de contacto local. `render.py --stills` permite inspeccionar el montaje sin codificar el video.

Después de modificar el guion, regenerar **ambos** pasos antes de compilar Next.js: los capítulos y la transcripción se importan desde el mismo JSON. Si cambia el montaje, actualizar `public/marketing/kevvio-journey.provenance.json` y la procedencia de la portada. La revisión de los fotogramas del video no sustituye la revisión visual de la landing en un navegador.

## Reproducción accesible

Conservar la zona de seguridad del montaje: los rótulos esenciales de categorías usan 54px en el lienzo de 1280px, unos 14px al reproducirse a 342px de ancho. El contenido principal se concentra en la mitad superior; la zona inferior de subtítulos y controles nativos queda libre de texto esencial y de pies incrustados. Los nombres de presentación alternan a 56px y las categorías operativas se organizan en dos filas de dos a 54px. Comprobar el resultado móvil con subtítulos y controles visibles después de cada cambio de montaje. La corrección está implementada y recodificada. La revisión final concluyó «ship» para los dos puntos evaluados: legibilidad móvil y zonas de subtítulos/controles, y documentación del relato de seis escenas. Las nuevas capturas de escritorio y móvil muestran esas correcciones resueltas sin regresiones visibles; el veredicto se limita a esos puntos.

`components/landing-film.tsx` carga el MP4 al entrar en pantalla o por acción del visitante. La vista previa es muda y ocurre una sola vez. Se pausa al salir de pantalla o cambiar de pestaña. Movimiento reducido y ahorro de datos desactivan el inicio automático. El botón de narración vuelve al inicio y activa el sonido; hay controles nativos, capítulos, subtítulos en español, transcripción y descarga. Las cuatro áreas de `landing-capabilities.tsx` son pestañas navegables con flechas, Inicio y Fin.
