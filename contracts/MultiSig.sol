// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

abstract contract MultiSig {
    uint256 public required;

    struct Safe {
        address[3] signers;
        bool confirmed;
        mapping(address => bool) signStatus;
    }

    Safe[] safes;
    Safe private safe;
    bool private safeLock = true;

    event Staffed(
        address indexed _borrower,
        address _lender,
        uint256 indexed _safeId
    );
    event Signed(address indexed _signer, bool _confirmedStatus);
    event Unsigned(address indexed _signer, bool _confirmedStatus);
    event Confirmed(address indexed _contract, bool indexed _confirmedStatus);

    constructor(uint256 _required) {
        required = _required;

        // Lock out first safe.
        safes.push();
        for (uint256 i; i < required; i++) {
            safes[0].signers[i] = address(0);
        }
    }

    function getSigner(uint256 _safeId, uint256 _position)
        public
        view
        returns (address)
    {
        address _signer = safes[_safeId].signers[_position];
        return _signer;
    }

    function _getSignStatus(uint256 _safeId, address _signer)
        internal
        view
        returns (bool)
    {
        bool _status = safes[_safeId].signStatus[_signer];
        return _status;
    }

    function _isSigner() internal view returns (bool _isSigner_) {
        _isSigner_ = true;
        _isSigner_ = safe.signers[0] == msg.sender ? true : _isSigner_;
        _isSigner_ = safe.signers[1] == msg.sender ? true : _isSigner_;
        _isSigner_ = safe.signers[2] == msg.sender ? true : _isSigner_;
    }

    function _createSafe() internal {
        uint256 _safeId = safes.length;
        safes.push();

        safes[_safeId].signers[0] = msg.sender;
    }

    function _sign(uint256 _safeId)
        internal
        safeKey(_safeId)
        onlySigner(msg.sender)
        returns (bool _isSigned)
    {
        require(safe.signers[0] != address(0), "Borrower must be set.");
        safe.signStatus[msg.sender] = true;
        emit Signed(msg.sender, safe.confirmed);

        _isSigned = safe.signStatus[msg.sender];
    }

    function _removeSignature(uint256 _safeId, address _signer)
        internal
        safeKey(_safeId)
        onlySigner(msg.sender)
        onlySigner(_signer)
    {
        safe.signStatus[_signer] = false;

        __setConfirmedStatus();

        emit Unsigned(msg.sender, safe.confirmed);
    }

    function _setSigner(
        uint256 _safeId,
        address _signer,
        uint256 _position
    ) internal safeKey(_safeId) {
        // Either _position is safe creator,
        // or creator is not equal to _signer
        require(
            _position == 0 || safe.signers[0] != _signer,
            "Signer 0 must be unique."
        );

        safe.signers[_position] = _signer;
        safe.signStatus[_signer] = false;

        uint256 _counter;
        for (uint256 i; i < required; i++) {
            _counter = safe.signers[i] != address(0) ? _counter + 1 : _counter;
        }

        if (_counter >= required)
            emit Staffed(safe.signers[0], safe.signers[1], _safeId);
    }

    function _setConfirmedStatus(uint256 _safeId) internal safeKey(_safeId) {
        __setConfirmedStatus();
    }

    function __setConfirmedStatus() private {
        uint8 _signCount = 0;

        if (!safe.confirmed) {
            bool _borrowerSignStatus = safe.signStatus[safe.signers[0]];
            bool _lenderSignStatus = safe.signStatus[safe.signers[1]];
            bool _arbiterSignStatus = safe.signStatus[safe.signers[2]];

            _signCount = _borrowerSignStatus ? _signCount + 1 : _signCount;
            _signCount = _lenderSignStatus ? _signCount + 1 : _signCount;
            _signCount = _arbiterSignStatus ? _signCount + 1 : _signCount;

            safe.confirmed = _signCount >= required;

            if (safe.confirmed) {
                emit Confirmed(address(this), safe.confirmed);
            }
        }
    }

    function __setSafe(uint256 _safeId) private {
        require(safeLock == false, "This safe is locked.");
        safe.signers = safes[_safeId].signers;
        safe.confirmed = safes[_safeId].confirmed;

        address _borrower = safe.signers[0];
        address _lender = safe.signers[1];
        address _arbiter = safe.signers[2];

        safe.signStatus[_borrower] = safes[_safeId].signStatus[_borrower];
        safe.signStatus[_lender] = safes[_safeId].signStatus[_lender];
        safe.signStatus[_arbiter] = safes[_safeId].signStatus[_arbiter];
    }

    function __updateSafe(uint256 _safeId) private {
        require(safeLock == false, "This safe is locked.");
        safes[_safeId].signers = safe.signers;
        safes[_safeId].confirmed = safe.confirmed;

        address _borrower = safes[_safeId].signers[0];
        address _lender = safes[_safeId].signers[1];
        address _arbiter = safes[_safeId].signers[2];

        safes[_safeId].signStatus[_borrower] = safe.signStatus[_borrower];
        safes[_safeId].signStatus[_lender] = safe.signStatus[_lender];
        safes[_safeId].signStatus[_arbiter] = safe.signStatus[_arbiter];
    }

    modifier safeKey(uint256 _safeId) {
        safeLock = false;
        __setSafe(_safeId);
        _;
        __updateSafe(_safeId);
        __setSafe(0);
        safeLock = true;
    }

    modifier onlySigner(address _signer) {
        require(_signer != address(0), "Address 0 is invalid.");
        require(_isSigner() == true, "You are not a valid signer.");
        _;
    }
}
