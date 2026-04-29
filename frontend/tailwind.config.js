/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#0b132b",
          teal: "#1c8f8f",
          mint: "#b8f2e6",
          amber: "#f2b705",
          coral: "#f25f5c"
        }
      },
      boxShadow: {
        panel: "0 14px 40px rgba(11, 19, 43, 0.12)"
      }
    }
  },
  plugins: []
};
