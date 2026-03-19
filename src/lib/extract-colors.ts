interface RGB { r: number; g: number; b: number }

export async function extractDominantColors(
  buffer: Buffer,
  mimeType: string
): Promise<{ primary: string; accent: string } | null> {
  try {
    if (mimeType === "image/svg+xml") return null;
    const pixels = decodePixels(buffer, mimeType);
    if (!pixels || pixels.length < 10) return null;
    const colorful = pixels.filter((p) => {
      const max = Math.max(p.r, p.g, p.b);
      const min = Math.min(p.r, p.g, p.b);
      const brightness = (p.r + p.g + p.b) / 3;
      const saturation = max === 0 ? 0 : (max - min) / max;
      return brightness > 30 && brightness < 230 && saturation > 0.15;
    });
    if (colorful.length < 5) return null;
    const clusters = kMeans(colorful, 5, 10);
    clusters.sort((a, b) => b.count - a.count);
    const primary = clusters[0];
    let accent = clusters[1];
    for (let i = 1; i < clusters.length; i++) {
      if (colorDistance(clusters[i].center, primary.center) > 80) {
        accent = clusters[i];
        break;
      }
    }
    if (!primary || !accent) return null;
    return { primary: rgbToHex(primary.center), accent: rgbToHex(accent.center) };
  } catch { return null; }
}

function decodePixels(buffer: Buffer, mimeType: string): RGB[] {
  const pixels: RGB[] = [];
  const step = Math.max(1, Math.floor(buffer.length / 3000));
  const start = mimeType === "image/png" ? 50 : 100;
  for (let i = start; i < buffer.length - 3; i += step) {
    const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
    if (r !== g || g !== b || r !== b) pixels.push({ r, g, b });
  }
  return pixels;
}

interface Cluster { center: RGB; count: number }

function kMeans(pixels: RGB[], k: number, iterations: number): Cluster[] {
  const step = Math.floor(pixels.length / k);
  let centers: RGB[] = [];
  for (let i = 0; i < k; i++) centers.push({ ...pixels[Math.min(i * step, pixels.length - 1)] });
  let assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity, minIdx = 0;
      for (let c = 0; c < centers.length; c++) {
        const dist = colorDistance(pixels[i], centers[c]);
        if (dist < minDist) { minDist = dist; minIdx = c; }
      }
      assignments[i] = minIdx;
    }
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c].r += pixels[i].r; sums[c].g += pixels[i].g; sums[c].b += pixels[i].b; sums[c].count++;
    }
    for (let c = 0; c < centers.length; c++) {
      if (sums[c].count > 0) {
        centers[c] = {
          r: Math.round(sums[c].r / sums[c].count),
          g: Math.round(sums[c].g / sums[c].count),
          b: Math.round(sums[c].b / sums[c].count),
        };
      }
    }
  }
  const counts = new Array(k).fill(0);
  for (const a of assignments) counts[a]++;
  return centers.map((center, i) => ({ center, count: counts[i] }));
}

function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function rgbToHex(c: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}
