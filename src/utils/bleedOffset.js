// ============================================================================
// bleedOffset.js — Production-quality geometric bleed offset pipeline
//
// Pipeline: Pacdora curves → flatten → validate → Clipper2 offset → SVG path
//
// Uses clipper2-ts (TypeScript port of Angus Johnson's Clipper2 library)
// for Minkowski-sum-based polygon offset with boolean union and
// self-intersection cleanup. No heuristic edge-by-edge offset.
//
// All geometry is in millimeters. A unit layer (unitsPerMM) handles
// non-mm coordinate systems. All tolerances are specified in mm and
// converted through the unit layer.
// ============================================================================

import { inflatePaths, JoinType, EndType, FillRule } from 'clipper2-ts';

// ── Unit layer ──────────────────────────────────────────────────────────────

const GEOMETRY = {
  unitsPerMM: 1.0,
  mmToUnits(mm) { return mm * this.unitsPerMM; },
  unitsToMM(u) { return u / this.unitsPerMM; },
};

// Derive unitsPerMM by comparing path lengths to known physical dimensions.
// Called once when a Pacdora template loads.
export function deriveUnits(shapes, knownL, knownW, knownH) {
  if (!shapes || !shapes.length) return;

  // Find the longest LineCurve
  let maxLen = 0;
  for (const shape of shapes) {
    for (const curve of (shape.curves || [])) {
      if (curve.type === 'LineCurve') {
        const len = Math.hypot(
          curve.v2[0] - curve.v1[0],
          curve.v2[1] - curve.v1[1]
        );
        if (len > maxLen) maxLen = len;
      }
    }
  }

  if (maxLen < 1) return;

  // Try matching against known dimensions
  const candidates = [knownL, knownW, knownH, knownL + 2 * knownH, knownW + 2 * knownH]
    .filter(v => v && v > 0);

  for (const dim of candidates) {
    const ratio = maxLen / dim;
    if (Math.abs(ratio - 1.0) < 0.005) { GEOMETRY.unitsPerMM = 1.0; return; }
    if (Math.abs(ratio - 2.835) < 0.05) { GEOMETRY.unitsPerMM = 2.835; return; }
    if (Math.abs(ratio - 37.8) < 0.5) { GEOMETRY.unitsPerMM = 37.8; return; }
  }

  // Fallback: assume mm (verified for all Pacdora templates)
  GEOMETRY.unitsPerMM = 1.0;
}

// ── Adaptive Bézier flattening ──────────────────────────────────────────────
// De Casteljau recursive subdivision with chord-error flatness test.
// Tolerance is in mm, converted through unit layer.

const FLATTEN_TOL_MM = 0.05;

function flattenCubicBezier(p0, p1, p2, p3, tol, out) {
  // Chord error: distance from curve midpoint to chord midpoint
  const midX = (p0[0] + 3*p1[0] + 3*p2[0] + p3[0]) / 8;
  const midY = (p0[1] + 3*p1[1] + 3*p2[1] + p3[1]) / 8;
  const chordMidX = (p0[0] + p3[0]) / 2;
  const chordMidY = (p0[1] + p3[1]) / 2;
  const error = Math.hypot(midX - chordMidX, midY - chordMidY);

  if (error < tol) {
    out.push([p3[0], p3[1]]);
    return;
  }

  // De Casteljau split at t=0.5
  const a01 = [(p0[0]+p1[0])/2, (p0[1]+p1[1])/2];
  const a12 = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
  const a23 = [(p2[0]+p3[0])/2, (p2[1]+p3[1])/2];
  const b01 = [(a01[0]+a12[0])/2, (a01[1]+a12[1])/2];
  const b12 = [(a12[0]+a23[0])/2, (a12[1]+a23[1])/2];
  const c = [(b01[0]+b12[0])/2, (b01[1]+b12[1])/2];

  flattenCubicBezier(p0, a01, b01, c, tol, out);
  flattenCubicBezier(c, b12, a23, p3, tol, out);
}

