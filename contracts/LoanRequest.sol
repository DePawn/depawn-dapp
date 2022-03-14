// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
import "./LoanContract.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "hardhat/console.sol";

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
    ) public  returns(uint256){
        require(_collateral != address(0), "Collateral cannot be address 0.");
        require(msg.sender != _lender, "Lender cannot be the borrower.");

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

        IERC721(_collateral).safeTransferFrom(msg.sender, address(this), _tokenId);

        // Set lender
        if (_lender != address(0)) {
            _setSigner(_safeId, _lender, lenderPosition);
        } else {
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

        // Borrower signs
        (bool success, ) = address(this).delegatecall(
            abi.encodeWithSignature(
                "sign(address,uint256)",
                msg.sender,
                _loanId
            )
        );
        require(success, "Borrower loan signoff failed.");
        return _loanId;
    }

    function withdrawNFT(address _borrower, uint256 _loanId) 
        external 
        onlyHasLoan(_borrower)
        onlyNotConfirmed(_borrower, _loanId)
        onlyBorrower(_loanId)
    {
        address collateral = loanRequests[_borrower][_loanId].collateral;
        uint256 tokenId = loanRequests[_borrower][_loanId].tokenId;
        console.log(collateral);
        console.log(tokenId);
        IERC721(collateral).safeTransferFrom(address(this), _borrower, tokenId);
    }

    function onERC721Received(address , address , uint256 , bytes calldata ) external pure returns(bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
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

    function getBorrowers() external view returns (address[] memory) {
        return borrowers;
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

    function setLoanParam(
        uint256 _loanId,
        string memory _param,
        uint256 _value,
        address _address
    )
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        LoanStatus storage _loanRequest = loanRequests[msg.sender][_loanId];
        uint256 _safeId = _loanRequest.safeId;
        _unsign(_safeId, true);

        if (keccak256(bytes(_param)) == keccak256(bytes("collateral"))) {
            _loanRequest.collateral = _address;
        } else if (keccak256(bytes(_param)) == keccak256(bytes("token_id"))) {
            _loanRequest.tokenId = _value;
        } else if (keccak256(bytes(_param)) == keccak256(bytes("value"))) {
            _loanRequest.initialLoanValue = _value;
        } else if (keccak256(bytes(_param)) == keccak256(bytes("rate"))) {
            _loanRequest.rate = _value;
        } else if (keccak256(bytes(_param)) == keccak256(bytes("duration"))) {
            _loanRequest.duration = uint64(_value);
        } else {
            revert(
                "Param must be one of ['collateral', 'token_id', 'value', 'rate', 'duration']."
            );
        }

        emit SubmittedLoanRequest(
            msg.sender,
            _loanId,
            _loanRequest.collateral,
            _loanRequest.tokenId,
            _loanRequest.initialLoanValue,
            _loanRequest.rate,
            _loanRequest.duration
        );
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
        require(
            msg.sender != getLender(_borrower, _loanId),
            "Lender should not be the same as existing."
        );

        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        address _currentLender = getLender(_borrower, _loanId);

        require(
            _getSignStatus(_safeId, _currentLender) == false,
            "Loan cannot be signed off by lender."
        );

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
            require(success, "Borrower loan signoff failed.");
        } else {
            // If msg.sender == borrower, unsign lender and set lender
            // to address(0).
            _unsign(_safeId, _getSignStatus(_safeId, msg.sender));
            _setSigner(_safeId, address(0), lenderPosition);
        }
    }

    function sign(address _borrower, uint256 _loanId) public payable {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        uint256 loanValue = loanRequests[_borrower][_loanId].initialLoanValue;

        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );

        _sign(_safeId);

        // Conditionally create contract
        if (isReady(_borrower, _loanId)) {
            address loanContractAddress = __deployLoanContract(_borrower, _loanId);
            require(loanValue == msg.value, "loan value doesn't match amount sent");
            (bool success, ) = payable(loanContractAddress).call{value: msg.value}("");
            require(success, "Transfer failed.");
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
        onlyHasLoan(_borrower) returns(address)
    {
        uint256 _safeId = loanRequests[_borrower][_loanId].safeId;
        address _lender = getLender(_borrower, _loanId);
        _setConfirmedStatus(_safeId);

        LoanContract _loanContract = new LoanContract(
            [_borrower, _lender],
            loanRequests[_borrower][_loanId].collateral,
            loanRequests[_borrower][_loanId].tokenId,
            loanRequests[_borrower][_loanId].initialLoanValue,
            loanRequests[_borrower][_loanId].rate,
            loanRequests[_borrower][_loanId].duration
        );
        address _loanContractAddress = address(_loanContract);



        IERC721(loanRequests[_borrower][_loanId].collateral).approve(_loanContractAddress, loanRequests[_borrower][_loanId].tokenId);
        IERC721(loanRequests[_borrower][_loanId].collateral).safeTransferFrom(address(this), _loanContractAddress, loanRequests[_borrower][_loanId].tokenId);

        loanRequests[_borrower][_loanId].loanContract = _loanContractAddress;

        emit DeployedLoanContract(
            _loanContractAddress,
            _borrower,
            _lender,
            _loanId
        );

        return _loanContractAddress;
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
