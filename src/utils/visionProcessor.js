/**
 * Computer Vision Helper Functions for HSV Color Tracking & Image Processing
 */

// Convert RGB (0-255) to HSV (H: 0-360, S: 0-100, V: 0-100)
export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

// Preset Target Color HSV Ranges
export const COLOR_PRESETS = {
  CYAN: { name: 'Neon Cyan Ball', min: { h: 170, s: 50, v: 40 }, max: { h: 210, s: 100, v: 100 } },
  RED: { name: 'Red Marker', min: { h: 340, s: 50, v: 40 }, max: { h: 20, s: 100, v: 100 } }, // wrap-around handles in logic
  GREEN: { name: 'Laser Green', min: { h: 80, s: 40, v: 40 }, max: { h: 160, s: 100, v: 100 } },
  YELLOW: { name: 'Tennis Yellow', min: { h: 40, s: 40, v: 50 }, max: { h: 75, s: 100, v: 100 } },
  ORANGE: { name: 'Orange Cone', min: { h: 15, s: 60, v: 50 }, max: { h: 38, s: 100, v: 100 } }
};

/**
 * Process frame pixels to find color blob centroid and return binary mask
 */
export function analyzeFrame(ctx, width, height, hsvMin, hsvMax) {
  if (!ctx || width === 0 || height === 0) return null;

  const frameData = ctx.getImageData(0, 0, width, height);
  const pixels = frameData.data;
  const maskData = ctx.createImageData(width, height);
  const maskPixels = maskData.data;

  let totalX = 0;
  let totalY = 0;
  let matchingCount = 0;
  
  let minX = width, minY = height, maxX = 0, maxY = 0;

  // Subsample 2x2 for performance
  const step = 2;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const hsv = rgbToHsv(r, g, b);

      let isMatch = false;

      // Special wrap-around check for Red (Hue near 0 or 360)
      if (hsvMin.h > hsvMax.h) {
        isMatch = (hsv.h >= hsvMin.h || hsv.h <= hsvMax.h) &&
                  (hsv.s >= hsvMin.s && hsv.s <= hsvMax.s) &&
                  (hsv.v >= hsvMin.v && hsv.v <= hsvMax.v);
      } else {
        isMatch = (hsv.h >= hsvMin.h && hsv.h <= hsvMax.h) &&
                  (hsv.s >= hsvMin.s && hsv.s <= hsvMax.s) &&
                  (hsv.v >= hsvMin.v && hsv.v <= hsvMax.v);
      }

      if (isMatch) {
        totalX += x;
        totalY += y;
        matchingCount++;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // White in mask
        maskPixels[idx] = 0;
        maskPixels[idx + 1] = 243;
        maskPixels[idx + 2] = 255;
        maskPixels[idx + 3] = 255;
      } else {
        // Black transparent in mask
        maskPixels[idx] = 10;
        maskPixels[idx + 1] = 15;
        maskPixels[idx + 2] = 25;
        maskPixels[idx + 3] = 160;
      }
    }
  }

  const hasTarget = matchingCount > 15;
  const cx = hasTarget ? Math.round(totalX / matchingCount) : width / 2;
  const cy = hasTarget ? Math.round(totalY / matchingCount) : height / 2;
  const areaRatio = hasTarget ? (matchingCount * step * step) / (width * height) : 0;

  return {
    hasTarget,
    cx,
    cy,
    bbox: hasTarget ? { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } : null,
    areaRatio,
    matchingCount: matchingCount * step * step,
    maskData
  };
}

/**
 * Draws synthetic test video stream on canvas when webcam is off
 */
export function drawSyntheticFeed(ctx, width, height, timeSec, targetPos) {
  // Dark grid backdrop
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  const gridSize = 30;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw moving Target Ball
  const targetX = targetPos ? targetPos.x : (width / 2 + Math.sin(timeSec * 1.5) * (width * 0.3));
  const targetY = targetPos ? targetPos.y : (height / 2 + Math.cos(timeSec * 2.2) * (height * 0.25));
  const radius = 24 + Math.sin(timeSec * 3) * 4;

  // Glow effect
  const gradient = ctx.createRadialGradient(targetX, targetY, 2, targetX, targetY, radius * 1.8);
  gradient.addColorStop(0, '#00f3ff');
  gradient.addColorStop(0.5, 'rgba(0, 243, 255, 0.7)');
  gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(targetX, targetY, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Solid inner sphere
  ctx.fillStyle = '#00f3ff';
  ctx.beginPath();
  ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Center white dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
  ctx.fill();

  return { x: targetX, y: targetY };
}
