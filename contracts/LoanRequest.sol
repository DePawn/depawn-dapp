// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
// import "./LoanContract.sol";
import "hardhat/console.sol";

contract LoanRequest is MultiSig {
    enum Status {
        UNDEFINED,
        EMPTY,
        MEMBERS_SET,
        CONFIRMED,
        FUNDED_ONLY,
        HAS_721_ONLY,
        FUNDED_AND_HAS_721
    }

    struct LoanStatus {
        uint256 safeId;
        uint256 rate;
        uint64 duration;
        Status status;
    }

    mapping(address => LoanStatus[]) borrowerLoans;

    event DeployedLoanContract(
        address indexed _contract,
        address indexed _borrower,
        address indexed _lender,
        uint256 _required,
        uint256 _rate,
        uint64 _duration
    );

    constructor(uint256 _rate, uint64 _duration) MultiSig(2) {
        require(_duration != 0, "Duration must be nonzero.");

        uint256 _safeId = safes.length;
        uint256 _loanId = borrowerLoans[msg.sender].length;
        _createSafe();

        borrowerLoans[msg.sender].push();
        borrowerLoans[msg.sender][_loanId].safeId = _safeId;
        borrowerLoans[msg.sender][_loanId].rate = _rate;
        borrowerLoans[msg.sender][_loanId].duration = _duration;
        borrowerLoans[msg.sender][_loanId].status = Status.EMPTY;
    }

    fallback() external {}

    function getLender(address _borrower, uint256 _loanId)
        public
        view
        returns (address)
    {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
        return super._getLender(_safeId);
    }

    function getSignStatus(
        address _signer,
        address _borrower,
        uint256 _loanId
    ) public view returns (bool) {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
        return super._getSignStatus(_safeId, _signer);
    }

    function setRate(uint256 _loanId, uint256 _rate)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
    {
        if (_rate != borrowerLoans[msg.sender][_loanId].rate) {
            uint256 _safeId = borrowerLoans[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            borrowerLoans[msg.sender][_loanId].rate = _rate;
            borrowerLoans[msg.sender][_loanId].status = Status.EMPTY;
        }
    }

    function setLender(
        address _borrower,
        uint256 _loanId,
        uint256 _rate
    )
        external
        onlyHasLoan(_borrower)
        onlyMatchedRates(_borrower, _loanId, _rate)
    {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;

        // Set lender
        super._setLender(_safeId, msg.sender);

        // Set loan status
        borrowerLoans[_borrower][_loanId].rate = _rate;
        borrowerLoans[_borrower][_loanId].status = Status.MEMBERS_SET;
    }

    function setLenderToSign(
        address _borrower,
        uint256 _loanId,
        uint256 _rate
    )
        external
        onlyHasLoan(_borrower)
        onlyMatchedRates(_borrower, _loanId, _rate)
    {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;

        // Set lender
        super._setLender(_safeId, msg.sender);

        // Set loan status
        borrowerLoans[_borrower][_loanId].rate = _rate;
        borrowerLoans[_borrower][_loanId].status = Status.MEMBERS_SET;

        // Lender signs
        (bool success, ) = address(this).delegatecall(
            abi.encodeWithSignature("sign(address,uint256)", _borrower, _loanId)
        );
        require(success);
    }

    function sign(address _borrower, uint256 _loanId) public {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
        bool _confirmed = super._sign(_safeId);

        if (_confirmed) {
            borrowerLoans[_borrower][_loanId].status = Status.CONFIRMED;
        }
    }

    modifier onlyBorrower(uint256 _loanId) {
        uint256 _safeId = borrowerLoans[msg.sender][_loanId].safeId;
        require(
            msg.sender == safes[_safeId].signers[0],
            "You are not the borrower."
        );
        _;
    }

    modifier onlyHasLoan(address _borrower) {
        require(
            borrowerLoans[_borrower].length > 0,
            "No loans exist for this borrower."
        );
        _;
    }

    modifier onlyNotMembersSet(uint256 _loanId) {
        require(
            borrowerLoans[msg.sender][_loanId].status != Status.MEMBERS_SET,
            "Members have been set."
        );
        _;
    }

    modifier onlyMatchedRates(
        address _borrower,
        uint256 _loanId,
        uint256 _rate
    ) {
        require(
            _rate == borrowerLoans[_borrower][_loanId].rate,
            "Rates do not match."
        );
        _;
    }
}
