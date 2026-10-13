import { ServiceError } from "../experiments/phase-2/services/request-json.mjs";
export function validateVideoProgress(body) {
  if (
    !body ||
    !/^[A-Za-z0-9_-]{11}$/.test(body.video_id ?? "") ||
    typeof body.topic_key !== "string" ||
    !body.topic_key.trim() ||
    body.topic_key.length > 500 ||
    !Number.isFinite(body.position_seconds) ||
    !Number.isFinite(body.duration_seconds) ||
    body.duration_seconds <= 0 ||
    body.duration_seconds > 604800 ||
    body.position_seconds < 0 ||
    body.position_seconds > body.duration_seconds ||
    typeof body.completed !== "boolean"
  ) {
    throw new ServiceError(
      "INVALID_INPUT",
      "Send a valid video and playback position.",
    );
  }
  return {
    video_id: body.video_id,
    topic_key: body.topic_key,
    position_seconds: body.position_seconds,
    duration_seconds: body.duration_seconds,
    completed: body.completed,
  };
}
