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
        [borrower, lender, otherMember, nonMember, ..._] = await hre.ethers.getSigners();
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(rate, duration);
    });

    // TEST ID: 0.01
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

    //TEST ID: 0.02
    it("LoanRequest should not allow non-borrower to add lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(otherMember.address, loanId, rate),
            "No loans exist for this borrower."
        );
        // Will assume lender is borrower and fail for new loan request by lender's address.
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId, rate),
            "No loans exist for this borrower."
        );
    });

    //TEST ID: 0.03
    it("LoanRequest should not allow borrower to add self as lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setLender(borrower.address, loanId, rate),
            "Lender cannot be self."
        );

        // Need to create a loan request for lender so we can observe check. 
        await loanRequestContract.connect(lender).createLoanRequest(rate, duration);

        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId, rate),
            "Lender cannot be self."
        );
    });

    //TEST ID: 0.04
    it("LoandRequest should remove signer signature at request.", async function () {
        // Validate borrower signoff removal
        await loanRequestContract.setLender(lender.address, loanId, rate);
        let borrowerAddress = borrower.address;
        let borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrowerAddress,
            borrower.address,
            loanId
        );
        assert.isTrue(borrowerSignStatus, "Borrower sign status is not true.");

        await loanRequestContract.removeSignature(borrower.address, loanId);
        borrowerAddress = borrower.address;
        borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrowerAddress,
            borrower.address,
            loanId
        );
        assert.isFalse(borrowerSignStatus, "Borrower sign status is not false.");

        // Validate lender signoff removal        
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isTrue(lenderSignStatus, "Lender sign status is not true.");

        await loanRequestContract.connect(lender).removeSignature(borrower.address, loanId);
        lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    //TEST ID: 0.05
    it("LoanRequest should remove lender signature if borrower changes duration.", async function () {
        await loanRequestContract.setLender(lender.address, loanId, rate);
        await loanRequestContract.removeSignature(borrower.address, loanId);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate borrower signoff removal
        const borrowerAddress = borrower.address;
        const borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrowerAddress,
            borrower.address,
            loanId
        );

        // Validate lender signoff
        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );

        assert.isFalse(borrowerSignStatus, "Borrower sign status is not false.");
        assert.isTrue(lenderSignStatus, "Lender sign status is not true.");

        // Update duration
        const newDuration = ethers.BigNumber.from('15');
        await loanRequestContract.setDuration(loanId, newDuration);

        // Validate lender signoff removal
        lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    //TEST ID: 0.06
    it("LoanRequest should remove lender signature if borrower changes rate.", async function () {
        await loanRequestContract.setLender(lender.address, loanId, rate);
        await loanRequestContract.removeSignature(borrower.address, loanId);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate borrower signoff removal
        const borrowerAddress = borrower.address;
        const borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrowerAddress,
            borrower.address,
            loanId
        );

        // Validate lender signoff
        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );

        assert.isFalse(borrowerSignStatus, "Borrower sign status is not false.");
        assert.isTrue(lenderSignStatus, "Lender sign status is not true.");

        // Update duration
        const newRate = ethers.BigNumber.from('7');
        await loanRequestContract.setRate(loanId, newRate);

        // Validate lender signoff removal
        lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });
})