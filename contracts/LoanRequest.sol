// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
import "./LoanContract.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract LoanRequest is MultiSig {
    struct LoanStatus {
        uint256 safeId;
        address collateral;
        uint256 tokenId;
        uint256 initialLoanValue;
        uint256 rate;
        uint64 duration;
        address loanContract;
    }

    uint8 private lenderPosition = 1;
    address[] public borrowers;
    mapping(address => LoanStatus[]) public loanRequests;

    event SubmittedLoanRequest(
        address indexed _borrower,
        uint256 indexed _loanId,
        address collateral,
        uint256 tokenId,
        uint256 initialLoanValue,
        uint256 rate,
        uint64 duration
    );

    event DeployedLoanContract(
        address indexed _contract,
        address indexed _borrower,
        address indexed _lender,
        uint256 loanId
    );

    constructor() MultiSig(2) {}

    function createLoanRequest(
        address _collateral,
        uint256 _tokenId,
        uint256 _initialLoanValue,
        uint256 _rate,
        uint64 _duration,
        address _lender
    ) public {
        require(_collateral != address(0), "Collateral cannot be address 0.");

        uint256 _safeId = safes.length;
        uint256 _loanId = loanRequests[msg.sender].length;
        _createSafe();

        // Append to borrower
        if (_loanId == 0) {
            borrowers.push(msg.sender);
        }

        // Set loan request parameters
        loanRequests[msg.sender].push();
        loanRequests[msg.sender][_loanId].safeId = _safeId;
        loanRequests[msg.sender][_loanId].collateral = _collateral;
        loanRequests[msg.sender][_loanId].tokenId = _tokenId;
        loanRequests[msg.sender][_loanId].initialLoanValue = _initialLoanValue;
        loanRequests[msg.sender][_loanId].rate = _rate;
        loanRequests[msg.sender][_loanId].duration = _duration;

        // Set lender
        if (_lender != address(0)) {
            _setSigner(_safeId, _lender, lenderPosition);
        } else {
            emit SubmittedLoanRequest(msg.sender, _loanId, _collateral, _tokenId, _initialLoanValue, _rate, _duration);
        }

        // Borrower signs
        (bool success, ) = address(this).delegatecall(
            abi.encodeWithSignature(
                "sign(address,uint256)",
                msg.sender,
                _loanId
            )
        );
        require(success, "Borrower loan signoff failed.");
    }

    function transfer(address receipient, address nft, uint256 id) external {

        IERC721(nft).safeTransferFrom(msg.sender, receipient, id);

    }

    function isReady(address _borrower, uint256 _loanId)
        public
        view
        returns (bool _isReady)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        address _lender = getLender(_borrower, _loanId);

        _isReady =
            _getSignStatus(_safeId, _borrower) &&
            _getSignStatus(_safeId, _lender) &&
            loanRequests[_borrower][_loanId].collateral != address(0) &&
            loanRequests[_borrower][_loanId].initialLoanValue != 0 &&
            loanRequests[_borrower][_loanId].rate != 0 &&
            loanRequests[_borrower][_loanId].duration != 0;
    }

    function getLoans(address _borrower)
        external
        view
        returns (LoanStatus[] memory)
    {
        return loanRequests[_borrower];
    }

    function getLender(address _borrower, uint256 _loanId)
        public
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
        return _getSignStatus(_safeId, _signer);
    }

    /*
    function setCollateral(uint256 _loanId, address _collateral)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        require(
            _collateral != loanRequests[msg.sender][_loanId].collateral,
            "Collateral should not be the same as existing."
        );
        require(_collateral != address(0), "Collateral cannot be address 0.");

        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _unsign(_safeId, true);

        loanRequests[msg.sender][_loanId].collateral = _collateral;
        emit SubmittedLoanRequest(msg.sender, _loanId);
    }
    
    function setInitialLoanValue(uint256 _loanId, uint256 _initialLoanValue)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        require(
            _initialLoanValue !=
                loanRequests[msg.sender][_loanId].initialLoanValue,
            "Initial loan value should not be the same as existing."
        );

        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _unsign(_safeId, true);

        loanRequests[msg.sender][_loanId].initialLoanValue = _initialLoanValue;
        emit SubmittedLoanRequest(msg.sender, _loanId);
    }

    function setRate(uint256 _loanId, uint256 _rate)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        require(
            _rate != loanRequests[msg.sender][_loanId].rate,
            "Rate should not be the same as existing."
        );

        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _unsign(_safeId, true);

        loanRequests[msg.sender][_loanId].rate = _rate;
        emit SubmittedLoanRequest(msg.sender, _loanId);
    }

    function setDuration(uint256 _loanId, uint64 _duration)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        require(
            _duration != loanRequests[msg.sender][_loanId].duration,
            "Duration should not be the same as existing."
        );

        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _unsign(_safeId, true);

        loanRequests[msg.sender][_loanId].duration = _duration;
        emit SubmittedLoanRequest(msg.sender, _loanId);
    }
    */

    /*
     *  Set the loan Lender.
     *
     *   Borrower sets the loan's lender and rates. The borrower will
     *   automatically sign off.
     */
    function setLender(uint256 _loanId, address _lender)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        require(
            _lender != getLender(msg.sender, _loanId),
            "Lender should not be the same as existing."
        );

        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;
        _setSigner(_safeId, _lender, lenderPosition);
        //emit SubmittedLoanRequest(msg.sender, _loanId);
    }

    function sign(address _borrower, uint256 _loanId) public {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;

        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );

        _sign(_safeId);

        // Conditionally create contract
        if (isReady(_borrower, _loanId)) {
            __deployLoanContract(_borrower, _loanId);
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

    function __deployLoanContract(address _borrower, uint256 _loanId)
        private
        onlyHasLoan(_borrower)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        address _lender = getLender(_borrower, _loanId);
        _setConfirmedStatus(_safeId);

        LoanContract _loanContract = new LoanContract(
            [_borrower, _lender],
            loanRequests[_borrower][_loanId].collateral,
            loanRequests[_borrower][_loanId].initialLoanValue,
            loanRequests[_borrower][_loanId].rate,
            loanRequests[_borrower][_loanId].duration
        );
        address _loanContractAddress = address(_loanContract);
        loanRequests[_borrower][_loanId].loanContract = _loanContractAddress;

        emit DeployedLoanContract(
            _loanContractAddress,
            _borrower,
            _lender,
            _loanId
        );
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
