const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const hre = require("hardhat");
const { ethers } = require('ethers');


describe("0-0 :: LoanRequest signer functions", function () {
    let loanRequestContract;
    let borrower, lender, otherLender, nonMember, nft, nft2;

    let collateral;
    let initialLoanValue;
    let rate;
    let duration;
    let initialLender;
    let loanId;

    beforeEach(async () => {
        [borrower, lender, otherLender, nonMember, nft, nft2, ..._] = await hre.ethers.getSigners();
        nft = nft.address;
        nft2 = nft2.address;

        collateral = ethers.constants.AddressZero;
        tokenId = ethers.constants.Zero;
        initialLoanValue = ethers.constants.Zero;
        rate = ethers.constants.Zero;
        duration = ethers.constants.Zero;
        initialLender = ethers.constants.AddressZero;
        loanId = ethers.constants.Zero;

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            nft,
            tokenId,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );
    });

    it("0-0-00 :: LoanRequest should only allow lender to add self as lender and signoff self", async function () {
        await loanRequestContract.connect(lender).setLender(borrower.address, loanId);

        const lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");
    });

    it("0-0-01 :: LoanRequest should not allow lender to add self as lender to non-exisiting contract", async function () {
        // Will assume lender is borrower and fail for new loan request by lender's address.
        await truffleAssert.reverts(
            loanRequestContract.connect(lender).setLender(lender.address, loanId),
            "No loans exist for this borrower."
        );
    });

    it("0-0-02 :: LoanRequest should not allow borrower to add self as lender", async function () {
        // Need to create a loan request for lender so we can observe check. 
        await truffleAssert.reverts(
            loanRequestContract.connect(borrower).createLoanRequest(
                nft,
                tokenId,
                initialLoanValue,
                rate,
                duration,
                borrower.address
            ),
            "Lender cannot be the borrower."
        );
    });

    it("0-0-03 :: LoanRequest should allow borrower to remove lender if lender has not signed off", async function () {
        // Remove borrower signature to allow interaction
        await loanRequestContract.removeSignature(borrower.address, loanId);

        // Sign off lender and ensure lender removal cannot be done.
        await loanRequestContract.connect(lender).setLender(borrower.address, loanId);
        let lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);

        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        await truffleAssert.reverts(
            loanRequestContract.setLender(borrower.address, loanId),
            "Loan cannot be signed off by lender."
        );

        // Remove lender signature and remove lender.
        await loanRequestContract.connect(lender).removeSignature(borrower.address, loanId);

        lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isFalse(lenderSignStatus, "Lender sign status should be false.");

        await loanRequestContract.setLender(borrower.address, loanId);
        lenderAddress = await loanRequestContract.getLender(borrower.address, loanId);
        assert.equal(lenderAddress, ethers.constants.AddressZero, "Lender address should be address 0.");

        lenderSignStatus = await loanRequestContract.getSignStatus(
            lenderAddress,
            borrower.address,
            loanId
        );
        assert.isFalse(lenderSignStatus, "Lender sign status should be false.");
    });

    it("0-0-04 :: LoanRequest should remove signer signature at request", async function () {
        // Validate borrower signoff removal
        await loanRequestContract.setLender(loanId, lender.address);
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

    it("0-0-05 :: LoanRequest should remove lender signature if borrower changes collateral", async function () {
        await loanRequestContract.setLender(loanId, lender.address);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate lender signoff
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        // Update collateral
        collateral = nft2;
        await loanRequestContract.setCollateral(loanId, collateral);

        // Validate lender signoff removal
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it("0-0-06 :: LoanRequest should remove lender signature if borrower changes initial loan value", async function () {
        await loanRequestContract.setLender(loanId, lender.address);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate lender signoff
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        // Update initial loan value
        initialLoanValue = ethers.constants.One;
        await loanRequestContract.setInitialLoanValue(loanId, initialLoanValue);

        // Validate lender signoff removal
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it("0-0-07 :: LoanRequest should remove lender signature if borrower changes rate", async function () {
        await loanRequestContract.setLender(loanId, lender.address);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate lender signoff
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        // Update rate
        rate = ethers.constants.One;
        await loanRequestContract.setRate(loanId, rate);

        // Validate lender signoff removal
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it("0-0-08 :: LoanRequest should remove lender signature if borrower changes duration", async function () {
        await loanRequestContract.setLender(loanId, lender.address);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate lender signoff
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        // Update duration
        duration = ethers.constants.One;
        await loanRequestContract.setDuration(loanId, duration);

        // Validate lender signoff removal
        lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });

    it("0-0-09 :: LoanRequest should remove lender signature if borrower changes lender", async function () {
        await loanRequestContract.setLender(loanId, lender.address);
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);

        // Validate lender signoff
        let lenderSignStatus = await loanRequestContract.getSignStatus(
            lender.address,
            borrower.address,
            loanId
        );

        assert.isTrue(lenderSignStatus, "Lender sign status should be true.");

        // Update lender
        await loanRequestContract.setLender(loanId, otherLender.address);

        // Validate lender signoff removal
        lenderSignStatus = await loanRequestContract.getSignStatus(
            otherLender.address,
            borrower.address,
            loanId
        );

        assert.isFalse(lenderSignStatus, "Lender sign status is not false.");
    });
});

describe("0-1 :: LoanRequest components functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft, nft2;
    let loanRequests;

    const collateral = ethers.constants.AddressZero;
    const initialLoanValue = ethers.constants.Zero;
    const rate = ethers.constants.One;
    const duration = ethers.constants.Two;
    const initialLender = ethers.constants.AddressZero;
    const loanId = ethers.constants.Zero;


    beforeEach(async () => {
        [borrower, lender, nonMember, nft, nft2, ..._] = await hre.ethers.getSigners();
        nft = nft.address;
        nft2 = nft2.address;

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );
        loanRequests = await loanRequestContract.getLoans(borrower.address);
    });

    it("0-1-00 :: LoanRequest collateral should only be changed by borrower", async function () {
        // Verify current collateral
        const currentCollateral = loanRequests[loanId].collateral;
        assert.equal(nft, currentCollateral, "Current collateral should equal collateral.");

        // Verify nonMember cannot change collateral
        const newCollateral = nft2;
        await truffleAssert.reverts(
            loanRequestContract.connect(nonMember).setCollateral(loanId, newCollateral),
            "No loans exist for this borrower."
        );

        // Change collateral
        await loanRequestContract.setCollateral(loanId, newCollateral);

        // Verify collateral changed
        loanRequests = await loanRequestContract.getLoans(borrower.address);
        const changedCollateral = loanRequests[loanId].collateral;
        assert.notEqual(nft, changedCollateral, "Changed collateral should not equal collateral.");
    });

    it("0-1-01 :: LoanRequest initial loan value should only be changed by borrower", async function () {
        // Verify current initial loan value
        const currentInitialLoanValue = loanRequests[loanId].initialLoanValue;
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
        loanRequests = await loanRequestContract.getLoans(borrower.address);
        const changedInitialLoanValue = loanRequests[loanId].initialLoanValue;
        assert.notEqual(initialLoanValue.toNumber(), changedInitialLoanValue.toNumber(), "Changed initial loan value should not equal initial loan value.");
    });

    it("0-1-02 :: LoanRequest rate should only be changed by borrower", async function () {
        // Verify current rate
        const currentRate = loanRequests[loanId].rate;
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
        loanRequests = await loanRequestContract.getLoans(borrower.address);
        const changedRate = loanRequests[loanId].rate;
        assert.notEqual(rate, changedRate.toNumber(), "Changed rate should not equal rate.");
    });

    it("0-1-03 :: LoanRequest duration should only be changed by borrower", async function () {
        // Verify current durations
        const currentDuration = loanRequests[loanId].duration;
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
        loanRequests = await loanRequestContract.getLoans(borrower.address);
        const changedDuration = loanRequests[loanId].duration;
        assert.notEqual(duration, changedDuration.toNumber(), "Changed duration should not equal duration.");
    });
});

describe("0-2 :: LoanRequest signed off functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft;

    let initialLoanValue = ethers.constants.One;
    let rate = ethers.constants.One;
    let duration = ethers.constants.One;
    let loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, nft, ..._] = await hre.ethers.getSigners();
        nft = nft.address;
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );
        await loanRequestContract.connect(lender).sign(borrower.address, loanId);
    });

    it("0-2-00 :: LoanRequest should not allow collateral change if safe is confirmed", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setCollateral(loanId, ethers.constants.AddressZero),
            "Only unconfirmed contracts can be accessed."
        );
    });

    it("0-2-01 :: LoanRequest should not allow initial loan value change if safe is confirmed", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setInitialLoanValue(loanId, ethers.constants.Two),
            "Only unconfirmed contracts can be accessed."
        );
    });

    it("0-2-02 :: LoanRequest should not allow rate change if safe is confirmed", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setRate(loanId, ethers.constants.Two),
            "Only unconfirmed contracts can be accessed."
        );
    });

    it("0-2-03 :: LoanRequest should not allow duration change if safe is confirmed", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setDuration(loanId, ethers.constants.Two),
            "Only unconfirmed contracts can be accessed."
        );
    });

    it("0-2-04 :: LoanRequest should not allow lender change if safe is confirmed", async function () {
        await truffleAssert.reverts(
            loanRequestContract.setLender(loanId, ethers.constants.AddressZero),
            "Only unconfirmed contracts can be accessed."
        );
    });
});

