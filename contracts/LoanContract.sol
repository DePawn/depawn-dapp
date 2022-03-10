// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

contract LoanContract {
    address borrower;
    address lender;
    address arbiter;
    address collateral;
    uint256 intitialLoanValue;
    uint256 rate;
    uint64 expiration;

    constructor(
        address[2] memory _members,
        address _collateral,
        uint256 _intitialLoanValue,
        uint256 _rate,
        uint64 _expiration
    ) {
        borrower = _members[0];
        lender = _members[1];
        arbiter = address(this);
        collateral = _collateral;
        intitialLoanValue = _intitialLoanValue;
        rate = _rate;
        expiration = _expiration;
    }
}
