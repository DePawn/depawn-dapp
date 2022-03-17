// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
import "./LoanContract.sol";

// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract LoanRequest is MultiSig {
    struct LoanStatus {
        uint256 safeId;
        address collateral;
        uint256 tokenId;
        uint256 initialLoanValue;
        uint256 rate;
        uint64 duration;
        address lender;
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

    event LoanRequestChanged(
        address indexed _borrower,
        uint256 indexed _loanId,
        string _param,
        uint256 _value
    );

    event LoanRequestLenderChanged(
        address indexed _borrower,
        uint256 indexed _loanId,
        address _lender
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
        uint64 _duration
    ) public returns (uint256 _loanId) {
        require(_collateral != address(0), "Collateral cannot be address 0.");

        uint256 _safeId = safes.length;
        uint256 _loanId = loanRequests[msg.sender].length;

        _createSafe();

        // Append to borrower
        if (_loanId == 0) borrowers.push(msg.sender);

        // Set loan request parameters
        loanRequests[msg.sender].push();
        LoanStatus storage _loanRequest = loanRequests[msg.sender][_loanId];
        _loanRequest.safeId = _safeId;
        _loanRequest.collateral = _collateral;
        _loanRequest.tokenId = _tokenId;
        _loanRequest.initialLoanValue = _initialLoanValue;
        _loanRequest.rate = _rate;
        _loanRequest.duration = _duration;

        emit SubmittedLoanRequest(
            msg.sender,
            _loanId,
            _collateral,
            _tokenId,
            _initialLoanValue,
            _rate,
            _duration
        );
    }

    function withdrawNFT(uint256 _loanId)
        external
        onlyHasLoan(msg.sender)
        onlyNotConfirmed(msg.sender, _loanId)
        onlyBorrower(_loanId)
    {
        address collateral = loanRequests[msg.sender][_loanId].collateral;
        uint256 tokenId = loanRequests[msg.sender][_loanId].tokenId;
        IERC721(collateral).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );
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

    /*
    function transfer(
        address receipient,
        address nft,
        uint256 id
    ) external {
        IERC721(nft).safeTransferFrom(msg.sender, receipient, id);
    }
    */

    function isReady(address _borrower, uint256 _loanId)
        public
        view
        returns (bool _isReady)
    {
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];
        uint256 _safeId = _loanRequest.safeId;
        address _lender = getSigner(_loanId, lenderPosition);

        _isReady =
            _getSignStatus(_safeId, _borrower) &&
            _getSignStatus(_safeId, _lender) &&
            _loanRequest.collateral != address(0) &&
            _loanRequest.initialLoanValue != 0 &&
            _loanRequest.duration != 0;
    }

    function getLoans(address _borrower)
        external
        view
        returns (LoanStatus[] memory)
    {
        return loanRequests[_borrower];
    }

    function getSignStatus(
        address _signer,
        address _borrower,
        uint256 _loanId
    ) external view returns (bool) {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        return _getSignStatus(_safeId, _signer);
    }

    function setLoanParam(
        uint256 _loanId,
        string memory _param,
        uint256 _value
    )
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        LoanStatus storage _loanRequest = loanRequests[msg.sender][_loanId];
        uint256 _safeId = _loanRequest.safeId;

        (bool success, ) = address(this).delegatecall(
            abi.encodeWithSignature(
                "_removeSignature(uint256,address)",
                _safeId,
                safes[_safeId].signers[1]
            )
        );

        bytes32 _paramHash = keccak256(bytes(_param));
        if (_paramHash == keccak256(bytes("value"))) {
            _loanRequest.initialLoanValue = _value;
        } else if (_paramHash == keccak256(bytes("rate"))) {
            _loanRequest.rate = _value;
        } else if (_paramHash == keccak256(bytes("duration"))) {
            _loanRequest.duration = uint64(_value);
        } else {
            revert("Param must be one of ['value', 'rate', 'duration'].");
        }

        emit LoanRequestChanged(msg.sender, _loanId, _param, _value);
    }

    /*
     *  Set the loan Lender.
     *
     *   Borrower sets the loan's lender and rates. The borrower will
     *   automatically sign off.
     */
    function setLender(address _borrower, uint256 _loanId)
        external
        onlyHasLoan(_borrower)
        onlyNotConfirmed(_borrower, _loanId)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;

        if (msg.sender != safes[_safeId].signers[0]) {
            // If msg.sender != borrower, set msg.sender to lender and
            // sign off lender.
            _setSigner(_safeId, msg.sender, lenderPosition);

            // Lender signs
            (bool success, ) = address(this).delegatecall(
                abi.encodeWithSignature(
                    "sign(address,uint256)",
                    _borrower,
                    _loanId
                )
            );
            emit LoanRequestLenderChanged(_borrower, _loanId, msg.sender);
        } else {
            // If msg.sender == borrower, unsign lender and set lender
            // to address(0).
            (bool success, ) = address(this).delegatecall(
                abi.encodeWithSignature(
                    "_removeSignature(uint256,address)",
                    _safeId,
                    safes[_safeId].signers[1]
                )
            );

            _setSigner(_safeId, address(0), lenderPosition);
            emit LoanRequestLenderChanged(msg.sender, _loanId, address(0));
        }

        loanRequests[_borrower][_loanId].lender = safes[_safeId].signers[1];
    }

    function sign(address _borrower, uint256 _loanId) public payable {
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];
        uint256 _safeId = _loanRequest.safeId;
        uint256 loanValue = _loanRequest.initialLoanValue;

        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );

        _sign(_safeId);

        // Conditionally create contract
        if (isReady(_borrower, _loanId)) {
            __deployLoanContract(_borrower, _loanId);
            require(
                loanValue == msg.value,
                "loan value doesn't match amount sent"
            );
            (bool success, ) = payable(_loanRequest.loanContract).call{
                value: msg.value
            }("");
            require(success, "Transfer failed.");
        }
    }

    function removeSignature(address _borrower, uint256 _loanId)
        external
        onlyHasLoan(_borrower)
        onlyNotConfirmed(_borrower, _loanId)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        _removeSignature(_safeId, msg.sender);
    }

    function __deployLoanContract(address _borrower, uint256 _loanId)
        private
        onlyHasLoan(_borrower)
    {
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];
        uint256 _safeId = _loanRequest.safeId;
        address _lender = getSigner(_loanId, lenderPosition);
        _setConfirmedStatus(_safeId);

        LoanContract _loanContract = new LoanContract(
            [_borrower, _lender],
            _loanRequest.collateral,
            _loanRequest.tokenId,
            _loanRequest.initialLoanValue,
            _loanRequest.rate,
            _loanRequest.duration
        );
        address _loanContractAddress = address(_loanContract);

        IERC721(_loanRequest.collateral).approve(
            _loanContractAddress,
            _loanRequest.tokenId
        );
        IERC721(_loanRequest.collateral).safeTransferFrom(
            address(this),
            _loanContractAddress,
            _loanRequest.tokenId
        );

        _loanRequest.loanContract = _loanContractAddress;

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
        require(
            loanRequests[_borrower][_loanId].loanContract == address(0),
            "Only unconfirmed contracts can be accessed."
        );
        _;
    }
}
