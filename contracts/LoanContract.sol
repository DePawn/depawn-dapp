// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract LoanContract {
    address borrower;
    address lender;
    address arbiter;
    address collateral;
    uint256 tokenId;
    uint256 initialLoanValue;
    uint256 rate;
    uint64 expiration;

    constructor(
        address[2] memory _members,
        address _collateral,
        uint256 _tokenId,
        uint256 _intitialLoanValue,
        uint256 _rate,
        uint64 _expiration
    ) {
        borrower = _members[0];
        lender = _members[1];
        arbiter = address(this);
        collateral = _collateral;
        tokenId = _tokenId;
        initialLoanValue = _intitialLoanValue;
        rate = _rate;
        expiration = _expiration;
    }


    function onERC721Received(address , address , uint256 , bytes calldata ) external pure returns(bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }


    function checkMaturity() private view returns(bool) {



    }

    receive() external payable {



    }

}
