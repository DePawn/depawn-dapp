// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

contract LoanRequestEvents {

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

    function callSubmittedLoanRequest(
        address _borrower,
        uint256  _loanId,
        address collateral,
        uint256 tokenId,
        uint256 initialLoanValue,
        uint256 rate,
        uint64 duration
    ) public {
        emit SubmittedLoanRequest(_borrower, _loanId, collateral, tokenId, initialLoanValue, rate, duration);
    }

    function callLoanRequestChanged(
        address _borrower,
        uint256 _loanId,
        string memory _param,
        uint256 _value
    ) public {
        emit LoanRequestChanged(_borrower, _loanId, _param, _value);
    }

    function callLoanRequestLenderChanged(
        address _borrower,
        uint256 _loanId,
        address _lender
    ) public {
        emit LoanRequestLenderChanged(_borrower, _loanId, _lender);
    }

    function callDeployedLoanContract(
        address _contract,
        address _borrower,
        address _lender,
        uint256 loanId
    ) public {
        emit DeployedLoanContract(_contract, _borrower, _lender, loanId);
    }



}