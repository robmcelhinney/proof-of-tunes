/* global BigInt */

import React, { useState, useEffect } from "react"
import * as snarkjs from "snarkjs"
import { keccak256, toUtf8Bytes, BrowserProvider, Contract } from "ethers"
import ZKBadgeNFT_ABI from "./abi/ZKBadgeNFT.json"
import Confetti from "react-confetti"
import { useWindowSize } from "@react-hook/window-size" // install this too!

const SNARK_FIELD = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
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

function generateTokenURI(a1, a2, a3, monthYear) {
    const svg = generateSVG(a1, a2, a3, monthYear)
    const svgBase64 = window.btoa(unescape(encodeURIComponent(svg)))
    const metadata = {
        name: `Top Listener Badge - ${monthYear}`,
        description: "Verified top 3 Spotify artists using ZK.",
        image: `data:image/svg+xml;base64,${svgBase64}`,
        attributes: [
            { trait_type: "Month", value: monthYear },
            { trait_type: "Artist 1", value: a1 },
            { trait_type: "Artist 2", value: a2 },
            { trait_type: "Artist 3", value: a3 },
        ],
    }
    const metadataBase64 = window.btoa(
        unescape(encodeURIComponent(JSON.stringify(metadata)))
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
    const [showConfetti, setShowConfetti] = useState(false)
    const [width, height] = useWindowSize()

    // Instead of reading from URL params, fetch verified Spotify data from your backend.
    useEffect(() => {
        async function fetchTopArtists() {
            try {
                const response = await fetch(
                    "http://localhost:5000/api/top-artists",
                    {
                        credentials: "include", // send session cookies
                    }
                )
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
                        "Not logged in or failed to fetch top artists."
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
        const input = {
            artist1Hash: zkInput.hash1.toString(),
            artist2Hash: zkInput.hash2.toString(),
            artist3Hash: zkInput.hash3.toString(),
        }

        // console.log("Expected public signals (hashes):", [
        //     zkInput.hash1.toString(),
        //     zkInput.hash2.toString(),
        //     zkInput.hash3.toString(),
        // ])

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            process.env.PUBLIC_URL + "/top_artists.wasm",
            process.env.PUBLIC_URL + "/top_artists_final.zkey"
        )

        setProofData({ proof, publicSignals })
        setNotification({
            type: "info",
            message: "Proof generated successfully",
        })
    }

    const mintBadge = async () => {
        try {
            const provider = new BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()

            const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS
            const contract = new Contract(
                CONTRACT_ADDRESS,
                ZKBadgeNFT_ABI.abi,
                signer
            )
            const { proof, publicSignals } = proofData

            const a = proof.pi_a.slice(0, 2)
            const b = [proof.pi_b[0].slice(0, 2), proof.pi_b[1].slice(0, 2)]
            const c = proof.pi_c.slice(0, 2)

            const monthYear = getCurrentMonthYear()
            const uri = generateTokenURI(
                zkInput.artist1,
                zkInput.artist2,
                zkInput.artist3,
                monthYear
            )

            console.log("uri: ", uri)

            setNotification({
                type: "info",
                message: "Transaction submitted, waiting for confirmation...",
            })
            const tx = await contract.mintBadge(
                a,
                b,
                c,
                publicSignals,
                zkInput.artist1,
                zkInput.artist2,
                zkInput.artist3,
                uri,
                monthYear
            )
            console.log("Transaction submitted:", tx.hash)
            const receipt = await tx.wait()
            console.log("Transaction mined:", receipt)
            setMintedTx(tx.hash)
            const base64 = uri.split(",")[1]
            const metadata = JSON.parse(atob(base64))

            setMintedNFT({
                image: metadata.image,
                name: metadata.name,
                description: metadata.description,
                attributes: metadata.attributes,
            })
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 5000)

            setTimeout(() => {
                document
                    .querySelector("#new-nft")
                    ?.scrollIntoView({ behavior: "smooth" })
            }, 200)
            setNotification({
                type: "success",
                message: `Mint successful! Tx: ${tx.hash.substring(0, 10)}...`,
            })
            // Clear proof data for new interactions.
            setProofData(null)
        } catch (error) {
            console.error("Minting failed:", error)
            setNotification({
                type: "error",
                message: "Minting failed. Please check the console.",
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
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
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
                    {showConfetti && <Confetti width={width} height={height} />}
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-semibold mb-2">
                            Your Top Artists (Past Year):
                        </h2>
                        <ul className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <li key={i} className="flex items-center">
                                    <img
                                        src={zkInput[`img${i}`]}
                                        alt=""
                                        className="h-12 w-12 rounded-full mr-3"
                                    />
                                    <span className="text-lg">
                                        {zkInput[`artist${i}`]}
                                    </span>
                                </li>
                            ))}
                        </ul>
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
                            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded mb-4"
                        >
                            Mint Badge NFT
                        </button>
                    )}
                </>
            )}

            {mintedTx && (
                <div className="mt-6 p-4 border border-green-500 rounded">
                    <p className="mb-2">Mint successful!</p>
                    <p>
                        Transaction:{" "}
                        <a
                            href={`https://etherscan.io/tx/${mintedTx}`}
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
                                        `https://etherscan.io/tx/${mintedTx}`
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
                                        `https://etherscan.io/tx/${mintedTx}`
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

export default App
