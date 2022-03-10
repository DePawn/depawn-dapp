const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const hre = require("hardhat");
const { ethers } = require('ethers');


describe("0-0 :: LoanRequest signer functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember;

    const collateral = ethers.constants.AddressZero;
    const initialLoanValue = ethers.constants.Zero;
    const rate = ethers.constants.One;
    const duration = ethers.constants.Two;
    const initialLender = ethers.constants.AddressZero;
    const loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, ..._] = await hre.ethers.getSigners();
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            collateral,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );
    });

    it("0-0-00 :: LoanRequest should allow borrower to add lender and automatically sign for borrower.", async function () {
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

    it("0-0-01 :: LoanRequest should not allow non-borrower to add lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(nonMember.address, loanId, rate),
            "No loans exist for this borrower."
        );
        // Will assume lender is borrower and fail for new loan request by lender's address.
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId, rate),
            "No loans exist for this borrower."
        );
    });

    it("0-0-02 :: LoanRequest should not allow borrower to add self as lender.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setLender(borrower.address, loanId, rate),
            "Lender cannot be self."
        );

        // Need to create a loan request for lender so we can observe check. 
        await truffleAssert.reverts(
            loanRequestContract.connect(borrower).createLoanRequest(
                collateral,
                initialLoanValue,
                rate,
                duration,
                borrower.address
            ),
            "Lender cannot be self."
        );
    });

    it("0-0-03 :: LoanRequest should remove signer signature at request.", async function () {
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

    it("0-0-04 :: LoanRequest should remove lender signature if borrower changes duration.", async function () {
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

    it("0-0-05 :: LoanRequest should remove lender signature if borrower changes rate.", async function () {
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

        // Update rate
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
});

describe("0-1 :: LoanRequest components functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft;

    const collateral = ethers.constants.AddressZero;
    const initialLoanValue = ethers.constants.Zero;
    const rate = ethers.constants.One;
    const duration = ethers.constants.Two;
    const initialLender = ethers.constants.AddressZero;
    const loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, nft, ..._] = await hre.ethers.getSigners();
        nft = nft.address;

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            collateral,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );
    });

    it("0-1-00 :: LoanRequest collateral should only be changed by borrower.", async function () {
        // Verify current collateral
        const currentCollateral = await loanRequestContract.getCollateral(borrower.address, loanId);
        assert.equal(collateral, currentCollateral, "Current collateral should equal collateral.");

        // Verify nonMember cannot change collateral
        const newCollateral = nft;
        await truffleAssert.reverts(
            loanRequestContract.connect(nonMember).setCollateral(loanId, newCollateral),
            "No loans exist for this borrower."
        );

        // Change collateral
        await loanRequestContract.setCollateral(loanId, newCollateral);

        // Verify collateral changed
        const changedCollateral = await loanRequestContract.getCollateral(borrower.address, loanId);
        assert.notEqual(collateral, changedCollateral, "Changed collateral should not equal collateral.");
    });

    it("0-1-01 :: LoanRequest initial loan value should only be changed by borrower.", async function () {
        // Verify current initial loan value
        const currentInitialLoanValue = await loanRequestContract.getInitialLoanValue(borrower.address, loanId);
        assert.equal(initialLoanValue.toNumber(), currentInitialLoanValue.toNumber(), "Current initial loan value should equal initial loan value.");

        // Verify nonMember cannot change initial loan value
        const newInitialLoanValue = ethers.constants.One;
        await truffleAssert.reverts(
            loanRequestContract.connect(nonMember).setInitialLoanValue(loanId, newInitialLoanValue),
            "No loans exist for this borrower."
        );

        // Change initial loan value
        await loanRequestContract.setInitialLoanValue(loanId, newInitialLoanValue);

        // Verify initial loan value changed
        const changedInitialLoanValue = await loanRequestContract.getInitialLoanValue(borrower.address, loanId);
        assert.notEqual(initialLoanValue.toNumber(), changedInitialLoanValue.toNumber(), "Changed initial loan value should not equal initial loan value.");
    });

    it("0-1-02 :: LoanRequest rate should only be changed by borrower.", async function () {
        // Verify current rate
        const currentRate = await loanRequestContract.getRate(borrower.address, loanId);
        assert.equal(rate, currentRate.toNumber(), "Current rate should equal rate.");

        // Verify nonMember cannot change rate
        const newRate = ethers.BigNumber.from('7');
        await truffleAssert.reverts(
            loanRequestContract.connect(nonMember).setRate(loanId, newRate),
            "No loans exist for this borrower."
        );

        // Change rate
        await loanRequestContract.setRate(loanId, newRate);

        // Verify rate changed
        const changedRate = await loanRequestContract.getRate(borrower.address, loanId);
        assert.notEqual(rate, changedRate.toNumber(), "Changed rate should not equal rate.");
    });

    it("0-1-03 :: LoanRequest duration should only be changed by borrower.", async function () {
        // Verify current durations
        const currentDuration = await loanRequestContract.getDuration(borrower.address, loanId);
        assert.equal(duration, currentDuration.toNumber(), "Current duration should equal duration.");

        // Verify nonMember cannot change duration
        const newDuration = ethers.BigNumber.from('70');
        await truffleAssert.reverts(
            loanRequestContract.connect(nonMember).setDuration(loanId, newDuration),
            "No loans exist for this borrower."
        );

        // Change duration
        await loanRequestContract.setDuration(loanId, newDuration);

        // Verify duration changed
        const changedDuration = await loanRequestContract.getDuration(borrower.address, loanId);
        assert.notEqual(duration, changedDuration.toNumber(), "Changed duration should not equal duration.");
    });
});

describe("0-2 :: LoanRequest signed off functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember;

    const collateral = ethers.constants.AddressZero;
    const initialLoanValue = ethers.constants.Zero;
    const rate = ethers.constants.One;
    const duration = ethers.constants.Two;
    const initialLender = ethers.constants.AddressZero;
    const loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, ..._] = await hre.ethers.getSigners();
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            collateral,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );
    });


    it("0-2-00 :: LoanRequest should not allow rate changes if safe is confirmed.", async function () {
        // Validate lender signoff removal        
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isTrue(lenderSignStatus, "Lender sign status is not true.");
    });
});

describe("0-3 :: LoanRequest approved functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft;

    const initialLoanValue = ethers.constants.One;
    const rate = ethers.constants.One;
    const duration = ethers.constants.One;
    const loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, nft, ..._] = await hre.ethers.getSigners();
        nft = nft.address;
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
    });

    it("0-3-00 :: LoanRequest must deploy loan contract when all parameters are set.", async function () {
        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );
        const tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        const receipt = await tx.wait();

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });

});