function flattenQuadraticBezier(p0, p1, p2, tol, out) {
  const midX = (p0[0] + 2*p1[0] + p2[0]) / 4;
  const midY = (p0[1] + 2*p1[1] + p2[1]) / 4;
  const chordMidX = (p0[0] + p2[0]) / 2;
  const chordMidY = (p0[1] + p2[1]) / 2;
  const error = Math.hypot(midX - chordMidX, midY - chordMidY);

  if (error < tol) {
    out.push([p2[0], p2[1]]);
    return;
  }

  const a01 = [(p0[0]+p1[0])/2, (p0[1]+p1[1])/2];
  const a12 = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
  const c = [(a01[0]+a12[0])/2, (a01[1]+a12[1])/2];

  flattenQuadraticBezier(p0, a01, c, tol, out);
  flattenQuadraticBezier(c, a12, p2, tol, out);
}

// Flatten an EllipseCurve (arc) into line segments using adaptive subdivision.
// Splits arc into max 90° segments, then flattens each as cubic Bézier.
function flattenEllipseCurve(curve, tol, out) {
  const { aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation } = curve;
  let a0 = aStartAngle, a1 = aEndAngle;
  if (!aClockwise && a1 < a0) a1 += Math.PI * 2;
  if (aClockwise && a1 > a0) a1 -= Math.PI * 2;

  const totalAngle = Math.abs(a1 - a0);
  const segments = Math.max(1, Math.ceil(totalAngle / (Math.PI / 2))); // max 90° per segment

  for (let i = 0; i < segments; i++) {
    const s0 = a0 + (a1 - a0) * (i / segments);
    const s1 = a0 + (a1 - a0) * ((i + 1) / segments);

    // Convert arc segment to cubic Bézier
    const t = (s1 - s0) / 2;
    const cosT = Math.cos(t), sinT = Math.sin(t);
    const k = (4/3) * Math.tan(t / 2);

    // Points on arc at s0, midpoint, s1
    const p0x = Math.cos(s0), p0y = Math.sin(s0);
    const p1x = p0x - k * Math.sin(s0), p1y = p0y + k * Math.cos(s0);
    const p2x = Math.cos(s1) + k * Math.sin(s1), p2y = Math.sin(s1) - k * Math.cos(s1);
    const p3x = Math.cos(s1), p3y = Math.sin(s1);

    // Apply radii, center, and rotation
    const rot = aRotation || 0;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);

    const transform = (px, py) => {
      const x = px * xRadius, y = py * yRadius;
      return [
        aX + x * cosR - y * sinR,
        aY + x * sinR + y * cosR
      ];
    };

    const bp0 = transform(p0x, p0y);
    const bp1 = transform(p1x, p1y);
    const bp2 = transform(p2x, p2y);
    const bp3 = transform(p3x, p3y);

    if (i === 0) out.push(bp0);
    flattenCubicBezier(bp0, bp1, bp2, bp3, tol, out);
  }
}

// ── Curve extraction with G1-continuity-preserving flattening ────────────────
// Extracts all curves (including holes) and flattens them into point arrays.
// Consecutive G1-continuous curves are flattened as a single chain — no
// duplicate boundary points, no artificial tangent-break vertices.
// Returns: { outer: [[x,y]...], holes: [[[x,y]...]...] }

export function extractContours(shapes, flattenTolMM = FLATTEN_TOL_MM) {
  const tol = GEOMETRY.mmToUnits(flattenTolMM);
  const outer = [];
  const holes = [];

  for (const shape of shapes) {
    // Flatten outer contour with G1 chaining
    const contour = flattenCurveChain(shape.curves || [], tol);
    if (contour.length >= 3) {
      outer.push(closeContour(contour));
    }

    // Flatten holes with G1 chaining
    for (const hole of (shape.holes || [])) {
      const holeContour = flattenCurveChain(hole.curves || [], tol);
      if (holeContour.length >= 3) {
        holes.push(closeContour(holeContour));
      }
    }
  }

  return { outer, holes };
}