describe("0-3 :: LoanRequest loan creation functions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft;

    let initialLoanValue;
    let rate;
    let duration;
    let loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, nft, ..._] = await hre.ethers.getSigners();
        nft = nft.address;
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
    });

    afterEach(async () => {
        // Zero out parameters
        initialLoanValue = ethers.constants.Zero;
        rate = ethers.constants.Zero;
        duration = ethers.constants.Zero;
    })

    it("0-3-00 :: LoanRequest should deploy loan contract when all parameters are finalized via createLoanRequest()", async function () {
        initialLoanValue = ethers.constants.One;
        rate = ethers.constants.One;
        duration = ethers.constants.One;

        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );

        // Signoff and create new contract
        const tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        const receipt = await tx.wait();
        const events = receipt.events.map(ev => ev.event);

        expect(events).to.include('DeployedLoanContract');

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });

    it("0-3-01 :: LoanRequest should deploy loan contract when all parameters are finalized via setInitialLoanValue()", async function () {
        initialLoanValue = ethers.constants.Zero;
        rate = ethers.constants.One;
        duration = ethers.constants.One;

        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );

        // Signoff and NOT create new contract
        let tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        let receipt = await tx.wait();
        let events = receipt.events.map(ev => ev.event);

        expect(events).to.not.include('DeployedLoanContract');

        // Add initial loan value
        await loanRequestContract.setInitialLoanValue(loanId, ethers.constants.One);

        // Signoff and create new contract
        tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        receipt = await tx.wait();
        events = receipt.events.map(ev => ev.event);

        expect(events).to.include('DeployedLoanContract');

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });

    it("0-3-02 :: LoanRequest should deploy loan contract when all parameters are finalized via setRate()", async function () {
        initialLoanValue = ethers.constants.One;
        rate = ethers.constants.Zero;
        duration = ethers.constants.One;

        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );

        // Signoff and NOT create new contract
        let tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        let receipt = await tx.wait();
        let events = receipt.events.map(ev => ev.event);

        expect(events).to.not.include('DeployedLoanContract');

        // Add rate
        await loanRequestContract.setRate(loanId, ethers.constants.One);

        // Signoff and create new contract
        tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        receipt = await tx.wait();
        events = receipt.events.map(ev => ev.event);

        expect(events).to.include('DeployedLoanContract');

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });

    it("0-3-03 :: LoanRequest should deploy loan contract when all parameters are finalized via setDuration()", async function () {
        initialLoanValue = ethers.constants.One;
        rate = ethers.constants.One;
        duration = ethers.constants.Zero;

        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            lender.address
        );

        // Signoff and NOT create new contract
        let tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        let receipt = await tx.wait();
        let events = receipt.events.map(ev => ev.event);

        expect(events).to.not.include('DeployedLoanContract');

        // Add duration
        await loanRequestContract.setDuration(loanId, ethers.constants.One);

        // Signoff and create new contract
        tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        receipt = await tx.wait();
        events = receipt.events.map(ev => ev.event);

        expect(events).to.include('DeployedLoanContract');

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });

    it("0-3-04 :: LoanRequest should deploy loan contract when all parameters are finalized via setLender()", async function () {
        initialLoanValue = ethers.constants.One;
        rate = ethers.constants.One;
        duration = ethers.constants.One;

        let tx = await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            ethers.constants.AddressZero
        );
        let receipt = await tx.wait();
        let events = receipt.events.map(ev => ev.event);

        expect(events).to.not.include('DeployedLoanContract');

        // Add lender
        await loanRequestContract.setLender(loanId, lender.address,);

        // Signoff and create new contract
        tx = await loanRequestContract.connect(lender).sign(borrower.address, loanId);
        receipt = await tx.wait();
        events = receipt.events.map(ev => ev.event);

        expect(events).to.include('DeployedLoanContract');

        const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractBorrower = deployedEvent.args['_borrower'];
        const contractLender = deployedEvent.args['_lender'];

        assert.equal(contractBorrower, borrower.address, "Borrower address mismatch.");
        assert.equal(contractLender, lender.address, "Lender address mismatch.");
    });
});

