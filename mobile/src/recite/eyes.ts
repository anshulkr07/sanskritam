// eyes: turn camera samples into the numbers sent to the server.

export interface EyeSample {
  t: number;
  faces: number;
  leftOpen: number | null;
  rightOpen: number | null;
  mouthGap: number | null;
}

export interface EyeSummary {
  samples: number;
  interval_ms: number;
  face_ratio: number;
  eyes_closed_ratio: number;
  multi_face_ratio: number;
  mouth_moving_ratio: number;
  app_version: string;
}

export function summarize(
  samples: EyeSample[],
  intervalMs: number,
  appVersion: string,
): EyeSummary {
  const n = samples.length;
  if (!n) {
    return {
      samples: 0,
      interval_ms: intervalMs,
      face_ratio: 0,
      eyes_closed_ratio: 0,
      multi_face_ratio: 0,
      mouth_moving_ratio: 0,
      app_version: appVersion,
    };
  }
  const face = samples.filter((s) => s.faces === 1).length / n;
  const closed = samples.filter(
    (s) =>
      s.leftOpen !== null &&
      s.rightOpen !== null &&
      s.leftOpen < 0.3 &&
      s.rightOpen < 0.3,
  ).length / n;
  const multi = samples.filter((s) => s.faces > 1).length / n;
  let moving = 0;
  let windows = 0;
  for (let i = 0; i + 2 < samples.length; i++) {
    const w = [samples[i], samples[i + 1], samples[i + 2]];
    if (w.every((s) => s.mouthGap !== null)) {
      windows++;
      const gaps = w.map((s) => s.mouthGap as number);
      if (Math.max(...gaps) - Math.min(...gaps) > 0.02) moving++;
    }
  }
  return {
    samples: n,
    interval_ms: intervalMs,
    face_ratio: face,
    eyes_closed_ratio: closed,
    multi_face_ratio: multi,
    mouth_moving_ratio: windows ? moving / windows : 0,
    app_version: appVersion,
  };
}