// Flatten a list of curves into a single point array, preserving G1 continuity.
// Consecutive curves that are G1-continuous (tangent angle < 0.5° from original
// curve data) are flattened as a single chain — the boundary point is shared,
// not duplicated. This prevents artificial tangent-break vertices that cause
// Clipper to generate oversized round joins.
//
// Supports all curve type transitions:
//   Ellipse → Line, Line → Ellipse,
//   Quadratic → Line, Line → Quadratic,
//   Ellipse → Quadratic, Quadratic → Ellipse,
//   Cubic → *, * → Cubic, Spline → *, * → Spline
function flattenCurveChain(curves, tol) {
  if (!curves || curves.length === 0) return [];
  if (curves.length === 1) {
    const out = [];
    flattenCurveG1(curves[0], tol, out, true, true);
    return out;
  }

  // Step 1: Detect G1 continuity at each boundary from original curve data
  // Build chains of G1-connected curves
  const isG1 = []; // isG1[i] = true if curve[i] and curve[i+1] are G1-continuous
  for (let i = 0; i < curves.length; i++) {
    const c1 = curves[i];
    const c2 = curves[(i + 1) % curves.length];
    isG1.push(isG1Continuous(c1, c2, 0.5)); // 0.5° tolerance
  }

  // Step 2: Flatten with G1 chaining
  // We process curves in order. When curve[i] and curve[i+1] are G1-continuous,
  // they're part of the same chain — the boundary point is shared.
  const out = [];

  for (let i = 0; i < curves.length; i++) {
    const isFirst = (i === 0) || !isG1[i - 1];
    const isLast = (i === curves.length - 1) || !isG1[i];

    flattenCurveG1(curves[i], tol, out, isFirst, isLast);
  }

  return out;
}

// ── G1 continuity detection from original curve primitives ──────────
// Computes tangent vectors at curve boundaries from the ORIGINAL curve data,
// not from flattened points. This detects true G1 continuity before
// flattening introduces sampling quantization errors.