describe("0-4 :: LoanRequest loan components retrictions", function () {
    let loanRequestContract;
    let borrower, lender, nonMember, nft;

    let initialLoanValue;
    let rate;
    let duration;
    let loanId = ethers.constants.Zero;

    beforeEach(async () => {
        [borrower, lender, nonMember, nft, ..._] = await hre.ethers.getSigners();
        nft = nft.address;

        initialLoanValue = ethers.constants.Zero;
        rate = ethers.constants.Zero;
        duration = ethers.constants.Zero;
        initialLender = ethers.constants.AddressZero;
        loanId = ethers.constants.Zero;

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();
    });

    it("0-4-00 :: LoanRequest should not allow borrower to set collateral to address 0", async function () {
        initialLoanValue = ethers.constants.One;
        rate = ethers.constants.One;
        duration = ethers.constants.One;

        // Expected revert via createLoanRequest()
        await truffleAssert.reverts(
            loanRequestContract.createLoanRequest(
                ethers.constants.AddressZero,
                initialLoanValue,
                rate,
                duration,
                lender.address
            ),
            "Collateral cannot be address 0."
        );

        // Expected revert via setCollateral()
        await loanRequestContract.createLoanRequest(
            nft,
            initialLoanValue,
            rate,
            duration,
            initialLender
        );

        await truffleAssert.reverts(
            loanRequestContract.setCollateral(loanId, ethers.constants.AddressZero),
            "Collateral cannot be address 0."
        );
    });
});