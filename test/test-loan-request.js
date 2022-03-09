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

        loanRequestContract = await LoanRequestFactory.deploy(rate, duration);
        await loanRequestContract.deployed();
    });

    it("LoanRequest should not allow current member add lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setLender(borrower.address, loanId, rate),
            "You are already a signer."
        );
    });

    it("LoanRequest should allow only lender to add lender.", async function () {
        await loanRequestContract.connect(lender).setLender(borrower.address, loanId, rate);
        const contractLender = await loanRequestContract.getLender(borrower.address, loanId);

        assert.equal(contractLender, lender.address, "Contract lender does not match lender.");
    });

    it("LoanRequest should only let borrower sign if there is lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.sign(borrower.address, loanId),
            "Lender must be set."
        );

        await loanRequestContract.connect(lender).setLender(borrower.address, loanId, rate);
        await loanRequestContract.sign(borrower.address, loanId);

        const borrowerSignStatus = await loanRequestContract.getSignStatus(
            borrower.address,
            borrower.address,
            loanId
        );

        assert.isTrue(borrowerSignStatus, "Borrower sign status is not true.");
    });

    it("LoanRequest should allow lender to automatically sign.", async function () {
        await loanRequestContract.connect(lender).setLenderToSign(borrower.address, loanId, rate);

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

        assert.isFalse(borrowerSignStatus, "Borrower sign status is not false.");
        assert.isTrue(lenderSignStatus, "Lender sign status is not true.");
    });

    it.only("LoanRequest should remove lender if borrower changes rate.", async function () {
        await loanRequestContract.connect(lender).setLenderToSign(borrower.address, loanId, rate);

        const newRate = ethers.BigNumber.from('15');
        await loanRequestContract.setRate(loanId, newRate);

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
    })
})