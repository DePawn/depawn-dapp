// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
import "./LoanContract.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract LoanRequest {
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
    MultiSig multiSig;

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

    //LoanRequestEvents ctEvents;
    constructor() {
        multiSig = new MultiSig(2);
    }

    function createLoanRequest(
        address _collateral,
        uint256 _tokenId,
        uint256 _initialLoanValue,
        uint256 _rate,
        uint64 _duration
    ) public returns (uint256) {
        require(_collateral != address(0), "Collateral cannot be address 0.");

        uint256 _safeId = multiSig.getSafesLength();
        uint256 _loanId = loanRequests[msg.sender].length;

        multiSig._createSafe(msg.sender);

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

        IERC721(_collateral).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId
        );

        emit SubmittedLoanRequest(
            msg.sender,
            _loanId,
            _collateral,
            _tokenId,
            _initialLoanValue,
            _rate,
            _duration
        );
        return _loanId;
    }

    function withdrawNFT(uint256 _loanId) external {
        onlyHasLoan(msg.sender);
        onlyNotConfirmed(msg.sender, _loanId);

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

    function isReady(address _borrower, uint256 _loanId)
        public
        view
        returns (bool _isReady)
    {
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];

        _isReady =
            multiSig._getSignStatus(_loanRequest.safeId, _borrower) &&
            multiSig._getSignStatus(
                _loanRequest.safeId,
                multiSig.getSigner(_loanRequest.safeId, lenderPosition)
            ) &&
            _loanRequest.collateral != address(0) &&
            _loanRequest.initialLoanValue != 0 &&
            _loanRequest.duration != 0;
    }

    function getSignStatus(
        address _signer,
        address _borrower,
        uint256 _loanId
    ) external view returns (bool) {
        return
            multiSig._getSignStatus(
                loanRequests[_borrower][_loanId].safeId,
                _signer
            );
    }

    function setLoanParam(
        uint256 _loanId,
        string memory _param,
        uint256 _value
    ) external {
        onlyHasLoan(msg.sender);
        onlyNotConfirmed(msg.sender, _loanId);

        LoanStatus storage _loanRequest = loanRequests[msg.sender][_loanId];
        uint256 _safeId = loanRequests[msg.sender][_loanId].safeId;

        // Remove lender signature
        multiSig._removeSignature(
            _loanRequest.safeId,
            multiSig.getSafesSigner(_loanRequest.safeId, lenderPosition)
        );

        // Return funds to lender
        payable(multiSig.getSafesSigner(_safeId, lenderPosition)).transfer(
            _loanRequest.initialLoanValue
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
    function setLender(address _borrower, uint256 _loanId) external payable {
        onlyHasLoan(_borrower);
        onlyNotConfirmed(_borrower, _loanId);
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;

        if (msg.sender != multiSig.getSafesSigner(_safeId, 0)) {
            /*
             * If msg.sender != borrower, set msg.sender to lender and
             * sign off lender.
             */

            // Set lender
            multiSig._setSigner(_safeId, msg.sender, lenderPosition);

            // Sign off lender
            sign(_borrower, _loanId);

            emit LoanRequestLenderChanged(_borrower, _loanId, msg.sender);
        } else {
            /*
             * If msg.sender == borrower, unsign lender and set lender
             * to address(0).
             */

            // Remove lender signature
            multiSig._removeSignature(
                _safeId,
                multiSig.getSafesSigner(_safeId, lenderPosition)
            );

            // Return funds to lender
            payable(multiSig.getSafesSigner(_safeId, lenderPosition)).transfer(
                loanRequests[_borrower][_loanId].initialLoanValue
            );

            // Remove lender
            multiSig._setSigner(_safeId, address(0), lenderPosition);

            emit LoanRequestLenderChanged(msg.sender, _loanId, address(0));
        }

        loanRequests[_borrower][_loanId].lender = multiSig.getSafesSigner(
            _safeId,
            lenderPosition
        );
    }

    function sign(address _borrower, uint256 _loanId) public payable {
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];

        require(
            multiSig._getSignStatus(_loanRequest.safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );

        multiSig._sign(_loanRequest.safeId, msg.sender);

        // Conditionally create contract
        if (msg.sender != _borrower) {
            require(
                _loanRequest.initialLoanValue == msg.value,
                "loan value doesn't match amount sent"
            );
            payable(address(this)).transfer(msg.value);
        }

        if (isReady(_borrower, _loanId)) {
            __deployLoanContract(_borrower, _loanId);
            console.log(_loanRequest.initialLoanValue, msg.value);

            payable(_loanRequest.loanContract).transfer(
                _loanRequest.initialLoanValue
            );
        }
    }

    function removeSignature(address _borrower, uint256 _loanId) external {
        onlyHasLoan(_borrower);
        onlyNotConfirmed(_borrower, _loanId);

        multiSig._removeSignature(
            loanRequests[_borrower][_loanId].safeId,
            msg.sender
        );
    }

    function __deployLoanContract(address _borrower, uint256 _loanId) private {
        onlyHasLoan(_borrower);
        LoanStatus storage _loanRequest = loanRequests[_borrower][_loanId];

        address _lender = multiSig.getSigner(
            _loanRequest.safeId,
            lenderPosition
        );
        multiSig._setConfirmedStatus(_loanRequest.safeId);

        LoanContract _loanContract = new LoanContract(
            [_borrower, _lender],
            _loanRequest.collateral,
            _loanRequest.tokenId,
            _loanRequest.initialLoanValue,
            _loanRequest.rate,
            _loanRequest.duration
        );
        address _loanContractAddress = address(_loanContract);
        console.log(_loanContractAddress);

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

    function onlyHasLoan(address _borrower) private view {
        require(
            loanRequests[_borrower].length > 0,
            "No loans exist for this borrower."
        );
    }

    function onlyNotConfirmed(address _borrower, uint256 _loanId) private view {
        require(
            loanRequests[_borrower][_loanId].loanContract == address(0),
            "Only unconfirmed contracts can be accessed."
        );
    }

    receive() external payable {}
}
