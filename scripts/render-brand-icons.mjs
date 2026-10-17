import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const directory = new URL("../public/brand/", import.meta.url);
const master = await readFile(
  new URL("revelink-symbol.svg", directory),
  "utf8",
);
// Preserve the approved orbit/book geometry; the app tile uses its white variant.
const paths = master
  .slice(master.indexOf(">") + 1, master.lastIndexOf("</svg>"))
  .replace(/(stroke|fill)="(?!none)[^"]*"/g, '$1="#FFFFFF"');
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#176B4C"/><g transform="translate(8 8) scale(.75)">${paths}</g></svg>\n`;
await writeFile(new URL("revelink-app-icon.svg", directory), tile);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ??
    (existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : undefined),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  for (const [size, name] of [
    [32, "favicon-32.png"],
    [180, "apple-touch-icon.png"],
    [192, "app-icon-192.png"],
    [512, "app-icon-512.png"],
  ]) {
    const data = await page.evaluate(
      async ({ tile, size }) => {
        const image = new Image();
        image.src = "data:image/svg+xml;base64," + btoa(tile);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { tile, size },
    );
    await writeFile(new URL(name, directory), Buffer.from(data, "base64"));
  }
  const png = await readFile(new URL("favicon-32.png", directory));
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(
    new URL("../public/favicon.ico", import.meta.url),
    Buffer.concat([header, png]),
  );
  console.log("Rendered Revelink browser and app icons.");
} finally {
  await browser.close();
}
