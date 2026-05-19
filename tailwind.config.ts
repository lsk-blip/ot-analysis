import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        gray: {
          50: "#FAFBFC",
          100: "#F2F4F6",
          200: "#E5E8EB",
          300: "#D1D6DB",
          400: "#8B95A1",
          500: "#6B7684",
          600: "#4E5968",
          700: "#333D4B",
          800: "#252B33",
          900: "#191F28",
        },
        accent: {
          DEFAULT: "#3182F6",
          hover: "#1B64DA",
          soft: "#E8F3FF",
        },
        conf: {
          high: "#0E8F58",
          mid: "#B86E00",
          low: "#D62F2F",
        },
      },
    },
  },
  plugins: [],
}

export default config
