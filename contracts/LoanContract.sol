// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LoanContract {

    using SafeMath for uint256;

    address borrower;
    address lender;
    address arbiter;
    address collateral;
    uint256 tokenId;
    uint256 initialLoanValue;
    uint256 rate;
    uint256 expiration;
    LoanStatus status;
    uint256 calculatedRedemption;
    uint256 start;


    enum LoanStatus{ WITHDRAWABLE, ACTIVE, PAID, DEFAULT, CLOSED }

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
        status = LoanStatus.WITHDRAWABLE;
        start = block.timestamp;
        


    }


    function onERC721Received(address , address , uint256 , bytes calldata ) external pure returns(bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    function getStatus() external view returns(string memory) {

        if(status == LoanStatus.WITHDRAWABLE)
            return "WITHDRAWABLE";
        if(status == LoanStatus.ACTIVE)
            return "ACTIVE";
        if(status == LoanStatus.PAID)
            return "PAID";
        if(status == LoanStatus.DEFAULT)
            return "DEFAULT";
        if(status == LoanStatus.CLOSED)
            return "CLOSED";


    }

    function calculateRedemption() public view returns(uint256) {

        uint256 daysPassed = (block.timestamp - start) / 60 / 60 / 24;
        uint256 redemption = initialLoanValue.mul(rate).div(100).mul(daysPassed).div(365) + initialLoanValue;
        return redemption;

    }


    function issueLoanBorrower() external checkMaturity {

        require(msg.sender == borrower, "Only borrower can take balance out");
        require(status == LoanStatus.WITHDRAWABLE);
        status = LoanStatus.ACTIVE;
        payable(borrower).transfer(address(this).balance);

    }

    function payLoan() external payable checkMaturity {

        require(msg.sender == borrower, "Only borrower can prepay loan");
        require(status == LoanStatus.ACTIVE || status == LoanStatus.DEFAULT, "Loan should be active or default to be prepaid");
        status = LoanStatus.PAID;
        uint256 redemption = calculatedRedemption;
        require(msg.value >= redemption, "Loan not paid in total");

    }

    function withdrawLoanLender() external checkMaturity {

        require(msg.sender == lender, "Only lender can call withdrawLoanLender");

        if(status == LoanStatus.PAID) {
            payable(lender).transfer(address(this).balance);
        }
        if(status == LoanStatus.DEFAULT) {
            //Take NFT

            status = LoanStatus.CLOSED;
        }

    }

    function withdrawNFTBorrower() external checkMaturity {

        require(msg.sender == borrower, "Only borrower can call withdrawNFTBorrower");
        if(status == LoanStatus.PAID) {
            // Take NFT back
        }

    }

    modifier checkMaturity {

        if(block.timestamp > expiration + 5 days && status != LoanStatus.PAID && status != LoanStatus.CLOSED)
            status = LoanStatus.DEFAULT;

        _;
   }

    receive() external payable {



    }

}
