// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";

abstract contract LoanBase is MultiSig {
    uint256 rate;
    uint64 duration;

    constructor(
        address _borrower,
        address _lender,
        uint256 _required
    ) MultiSig(_borrower, _lender, address(this), _required) {}
}