// Get tangent direction at the END of a curve (unit vector)
function getTangentEnd(curve) {
  switch (curve.type) {
    case 'LineCurve': {
      const dx = curve.v2[0] - curve.v1[0];
      const dy = curve.v2[1] - curve.v1[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'EllipseCurve': {
      const { aX, aY, xRadius, yRadius, aEndAngle, aClockwise, aRotation } = curve;
      const cosA = Math.cos(aEndAngle), sinA = Math.sin(aEndAngle);
      // Tangent of ellipse: (-sin*r_x, cos*r_y), direction depends on clockwise
      let tx = -sinA * xRadius, ty = cosA * yRadius;
      if (aClockwise) { tx = -tx; ty = -ty; }
      // Apply rotation
      if (aRotation) {
        const cR = Math.cos(aRotation), sR = Math.sin(aRotation);
        const ox = tx, oy = ty;
        tx = ox * cR - oy * sR;
        ty = ox * sR + oy * cR;
      }
      const len = Math.hypot(tx, ty);
      return len > 1e-9 ? [tx / len, ty / len] : null;
    }
    case 'QuadraticBezierCurve': {
      // Tangent at t=1 = direction from v1 to v2
      const dx = curve.v2[0] - curve.v1[0];
      const dy = curve.v2[1] - curve.v1[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'CubicBezierCurve': {
      // Tangent at t=1 = direction from v2 to v3
      const dx = curve.v3[0] - curve.v2[0];
      const dy = curve.v3[1] - curve.v2[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'SplineCurve': {
      if (curve.points && curve.points.length >= 2) {
        const p1 = curve.points[curve.points.length - 2];
        const p2 = curve.points[curve.points.length - 1];
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
        const len = Math.hypot(dx, dy);
        return len > 1e-9 ? [dx / len, dy / len] : null;
      }
      return null;
    }
    default:
      return null;
  }
}

// Get tangent direction at the START of a curve (unit vector)
function getTangentStart(curve) {
  switch (curve.type) {
    case 'LineCurve': {
      const dx = curve.v2[0] - curve.v1[0];
      const dy = curve.v2[1] - curve.v1[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'EllipseCurve': {
      const { aX, aY, xRadius, yRadius, aStartAngle, aClockwise, aRotation } = curve;
      const cosA = Math.cos(aStartAngle), sinA = Math.sin(aStartAngle);
      let tx = -sinA * xRadius, ty = cosA * yRadius;
      if (aClockwise) { tx = -tx; ty = -ty; }
      if (aRotation) {
        const cR = Math.cos(aRotation), sR = Math.sin(aRotation);
        const ox = tx, oy = ty;
        tx = ox * cR - oy * sR;
        ty = ox * sR + oy * cR;
      }
      const len = Math.hypot(tx, ty);
      return len > 1e-9 ? [tx / len, ty / len] : null;
    }
    case 'QuadraticBezierCurve': {
      // Tangent at t=0 = direction from v0 to v1
      const dx = curve.v1[0] - curve.v0[0];
      const dy = curve.v1[1] - curve.v0[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'CubicBezierCurve': {
      // Tangent at t=0 = direction from v0 to v1
      const dx = curve.v1[0] - curve.v0[0];
      const dy = curve.v1[1] - curve.v0[1];
      const len = Math.hypot(dx, dy);
      return len > 1e-9 ? [dx / len, dy / len] : null;
    }
    case 'SplineCurve': {
      if (curve.points && curve.points.length >= 2) {
        const p0 = curve.points[0];
        const p1 = curve.points[1];
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
        const len = Math.hypot(dx, dy);
        return len > 1e-9 ? [dx / len, dy / len] : null;
      }
      return null;
    }
    default:
      return null;
  }
}

// Check if two consecutive curves are G1-continuous (tangent vectors parallel).
// Uses ORIGINAL curve data, not flattened points.
// Returns true if the tangent angle between curve1.end and curve2.start < tolDeg.
function isG1Continuous(curve1, curve2, tolDeg = 0.5) {
  const t1 = getTangentEnd(curve1);
  const t2 = getTangentStart(curve2);
  if (!t1 || !t2) return false;
  // Tangent vectors should point in the SAME direction (dot product ≈ 1)
  const dot = t1[0] * t2[0] + t1[1] * t2[1];
  const angle = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot)))) * 180 / Math.PI;
  return angle < tolDeg;
}

// Get the endpoint of a curve (the shared point at a boundary)
function getCurveEnd(curve) {
  switch (curve.type) {
    case 'LineCurve': return curve.v2;
    case 'EllipseCurve': {
      const { aX, aY, xRadius, yRadius, aEndAngle, aRotation } = curve;
      let x = aX + Math.cos(aEndAngle) * xRadius;
      let y = aY + Math.sin(aEndAngle) * yRadius;
      if (aRotation) {
        const cR = Math.cos(aRotation), sR = Math.sin(aRotation);
        const dx = x - aX, dy = y - aY;
        x = aX + dx * cR - dy * sR;
        y = aY + dx * sR + dy * cR;
      }
      return [x, y];
    }
    case 'QuadraticBezierCurve': return curve.v2;
    case 'CubicBezierCurve': return curve.v3;
    case 'SplineCurve':
      return curve.points && curve.points.length > 0
        ? curve.points[curve.points.length - 1] : null;
    default: return null;
  }
}

// Get the start point of a curve
function getCurveStart(curve) {
  switch (curve.type) {
    case 'LineCurve': return curve.v1;
    case 'EllipseCurve': {
      const { aX, aY, xRadius, yRadius, aStartAngle, aRotation } = curve;
      let x = aX + Math.cos(aStartAngle) * xRadius;
      let y = aY + Math.sin(aStartAngle) * yRadius;
      if (aRotation) {
        const cR = Math.cos(aRotation), sR = Math.sin(aRotation);
        const dx = x - aX, dy = y - aY;
        x = aX + dx * cR - dy * sR;
        y = aY + dx * sR + dy * cR;
      }
      return [x, y];
    }
    case 'QuadraticBezierCurve': return curve.v0;
    case 'CubicBezierCurve': return curve.v0;
    case 'SplineCurve':
      return curve.points && curve.points.length > 0 ? curve.points[0] : null;
    default: return null;
  }
}

// Flatten a single THREE.js curve into the output point array.
// If `isFirstInChain` is true, the start point is emitted.
// If `isLastInChain` is true, the end point is emitted.
// For G1-continuous chains, intermediate boundary points are NOT duplicated.
function flattenCurveG1(curve, tol, out, isFirstInChain, isLastInChain) {
  switch (curve.type) {
    case 'LineCurve': {
      if (isFirstInChain) out.push([curve.v1[0], curve.v1[1]]);
      // End point is only emitted if this is the last curve in the chain
      // (otherwise the next curve will start from here)
      if (isLastInChain) out.push([curve.v2[0], curve.v2[1]]);
      break;
    }
    case 'EllipseCurve': {
      // For arcs, we need to sample the curve
      // If this is NOT the first in chain, we skip the first sample point
      // (it's the same as the previous curve's end)
      const pts = [];
      flattenEllipseCurve(curve, tol, pts);
      // pts[0] is the start point, pts[pts.length-1] is the end point
      if (isFirstInChain) {
        out.push(...pts);
      } else {
        // Skip first point (shared with previous curve's end)
        out.push(...pts.slice(1));
      }
      // If this is NOT the last in chain, the next curve will continue from
      // our last point, so we keep it in the output
      break;
    }
    case 'QuadraticBezierCurve': {
      const pts = [];
      flattenQuadraticBezier(curve.v0, curve.v1, curve.v2, tol, pts);
      if (isFirstInChain) {
        out.push(...pts);
      } else {
        out.push(...pts.slice(1));
      }
      break;
    }
    case 'CubicBezierCurve': {
      const pts = [];
      flattenCubicBezier(curve.v0, curve.v1, curve.v2, curve.v3, tol, pts);
      if (isFirstInChain) {
        out.push(...pts);
      } else {
        out.push(...pts.slice(1));
      }
      break;
    }
    case 'SplineCurve': {
      if (curve.points && curve.points.length > 1) {
        if (isFirstInChain) {
          for (const p of curve.points) out.push([p[0], p[1]]);
        } else {
          for (let i = 1; i < curve.points.length; i++) {
            out.push([curve.points[i][0], curve.points[i][1]]);
          }
        }
      }
      break;
    }
    default: {
      // Unknown curve type — try to extract any point data
      const keys = ['v0', 'v1', 'v2', 'v3'].filter(k => curve[k]);
      if (isFirstInChain) {
        for (const key of keys) out.push([curve[key][0], curve[key][1]]);
      } else {
        for (let i = 1; i < keys.length; i++) {
          out.push([curve[keys[i]][0], curve[keys[i]][1]]);
        }
      }
      break;
    }
  }
}

// ── Geometry validation ─────────────────────────────────────────────────────

const SNAP_TOL_MM = 0.01;
const MERGE_TOL_MM = 0.01;

// Ensure contour is closed (first point ≈ last point)
function closeContour(pts) {
  if (pts.length < 2) return pts;
  const snap = GEOMETRY.mmToUnits(SNAP_TOL_MM);
  const first = pts[0], last = pts[pts.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > snap) {
    pts.push([first[0], first[1]]); // close it
  }
  return dedup(pts);
}

// Remove duplicate/near-duplicate consecutive points
function dedup(pts) {
  if (pts.length < 2) return pts;
  const merge = GEOMETRY.mmToUnits(MERGE_TOL_MM);
  const result = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = result[result.length - 1];
    if (Math.hypot(pts[i][0] - prev[0], pts[i][1] - prev[1]) > merge) {
      result.push(pts[i]);
    }
  }
  // Check last vs first
  if (result.length > 2) {
    const f = result[0], l = result[result.length - 1];
    if (Math.hypot(l[0] - f[0], l[1] - f[1]) < merge) result.pop();
  }
  return result;
}

// Compute signed area (positive = clockwise in SVG y-down)
function signedArea(pts) {
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return a / 2;
}

// Ensure outer contours are CW (positive area in SVG y-down) and holes are CCW
function ensureWinding(pts, shouldBeCW) {
  const area = signedArea(pts);
  const isCW = area > 0;
  if (isCW !== shouldBeCW) {
    pts.reverse();
  }
  return pts;
}

// ── Clipper2 offset ─────────────────────────────────────────────────────────
// Uses inflatePaths() from clipper2-ts for Minkowski-sum-based offset.
// Scale coordinates to integer space (×1000 for μm precision).

const CLIPPER_SCALE = 1000;

function toClipperPath(pts) {
  return pts.map(p => ({ x: Math.round(p[0] * CLIPPER_SCALE), y: Math.round(p[1] * CLIPPER_SCALE) }));
}

function fromClipperPath(path) {
  return path.map(p => [p.x / CLIPPER_SCALE, p.y / CLIPPER_SCALE]);
}

function pathsToSVG(paths) {
  return paths
    .filter(p => p.length >= 3)
    .map(p => {
      let d = `M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
      for (let i = 1; i < p.length; i++) {
        d += ` L ${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`;
      }
      d += ' Z';
      return d;
    })
    .join(' ');
}

// Main export: compute bleed offset path from Pacdora shapes.
// Returns SVG path 'd' string(s) for the green bleed line.
export function computeBleedOffset(shapes, bleedMM) {
  if (!shapes || !shapes.length || bleedMM <= 0) return '';

  // 1. Extract and flatten all contours (outer + holes)
  const { outer, holes } = extractContours(shapes);

  if (outer.length === 0) return '';

  // 2. Validate geometry
  const validatedOuter = outer
    .map(pts => dedup(pts))
    .filter(pts => pts.length >= 3)
    .map(pts => ensureWinding(pts, true)); // CW for outer

  const validatedHoles = holes
    .map(pts => dedup(pts))
    .filter(pts => pts.length >= 3)
    .map(pts => ensureWinding(pts, false)); // CCW for holes

  // 3. Convert to Clipper coordinate space
  const clipperInput = [];
  for (const pts of validatedOuter) {
    clipperInput.push(toClipperPath(pts));
  }
  for (const pts of validatedHoles) {
    clipperInput.push(toClipperPath(pts));
  }

  // 4. Run Clipper2 inflatePaths (Minkowski sum + boolean union)
  const delta = Math.round(GEOMETRY.mmToUnits(bleedMM) * CLIPPER_SCALE);

  let result;
  try {
    result = inflatePaths(
      clipperInput,
      delta,
      JoinType.Round,
      EndType.Polygon
    );
  } catch (e) {
    console.error('Clipper2 inflatePaths error:', e);
    return '';
  }

  // 5. Convert back to SVG coordinates
  if (!result || result.length === 0) return '';

  const svgPaths = result.map(fromClipperPath);
  return pathsToSVG(svgPaths);
}

// Also export a version that works with pre-classified SVG path 'd' strings
// (for the parametric/fallback mode where paths come from dielineGenerators)
export function computeBleedOffsetFromSVG(svgCutPaths, bleedMM) {
  if (!svgCutPaths || !svgCutPaths.length || bleedMM <= 0) return '';

  const tol = GEOMETRY.mmToUnits(FLATTEN_TOL_MM);
  const contours = [];

  for (const d of svgCutPaths) {
    const pts = parseSVGPathToPoints(d, tol);
    if (pts.length >= 3) {
      contours.push(ensureWinding(dedup(pts), true));
    }
  }

  if (contours.length === 0) return '';

  // Convert to Clipper and offset
  const clipperInput = contours.map(toClipperPath);
  const delta = Math.round(GEOMETRY.mmToUnits(bleedMM) * CLIPPER_SCALE);

  let result;
  try {
    result = inflatePaths(
      clipperInput,
      delta,
      JoinType.Round,
      EndType.Polygon
    );
  } catch (e) {
    console.error('Clipper2 inflatePaths error:', e);
    return '';
  }

  if (!result || result.length === 0) return '';

  const svgPaths = result.map(fromClipperPath);
  return pathsToSVG(svgPaths);
}

// Parse SVG path 'd' string into array of [x,y] points with adaptive flattening.
// Supports: M L H V C S Q T A Z
function parseSVGPathToPoints(d, tol) {
  if (!d) return [];
  const subs = [];
  let cur = [];
  let cx = 0, cy = 0;
  let lastCmd = '';
  let lastControl = null; // for S/T smooth commands

  const re = /([MLHVCQSTAZmlhvcqsta])\s*([^MLHVCQSTAZmlhvcqsta]*)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1].toUpperCase();
    const rel = m[1] !== cmd;
    const nums = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);

    const getNum = (i) => nums[i];

    switch (cmd) {
      case 'M': {
        if (cur.length >= 3) subs.push(cur);
        cur = [];
        cx = rel ? cx + nums[0] : nums[0];
        cy = rel ? cy + nums[1] : nums[1];
        cur.push([cx, cy]);
        for (let i = 2; i + 1 < nums.length; i += 2) {
          cx = rel ? cx + nums[i] : nums[i];
          cy = rel ? cy + nums[i+1] : nums[i+1];
          cur.push([cx, cy]);
        }
        lastCmd = 'M';
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          cx = rel ? cx + nums[i] : nums[i];
          cy = rel ? cy + nums[i+1] : nums[i+1];
          cur.push([cx, cy]);
        }
        lastCmd = 'L';
        break;
      }
      case 'H': {
        for (let i = 0; i < nums.length; i++) {
          cx = rel ? cx + nums[i] : nums[i];
          cur.push([cx, cy]);
        }
        lastCmd = 'H';
        break;
      }
      case 'V': {
        for (let i = 0; i < nums.length; i++) {
          cy = rel ? cy + nums[i] : nums[i];
          cur.push([cx, cy]);
        }
        lastCmd = 'V';
        break;
      }
      case 'C': {
        for (let i = 0; i + 5 < nums.length; i += 6) {
          const x1 = rel ? cx + nums[i] : nums[i];
          const y1 = rel ? cy + nums[i+1] : nums[i+1];
          const x2 = rel ? cx + nums[i+2] : nums[i+2];
          const y2 = rel ? cy + nums[i+3] : nums[i+3];
          const x = rel ? cx + nums[i+4] : nums[i+4];
          const y = rel ? cy + nums[i+5] : nums[i+5];
          flattenCubicBezier([cx, cy], [x1, y1], [x2, y2], [x, y], tol, cur);
          lastControl = [x2, y2];
          cx = x; cy = y;
        }
        lastCmd = 'C';
        break;
      }
      case 'S': {
        // Smooth cubic: reflect last control point
        for (let i = 0; i + 3 < nums.length; i += 4) {
          const x2 = rel ? cx + nums[i] : nums[i];
          const y2 = rel ? cy + nums[i+1] : nums[i+1];
          const x = rel ? cx + nums[i+2] : nums[i+2];
          const y = rel ? cy + nums[i+3] : nums[i+3];
          // Reflected control point
          const x1 = lastCmd === 'C' || lastCmd === 'S' ? 2*cx - lastControl[0] : cx;
          const y1 = lastCmd === 'C' || lastCmd === 'S' ? 2*cy - lastControl[1] : cy;
          flattenCubicBezier([cx, cy], [x1, y1], [x2, y2], [x, y], tol, cur);
          lastControl = [x2, y2];
          cx = x; cy = y;
        }
        lastCmd = 'S';
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < nums.length; i += 4) {
          const x1 = rel ? cx + nums[i] : nums[i];
          const y1 = rel ? cy + nums[i+1] : nums[i+1];
          const x = rel ? cx + nums[i+2] : nums[i+2];
          const y = rel ? cy + nums[i+3] : nums[i+3];
          flattenQuadraticBezier([cx, cy], [x1, y1], [x, y], tol, cur);
          lastControl = [x1, y1];
          cx = x; cy = y;
        }
        lastCmd = 'Q';
        break;
      }
      case 'T': {
        // Smooth quadratic: reflect last control point
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const x = rel ? cx + nums[i] : nums[i];
          const y = rel ? cy + nums[i+1] : nums[i+1];
          const x1 = lastCmd === 'Q' || lastCmd === 'T' ? 2*cx - lastControl[0] : cx;
          const y1 = lastCmd === 'Q' || lastCmd === 'T' ? 2*cy - lastControl[1] : cy;
          flattenQuadraticBezier([cx, cy], [x1, y1], [x, y], tol, cur);
          lastControl = [x1, y1];
          cx = x; cy = y;
        }
        lastCmd = 'T';
        break;
      }
      case 'A': {
        // Arc: convert to cubic Bézier segments, then flatten
        for (let i = 0; i + 6 < nums.length; i += 7) {
          const rx = nums[i], ry = nums[i+1];
          const xRot = nums[i+2] * Math.PI / 180;
          const largeArc = nums[i+3] !== 0;
          const sweep = nums[i+4] !== 0;
          const x = rel ? cx + nums[i+5] : nums[i+5];
          const y = rel ? cy + nums[i+6] : nums[i+6];

          const beziers = arcToBeziers(cx, cy, rx, ry, xRot, largeArc, sweep, x, y);
          for (const [bp0, bp1, bp2, bp3] of beziers) {
            flattenCubicBezier(bp0, bp1, bp2, bp3, tol, cur);
          }
          cx = x; cy = y;
        }
        lastCmd = 'A';
        break;
      }
      case 'Z': {
        if (cur.length >= 3) subs.push(cur);
        cur = [];
        lastCmd = 'Z';
        break;
      }
    }
  }
  if (cur.length >= 3) subs.push(cur);

  // Flatten subpaths into single point array (for now, use first subpath)
  // For multi-subpath, each becomes a separate contour
  return subs.length > 0 ? subs[0] : [];
}

// Convert SVG arc (A command) to cubic Bézier segments.
// Implements the algorithm from SVG spec Appendix F.6.
function arcToBeziers(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [[[x1, y1], [x2, y2], [x2, y2], [x2, y2]]];

  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1')
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Compute (cx', cy')
  let rxp = Math.max(rx, 0.001), ryp = Math.max(ry, 0.001);
  const lambda = (x1p*x1p)/(rxp*rxp) + (y1p*y1p)/(ryp*ryp);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rxp *= s; ryp *= s;
  }

  const rx2 = rxp*rxp, ry2 = ryp*ryp;
  const x1p2 = x1p*x1p, y1p2 = y1p*y1p;
  let k = Math.sqrt(Math.max(0, (rx2*ry2 - rx2*y1p2 - ry2*x1p2) / (rx2*y1p2 + ry2*x1p2)));
  if (largeArc === sweep) k = -k;
  const cxp = k * rxp * y1p / ryp;
  const cyp = -k * ryp * x1p / rxp;

  // Step 3: Compute (cx, cy)
  const cx_ = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy_ = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Step 4: Compute theta1 and delta_theta
  const angle = (ux, uy, vx, vy) => {
    const dot = ux*vx + uy*vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot/len)));
    if (ux*vy - uy*vx < 0) a = -a;
    return a;
  };

  const theta1 = angle(1, 0, (x1p - cxp)/rxp, (y1p - cyp)/ryp);
  let deltaTheta = angle((x1p - cxp)/rxp, (y1p - cyp)/ryp, (-x1p - cxp)/rxp, (-y1p - cyp)/ryp);

  if (!sweep && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  if (sweep && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  // Step 5: Split into segments (max 90°) and convert each to cubic Bézier
  const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const beziers = [];

  for (let i = 0; i < segments; i++) {
    const t0 = theta1 + (deltaTheta * i / segments);
    const t1 = theta1 + (deltaTheta * (i + 1) / segments);
    const halfT = (t1 - t0) / 2;
    const k4 = (4/3) * Math.tan(halfT / 2);

    const cos0 = Math.cos(t0), sin0 = Math.sin(t0);
    const cos1 = Math.cos(t1), sin1 = Math.sin(t1);

    const p0 = [cx_ + rxp * cos0 * cosPhi - ryp * sin0 * sinPhi,
                cy_ + rxp * cos0 * sinPhi + ryp * sin0 * cosPhi];
    const p3 = [cx_ + rxp * cos1 * cosPhi - ryp * sin1 * sinPhi,
                cy_ + rxp * cos1 * sinPhi + ryp * sin1 * cosPhi];
    const p1 = [cx_ + rxp * (cos0 - k4 * sin0) * cosPhi - ryp * (sin0 + k4 * cos0) * sinPhi,
                cy_ + rxp * (cos0 - k4 * sin0) * sinPhi + ryp * (sin0 + k4 * cos0) * cosPhi];
    const p2 = [cx_ + rxp * (cos1 + k4 * sin1) * cosPhi - ryp * (sin1 - k4 * cos1) * sinPhi,
                cy_ + rxp * (cos1 + k4 * sin1) * sinPhi + ryp * (sin1 - k4 * cos1) * cosPhi];

    beziers.push([p0, p1, p2, p3]);
  }

  return beziers;
}
