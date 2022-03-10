// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
import "./LoanContract.sol";

contract LoanRequest is MultiSig {
    struct LoanStatus {
        uint256 safeId;
        address collateral;
        uint256 initialLoanValue;
        uint256 rate;
        uint64 duration;
    }

    mapping(address => LoanStatus[]) loanRequests;

    event DeployedLoanContract(
        address indexed _contract,
        address indexed _borrower,
        address indexed _lender
    );

    constructor() MultiSig(2) {}

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

        // Set loan request parameters
        loanRequests[msg.sender].push();
        loanRequests[msg.sender][_loanId].safeId = _safeId;
        loanRequests[msg.sender][_loanId].collateral = _collateral;
        loanRequests[msg.sender][_loanId].initialLoanValue = _initialLoanValue;
        loanRequests[msg.sender][_loanId].rate = _rate;
        loanRequests[msg.sender][_loanId].duration = _duration;

        // Set lender
        if (_lender != address(0)) _setLender(_safeId, _lender);

        // Borrower signs
        address(this).delegatecall(
            abi.encodeWithSignature(
                "sign(address,uint256)",
                msg.sender,
                _loanId
            )
        );
    }

    function isReady(address _borrower, uint256 _loanId)
        public
        view
        returns (bool _isReady)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        address _lender = _getLender(_safeId);

        _isReady =
            _getSignStatus(_safeId, _borrower) &&
            _getSignStatus(_safeId, _lender) &&
            loanRequests[_borrower][_loanId].collateral != address(0) &&
            loanRequests[_borrower][_loanId].initialLoanValue != 0 &&
            loanRequests[_borrower][_loanId].rate != 0 &&
            loanRequests[_borrower][_loanId].duration != 0;
    }

    function getCollateral(address _borrower, uint256 _loanId)
        external
        view
        returns (address)
    {
        return loanRequests[_borrower][_loanId].collateral;
    }

    function getInitialLoanValue(address _borrower, uint256 _loanId)
        external
        view
        returns (uint256)
    {
        return loanRequests[_borrower][_loanId].initialLoanValue;
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
        returns (uint256)
    {
        return loanRequests[_borrower][_loanId].duration;
    }

    function getLender(address _borrower, uint256 _loanId)
        external
        view
        returns (address)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        return _getLender(_safeId);
    }

    function getSignStatus(
        address _signer,
        address _borrower,
        uint256 _loanId
    ) external view returns (bool) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        return super._getSignStatus(_safeId, _signer);
    }

    function setCollateral(uint256 _loanId, address _collateral)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (_collateral != loanRequests[msg.sender][_loanId].collateral) {
            uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            // Borrower signs
            address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    msg.sender,
                    _loanId
                )
            );

            loanRequests[msg.sender][_loanId].collateral = _collateral;

            // Conditionally create contract
            if (isReady(msg.sender, _loanId))
                __deployLoanContract(msg.sender, _loanId);
        }
    }

    function setInitialLoanValue(uint256 _loanId, uint256 _initialLoanValue)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (
            _initialLoanValue !=
            loanRequests[msg.sender][_loanId].initialLoanValue
        ) {
            uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            // Borrower signs
            address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    msg.sender,
                    _loanId
                )
            );

            loanRequests[msg.sender][_loanId]
                .initialLoanValue = _initialLoanValue;

            // Conditionally create contract
            if (isReady(msg.sender, _loanId))
                __deployLoanContract(msg.sender, _loanId);
        }
    }

    function setRate(uint256 _loanId, uint256 _rate)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (_rate != loanRequests[msg.sender][_loanId].rate) {
            uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            // Borrower signs
            address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    msg.sender,
                    _loanId
                )
            );

            loanRequests[msg.sender][_loanId].rate = _rate;

            // Conditionally create contract
            if (isReady(msg.sender, _loanId))
                __deployLoanContract(msg.sender, _loanId);
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

            address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    msg.sender,
                    _loanId
                )
            );

            loanRequests[msg.sender][_loanId].duration = _duration;

            // Conditionally create contract
            if (isReady(msg.sender, _loanId))
                __deployLoanContract(msg.sender, _loanId);
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
        _setLender(_safeId, _lender);

        // Set loan status
        loanRequests[msg.sender][_loanId].rate = _rate;

        // Borrower signs
        address(this).delegatecall(
            abi.encodeWithSignature(
                "sign(address,uint256)",
                msg.sender,
                _loanId
            )
        );

        // Conditionally create contract
        if (isReady(msg.sender, _loanId))
            __deployLoanContract(msg.sender, _loanId);
    }

    function removeLender(uint256 _loanId)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _removeLender(_safeId);
    }

    function sign(address _borrower, uint256 _loanId) public {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;

        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );

        _sign(_safeId);

        // Conditionally create contract
        if (isReady(_borrower, _loanId))
            __deployLoanContract(_borrower, _loanId);
    }

    function removeSignature(address _borrower, uint256 _loanId)
        external
        onlyHasLoan(_borrower)
        onlyNotConfirmed(_borrower, _loanId)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        _removeSignature(_safeId);
    }

    function __deployLoanContract(address _borrower, uint256 _loanId)
        private
        onlyHasLoan(_borrower)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        require(
            _getConfirmed(_safeId) == true,
            "Only confirmed contracts can be accessed."
        );
        address _lender = _getLender(_safeId);

        LoanContract loanContract = new LoanContract(
            [_borrower, _lender],
            loanRequests[_borrower][_loanId].collateral,
            loanRequests[_borrower][_loanId].initialLoanValue,
            loanRequests[_borrower][_loanId].rate,
            loanRequests[_borrower][_loanId].duration
        );

        emit DeployedLoanContract(address(loanContract), _borrower, _lender);
    }

    modifier onlyBorrower(uint256 _loanId) {
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        require(
            msg.sender == safes[_safeId].signers[0],
            "You are not the borrower."
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

    modifier onlyNotConfirmed(address _borrower, uint256 _loanId) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        require(
            _getConfirmed(_safeId) == false,
            "Only unconfirmed contracts can be accessed."
        );
        _;
    }
}
