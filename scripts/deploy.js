// scripts/deploy.js
async function main() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contracts with account:", deployer.address)

    const ZKBadgeNFT = await ethers.getContractFactory("ZKBadgeNFT")
    const verifierAddress = "0xB945121b28F2Fb2043e3290C3147874ae4d31289" // update with your deployed verifier address

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
