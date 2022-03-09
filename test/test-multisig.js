const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const hre = require("hardhat");


describe("MultiSig via LoanRequest", function () {
    let loanRequestContract;
    let owner0, owner1, contractOwner, nonOwner0;
    const required = 2;

    beforeEach(async () => {
        [owner0, owner1, nonOwner0, ..._] = await hre.ethers.getSigners();

        const borrower = owner0.address;
        const lender = owner1.address;
        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");

        loanRequestContract = await LoanRequestFactory.deploy(borrower, lender, required);
        await loanRequestContract.deployed();
        contractOwner = loanRequestContract.address;
    });

    it("MultiSig should be signable by any owner.", async function () {
        await truffleAssert.passes(loanRequestContract.connect(owner0).sign());
        await truffleAssert.passes(loanRequestContract.connect(owner1).sign());
    });

    it("MultiSig Signed event should be emitted when signed.", async function () {
        async function getSignedEvent(signer) {
            const topic = loanRequestContract.interface.getEventTopic('Signed');

            const tx = await loanRequestContract.connect(signer).sign();
            const receipt = await tx.wait();
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
            const deployedEvent = loanRequestContract.interface.parseLog(log);
            const signerAddress = deployedEvent.args['_signer'];
            const confirmedStatus = deployedEvent.args['_confirmedStatus'];

            return [signerAddress, confirmedStatus]
        }

        let [signerAddress, confirmedStatus] = await getSignedEvent(owner0);
        assert(signerAddress == owner0.address, "Event signer and owner0 does not match.");
        assert(confirmedStatus == (required <= 1), `Event confirmedStatus not ${required <= 1} for owner0 signoff.`);

        [signerAddress, confirmedStatus] = await getSignedEvent(owner1);
        assert(signerAddress == owner1.address, "Event signer and owner1 does not match.");
        assert(confirmedStatus == (required <= 2), `Event confirmedStatus not ${required <= 2} for owner1 signoff.`);
    });

    it("MultiSig should not be signable by a non-owner.", async function () {
        await truffleAssert.reverts(
            loanRequestContract.connect(nonOwner0).sign(),
            "You are not a valid signer."
        );
    });

    it("MultiSig Confirmed event should emit when sign-off complete.", async function () {
        const topic = loanRequestContract.interface.getEventTopic('Confirmed');

        let tx = await loanRequestContract.connect(owner0).sign();
        let receipt = await tx.wait();
        let log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

        if (!log) {
            tx = await loanRequestContract.connect(owner1).sign();
            receipt = await tx.wait();
            log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        }

        const deployedEvent = loanRequestContract.interface.parseLog(log);
        const contractAddress = deployedEvent.args['_contract'];
        const confirmedStatus = deployedEvent.args['_confirmedStatus'];

        assert.equal(loanRequestContract.address, contractAddress, "Event _contract not equal to contract address.");
        assert.equal(true, confirmedStatus, "Event _confirmedStatus not equal to true.");
    });
})