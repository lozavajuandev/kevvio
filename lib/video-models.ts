// Prices are estimates from the linked provider pages, checked 2026-11-10.
// Provider credits are not Kevvio subscription credits. Never expose provider IDs as arbitrary input.
export const videoModels = [
  {
    key: "seedance-fast",
    name: "Seedance Pro Fast",
    detail: "La opción económica en HD",
    providerModel: "bytedance/v1-pro-fast-image-to-video",
    seconds: 5,
    resolution: "720p",
    usd: 0.08,
    source: "https://kie.ai/seedance-1-0-pro-fast",
  },
  {
    key: "grok-standard",
    name: "Grok Imagine",
    detail: "Borrador de menor resolución",
    providerModel: "grok-imagine/image-to-video",
    seconds: 6,
    resolution: "480p",
    usd: 0.072,
    source: "https://kie.ai/grok-imagine",
  },
  {
    key: "grok-hd",
    name: "Grok Imagine HD",
    detail: "Movimiento en alta definición",
    providerModel: "grok-imagine/image-to-video",
    seconds: 6,
    resolution: "720p",
    usd: 0.135,
    source: "https://kie.ai/grok-imagine",
  },
  {
    key: "kling",
    name: "Kling 2.6",
    detail: "Una alternativa para comparar resultados",
    providerModel: "kling-2.6/image-to-video",
    seconds: 5,
    resolution: "1080p",
    usd: 0.315,
    source: "https://kie.ai/kling-2-6",
  },
] as const;
export type VideoModel = (typeof videoModels)[number];
export const videoMotions = [
  { id: "push", name: "Acercamiento suave" },
  { id: "pan", name: "Desplazamiento lateral" },
  { id: "steady", name: "Movimiento mínimo" },
] as const;
export function videoInput(
  model: VideoModel,
  imageUrl: string,
  motion: string,
) {
  const movement =
    motion === "pan"
      ? "A very subtle lateral camera slide."
      : motion === "steady"
        ? "An almost stationary shot with extremely subtle camera motion."
        : "An extremely slow, subtle camera push-in.";
  const prompt = `Real estate presentation using exactly the supplied photograph. ${movement} Preserve the original architecture, dimensions, walls, windows, doors, furniture, materials and lighting. Do not invent objects, extra rooms or views. No people, text, logos, narration or music. No remodeling, morphing, dramatic parallax or transitions to unseen areas.`;
  if (model.providerModel.startsWith("grok"))
    return {
      image_urls: [imageUrl],
      prompt,
      mode: "normal",
      duration: String(model.seconds),
      resolution: model.resolution,
      nsfw_checker: true,
    };
  if (model.key === "kling")
    return {
      image_urls: [imageUrl],
      prompt,
      sound: false,
      duration: String(model.seconds),
    };
  return {
    image_url: imageUrl,
    prompt,
    duration: String(model.seconds),
    resolution: model.resolution,
    nsfw_checker: true,
  };
}
export type VideoClip = {
  id: string;
  photo_id: string;
  position: number;
  status: string;
  error: string;
  provider_task_id: string | null;
  credits_consumed: string | null;
  has_file: boolean;
};
export type VideoProject = {
  id: string;
  model_key: string;
  aspect_ratio: string;
  motion: string;
  estimated_usd: string;
  created_at: string;
  has_file: boolean;
  clips: VideoClip[];
};
