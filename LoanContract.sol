// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./LoanBase.sol";

contract LoanContract is LoanBase {
    constructor(
        address _borrower,
        address _lender,
        uint256 _required,
        uint256 _rate,
        uint64 _duration
    ) LoanBase(_borrower, _lender, _required) {
        rate = _rate;
        duration = _duration;
    }
}
