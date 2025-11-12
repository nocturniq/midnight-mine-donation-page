export const theme = {
  colors: {
    primary: "#3b82f6",

    background: {
      main: "#0b1020",     // deep navy (page)
      secondary: "#0f172a",// slate-900 wash (sections)
      card: "#111827",     // slate-800 cards
    },

    border: {
      primary: "#1f2937",  // slate-800
      secondary: "#334155",// slate-700 (hover/focus)
    },

    text: {
      primary: "#e5e7eb",  // gray-200
      secondary: "#94a3b8",// slate-400
    },
  },

  gradients: {
    background:
      "radial-gradient(900px 600px at 15% -10%, rgba(30,58,138,0.25) 0%, rgba(2,6,23,0) 60%)," +
      "radial-gradient(800px 500px at 120% 0%, rgba(8,47,73,0.25) 0%, rgba(2,6,23,0) 60%)," +
      "linear-gradient(145deg, #0b1020 0%, #0f172a 60%, #111827 100%)",
  },

  effects: {
    headerBlur: "rgba(2, 6, 23, 0.65)",              // slate-950 w/ alpha
    cardShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",   // deeper, softer
    focusRing: "0 0 0 3px rgba(59, 130, 246, 0.45)", // accessible on dark
  },
} as const;

export type Theme = typeof theme;