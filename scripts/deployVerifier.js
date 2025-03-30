async function main() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying Verifier with account:", deployer.address)

    const Verifier = await ethers.getContractFactory("Groth16Verifier")
    const verifier = await Verifier.deploy()
    await verifier.waitForDeployment()

    console.log("Verifier deployed to:", verifier.target)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
