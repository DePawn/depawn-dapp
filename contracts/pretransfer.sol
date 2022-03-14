// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract PreTransfer {

    constructor() {

    }

    function transfer(address receipient, address nft, uint256 id) external {

        IERC721(nft).safeTransferFrom(msg.sender, receipient, id);

    }

}