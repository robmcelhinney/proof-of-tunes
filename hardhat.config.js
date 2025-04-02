require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

module.exports = {
    solidity: "0.8.28",
    networks: {
        "base-mainnet": {
            url: "https://mainnet.base.org",
            accounts: [process.env.WALLET_PRIVATE_KEY],
            gasPrice: 1000000000,
        },
        "base-sepolia": {
            url: "https://sepolia.base.org",
            accounts: [process.env.WALLET_PRIVATE_KEY],
            gasPrice: 1000000000,
        },
    },
    defaultNetwork: "hardhat",
}
