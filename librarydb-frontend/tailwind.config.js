/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 2px 5px rgba(0,0,0,0.06)",
        "card-hover": "0 10px 20px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};
