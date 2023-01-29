// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IERC20 {
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

// The contract is upgradeable..
contract Crowdfunding_Version2 is Initializable {
    
    struct Campaign{
           address owner;
           string title;
           string description;
           string campaignImage;
           uint256 goal;                      // Crowdfunded projects have a funding goal
           uint256 pledged;
           uint256 startCampaign;
           uint256 endCampaign;
           address token;
           bool claimed;
    }

    uint256 public numberOfCampaigns;
    uint256 public deadline;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public pledgedAmount;

    // Events are used to observe state changes in transaction logs
    event CampaignCreated(uint256 id, address indexed owner, uint256 goal, uint256 startCampaign, uint256 endCampaign, string message);
    event CampaignCancelled(uint256 id, string message);
    event Pledge(uint256 indexed id, address indexed pledger, uint256 amount, string message);
    event Unpledge(uint256 indexed id, address indexed pledger, uint256 amount, string message);
    event Claim(uint256 id, string message);
    event Refund(uint256 id, address indexed pledger, uint256 amount, string message);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 _deadline) public initializer {
        deadline = _deadline;
    }

    function changeDeadline(uint256 _newDeadline) public {
        deadline = _newDeadline;
    }

    function createCampaign(string memory _title, string memory _description, string memory _campaignImage, uint256 _goal, address _token, uint256 _startCampaign, uint256 _endCampaign) external {
        
        require(_startCampaign >= block.timestamp, "Campaign start time is less than current Block Timestamp");
        require(_endCampaign > _startCampaign, "Campaign end time is less than start time");
        require(_endCampaign <= block.timestamp + deadline, "Campaign end time exceeds the deadline");

        numberOfCampaigns += 1;
        campaigns[numberOfCampaigns] = Campaign({
                                                 owner: msg.sender,
                                                 title: _title,
                                                 description: _description,
                                                 campaignImage: _campaignImage,
                                                 goal: _goal,
                                                 pledged: 0,
                                                 startCampaign: _startCampaign,
                                                 endCampaign: _endCampaign,
                                                 token: _token,
                                                 claimed: false
        });

        emit CampaignCreated(numberOfCampaigns, msg.sender, _goal, _startCampaign, _endCampaign, "Campaign created successfully");
    }

    function cancelCampaign(uint256 _id) external {
        Campaign memory campaign = campaigns[_id];
        require(campaign.owner == msg.sender, "You did not create this Campaign");
        require(block.timestamp < campaign.startCampaign, "Campaign has already started");

        delete campaigns[_id];

        emit CampaignCancelled(_id, "Campaign cancelled successfully");
    }

    function pledge(uint256 _id, uint256 _amount) external {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp >= campaign.startCampaign, "Campaign has not Started yet");
        require(block.timestamp <= campaign.endCampaign, "Campaign has already ended");

        campaign.pledged += _amount;
        pledgedAmount[_id][msg.sender] += _amount;
        IERC20(campaign.token).transferFrom(msg.sender, address(this), _amount);

        emit Pledge(_id, msg.sender, _amount, "Tokens are pledged successfully");
    }

    function unPledge(uint256 _id, uint256 _amount) external {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp >= campaign.startCampaign, "Campaign has not Started yet");
        require(block.timestamp <= campaign.endCampaign, "Campaign has already ended");
        require(pledgedAmount[_id][msg.sender] >= _amount, "You do not have enough tokens Pledged to withraw");

        campaign.pledged -= _amount;
        pledgedAmount[_id][msg.sender] -= _amount;
        IERC20(campaign.token).transfer(msg.sender, _amount);

        emit Unpledge(_id, msg.sender, _amount, "Token are unpledged successfully");
    }

    function claim(uint256 _id) external {
        Campaign storage campaign = campaigns[_id];
        require(campaign.owner == msg.sender, "You did not create this Campaign");
        require(block.timestamp > campaign.endCampaign, "Campaign has not ended");
        require(campaign.pledged >= campaign.goal, "Campaign goal is yet to succeed");
        require(!campaign.claimed, "Funds are already claimed");

        campaign.claimed = true;
        IERC20(campaign.token).transfer(campaign.owner, campaign.pledged);

        emit Claim(_id, "Tokens are claimed successfully");
    }

//  When a funding goal is not met, customers are be able to get a refund of their pledged funds
    function refund(uint256 _id) external {
        Campaign memory campaign = campaigns[_id];
        require(block.timestamp > campaign.endCampaign, "Campaign has not ended");
        require(campaign.pledged < campaign.goal, "You cannot Withdraw, Campaign has succeeded and claimed");

        uint256 balance = pledgedAmount[_id][msg.sender];
        pledgedAmount[_id][msg.sender] = 0;
        IERC20(campaign.token).transfer(msg.sender, balance);

        emit Refund(_id, msg.sender, balance, "Your Tokens are refunded successfully");
    }
}