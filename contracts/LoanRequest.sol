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
        address collateral;
        uint256 initialLoanValue;
        uint256 rate;
        uint64 duration;
        Status status;
    }

    mapping(address => LoanStatus[]) loanRequests;

    event DeployedLoanContract(
        address indexed _contract,
        address indexed _borrower,
        address indexed _lender,
        uint256 _required,
        uint256 _rate,
        uint64 _duration
    );

    constructor() MultiSig(2) {}

    fallback(bytes calldata _input) external returns (bytes memory _output) {
        _output = _input;
    }

    function createLoanRequest(
        address _collateral,
        uint256 _initialLoanValue,
        uint256 _rate,
        uint64 _duration,
        address _lender
    ) public {
        require(_duration != 0, "Duration must be nonzero.");

        uint256 _safeId = safes.length;
        uint256 _loanId = loanRequests[msg.sender].length;
        _createSafe();

        if (_lender != address(0)) {
            _setLender(_safeId, _lender);
        }

        loanRequests[msg.sender].push();
        loanRequests[msg.sender][_loanId].safeId = _safeId;
        loanRequests[msg.sender][_loanId].collateral = _collateral;
        loanRequests[msg.sender][_loanId].initialLoanValue = _initialLoanValue;
        loanRequests[msg.sender][_loanId].rate = _rate;
        loanRequests[msg.sender][_loanId].duration = _duration;
        loanRequests[msg.sender][_loanId].status = Status.EMPTY;
    }

    function getLender(address _borrower, uint256 _loanId)
        external
        view
        returns (address)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        return _getLender(_safeId);
    }

    function getRate(address _borrower, uint256 _loanId)
        external
        view
        returns (uint256)
    {
        return loanRequests[_borrower][_loanId].rate;
    }

    function getDuration(address _borrower, uint256 _loanId)
        external
        view
        returns (uint64)
    {
        return loanRequests[_borrower][_loanId].duration;
    }

    function getSignStatus(
        address _signer,
        address _borrower,
        uint256 _loanId
    ) external view returns (bool) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        return super._getSignStatus(_safeId, _signer);
    }

    function setRate(uint256 _loanId, uint64 _rate)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (_rate != loanRequests[msg.sender][_loanId].rate) {
            uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            // Borrower signs
            if (
                loanRequests[msg.sender][_loanId].rate != 0 &&
                loanRequests[msg.sender][_loanId].duration != 0
            ) {
                (bool success, ) = address(this).delegatecall(
                    abi.encodeWithSignature(
                        "sign(address,uint256)",
                        msg.sender,
                        _loanId
                    )
                );
                if (!success) {
                    // Borrower already signed off
                }
            }

            loanRequests[msg.sender][_loanId].rate = _rate;
        }
    }

    function setDuration(uint256 _loanId, uint64 _duration)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (_duration != loanRequests[msg.sender][_loanId].duration) {
            uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            // Borrower signs
            if (
                loanRequests[msg.sender][_loanId].rate != 0 &&
                loanRequests[msg.sender][_loanId].duration != 0
            ) {
                (bool success, ) = address(this).delegatecall(
                    abi.encodeWithSignature(
                        "sign(address,uint256)",
                        msg.sender,
                        _loanId
                    )
                );
                if (!success) {
                    // Borrower already signed off
                }
            }

            loanRequests[msg.sender][_loanId].duration = _duration;
        }
    }

    /*
     *  Set the loan Lender.
     *
     *   Borrower sets the loan's lender and rates. The borrower will
     *   automatically sign off.
     */
    function setLender(
        address _lender,
        uint256 _loanId,
        uint256 _rate
    )
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;

        // Set lender
        _setLender(_safeId, _lender);

        // Set loan status
        loanRequests[msg.sender][_loanId].rate = _rate;
        loanRequests[msg.sender][_loanId].status = Status.MEMBERS_SET;

        // Borrower signs
        if (
            loanRequests[msg.sender][_loanId].rate != 0 &&
            loanRequests[msg.sender][_loanId].duration != 0
        ) {
            (bool success, ) = address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    msg.sender,
                    _loanId
                )
            );
            require(success);
        }
    }

    function removeLender(uint256 _loanId)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _removeLender(_safeId);
        loanRequests[msg.sender][_loanId].status = Status.EMPTY;
    }

    function sign(address _borrower, uint256 _loanId)
        public
        onlyNotSigned(_borrower, _loanId)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        bool _confirmed = _sign(_safeId);

        if (_confirmed) {
            loanRequests[_borrower][_loanId].status = Status.CONFIRMED;
        }
    }

    function removeSignature(address _borrower, uint256 _loanId)
        external
        onlyHasLoan(_borrower)
        onlyNotConfirmed(_borrower, _loanId)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        _removeSignature(_safeId);
    }

    modifier onlyBorrower(uint256 _loanId) {
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        require(
            msg.sender == safes[_safeId].signers[0],
            "You are not the borrower."
        );
        _;
    }

    modifier onlyLender(address _borrower, uint256 _loanId) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        require(
            msg.sender == safes[_safeId].signers[1],
            "You are not the lender."
        );
        _;
    }

    modifier onlyHasLoan(address _borrower) {
        require(
            loanRequests[_borrower].length > 0,
            "No loans exist for this borrower."
        );
        _;
    }

    modifier onlyNotMembersSet(uint256 _loanId) {
        require(
            loanRequests[msg.sender][_loanId].status != Status.MEMBERS_SET,
            "Members have been set."
        );
        _;
    }

    modifier onlyNotSigned(address _borrower, uint256 _loanId) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );
        _;
    }

    modifier onlyNotConfirmed(address _borrower, uint256 _loanId) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        require(
            _getConfirmed(_safeId) == false,
            "Only unconfirmed contracts can be accessed."
        );
        _;
    }

    modifier onlyMatchedTerms(
        address _borrower,
        uint256 _loanId,
        uint256 _rate,
        uint64 _duration
    ) {
        require(
            _rate == loanRequests[_borrower][_loanId].rate,
            "Rate does not match."
        );
        require(
            _duration == loanRequests[_borrower][_loanId].duration,
            "Duration does not match."
        );
        _;
    }
}
