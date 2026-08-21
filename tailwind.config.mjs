/** @type {import('tailwindcss').Config} */
export default {
  // No darkMode toggle. There is one theme: the faceplate.
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      // Metal, not paper. --radius is 0px; shadcn's calc() would otherwise
      // produce negative radii, so these all resolve flat.
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
        glass: "var(--radius-glass)",
      },

      fontFamily: {
        display: ["var(--font-display)"],
        cond: ["var(--font-cond)"],
        mono: ["var(--font-mono)"],
        segment: ["var(--font-segment)"],
      },

      fontSize: {
        xs: "var(--t-xs)",
        sm: "var(--t-sm)",
        base: "var(--t-md)",
        lg: "var(--t-lg)",
        xl: "var(--t-xl)",
        "2xl": "var(--t-2xl)",
      },

      letterSpacing: {
        label: "var(--track-label)",
        tight: "var(--track-tight)",
      },

      spacing: {
        1: "var(--s-1)", 2: "var(--s-2)", 3: "var(--s-3)", 4: "var(--s-4)",
        5: "var(--s-5)", 6: "var(--s-6)", 7: "var(--s-7)", 8: "var(--s-8)",
        9: "var(--s-9)",
        gutter: "var(--gutter)",
      },

      colors: {
        // shadcn contract — unchanged shape, repointed values.
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Semantic aliases — prefer these in new markup.
        faceplate: "var(--faceplate)",
        inlay: "var(--inlay)",
        recess: "var(--recess)",
        ink: { DEFAULT: "var(--ink)", dim: "var(--ink-dim)", faint: "var(--ink-faint)" },
        rule: "var(--rule)",
        seam: { light: "var(--seam-light)", dark: "var(--seam-dark)" },
        glass: { DEFAULT: "var(--glass)", edge: "var(--glass-edge)" },
        segment: { DEFAULT: "var(--segment)", off: "var(--segment-off)" },
      },

      transitionTimingFunction: { device: "var(--ease)" },
      transitionDuration: { fast: "var(--fast)", slow: "var(--slow)" },
    },
  },
  // tailwindcss-animate was only present for the shadcn accordion. Drop it
  // unless something still uses it — the motion budget here is one page-load
  // self-test and a hover arrow.
  plugins: [],
};
