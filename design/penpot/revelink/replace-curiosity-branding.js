// Run in the connected Penpot file, then call storage.replaceCuriosityBranding(pageId).
// Work one page at a time so large files remain responsive.
const component = penpot.library.local.components.find(
  (item) => item.id === '3f187a38-aa9d-807c-8008-ce2a40709b2c',
);
if (!component) throw new Error('Connect New File 1 with the approved Orbit Book component.');
const font = penpot.fonts.findAllByName('Manrope').find((item) => item.name === 'Manrope');
if (!font) throw new Error('Manrope is unavailable.');
const bold = font.variants.find((item) => item.fontWeight === '700' && item.fontStyle === 'normal');
const iconNames = new Set(['Brand mark', 'mark', 'Icon', 'play icon', 'star icon', 'Existing brand mark', '●', '▷']);
storage.revelinkBrandingChanges = storage.revelinkBrandingChanges || [];
storage.replaceCuriosityBranding = async function (pageId) {
  const page = penpotUtils.getPageById(pageId);
  if (!page) throw new Error('Page not found: ' + pageId);
  await penpot.openPage(page);
  const labels = penpotUtils.findShapes((shape) => shape.type === 'text' && /^curiosity$/i.test(shape.characters.trim()), page.root);
  const changes = [];
  for (const label of labels) {
    const parent = label.parent;
    if (parent.flex || parent.grid) throw new Error('Review the automatic layout before replacing ' + label.id);
    const centerY = label.y + label.height / 2;
    const oldMarks = parent.children.filter((shape) =>
      shape.id !== label.id && iconNames.has(shape.name) &&
      shape.width <= 48 && shape.height <= 48 &&
      shape.x < label.x && shape.x >= label.x - 65 &&
      Math.abs(shape.y + shape.height / 2 - centerY) < 18,
    );
    const dark = label.fills.some((fill) => /^#(?:f4f7ff|ffffff|fff)$/i.test(fill.fillColor || ''));
    const size = Number(label.fontSize);
    const symbolSize = size >= 23 ? 30 : 26;
    let symbolX = oldMarks.length ? Math.min(...oldMarks.map((shape) => shape.x)) : label.x;
    const symbolY = centerY - symbolSize / 2;
    const oldLabel = { id: label.id, text: label.characters, x: label.x, y: label.y, width: label.width, height: label.height };
    const suffixes = parent.children.filter((shape) => shape.type === 'text' && shape.characters.trim() === 'IN' && shape.x > label.x && shape.x < label.x + 140 && Math.abs(shape.y - label.y) < 20);
    const instance = component.instance();
    const originalWidth = instance.width;
    parent.appendChild(instance);
    instance.name = 'Revelink / Orbit Book';
    instance.resize(symbolSize, symbolSize);
    instance.x = symbolX;
    instance.y = symbolY;
    for (const shape of penpotUtils.findShapes((shape) => shape.strokes?.length, instance)) {
      shape.strokes = shape.strokes.map((stroke) => ({ ...stroke, strokeWidth: stroke.strokeWidth * symbolSize / originalWidth, ...(dark ? { strokeColor: '#FFFFFF' } : {}) }));
    }
    if (dark) {
      for (const shape of penpotUtils.findShapes((shape) => shape.fills?.length, instance)) {
        shape.fills = shape.fills.map((fill) => fill.fillColor ? { ...fill, fillColor: '#FFFFFF' } : fill);
      }
    }
    label.characters = 'Revelink';
    label.name = 'Revelink wordmark';
    font.applyToText(label, bold);
    label.fontFamily = 'Manrope';
    label.fontWeight = '700';
    label.fontSize = String(size);
    label.lineHeight = '1.2';
    label.fills = [{ fillColor: dark ? '#FFFFFF' : '#17221D' }];
    label.x = symbolX + symbolSize + 8;
    label.resize(Math.max(112, oldLabel.width), Math.max(28, size * 1.3));
    label.growType = 'auto-height';
    const removedIds = [...oldMarks, ...suffixes].map((shape) => shape.id);
    for (const shape of [...oldMarks, ...suffixes]) shape.remove();
    changes.push({ wordmarkId: label.id, symbolId: instance.id, pageId, oldLabel, removedIds, dark });
  }
  const brandedCopy = penpotUtils.findShapes((shape) => shape.type === 'text' && /©.*curiosity|curiosity tutor|See how Curiosity/i.test(shape.characters), page.root);
  for (const label of brandedCopy) {
    label.characters = label.characters.replace(/curiosity/gi, 'Revelink');
    label.name = label.name.replace(/curiosity/gi, 'Revelink');
    // Imported text retains rendered glyph positions until typography is reapplied.
    const currentFont = penpot.fonts.findAllByName(label.fontFamily).find((item) => item.name === label.fontFamily);
    const variant = currentFont?.variants.find((item) => item.fontWeight === label.fontWeight && item.fontStyle === 'normal');
    if (currentFont) currentFont.applyToText(label, variant);
    label.resize(label.width, label.height);
    label.growType = 'auto-height';
  }
  storage.revelinkBrandingChanges.push(...changes);
  return { pageId, page: page.name, wordmarks: changes.length, brandedCopy: brandedCopy.length, changes };
};
return { ready: true, pages: penpotUtils.getPages() };
