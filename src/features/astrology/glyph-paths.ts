export type GlyphCircle = { type: "circle"; cx: number; cy: number; r: number; fill?: boolean };
export type GlyphPath = { type: "path"; d: string; fill?: boolean };
export type GlyphPart = GlyphCircle | GlyphPath;

const BOX = 24;

function path(d: string, fill = false): GlyphPath {
  return { type: "path", d, fill };
}

function circle(cx: number, cy: number, r: number, fill = false): GlyphCircle {
  return { type: "circle", cx, cy, r, fill };
}

export const SIGN_GLYPH_PATHS: GlyphPart[][] = [
  [path("M5 20 C5 9 9 4.5 12 11 C15 4.5 19 9 19 20")],
  [circle(12, 16.2, 5), path("M4.8 13 C4.8 3.8 12 3.8 12 11.2 M19.2 13 C19.2 3.8 12 3.8 12 11.2")],
  [path("M8 5 L8 19 M16 5 L16 19 M5.5 5 L18.5 5 M5.5 19 L18.5 19")],
  [
    circle(8.2, 9.4, 2.5),
    path("M10.6 9.4 C13.8 9.4 13.8 5.4 10.8 5.4"),
    circle(15.8, 14.6, 2.5),
    path("M13.4 14.6 C10.2 14.6 10.2 18.6 13.2 18.6"),
  ],
  [circle(9.4, 10.2, 4.3), path("M13.4 10.2 C20.4 10.2 21 16.8 16.6 18.8 C13.4 20.4 12.6 16.4 15.2 15.6")],
  [
    path("M4.2 19.5 L4.2 7 C4.2 7 6 4.6 8 7.2 L12 13.6 L16 7.2 C18 4.6 19.8 7 19.8 7 L19.8 19.5"),
    path("M16 13.2 C16 13.2 21.4 12.6 21.4 17.4 C21.4 21 16.8 21 16.4 17.6"),
  ],
  [path("M3.8 14.2 L20.2 14.2 M7 19.2 L17 19.2 M7 14.2 A5.2 5.2 0 0 1 17 14.2")],
  [
    path("M4.2 19.5 L4.2 7 C4.2 7 6 4.6 8 7.2 L12 13.6 L16 7.2 C18 4.6 19.8 7 19.8 7 L19.8 14"),
    path("M19.8 14 L19.8 20.4 M19.8 20.4 L16.6 17.2 M19.8 20.4 L23 17.2"),
  ],
  [path("M5 19 L19.2 4.8 M19.2 4.8 L19.2 11 M19.2 4.8 L13 4.8 M9.6 9.2 L15.2 14.8")],
  [path("M3.6 8.5 L8.4 17 L13.2 7.5 C17.4 3.6 22.4 8.2 19.2 13.4 C16.2 18.2 12.2 16.4 14.2 13.2")],
  [path("M3.2 9.4 L7.6 5.2 L12 9.4 L16.4 5.2 L20.8 9.4 M3.2 16.8 L7.6 12.6 L12 16.8 L16.4 12.6 L20.8 16.8")],
  [path("M8 4.8 C2.4 12 2.4 12 8 19.2 M16 4.8 C21.6 12 21.6 12 16 19.2 M5.5 12 L18.5 12")],
];

export const POINT_GLYPH_PATHS: Record<string, GlyphPart[]> = {
  sun: [circle(12, 12, 7.2), circle(12, 12, 2.1, true)],
  moon: [path("M15.5 5.2 A8.2 8.2 0 1 0 15.5 18.8 A6.1 6.1 0 1 1 15.5 5.2", true)],
  mercury: [
    path("M7.5 7 A4.5 4.5 0 0 1 16.5 7"),
    circle(12, 11.2, 4.1),
    path("M12 15.3 L12 21 M8.6 18.2 L15.4 18.2"),
  ],
  venus: [circle(12, 9.2, 5.1), path("M12 14.3 L12 21.2 M8.4 18 L15.6 18")],
  mars: [circle(9.8, 14.2, 5.1), path("M13.4 10.6 L19.4 4.6 M19.4 4.6 L19.4 9.4 M19.4 4.6 L14.6 4.6")],
  jupiter: [path("M7 7 C7 7 5.5 11.5 8 15.5 C10.2 19 16.5 17.2 16.5 12.5 M13.5 4 L13.5 21 M10.5 8.2 L18.5 8.2")],
  saturn: [path("M8.5 4.5 L8.5 12 M5.5 8 L12 8 M8.5 12 C8.5 12 8.2 20.5 16 20.5 C20.2 20.5 20.4 14.8 16.2 14.8")],
  uranus: [
    circle(12, 17.4, 3.2),
    path("M12 14.2 L12 4 M7.4 8.6 L16.6 8.6 M7.4 4.8 L7.4 12.2 M16.6 4.8 L16.6 12.2"),
  ],
  neptune: [path("M12 21 L12 5 M12 5 L6.5 12.5 M12 5 L17.5 12.5 M5.5 9.2 L18.5 9.2")],
  pluto: [path("M8 4.2 L8 21 M8 4.2 C8 4.2 17.6 4.2 17.6 10 C17.6 15.6 8 15.6 8 15.6 M5.5 21 L14.5 21")],
  chiron: [circle(12, 7.2, 3.8), path("M12 11 L12 21 M12 14.5 L18 20.5 M12 14.5 L6.2 20.2")],
  north_node: [path("M5.5 18 C5.5 8 18.5 8 18.5 18")],
  south_node: [path("M5.5 6 C5.5 16 18.5 16 18.5 6")],
  part_of_fortune: [circle(12, 12, 7.4), path("M12 6.2 L12 17.8 M6.2 12 L17.8 12")],
};

export const GLYPH_BOX = BOX;

export function signGlyphParts(signIndex: number) {
  return SIGN_GLYPH_PATHS[signIndex] ?? [];
}

export function pointGlyphParts(pointId: string) {
  return POINT_GLYPH_PATHS[pointId] ?? [];
}
