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
        address indexed _lender,
        address indexed _arbiter
    );
    event Signed(address indexed _signer, bool _confirmedStatus);
    event Unsigned(address indexed _signer, bool _confirmedStatus);
    event Confirmed(address indexed _contract, bool indexed _confirmedStatus);

    constructor(uint256 _required) {
        required = _required;

        // Lock out first safe.
        safes.push();
        safes[0].signers[0] = address(0);
        safes[0].signers[1] = address(0);
        safes[0].signers[2] = address(0);
    }

    function _getSigners(uint256 _safeId)
        internal
        view
        returns (address[3] memory)
    {
        address[3] memory _signers = safes[_safeId].signers;
        return _signers;
    }

    function _getConfirmed(uint256 _safeId) internal view returns (bool) {
        bool _confirmed = safes[_safeId].confirmed;
        return _confirmed;
    }

    function _getSignStatus(uint256 _safeId, address _signer)
        internal
        view
        returns (bool)
    {
        bool _status = safes[_safeId].signStatus[_signer];
        return _status;
    }

    function _getBorrower(uint256 _safeId) internal view returns (address) {
        address _borrower = safes[_safeId].signers[0];
        return _borrower;
    }

    function _getLender(uint256 _safeId) internal view returns (address) {
        address _lender = safes[_safeId].signers[1];
        return _lender;
    }

    function _getArbiter(uint256 _safeId) internal view returns (address) {
        address _arbiter = safes[_safeId].signers[2];
        return _arbiter;
    }

    function _isSigner() internal view returns (bool _isSigner_) {
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
        onlySigner
        onlyWhenMembersSet
        returns (bool)
    {
        safe.signStatus[msg.sender] = true;
        __setConfirmedStatus();

        emit Signed(msg.sender, safe.confirmed);

        return (safe.confirmed);
    }

    function _unsign(uint256 _safeId) internal safeKey(_safeId) onlySigner {
        safe.signStatus[safe.signers[1]] = false;
        safe.signStatus[safe.signers[2]] = false;

        safe.signers[1] = address(0);
        safe.signers[2] = address(0);

        __setConfirmedStatus();

        emit Unsigned(msg.sender, safe.confirmed);
    }

    function _setLender(uint256 _safeId, address _lender)
        internal
        safeKey(_safeId)
        onlyNonSigner
        onlyUnstaffed(safe.signers[1], _lender)
    {
        require(_lender != address(0), "Lender cannot be address 0.");
        safe.signers[1] = _lender;
    }

    function _setArbiter(uint256 _safeId, address _arbiter)
        internal
        safeKey(_safeId)
        onlyNonSigner
        onlyUnstaffed(safe.signers[2], _arbiter)
    {
        require(_arbiter != address(0), "Arbiter cannot be address 0.");
        safe.signers[2] = _arbiter;
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

    modifier onlySigner() {
        require(_isSigner() == true, "You are not a valid signer.");
        _;
    }

    modifier onlyNonSigner() {
        require(_isSigner() == false, "You are already a signer.");
        _;
    }

    modifier onlyUnstaffed(address _currentSigner, address _newSigner) {
        require(
            _currentSigner == address(0),
            "Current signer cannot already be set."
        );
        require(_newSigner != address(0), "New signer cannot be address 0.");
        _;
    }

    modifier onlyConfirmed() {
        require(safe.confirmed == true, "MultiSig not confirmed.");
        _;
    }

    modifier onlyWhenMembersSet() {
        require(safe.signers[0] != address(0), "Borrower must be set.");
        require(safe.signers[1] != address(0), "Lender must be set.");
        _;
    }
}
