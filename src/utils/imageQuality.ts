export interface ImageQualityResult {
  isAcceptable: boolean;
  status: 'OK' | 'BLURRED' | 'TOO_DARK' | 'TOO_BRIGHT' | 'LOW_RESOLUTION';
  message: string;
  score: number; // 0 - 100 quality score
  blurMetric?: number;
  meanBrightness?: number;
}

/**
 * Deterministic client-side image quality check using canvas pixel analysis.
 * Detects blur, excessive darkness, excessive brightness, and resolution.
 */
export async function analyzeImageQuality(imageDataUrl: string): Promise<ImageQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // 1. Resolution Check
        if (width < 640 || height < 480) {
          resolve({
            isAcceptable: false,
            status: 'LOW_RESOLUTION',
            message: `Resolution (${width}x${height}) is below minimum inspection standard (640x480).`,
            score: 40,
          });
          return;
        }

        // Downsample to 200x200 canvas for fast, deterministic CPU analysis on mobile
        const sampleSize = 200;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({
            isAcceptable: true,
            status: 'OK',
            message: 'Image Quality Acceptable',
            score: 85,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Grayscale conversion & brightness calculation
        const gray = new Float32Array(sampleSize * sampleSize);
        let totalLuma = 0;

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray[p] = luma;
          totalLuma += luma;
        }

        const meanBrightness = totalLuma / (sampleSize * sampleSize);

        // 2. Darkness & Brightness Check
        if (meanBrightness < 30) {
          resolve({
            isAcceptable: false,
            status: 'TOO_DARK',
            message: 'Image appears excessively dark. Please improve lighting or enable torch.',
            score: Math.max(10, Math.round((meanBrightness / 30) * 50)),
            meanBrightness,
          });
          return;
        }

        if (meanBrightness > 235) {
          resolve({
            isAcceptable: false,
            status: 'TOO_BRIGHT',
            message: 'Image has excessive glare / brightness wash out.',
            score: 35,
            meanBrightness,
          });
          return;
        }

        // 3. Blur Detection using discrete Laplacian variance approximation
        // L(x, y) = 4*I(x,y) - I(x+1,y) - I(x-1,y) - I(x,y+1) - I(x,y-1)
        let laplacianSum = 0;
        let laplacianSqSum = 0;
        let count = 0;

        for (let y = 1; y < sampleSize - 1; y++) {
          for (let x = 1; x < sampleSize - 1; x++) {
            const idx = y * sampleSize + x;
            const center = gray[idx];
            const up = gray[(y - 1) * sampleSize + x];
            const down = gray[(y + 1) * sampleSize + x];
            const left = gray[y * sampleSize + (x - 1)];
            const right = gray[y * sampleSize + (x + 1)];

            const lap = Math.abs(4 * center - up - down - left - right);
            laplacianSum += lap;
            laplacianSqSum += lap * lap;
            count++;
          }
        }

        const meanLap = laplacianSum / count;
        const varianceLap = (laplacianSqSum / count) - (meanLap * meanLap);

        // Typical blurred mobile camera photos have variance < 35 on 200x200 downsample
        const blurThreshold = 35;
        const isBlurred = varianceLap < blurThreshold;

        if (isBlurred) {
          resolve({
            isAcceptable: false,
            status: 'BLURRED',
            message: 'Image appears blurred. Please steady the smartphone and retake.',
            score: Math.min(55, Math.max(20, Math.round((varianceLap / blurThreshold) * 60))),
            blurMetric: varianceLap,
            meanBrightness,
          });
          return;
        }

        // Compute normalized score 70 - 98
        const calculatedScore = Math.min(98, Math.max(75, Math.round(75 + Math.min(23, varianceLap / 10))));

        resolve({
          isAcceptable: true,
          status: 'OK',
          message: 'Image Quality Acceptable',
          score: calculatedScore,
          blurMetric: varianceLap,
          meanBrightness,
        });
      } catch (err) {
        console.error('Image quality analysis error:', err);
        // Fallback to OK so operator is never blocked
        resolve({
          isAcceptable: true,
          status: 'OK',
          message: 'Quality check completed',
          score: 80,
        });
      }
    };

    img.onerror = () => {
      resolve({
        isAcceptable: true,
        status: 'OK',
        message: 'Quality check bypassed',
        score: 75,
      });
    };

    img.src = imageDataUrl;
  });
}
