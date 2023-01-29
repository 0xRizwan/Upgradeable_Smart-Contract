const {ethers, upgrades} = require("hardhat");

async function main() {
  const Crowdfunding_Version1 = await ethers.getContractFactory("Crowdfunding_Version1");
  const crowdfunding_Version1 = await upgrades.deployProxy(Crowdfunding_Version1, [604800],                                                        // 7 days of deadline to complete the campaign goal.
    {
      initializer: "initialize",
      kind: "transparent",
    }
  );
  await crowdfunding_Version1.deployed();

  console.log(`Crowdfunding_Version1 deployed to ${crowdfunding_Version1.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

