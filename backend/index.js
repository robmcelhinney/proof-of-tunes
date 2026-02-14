const express = require("express")
const session = require("express-session")
const axios = require("axios")
const cors = require("cors")
const dotenv = require("dotenv")
const { ethers } = require("ethers")
const path = require("path")

dotenv.config()

const app = express()

// Ensure correct MIME types
express.static.mime.define({
    "application/wasm": ["wasm"],
    "application/octet-stream": ["zkey"],
})

app.use((req, res, next) => {
    const backendUrl =
        process.env.NODE_ENV === "development" ? "http://localhost:5000" : ""
    const connectSrc =
        `'self' https://accounts.spotify.com https://api.spotify.com ${process.env.FRONTEND_URI} ${backendUrl}`.trim()
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; " +
            `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval' blob: ${process.env.FRONTEND_URI}; ` +
            "worker-src 'self' blob:; " +
            `style-src 'self' 'unsafe-inline' ${process.env.FRONTEND_URI}; ` +
            "img-src 'self' data: https:; " +
            `connect-src ${connectSrc}; ` +
            "font-src 'self'; " +
            "media-src 'self'; " +
            "frame-src 'self'; " +
            "object-src 'none';",
    )
    next()
})

app.use(
    cors({
        origin: process.env.FRONTEND_URI,
        credentials: true,
    }),
)
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    }),
)

app.get("/login", (req, res) => {
    const scope = "user-top-read"
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${
        process.env.SPOTIFY_CLIENT_ID
    }&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(
        process.env.REDIRECT_URI,
    )}`
    res.redirect(authUrl)
})

app.get("/callback", async (req, res) => {
    const code = req.query.code
    if (!code) return res.status(400).send("No code in query")

    try {
        const tokenRes = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: process.env.REDIRECT_URI,
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        )
        const access_token = tokenRes.data.access_token

        // Fetch user profile to get a unique user ID.
        const profileRes = await axios.get("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        })
        const userId = profileRes.data.id

        // Fetch top artists.
        const topRes = await axios.get(
            "https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=3",
            { headers: { Authorization: `Bearer ${access_token}` } },
        )
        const artists = topRes.data.items || []
        if (artists.length < 3) {
            return res.status(400).send("Not enough listening data.")
        }

        // Build payload with verified data.
        const payload = {
            artist1: artists[0].name.trim(),
            img1: artists[0].images?.[0]?.url || "",
            artist2: artists[1].name.trim(),
            img2: artists[1].images?.[0]?.url || "",
            artist3: artists[2].name.trim(),
            img3: artists[2].images?.[0]?.url || "",
        }

        // Compute a message hash over the three artist names.
        const messageHash = ethers.solidityPackedKeccak256(
            ["string", "string", "string"],
            [payload.artist1, payload.artist2, payload.artist3],
        )
        // Sign the hash with the backend private key.
        const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY)
        const signature = await wallet.signMessage(ethers.getBytes(messageHash))
        payload.signature = signature

        // Store the verified data (you can also store in session if you prefer).
        req.session.userData = payload
        res.redirect(process.env.FRONTEND_URI)
    } catch (err) {
        console.error("OAuth error:", err?.response?.data || err.message)
        res.status(500).send("Callback failed")
    }
})

app.get("/api/top-artists", (req, res) => {
    if (req.session.userData) {
        res.json(req.session.userData)
    } else {
        res.status(401).json({ error: "Not logged in" })
    }
})

app.get("/zk/top_artists.wasm", (req, res) => {
    res.setHeader("Content-Type", "application/wasm")
    res.sendFile(path.join(__dirname, "public", "zk", "top_artists.wasm"))
})

app.get("/zk/top_artists_final.zkey", (req, res) => {
    res.setHeader("Content-Type", "application/octet-stream")
    res.sendFile(path.join(__dirname, "public", "zk", "top_artists_final.zkey"))
})

// Then serve the rest of the React build
app.use(express.static(path.join(__dirname, "../frontend/build")))

// Catch-all fallback AFTER static serving
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"))
})

// Start the server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
