const {loadFixture, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
  
  describe("Crowdfunding contract", async function () {
    beforeEach(async () => {
      oneETH = ethers.utils.parseEther("5.0");
      [owner, campaignOwner, user] = await ethers.getSigners();
      campaignID = 1;
    });

      // Deploy CrowdFunding version1 smart contract
      async function deployCrowdfunding_version1() {
      const Crowdfunding_Version1 = await ethers.getContractFactory("Crowdfunding_Version1");
      const crowdfunding_Version1 = await upgrades.deployProxy(Crowdfunding_Version1,[604800],
        {
          initializer: "initialize",
          kind: "transparent",
        }
      );
      await crowdfunding_Version1.deployed();
      return {
        crowdfunding_Version1, 
      };
    }

      // Deploy CrowdFunding version2 smart contract
      async function deployCrowdfunding_version2() {
      const { crowdfunding_Version1 } = await loadFixture(deployCrowdfunding_version1);
  
      // Deploy CrowdFundingV2 contract
      const Crowdfunding_Version2 = await ethers.getContractFactory("Crowdfunding_Version2");
      const crowdfunding_Version2 = await upgrades.upgradeProxy(crowdfunding_Version1.address, Crowdfunding_Version2);
      await crowdfunding_Version2.deployed();
      return {
        crowdfunding_Version2,
      };
    }

      // Deploy MetaToken smart contract
      async function deployMetaToken() {
      // Deploy TokenERC20 contract
      const MetaToken = await ethers.getContractFactory("MetaToken");
      const metaToken = await MetaToken.deploy();
      await metaToken.deployed();
  
      // Mint 1000000000000000000 tokens to the user
      await metaToken.connect(owner).mint(user.address, oneETH);
      return {
        metaToken,
      };
    }
  
  describe("Create Campaign", function () {

    it("should create the campaign successfully", async function () {

      const { metaToken } = await loadFixture(deployMetaToken);
      const { crowdfunding_Version1 } = await loadFixture(deployCrowdfunding_version1);
  
      const campaignOwnerTokenbalanceInitialState = await metaToken.balanceOf(campaignOwner.address);
      const userTokenbalanceInitialState = await metaToken.balanceOf(user.address);
      expect(campaignOwnerTokenbalanceInitialState.toString()).to.be.equal("0");
      expect(userTokenbalanceInitialState.toString()).to.be.equal(oneETH);
  
      // Approve crowdfunding_version1 contract to spend some tokens
      await metaToken.connect(user).approve(crowdfunding_Version1.address, oneETH);
      const allowance = await metaToken.allowance(user.address, crowdfunding_Version1.address);
      expect(allowance.toString()).to.be.equal(oneETH);
  
      // Create Campaign as per contract parameters
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block.timestamp;
  
      const startCampaign = ethers.BigNumber.from(timestamp + 50);
      const endCampaign = ethers.BigNumber.from(timestamp + 500);
      const title = "Save Trees";
      const description = "It is high time to save trees and use minimal papers and adopt digital technology";
      const campaignImage = "Green trees";
  
      const createCampaign = await crowdfunding_Version1.connect(campaignOwner).createCampaign(title, description, campaignImage, oneETH, metaToken.address, startCampaign, endCampaign);
      // Events are used to observe state changes in transaction logs
      await expect(createCampaign).to.emit(crowdfunding_Version1, "CampaignCreated");
      await createCampaign.wait(1);
      await mine(100);
  
      const campaignInitialState = await crowdfunding_Version1.campaigns(campaignID);
      expect(campaignInitialState.goal.toString()).to.be.equal(oneETH);
  
      // Pledged the campaign, will be used by pledger
      const pledged = await crowdfunding_Version1.connect(user).pledge(campaignID, oneETH);
      // Events are used to observe state changes in transaction logs
      await expect(pledged).to.emit(crowdfunding_Version1, "Pledge");
      await pledged.wait(1);
      const pledgedAmount = (await crowdfunding_Version1.campaigns(campaignID)).pledged;
      expect(pledgedAmount.toString()).to.be.equal(oneETH);
  
      // Campaign Owner can claim campaign when successful
      await mine(1000);
      const claim = await crowdfunding_Version1.connect(campaignOwner).claim(campaignID);
      // Events are used to observe state changes in transaction logs
      await expect(claim).to.emit(crowdfunding_Version1, "Claim");
      await claim.wait(1);
      expect((await crowdfunding_Version1.campaigns(campaignID)).claimed);
  
      const userTokenbalanceFinalState = await metaToken.balanceOf(user.address);
      expect(userTokenbalanceFinalState.toString()).to.be.equal("0");
  
      const campaignOwnerTokenbalanceFinalState = await metaToken.balanceOf(campaignOwner.address);
      expect(campaignOwnerTokenbalanceFinalState.toString()).to.be.equal(oneETH);
  
      const campaignFinalState = await crowdfunding_Version1.campaigns(campaignID);
      expect(campaignFinalState);
  
    }); 
});

describe("Failed Campaign", function () {
  it("for the Failed Campaign", async function () {
      const { metaToken } = await loadFixture(deployMetaToken);
      const { crowdfunding_Version1 } = await loadFixture(deployCrowdfunding_version1);
  
      const campaignOwnerTokenbalanceInitialState = await metaToken.balanceOf(campaignOwner.address);
      const userTokenbalanceInitialState = await metaToken.balanceOf(user.address);
      expect(campaignOwnerTokenbalanceInitialState.toString()).to.be.equal("0");
      expect(userTokenbalanceInitialState.toString()).to.be.equal(oneETH);
  
      // Approve crowdfunding version1 contract to spend some tokens
      await metaToken.connect(user).approve(crowdfunding_Version1.address, oneETH);
      const allowance = await metaToken.allowance(user.address, crowdfunding_Version1.address);
      expect(allowance.toString()).to.be.equal(oneETH);
  
      // Create Campaign as per contract
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block.timestamp;
  
      const startCampaign = ethers.BigNumber.from(timestamp + 50);
      const endCampaign = ethers.BigNumber.from(timestamp + 500);
      const title = "Save Trees";
      const description = "It is high time to save trees and use minimal papers and adopt digital technology";
      const campaignImage = "Green trees";
  
      const createCampaign = await crowdfunding_Version1.connect(campaignOwner).createCampaign(title, description, campaignImage, oneETH, metaToken.address, startCampaign, endCampaign);
      // Events are used to observe state changes in transaction logs
      await expect(createCampaign).to.emit(crowdfunding_Version1, "CampaignCreated");
      await createCampaign.wait(1);
      await mine(100);
  
      const campaignInitialState = await crowdfunding_Version1.campaigns(campaignID);
      expect(campaignInitialState.goal.toString()).to.be.equal(oneETH);
  
      // Pledged the campaign, will be used by Pledger
      const pledged = await crowdfunding_Version1.connect(user).pledge(1, ethers.utils.parseEther("0.5"));
      // Events are used to observe state changes in transaction logs
      await expect(pledged).to.emit(crowdfunding_Version1, "Pledge");
      await pledged.wait(1);
      const pledgedAmount = (await crowdfunding_Version1.campaigns(campaignID)).pledged;
      expect(pledgedAmount.toString()).to.be.equal(ethers.utils.parseEther("0.5"));
  
      await mine(1000);
      const refund = await crowdfunding_Version1.connect(user).refund(campaignID);
      // Events are used to observe state changes in transaction logs
      await expect(refund).to.emit(crowdfunding_Version1, "Refund");
      await refund.wait(1);
  
      const userTokenbalanceFinalState = await metaToken.balanceOf(user.address);
      expect(userTokenbalanceFinalState.toString()).to.be.equal(oneETH);
  
      const campaignOwnerTokenbalanceFinalState = await metaToken.balanceOf(campaignOwner.address);
      expect(campaignOwnerTokenbalanceFinalState.toString()).to.be.equal("0");
  
      const campaignFinalState = await crowdfunding_Version1.campaigns(campaignID);
      expect(campaignFinalState);
  
    });
});

describe("Upgrade Campaign", function () {

    it("for Upgrade Contract", async function () {
      const { metaToken } = await loadFixture(deployMetaToken);
      const { crowdfunding_Version1 } = await loadFixture(deployCrowdfunding_version1);
      const { crowdfunding_Version2 } = await loadFixture(deployCrowdfunding_version2);
  
      // Approve crowdfunding version1 contract to spend tokens
      await metaToken.connect(user).approve(crowdfunding_Version1.address, oneETH);
      const allowance = await metaToken.allowance(user.address, crowdfunding_Version1.address);
      expect(allowance.toString()).to.be.equal(oneETH);
  
      // Create Campaign
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block.timestamp;
  
      const startCampaign = ethers.BigNumber.from(timestamp + 50);
      const endCampaign = ethers.BigNumber.from(timestamp + 500);
      const title = "Save Trees";
      const description = "It is high time to save trees and use minimal papers and adopt digital technology";
      const campaignImage = "Green trees";
  
      const createCampaign = await crowdfunding_Version1.connect(campaignOwner).createCampaign(title, description, campaignImage, oneETH, metaToken.address, startCampaign, endCampaign);
      // Events are used to observe state changes in transaction logs
      await expect(createCampaign).to.emit(crowdfunding_Version1, "CampaignCreated");
      await createCampaign.wait(1);
      await mine(100);
  
      const campaignInitialState = await crowdfunding_Version1.campaigns(campaignID);
      expect(campaignInitialState.goal.toString()).to.be.equal(oneETH);
  
      // Pledged the campaign
      const pledged = await crowdfunding_Version1.connect(user).pledge(campaignID, oneETH);
      // Events are used to observe state changes in transaction logs
      await expect(pledged).to.emit(crowdfunding_Version1, "Pledge");
      await pledged.wait(1);
      const pledgedAmount = (await crowdfunding_Version1.campaigns(campaignID)).pledged;
      expect(pledgedAmount.toString()).to.be.equal(oneETH);
  
      const deadlineInitialState = await crowdfunding_Version1.deadline();
  
      const userPledgedAmountInitialState = await crowdfunding_Version1.pledgedAmount(campaignID, user.address);
  
      // change the Campaign deadline
      await crowdfunding_Version2.changeDeadline(1000000);
      const deadlineFinalState = await crowdfunding_Version2.deadline();
      expect(deadlineFinalState).to.be.equal(1000000);
  
      const userPledgedAmountFinalState = await crowdfunding_Version2.pledgedAmount(campaignID, user.address);
      expect(userPledgedAmountInitialState).to.be.equal(userPledgedAmountFinalState);
  
    });
});
});
  