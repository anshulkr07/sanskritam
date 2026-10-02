// The shape of the lit Moon, as an SVG path.
//
// One number draws it: the Moon's angle from the Sun (0 at new moon, 180 at
// full). The lit limb is half a circle and the terminator half an ellipse
// whose width is the cosine of that angle. Bright on the right while waxing
// and on the left while waning, as seen from the northern hemisphere.

/** The lit part of a disc of radius R centred on (cx, cy). */
export function litPath(elongationDeg: number, R: number, cx: number, cy: number): string {
  const e = ((elongationDeg % 360) + 360) % 360;
  const c = Math.cos((e * Math.PI) / 180);
  const rx = (Math.abs(c) * R).toFixed(2);
  const waxing = e < 180;
  const top = `${cx} ${cy - R}`;
  const bottom = `${cx} ${cy + R}`;
  // The lit limb: down the right while waxing, down the left while waning.
  const limb = waxing ? 1 : 0;
  // The terminator, back up: it bulges away from the limb once the Moon is
  // more than half lit (cosine below zero).
  const terminator = waxing ? (c < 0 ? 1 : 0) : c < 0 ? 0 : 1;
  return `M ${top} A ${R} ${R} 0 0 ${limb} ${bottom} A ${rx} ${R} 0 0 ${terminator} ${top} Z`;
}
