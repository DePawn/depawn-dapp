// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./MultiSig.sol";
// import "./LoanContract.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract LoanRequest is MultiSig {
    enum Status {
        UNDEFINED,
        EMPTY,
        MEMBERS_SET,
        MEMBERS_SIGNED,
        CONFIRMED,
        FUNDED_ONLY,
        HAS_721_ONLY,
        FUNDED_AND_HAS_721
    }

    struct LoanStatus {
        uint256 safeId;
        uint256 rate;
        uint64 duration;
        uint256 loanValue;
        address nftAddress;
        uint256 tokenId;
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

    constructor() MultiSig(2) {}

    function createLoan(uint256 _rate, uint64 _duration, address _nftAddress, uint256 _tokenId, uint256 _loanValue) public {
        require(_duration != 0, "Duration must be nonzero.");

        uint256 _safeId = safes.length;
        uint256 _loanId = borrowerLoans[msg.sender].length;
        _createSafe();

        IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

        borrowerLoans[msg.sender].push();
        borrowerLoans[msg.sender][_loanId].safeId = _safeId;
        borrowerLoans[msg.sender][_loanId].rate = _rate;
        borrowerLoans[msg.sender][_loanId].duration = _duration;
        borrowerLoans[msg.sender][_loanId].nftAddress = _nftAddress;
        borrowerLoans[msg.sender][_loanId].tokenId = _tokenId;
        borrowerLoans[msg.sender][_loanId].loanValue = _loanValue;
        borrowerLoans[msg.sender][_loanId].status = Status.HAS_721_ONLY;
    }

    function withdrawNFT(address _nftAddress, uint256 _tokenId) external {

        IERC721(_nftAddress).safeTransferFrom(address(this), msg.sender, _tokenId);

    }

    function onERC721Received(address , address , uint256 , bytes calldata ) external pure returns(bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

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

    function setDuration(uint256 _loanId, uint64 _duration)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        if (_duration != borrowerLoans[msg.sender][_loanId].duration) {
            uint256 _safeId = borrowerLoans[msg.sender][_loanId].safeId;
            _unsign(_safeId);

            borrowerLoans[msg.sender][_loanId].duration = _duration;
            borrowerLoans[msg.sender][_loanId].status = Status.EMPTY;
        }
    }

    function setRate(
        address _borrower,
        uint256 _loanId,
        uint64 _rate
    )
        external
        onlyHasLoan(_borrower)
        onlyLender(_borrower, _loanId)
        onlyNotConfirmed(_borrower, _loanId)
    {
        if (_rate != borrowerLoans[_borrower][_loanId].rate) {
            uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
            _unsign(_safeId);

            borrowerLoans[_borrower][_loanId].rate = _rate;
            borrowerLoans[_borrower][_loanId].status = Status.MEMBERS_SET;
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
        uint256 _safeId = borrowerLoans[msg.sender][_loanId].safeId;
        console.logUint(_loanId);

        // Set lender
        _setLender(_safeId, _lender);

        // Set loan status
        borrowerLoans[msg.sender][_loanId].rate = _rate;
        borrowerLoans[msg.sender][_loanId].status = Status.MEMBERS_SET;

        // Borrower signs
        (bool success, ) = address(this).delegatecall(
            abi.encodeWithSignature(
                "sign(address,uint256)",
                msg.sender,
                _loanId
            )
        );
        require(success);
    }

    function removeLender(uint256 _loanId)
        external
        onlyHasLoan(msg.sender)
        onlyBorrower(_loanId)
        onlyNotConfirmed(msg.sender, _loanId)
    {
        uint256 _safeId = borrowerLoans[msg.sender][_loanId].safeId;
        _removeLender(_safeId);
        borrowerLoans[msg.sender][_loanId].status = Status.EMPTY;
    }

    function sign(address _borrower, uint256 _loanId)
        public
        onlyNotSigned(_borrower, _loanId)
    {
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

    modifier onlyLender(address _borrower, uint256 _loanId) {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
        require(
            msg.sender == safes[_safeId].signers[1],
            "You are not the lender."
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

    modifier onlyNotSigned(address _borrower, uint256 _loanId) {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
        require(
            _getSignStatus(_safeId, msg.sender) == false,
            "Only unsigned contracts can be accessed."
        );
        _;
    }

    modifier onlyNotConfirmed(address _borrower, uint256 _loanId) {
        uint256 _safeId = borrowerLoans[_borrower][_loanId].safeId;
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
            _rate == borrowerLoans[_borrower][_loanId].rate,
            "Rate does not match."
        );
        require(
            _duration == borrowerLoans[_borrower][_loanId].duration,
            "Duration does not match."
        );
        _;
    }
}
