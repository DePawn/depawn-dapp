// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
//import "hardhat/console.sol";

contract LoanContract {
    using SafeMath for uint256;

    address public borrower;
    address public lender;
    address public arbiter;
    address public collateral;
    uint256 public tokenId;
    uint256 currentLoanValue;
    uint256 public rate;
    uint256 public expiration;
    LoanStatus status;
    uint256 start;
    uint256 accruedInterest;

    enum LoanStatus {
        WITHDRAWABLE,
        ACTIVE,
        PAID,
        DEFAULT,
        CLOSED
    }

    event UnpaidBalance(
        uint256 balance,
        string status,
        address contractAddress
    );

    event NFTEvent(
        address indexed addr,
        address indexed lender_borrower,
        address nft,
        uint256 tokenId,
        string status
    );

    event ETHEvent(
        address indexed addr,
        address indexed lender,
        uint256 amount_withdrawn,
        uint256 contractBalance
    );

    constructor(
        address[2] memory _members,
        address _collateral,
        uint256 _tokenId,
        uint256 _intitialLoanValue,
        uint256 _rate,
        uint64 _expiration
    ) {
        //console.log("deploying contract...");

        borrower = _members[0];
        lender = _members[1];
        arbiter = address(this);
        collateral = _collateral;
        tokenId = _tokenId;
        currentLoanValue = _intitialLoanValue;
        rate = _rate;
        expiration = _expiration;
        status = LoanStatus.WITHDRAWABLE;

        start = block.timestamp;
        //start = 1644202800; // 2022-02-7
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }

    function getStatus() public view returns (string memory) {
        string memory result;
        if (status == LoanStatus.WITHDRAWABLE) result = "WITHDRAWABLE";
        if (status == LoanStatus.ACTIVE) result = "ACTIVE";
        if (status == LoanStatus.PAID) result = "PAID";
        if (status == LoanStatus.DEFAULT) result = "DEFAULT";
        if (status == LoanStatus.CLOSED) result = "CLOSED";
        return result;
    }

    function calculateInterest() public view returns (uint256) {
        uint256 daysPassed = (block.timestamp - start) / 60 / 60 / 24;
        //console.log("days passed", daysPassed);
        return currentLoanValue.mul(rate).div(100).mul(daysPassed).div(365);
    }

    function calculateRedemption() public view returns (uint256) {
        return calculateInterest() + currentLoanValue + accruedInterest;
    }

    function getMyLoan() external checkMaturity {
        require(msg.sender == borrower, "Only borrower can take balance out");
        require(status == LoanStatus.WITHDRAWABLE);
        status = LoanStatus.ACTIVE;
        payable(borrower).transfer(address(this).balance);
    }

    function payLoan() external payable checkMaturity {
        require(msg.sender == borrower, "Only borrower can prepay loan");
        require(
            status == LoanStatus.ACTIVE || status == LoanStatus.DEFAULT,
            "Loan should be active or default to be paid"
        );

        uint256 redemption = calculateRedemption();
        require(redemption >= msg.value, "Borrower can't pay more than owed");

        uint256 currentInterest = calculateInterest();

        //console.log(currentLoanValue);
        //console.log(msg.value);

        accruedInterest += currentInterest;
        start = block.timestamp;
        //console.log("accrued interest", accruedInterest);

        if (currentLoanValue >= msg.value) {
            currentLoanValue = currentLoanValue - msg.value;
        } else {
            accruedInterest -= (msg.value - currentLoanValue);
            currentLoanValue = 0;
            //console.log("accrued interes", accruedInterest);
        }
        //payable(lender).transfer(msg.value);

        if (currentLoanValue + accruedInterest == 0) status = LoanStatus.PAID;

        emit UnpaidBalance(address(this).balance, getStatus(), address(this));
        emit ETHEvent(address(this), lender, msg.value, address(this).balance);
    }

    function withdrawLoanLender() external checkMaturity {
        require(
            msg.sender == lender,
            "Only lender can call withdrawLoanLender"
        );

        if (address(this).balance >= 0) {
            emit ETHEvent(address(this), lender, address(this).balance, 0);
            payable(lender).transfer(address(this).balance);
        }
        if (status == LoanStatus.DEFAULT) {
            //Take NFT
            IERC721(collateral).safeTransferFrom(
                address(this),
                lender,
                tokenId
            );
            emit NFTEvent(address(this), lender, collateral, tokenId, "DEFAULT");

            status = LoanStatus.CLOSED;
        }
    }

    function withdrawNFTBorrower() external checkMaturity {
        require(
            msg.sender == borrower,
            "Only borrower can call withdrawNFTBorrower"
        );
        if (status == LoanStatus.PAID) {
            // Take NFT back
            IERC721(collateral).safeTransferFrom(
                address(this),
                borrower,
                tokenId
            );
            emit NFTEvent(address(this), borrower, collateral, tokenId, "PAID");
        } else require(false, "Not available for withdraw at the moment");
    }

    function setStatus() external checkMaturity {
        //console.log(block.timestamp, expiration + 5 days);
    }

    modifier checkMaturity() {
        if (
            block.timestamp > expiration + 5 days &&
            status != LoanStatus.PAID &&
            status != LoanStatus.CLOSED
        ) status = LoanStatus.DEFAULT;

        _;
    }

    receive() external payable {}
}
