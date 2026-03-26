export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex6(body: string): Rgb | null {
  if (body.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(body)) {
    return null;
  }
  const r = parseInt(body.slice(0, 2), 16);
  const g = parseInt(body.slice(2, 4), 16);
  const b = parseInt(body.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }
  return { r, g, b };
}

function parseHex3(body: string): Rgb | null {
  if (body.length !== 3 || !/^[0-9a-fA-F]{3}$/.test(body)) {
    return null;
  }
  const r = parseInt(body[0] + body[0], 16);
  const g = parseInt(body[1] + body[1], 16);
  const b = parseInt(body[2] + body[2], 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }
  return { r, g, b };
}

function clampByte(n: number): number | null {
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(255, Math.max(0, Math.round(n)));
}

function parseRgbChannel(part: string): number | null {
  const t = part.trim();
  if (t.endsWith('%')) {
    const p = parseFloat(t.slice(0, -1));
    if (!Number.isFinite(p)) {
      return null;
    }
    return clampByte((p / 100) * 255);
  }
  const n = parseFloat(t);
  return clampByte(n);
}

/**
 * Parse a subset of CSS colors used by VS Code computed styles and graph hex fills:
 * `#rgb`, `#rrggbb`, `#rrggbbaa` (alpha ignored), `rgb()`, `rgba()`.
 */
export function parseCssColorToRgb(input: string): Rgb | null {
  const s = input.trim();
  if (s.startsWith('#')) {
    const body = s.slice(1);
    if (body.length === 3) {
      return parseHex3(body);
    }
    if (body.length === 6) {
      return parseHex6(body);
    }
    if (body.length === 8 && /^[0-9a-fA-F]{8}$/.test(body)) {
      return parseHex6(body.slice(0, 6));
    }
    return null;
  }
  const m = /^rgba?\(\s*([^)]+)\s*\)$/i.exec(s);
  if (!m) {
    return null;
  }
  const parts = m[1].split(/\s*,\s*/);
  if (parts.length < 3) {
    return null;
  }
  const r = parseRgbChannel(parts[0]);
  const g = parseRgbChannel(parts[1]);
  const b = parseRgbChannel(parts[2]);
  if (r === null || g === null || b === null) {
    return null;
  }
  return { r, g, b };
}

function channelLinearize(c: number): number {
  const u = c / 255;
  return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance for sRGB (0–1). */
export function relativeLuminanceRgb(rgb: Rgb): number {
  const R = channelLinearize(rgb.r);
  const G = channelLinearize(rgb.g);
  const B = channelLinearize(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
