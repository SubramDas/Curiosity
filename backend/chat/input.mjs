import { ServiceError } from "../providers/request-json.mjs";

export function validateChatInput(body) {
  const invalid = () => {
    throw new ServiceError(
      "INVALID_INPUT",
      "Use a question up to 2,000 characters and a short conversation history.",
    );
  };
  if (
    typeof body.question !== "string" ||
    !body.question.trim() ||
    body.question.length > 2000
  )
    invalid();
  const history = body.history ?? [];
  if (
    !Array.isArray(history) ||
    history.length > 6 ||
    history.some(
      (item) =>
        !item ||
        !["user", "assistant"].includes(item.role) ||
        typeof item.content !== "string" ||
        item.content.length > 2000,
    )
  )
    invalid();
  let currentVideo = null;
  if (body.currentVideo) {
    const video = body.currentVideo;
    if (
      !/^[\w-]{11}$/.test(video.id ?? "") ||
      typeof video.title !== "string" ||
      video.title.length > 300 ||
      !Number.isFinite(video.positionSeconds) ||
      video.positionSeconds < 0 ||
      video.positionSeconds > 604800
    )
      invalid();
    currentVideo = {
      id: video.id,
      title: video.title,
      positionSeconds: video.positionSeconds,
    };
  }
  if (typeof body.topic !== "string" || body.topic.length > 480) invalid();
  return {
    question: body.question.trim(),
    topic: body.topic,
    history,
    currentVideo,
  };
}

export function videoDurationSeconds(duration) {
  const match = duration?.match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
  );
  return match
    ? Number(match[1] ?? 0) * 86400 +
        Number(match[2] ?? 0) * 3600 +
        Number(match[3] ?? 0) * 60 +
        Number(match[4] ?? 0)
    : null;
}
