// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KBBFees {
    address public owner;
    uint256 public gameStartFee = 0.0000003 ether; // ~$0.001

    uint256 public totalStartPaid;
    uint256 public totalPlayers;

    mapping(address => bool) private _seen;

    event GameStartPaid(address indexed player, uint256 amount);
    event FeesUpdated(uint256 newStartFee);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Pay the game-start fee. Must send at least gameStartFee.
    function payGameStart() external payable {
        require(msg.value >= gameStartFee, "Insufficient start fee");

        if (!_seen[msg.sender]) {
            _seen[msg.sender] = true;
            totalPlayers++;
        }

        totalStartPaid += msg.value;
        emit GameStartPaid(msg.sender, msg.value);
    }

    /// @notice Update fee amount.
    function setFee(uint256 _startFee) external onlyOwner {
        gameStartFee = _startFee;
        emit FeesUpdated(_startFee);
    }

    /// @notice Withdraw all ETH in this contract to the owner.
    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        payable(owner).transfer(bal);
        emit Withdrawn(owner, bal);
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
