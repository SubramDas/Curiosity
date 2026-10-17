import { ServiceError } from "../providers/request-json.mjs";
export const universes = ["science", "commerce", "arts"];
export function invalid(message = "Send valid learning-map information.") {
  throw new ServiceError("INVALID_INPUT", message);
}
export function universe(value) {
  if (!universes.includes(value)) invalid("Choose a valid Universe.");
  return value;
}
export function uuid(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalid();
  return value;
}
export function videoId(value) {
  if (typeof value !== "string" || !/^[\w-]{11}$/.test(value)) invalid();
  return value;
}
export function integer(value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
export function viewport(value) {
  if (
    !value ||
    ![value.x, value.y, value.zoom].every(Number.isFinite) ||
    Math.abs(value.x) > 12000 ||
    Math.abs(value.y) > 12000 ||
    value.zoom < 0.5 ||
    value.zoom > 2
  )
    invalid("The map position is invalid.");
  return { x: value.x, y: value.y, zoom: value.zoom };
}
