// Reading page themes: Light, Sepia, Dark. Dark is for the reading page only.

export type ReaderThemeName = "light" | "sepia" | "dark";

export interface ReaderTheme {
  page: string;
  bar: string;
  text: string;
  soft: string;
  accent: string;
  line: string;
}

export const READER_THEMES: Record<ReaderThemeName, ReaderTheme> = {
  light: {
    page: "#FFFDF7",
    bar: "#FFFFFF",
    text: "#3B2E25",
    soft: "#7A6A5C",
    accent: "#E85B25",
    line: "#EFE3CE",
  },
  sepia: {
    page: "#F1E3C6",
    bar: "#E9D8B6",
    text: "#4A3A28",
    soft: "#6B5842",
    accent: "#B23D10",
    line: "#D9C6A0",
  },
  dark: {
    page: "#1B1714",
    bar: "#26201B",
    text: "#EDE3D3",
    soft: "#A89B8A",
    accent: "#F08A5D",
    line: "#3A322B",
  },
};

export const READER_SIZES = [0.85, 1, 1.15, 1.3, 1.5];
