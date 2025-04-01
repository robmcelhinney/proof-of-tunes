// scripts/deploy.js
async function main() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contracts with account:", deployer.address)

    const ZKBadgeNFT = await ethers.getContractFactory("ZKBadgeNFT")
    const verifierAddress = "0x63E1cE0eFd672fe487A02eB373e155FB3C9225d3" // update with your deployed verifier address

    const zkBadgeNFT = await ZKBadgeNFT.deploy(verifierAddress)
    await zkBadgeNFT.waitForDeployment()

    console.log("ZKBadgeNFT deployed to:", zkBadgeNFT.target)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
