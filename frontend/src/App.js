/* global BigInt */

import React, { useState, useEffect } from "react"
import * as snarkjs from "snarkjs"
import { keccak256, toUtf8Bytes, BrowserProvider, Contract } from "ethers"
import ZKBadgeNFT_ABI from "./abi/ZKBadgeNFT.json"
import confetti from "canvas-confetti"

const SNARK_FIELD = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617",
)
function stringToHash(s) {
    return BigInt(keccak256(toUtf8Bytes(s))) % SNARK_FIELD
}

function getCurrentMonthYear() {
    const now = new Date()
    return now.toLocaleString("default", {
        month: "long",
        year: "numeric",
    }) // e.g. "March 2025"
}

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000"

function generateTokenSVG(a1, a2, a3, monthYear) {
    const svg = generateSVG(a1, a2, a3, monthYear)
    const svgBase64 = window.btoa(unescape(encodeURIComponent(svg)))
    const metadata = {
        name: `Top Listener Badge - ${monthYear}`,
        description: "Verified top 3 artists.",
        image: `data:image/svg+xml;base64,${svgBase64}`,
        attributes: [
            { trait_type: "Month", value: monthYear },
            { trait_type: "Artist 1", value: a1 },
            { trait_type: "Artist 2", value: a2 },
            { trait_type: "Artist 3", value: a3 },
        ],
    }
    const metadataBase64 = window.btoa(
        unescape(encodeURIComponent(JSON.stringify(metadata))),
    )
    return `data:application/json;base64,${metadataBase64}`
}

function generateSVG(a1, a2, a3, monthYear) {
    return `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { fill: white; font-size: 20px; font-weight: bold; }
            .artist { fill: #1DB954; font-size: 18px; }
        </style>
        <rect width="100%" height="100%" fill="#121212" />
        <text x="50%" y="40" class="title" dominant-baseline="middle" text-anchor="middle">
            Top Artists - ${monthYear}
        </text>
        <text x="50%" y="150" class="artist" dominant-baseline="middle" text-anchor="middle">${a1}</text>
        <text x="50%" y="200" class="artist" dominant-baseline="middle" text-anchor="middle">${a2}</text>
        <text x="50%" y="250" class="artist" dominant-baseline="middle" text-anchor="middle">${a3}</text>
    </svg>`
}

function Notification({ type, message, onClose }) {
    return (
        <div
            className={`fixed bottom-4 right-4 p-4 rounded shadow-lg z-50 
      ${type === "success" ? "bg-green-500 text-white" : ""} 
      ${type === "error" ? "bg-red-500 text-white" : ""} 
      ${type === "info" ? "bg-blue-500 text-white" : ""}`}
        >
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 font-bold">
                X
            </button>
        </div>
    )
}

