const colors = require("tailwindcss/colors");

module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      backgroundColor: (theme) => ({
        ...theme("colors"),
        dark12: "#121212",
      }),
      colors: () => ({
        emerald: colors.emerald,
      }),
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
