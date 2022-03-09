const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const hre = require("hardhat");
const { ethers } = require('ethers');


describe("LoanRequest", function () {
    let loanRequestContract;
    let borrower, lender, nonMember;
    const required = 2;
    const rate = ethers.BigNumber.from('12');
    const duration = ethers.BigNumber.from('5');
    const loanId = ethers.BigNumber.from('0');

    beforeEach(async () => {
        [borrower, lender, nonMember, ..._] = await hre.ethers.getSigners();
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoan(rate, duration);
    });

    it("LoanRequest should allow borrower to add lender and automatically sign for borrower.", async function () {
        await loanRequestContract.setLender(lender.address, loanId, rate);

        const borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrower.address,
            borrower.address,
            loanId
        );

        const lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(borrowerSignStatus, "Borrower sign status is not true.");
        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it.only("LoanRequest should not allow non-borrower to add lender.", async function () {
        // Will assume lender is borrower and fail for new loan request by lender's address.
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId, rate),
            "No loans exist for this borrower."
        );

        // Need to create a loan request for lender so we can observe onlyNonSigner check. 
        await loanRequestContract.connect(lender).createLoan(rate, duration);

        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId, rate),
            "You are already a signer."
        );
    })

    it("LoanRequest should remove lender if borrower changes duration.", async function () {
        await loanRequestContract.connect(lender).setLender(borrower.address, loanId, rate, duration);

        const newDuration = ethers.BigNumber.from('15');
        await loanRequestContract.setDuration(loanId, newDuration);

        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        const lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        lenderAddress = ethers.utils.hexStripZeros(lenderAddress);

        assert.notEqual(lender.address, lenderAddress, "Lender address did not change.");
        assert.equal("0x", lenderAddress, "Lender address is not '0x00'.");
        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it("LoanRequest should remove borrower signature if lender changes duration.", async function () {
        await loanRequestContract.connect(lender).setLender(borrower.address, loanId, rate, duration);

    })
})