function App() {
    const [zkInput, setZkInput] = useState(null)
    const [proofData, setProofData] = useState(null)
    const [notification, setNotification] = useState(null)
    const [mintedTx, setMintedTx] = useState(null)
    const [mintedNFT, setMintedNFT] = useState(null)
    const [isGeneratingProof, setIsGeneratingProof] = useState(false)

    // Instead of reading from URL params, fetch verified Spotify data from your backend.
    useEffect(() => {
        async function fetchTopArtists() {
            try {
                const response = await fetch(`${API_BASE}/api/top-artists`, {
                    credentials: "include", // send session cookies
                })
                if (response.ok) {
                    const data = await response.json()
                    const { artist1, artist2, artist3, img1, img2, img3 } = data
                    const h1 = stringToHash(artist1.trim())
                    const h2 = stringToHash(artist2.trim())
                    const h3 = stringToHash(artist3.trim())
                    setZkInput({
                        artist1,
                        artist2,
                        artist3,
                        img1,
                        img2,
                        img3,
                        hash1: h1,
                        hash2: h2,
                        hash3: h3,
                    })
                } else {
                    console.error(
                        "Not logged in or failed to fetch top artists.",
                    )
                }
            } catch (err) {
                console.error("Error fetching top artists", err)
            }
        }
        fetchTopArtists()
    }, [])

    const handleLogin = () => {
        // Redirect to backend login endpoint
        window.location.href = `${API_BASE}/login`
    }

    const generateProof = async () => {
        setIsGeneratingProof(true)
        const input = {
            artist1Hash: zkInput.hash1.toString(),
            artist2Hash: zkInput.hash2.toString(),
            artist3Hash: zkInput.hash3.toString(),
        }

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            `${API_BASE}/zk/top_artists.wasm`,
            `${API_BASE}/zk/top_artists_final.zkey`,
        )
        setIsGeneratingProof(false)

        setProofData({ proof, publicSignals })
        setNotification({
            type: "info",
            message: "Proof generated successfully",
        })
    }

    // const BASE_SEPOLIA_CHAIN_ID = "0x14A34" // Hex of 84532
    const BASE_MAINNET_CHAIN_ID = "0x2105" // Hex of 8453

    const mintBadge = async () => {
        try {
            const provider = new BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()

            // 1. Ensure user is connected to Base Sepolia
            const { chainId } = await provider.getNetwork()
            if (chainId !== parseInt(BASE_MAINNET_CHAIN_ID, 16)) {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: BASE_MAINNET_CHAIN_ID }],
                })
            }

            // 2. Continue with mint logic
            const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS
            const contract = new Contract(
                CONTRACT_ADDRESS,
                ZKBadgeNFT_ABI.abi,
                signer,
            )
            const { proof, publicSignals } = proofData

            const a = proof.pi_a.slice(0, 2)
            const b = [
                [proof.pi_b[0][1], proof.pi_b[0][0]],
                [proof.pi_b[1][1], proof.pi_b[1][0]],
            ]
            const c = proof.pi_c.slice(0, 2)

            const monthYear = getCurrentMonthYear()
            const svg = generateSVG(
                zkInput.artist1,
                zkInput.artist2,
                zkInput.artist3,
                monthYear,
            )

            setNotification({
                type: "info",
                message: "Transaction submitted, waiting for confirmation...",
            })
            const publicSignalsBN = publicSignals.map((x) => BigInt(x))

            const tx = await contract.mintBadge(
                a,
                b,
                c,
                publicSignalsBN,
                zkInput.artist1,
                zkInput.artist2,
                zkInput.artist3,
                svg,
                monthYear,
            )
            console.log("Transaction submitted:", tx.hash)
            const receipt = await tx.wait()
            console.log("Transaction mined:", receipt)
            setMintedTx(tx.hash)
            const siteSVG = generateTokenSVG(
                zkInput.artist1,
                zkInput.artist2,
                zkInput.artist3,
                monthYear,
            )
            const base64 = siteSVG.split(",")[1]
            const metadata = JSON.parse(atob(base64))
            setMintedNFT({
                image: metadata.image,
                name: metadata.name,
                description: metadata.description,
                attributes: metadata.attributes,
            })
            confetti({
                particleCount: 200,
                spread: 90,
                origin: { y: 0.6 },
            })

            setTimeout(() => {
                document
                    .querySelector("#new-nft")
                    ?.scrollIntoView({ behavior: "smooth" })
            }, 200)
            setNotification({
                type: "success",
                message: `Mint successful! Tx: ${tx.hash.substring(0, 10)}...`,
            })
            setProofData(null)
        } catch (error) {
            console.error("Minting failed:", error)
            setNotification({
                type: "error",
                message: `Minting failed: ${
                    error?.reason || error?.message || "Unknown error"
                }`,
            })
        }
    }

    const resetForm = () => {
        setProofData(null)
        setMintedTx(null)
        setNotification({
            type: "info",
            message: "Reset complete. Ready for new mint.",
        })
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-900 text-white w-full">
            <h1 className="text-4xl font-bold mb-4">Top Listener Badge</h1>
            {!zkInput ? (
                <button
                    onClick={handleLogin}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                    Login with Spotify
                </button>
            ) : (
                <>
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-semibold mb-2 text-spotifyGreen font-spotify">
                            Your Top Artists (Past Year):
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-gray-800 p-3 rounded shadow hover:scale-105 transition-transform backdrop-blur-lg bg-white/5 border border-white/10"
                                >
                                    <img
                                        src={zkInput[`img${i}`]}
                                        alt={`Artist ${i}`}
                                        className="w-full h-32 object-cover rounded mb-2"
                                    />
                                    <p className="text-center font-semibold text-white mb-2">
                                        {zkInput[`artist${i}`]}
                                    </p>
                                    <a
                                        href={`https://open.spotify.com/search/${encodeURIComponent(
                                            zkInput[`artist${i}`],
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center text-sm font-medium text-spotifyGreen hover:text-green-300 underline transition"
                                    >
                                        🎧 Listen on Spotify
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={generateProof}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded mb-4"
                    >
                        Generate ZK Proof
                    </button>
                    {proofData && (
                        <button
                            onClick={mintBadge}
                            className="bg-spotifyGreen hover:bg-green-500 text-black px-4 py-2 rounded-lg shadow-lg transition"
                        >
                            Mint ProofofTunes NFT
                        </button>
                    )}
                </>
            )}

            {isGeneratingProof && (
                <div className="w-full bg-gray-700 rounded h-3 mb-4">
                    <div className="bg-purple-500 h-3 animate-pulse rounded w-1/2"></div>
                </div>
            )}

            {proofData && !mintedNFT && (
                <div className="bg-gray-800 rounded p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-white">
                        🎨 Preview Your NFT
                    </h3>
                    <img
                        src={`data:image/svg+xml;base64,${btoa(
                            unescape(
                                encodeURIComponent(
                                    generateSVG(
                                        zkInput.artist1,
                                        zkInput.artist2,
                                        zkInput.artist3,
                                        getCurrentMonthYear(),
                                    ),
                                ),
                            ),
                        )}`}
                        alt="NFT Preview"
                        className="w-64 h-auto mx-auto border border-gray-600 rounded"
                    />
                </div>
            )}

            {mintedTx && (
                <div className="mt-6 p-4 border border-green-500 rounded">
                    <p className="mb-2">Mint successful!</p>
                    <p>
                        Transaction:{" "}
                        <a
                            href={`https://basescan.org/tx/${mintedTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline"
                        >
                            {mintedTx.substring(0, 10)}...
                        </a>
                    </p>
                    <div className="mt-4">
                        <p className="mb-2">Share your NFT:</p>
                        <div className="flex space-x-4">
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                    "Check out my new Top Listener Badge NFT! " +
                                        `https://basescan.org/tx/${mintedTx}`,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded"
                            >
                                Twitter
                            </a>
                            <a
                                href={`https://warpcast.com/~/compose?text=${encodeURIComponent(
                                    "Check out my new Top Listener Badge NFT! " +
                                        `https://basescan.org/tx/${mintedTx}`,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-3 rounded"
                            >
                                Farcaster
                            </a>
                        </div>
                    </div>
                    <button
                        onClick={resetForm}
                        className="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                        New Mint
                    </button>
                </div>
            )}

            {mintedNFT && (
                <div id="new-nft" className="...">
                    <div className="mt-6 p-4 border border-green-400 rounded w-full max-w-md text-center bg-gray-800">
                        <h3 className="text-xl font-bold mb-2">
                            🎉 Your New Badge
                        </h3>
                        <img
                            src={mintedNFT.image}
                            alt={mintedNFT.name}
                            className="w-full h-auto mb-2"
                        />
                        <p className="font-semibold">{mintedNFT.name}</p>
                        <p className="text-sm text-gray-300">
                            {mintedNFT.description}
                        </p>
                        <ul className="mt-2 text-left text-sm">
                            {mintedNFT.attributes.map((attr, idx) => (
                                <li key={idx}>
                                    <span className="font-semibold">
                                        {attr.trait_type}:
                                    </span>{" "}
                                    {attr.value}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    )
}

// Add a footer with a GitHub link
function Footer() {
    return (
        <footer className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 py-4 bg-gray-900 border-t border-gray-800">
            <a
                href="https://github.com/robmcelhinney/proof-of-tunes/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white flex items-center space-x-2"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.262.82-.582 0-.288-.01-1.05-.016-2.06-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.606-2.665-.304-5.466-1.334-5.466-5.933 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.922.43.37.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.698.825.58C20.565 21.796 24 17.297 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>View on GitHub</span>
            </a>
            <a
                href="https://opensea.io/collection/proofoftunes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white flex items-center space-x-2"
            >
                <img src="/opensea.svg" alt="OpenSea" className="h-5 w-5" />
                <span>View on OpenSea</span>
            </a>
        </footer>
    )
}

function AppWithFooter() {
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <App />
            </div>
            <Footer />
        </div>
    )
}

export default AppWithFooter
