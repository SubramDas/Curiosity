import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
export function createStaticHandler(directory) {
  const root = resolve(directory);
  return async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) return false;
    const url = new URL(request.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return false;
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400);
      response.end();
      return true;
    }
    if (
      pathname
        .split("/")
        .some((part) => part.startsWith(".") || part.includes("\\"))
    ) {
      response.writeHead(404);
      response.end();
      return true;
    }
    let file = resolve(root, "." + pathname);
    if (!file.startsWith(root + sep) && file !== root) {
      response.writeHead(404);
      response.end();
      return true;
    }
    let information;
    try {
      information = await stat(file);
    } catch {}
    if (!information?.isFile()) {
      if (extname(pathname) && pathname !== "/") {
        response.writeHead(404);
        response.end();
        return true;
      }
      file = resolve(root, "index.html");
      try {
        information = await stat(file);
      } catch {
        response.writeHead(503);
        response.end("Website build unavailable.");
        return true;
      }
    }
    const type = contentTypes[extname(file)];
    if (!type) {
      response.writeHead(404);
      response.end();
      return true;
    }
    response.setHeader("Content-Type", type);
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com https://*.ytimg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.youtube.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
    );
    response.setHeader("Content-Length", information.size);
    response.setHeader(
      "Cache-Control",
      file.endsWith("index.html")
        ? "no-cache"
        : pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
    );
    if (request.method === "HEAD") response.end();
    else
      createReadStream(file)
        .on("error", () => response.destroy())
        .pipe(response);
    return true;
  };
}
