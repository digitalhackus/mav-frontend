import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const withOpacityValue = (variable: string) => ({ opacityValue }: { opacityValue?: string }) => {
  if (opacityValue === undefined) {
    return `var(${variable})`;
  }

  const numericOpacity = Number(opacityValue);

  if (Number.isFinite(numericOpacity)) {
    const percentage = Math.max(0, Math.min(100, numericOpacity * 100));
    return `color-mix(in oklab, var(${variable}) ${percentage}%, transparent)`;
  }

  return `color-mix(in oklab, var(${variable}) calc(${opacityValue} * 100%), transparent)`;
};

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      colors: {
        border: withOpacityValue("--border"),
        input: withOpacityValue("--input"),
        ring: withOpacityValue("--ring"),
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: withOpacityValue("--primary"),
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: withOpacityValue("--secondary"),
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: withOpacityValue("--destructive"),
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: withOpacityValue("--muted"),
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: withOpacityValue("--accent"),
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: withOpacityValue("--popover"),
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: withOpacityValue("--card"),
          foreground: "var(--card-foreground)",
        },
        "input-background": withOpacityValue("--input-background"),
        "switch-background": withOpacityValue("--switch-background"),
        sidebar: {
          DEFAULT: withOpacityValue("--sidebar"),
          foreground: "var(--sidebar-foreground)",
          primary: withOpacityValue("--sidebar-primary"),
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: withOpacityValue("--sidebar-accent"),
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: withOpacityValue("--sidebar-border"),
          ring: withOpacityValue("--sidebar-ring"),
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;

