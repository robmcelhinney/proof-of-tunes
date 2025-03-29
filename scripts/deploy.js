// scripts/deploy.js
async function main() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contracts with account:", deployer.address)

    const ZKBadgeNFT = await ethers.getContractFactory("ZKBadgeNFT")
    const verifierAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" // update with your deployed verifier address

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
