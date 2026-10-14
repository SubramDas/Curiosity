import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";

const outputDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(outputDirectory, "../review/desktop-design.html");
const escapeXml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
  });
  await page.goto(pathToFileURL(source).href);
  await page.evaluate(() => document.fonts.ready);
  const screens = await page.evaluate(() => {
    const color = (value) => {
      const match = value.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
      );
      if (!match) return null;
      return {
        hex:
          "#" +
          match
            .slice(1, 4)
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase(),
        opacity: Number(match[4] ?? 1),
      };
    };
    return [...document.querySelectorAll(".screen")].map((screen, index) => {
      const origin = screen.getBoundingClientRect();
      const layers = [];
      function visit(element) {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          !bounds.width ||
          !bounds.height
        )
          return;
        const box = {
          x: bounds.x - origin.x,
          y: bounds.y - origin.y,
          width: bounds.width,
          height: bounds.height,
        };
        const name =
          element.className?.baseVal ?? element.className ?? element.tagName;
        const radius = parseFloat(style.borderTopLeftRadius) || 0;
        if (element.tagName.toLowerCase() === "svg") {
          layers.push({
            type: "vector",
            name: "Icon",
            ...box,
            svg: element.outerHTML.replaceAll("currentColor", style.color),
          });
          return;
        }
        const fill = color(style.backgroundColor);
        if (fill?.opacity > 0 && element !== screen)
          layers.push({ type: "rectangle", name, ...box, radius, fill });
        if (style.backgroundImage.startsWith("linear-gradient"))
          layers.push({
            type: "gradient",
            name,
            ...box,
            radius,
            gradient: style.backgroundImage,
          });
        const borderEdges = ["Top", "Right", "Bottom", "Left"];
        const uniformBorder =
          radius > 0 &&
          borderEdges.every(
            (edge) =>
              style["border" + edge + "Width"] === style.borderTopWidth &&
              style["border" + edge + "Color"] === style.borderTopColor &&
              style["border" + edge + "Style"] === "solid",
          );
        if (uniformBorder && parseFloat(style.borderTopWidth) > 0)
          layers.push({
            type: "outline",
            name: name + " border",
            ...box,
            radius,
            stroke: color(style.borderTopColor),
            strokeWidth: parseFloat(style.borderTopWidth),
          });
        for (const edge of uniformBorder ? [] : borderEdges) {
          const width = parseFloat(style["border" + edge + "Width"]);
          const stroke = color(style["border" + edge + "Color"]);
          if (
            !width ||
            !stroke?.opacity ||
            style["border" + edge + "Style"] === "none"
          )
            continue;
          const horizontal = edge === "Top" || edge === "Bottom";
          layers.push({
            type: "rectangle",
            name: name + " border " + edge,
            x: box.x + (edge === "Right" ? box.width - width : 0),
            y: box.y + (edge === "Bottom" ? box.height - width : 0),
            width: horizontal ? box.width : width,
            height: horizontal ? width : box.height,
            radius: 0,
            fill: stroke,
          });
        }
        if (element.tagName === "IMG") {
          const parentStyle = getComputedStyle(element.parentElement);
          layers.push({
            type: "image",
            name: "Thumbnail",
            ...box,
            radius: parseFloat(parentStyle.borderTopLeftRadius) || 0,
            source: element.src,
            fit: style.objectFit,
          });
        }
        for (const child of element.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            visit(child);
            continue;
          }
          if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim())
            continue;
          const text = child.textContent;
          const lines = [];
          for (let offset = 0; offset < text.length; offset++) {
            const range = document.createRange();
            range.setStart(child, offset);
            range.setEnd(child, offset + 1);
            const bound = range.getBoundingClientRect();
            if (!bound.width && !text[offset].trim()) continue;
            let line = lines.find((line) => Math.abs(line.y - bound.y) < 2);
            if (!line) {
              line = {
                x: bound.x,
                y: bound.y,
                width: 0,
                height: bound.height,
                text: "",
              };
              lines.push(line);
            }
            line.text += text[offset];
            line.width = Math.max(line.width, bound.right - line.x);
          }
          for (const line of lines)
            if (line.text.trim())
              layers.push({
                type: "text",
                name: line.text.trim().slice(0, 70),
                x: line.x - origin.x,
                y: line.y - origin.y,
                width: line.width,
                height: line.height,
                text: line.text.trim(),
                fontSize: parseFloat(style.fontSize),
                fontWeight: style.fontWeight,
                fontFamily: "Roboto",
                fill: color(style.color),
                letterSpacing: parseFloat(style.letterSpacing) || 0,
              });
        }
      }
      visit(screen);
      return {
        name: ["Home", "GPU topic", "Shorts"][index] ?? "Screen " + (index + 1),
        width: origin.width,
        height: origin.height,
        layers,
      };
    });
  });
  await mkdir(resolve(outputDirectory, "assets"), { recursive: true });
  const images = new Map();
  for (const screen of screens)
    for (const layer of screen.layers)
      if (layer.type === "image") {
        if (!images.has(layer.source)) {
          const [, mime, encoded] =
            layer.source.match(/^data:([^;]+);base64,(.*)$/s) ?? [];
          if (!encoded) throw new Error("Expected embedded thumbnail source");
          const bytes = Buffer.from(encoded, "base64");
          const id = createHash("sha256")
            .update(bytes)
            .digest("hex")
            .slice(0, 12);
          const extension = mime === "image/png" ? "png" : "jpg";
          const asset = { id, mime, path: `assets/${id}.${extension}` };
          await writeFile(resolve(outputDirectory, asset.path), bytes);
          images.set(layer.source, asset);
        }
        layer.asset = images.get(layer.source);
      }
  for (const [index, screen] of screens.entries()) {
    let definitions =
      '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.65"/></linearGradient>';
    const elements = ['<rect width="100%" height="100%" fill="#FFFFFF"/>'];
    for (const [layerIndex, layer] of screen.layers.entries()) {
      const name = escapeXml(layer.name);
      const geometry = `x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}"`;
      if (layer.type === "rectangle")
        elements.push(
          `<rect id="layer-${layerIndex}" aria-label="${name}" ${geometry} rx="${layer.radius}" fill="${layer.fill.hex}" fill-opacity="${layer.fill.opacity}"/>`,
        );
      if (layer.type === "outline")
        elements.push(
          `<rect aria-label="${name}" ${geometry} rx="${layer.radius}" fill="none" stroke="${layer.stroke.hex}" stroke-opacity="${layer.stroke.opacity}" stroke-width="${layer.strokeWidth}"/>`,
        );
      if (layer.type === "gradient")
        elements.push(
          `<rect aria-label="${name}" ${geometry} rx="${layer.radius}" fill="url(#shade)"/>`,
        );
      if (layer.type === "text")
        elements.push(
          `<text aria-label="${name}" x="${layer.x}" y="${layer.y + layer.height * 0.8}" font-family="Roboto, Arial, sans-serif" font-size="${layer.fontSize}" font-weight="${layer.fontWeight}" letter-spacing="${layer.letterSpacing}" fill="${layer.fill.hex}" fill-opacity="${layer.fill.opacity}">${escapeXml(layer.text)}</text>`,
        );
      if (layer.type === "vector")
        elements.push(
          layer.svg.replace(
            /^<svg([^>]*)>/,
            (_, attributes) =>
              `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/g, "")} ${geometry}>`,
          ),
        );
      if (layer.type === "image") {
        definitions += `<clipPath id="clip-${layerIndex}"><rect ${geometry} rx="${layer.radius}"/></clipPath>`;
        elements.push(
          `<image aria-label="${name}" ${geometry} href="${layer.source}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${layerIndex})"/>`,
        );
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${screen.width}" height="${screen.height}" viewBox="0 0 ${screen.width} ${screen.height}"><defs>${definitions}</defs>${elements.join("")}</svg>`;
    await writeFile(
      resolve(
        outputDirectory,
        `${index + 1}-${screen.name.toLowerCase().replaceAll(" ", "-")}.svg`,
      ),
      svg,
    );
    for (const layer of screen.layers)
      if (layer.type === "image") delete layer.source;
  }
  await writeFile(
    resolve(outputDirectory, "design-layers.json"),
    JSON.stringify(
      { version: 1, source: "../review/desktop-design.html", screens },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      screens: screens.map((screen) => ({
        name: screen.name,
        width: screen.width,
        height: screen.height,
        layers: screen.layers.length,
      })),
      assets: images.size,
    }),
  );
} finally {
  await browser.close();
}
