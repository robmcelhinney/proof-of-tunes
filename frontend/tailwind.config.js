/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                spotifyGreen: "#1DB954",
                neonPink: "#ff6ec7",
            },
            fontFamily: {
                spotify: ['"CircularSpotifyText", sans-serif'],
            },
        },
    },
    plugins: [],
}
