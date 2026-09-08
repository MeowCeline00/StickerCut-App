// Dynamic ruler-tick generation. Replaces any hardcoded tick list
// (e.g. a fixed 0/50/100/150/200) with values computed from the
// canvas's actual physical size, so an A4 (297mm tall) and an A5
// (210mm tall) page each get ticks that make sense for their own
// length, at whatever zoom level (editorScale) is currently active.

export interface RulerTick {
  // Position along the ruler, in millimeters from the page origin.
  valueMm: number;
  // Position along the ruler, in on-screen display pixels from the
  // page origin — i.e. valueMm * editorScale. Callers place the tick
  // label/mark at this offset.
  displayPx: number;
  // Major ticks get a numeric label; minor ticks are unlabeled marks.
  isMajor: boolean;
}

// Chooses a "nice" step size (1/2/5 × 10^n) close to a target raw step,
// the classic approach for auto-scaling axis ticks.
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;

  let niceFraction: number;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3.5) niceFraction = 2;
  else if (fraction < 7.5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * magnitude;
}

// Generates major (labeled) ticks spanning [0, lengthMm], targeting
// roughly `targetTickCount` major ticks, plus one minor (unlabeled)
// tick centered between each pair of major ticks so the ruler still
// reads as a ruler at low tick counts.
export function generateRulerTicks(
  lengthMm: number,
  editorScale: number,
  targetTickCount = 6,
): RulerTick[] {
  if (lengthMm <= 0 || editorScale <= 0) return [];

  const rawStep = lengthMm / Math.max(targetTickCount, 1);
  const majorStep = niceStep(rawStep);
  const minorStep = majorStep / 2;

  const ticks: RulerTick[] = [];

  for (let valueMm = 0; valueMm <= lengthMm + 0.001; valueMm += minorStep) {
    // Guard against floating point drift so e.g. 100.0000001 still
    // reads as an exact major tick.
    const roundedValueMm = Math.round(valueMm * 1000) / 1000;
    const isMajor =
      Math.abs(roundedValueMm % majorStep) < 0.01 ||
      Math.abs((roundedValueMm % majorStep) - majorStep) < 0.01;

    ticks.push({
      valueMm: roundedValueMm,
      displayPx: roundedValueMm * editorScale,
      isMajor,
    });
  }

  // Always include an explicit tick at the very end of the page even
  // if it doesn't fall on a clean step, so the ruler visually reaches
  // the page's far edge.
  const lastTick = ticks[ticks.length - 1];
  if (!lastTick || Math.abs(lastTick.valueMm - lengthMm) > 0.01) {
    ticks.push({
      valueMm: lengthMm,
      displayPx: lengthMm * editorScale,
      isMajor: true,
    });
  }

  return ticks;
}
