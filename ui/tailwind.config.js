/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'propaganda-red': '#b92b27',
                'propaganda-cream': '#f7f3e3',
                'propaganda-dark': '#2c3e50',
                'robot-blue-gray': '#7f8c8d',
                // Aliases for semantic use
                'primary': '#b92b27', // propaganda-red
                'secondary': '#2c3e50', // propaganda-dark
                'background': '#f7f3e3', // propaganda-cream
            }
        },
    },
    plugins: [],
}

