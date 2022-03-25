const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../exchange-dapp/src/artifacts/31337/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;
const loanContractAbi = require("../exchange-dapp/src/artifacts/31337/contracts/LoanContract.sol/LoanContract.json").abi;

const transferibles = [

    {
        ownerAddress: "0x5f7bd8e190d30b9db5656749c745b8988ab69cd0",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 5465,
        recipient: "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6",
        abi: erc721
    },
    {
        ownerAddress: "0xb855567a17c266c1d82a52bb093ef5b6a66deb01",
        nft: "0x3ba8c518530B8217a810eDaC019455F110923Cdc",
        tokenId: 22,
        recipient: "0x2d35bd9bec501955e82437c1a96e4baade2b8eeb",
        abi: erc721
    },
    {
        ownerAddress: "0x8cb377959625e693986c6adef82fff01d4d91af8",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 6482,
        recipient: "0xb3010c222301a6f5479cad8fadd4d5c163fa7d8a",
        abi: erc721
    }

]

const { expect } = require("chai");

describe("Loan Life Cycle", function () {

    let provider;
    let signers;
    let signer;
    let nftContract;
    let loanRequestContract;
    let loanContract;
    let loanContractAddress;

    let borrowerAddress = transferibles[0].recipient;
    let borrowerNFT = transferibles[0].nft;
    let borrowerTokenId = transferibles[0].tokenId;

    let lenderAddress = "0x2d35bd9bec501955e82437c1a96e4baade2b8eeb";
    let lender;

    let borrower;
    let loanId;

    let snapshotId;

    it("Impersonate Original NFT owners accounts. Transfer NFTs to hardhat accounts.", async function () {

        provider = new ethers.providers.Web3Provider(hre.network.provider);
        signers = await hre.ethers.getSigners();

        for (let tr of transferibles) {

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [tr.ownerAddress],
            });

            signer = provider.getSigner(tr.ownerAddress);

            nftContract = new hre.ethers.Contract(tr.nft, tr.abi, signer);
            let txn0 = await nftContract.ownerOf(tr.tokenId);
            //console.log("Owner is", txn0);

            let tx1 = await nftContract["safeTransferFrom(address,address,uint256)"](tr.ownerAddress, tr.recipient, tr.tokenId);
            await tx1.wait();

            let txn3 = await nftContract.ownerOf(tr.tokenId);
            //console.log("Owner is", txn3);

            await hre.network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [tr.ownerAddress],
            });

            expect(txn3.toLowerCase()).to.be.equal(tr.recipient.toLowerCase());

        }

    });

    it("NFT owner approves LoanRequest contract to transfer ownership.", async function () {

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest", signers[19]);

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();

        borrower = provider.getSigner(borrowerAddress);

        nftContract = new hre.ethers.Contract(borrowerNFT, erc721, borrower);

        let txn0 = await nftContract.ownerOf(borrowerTokenId);

        let txn1 = await nftContract.approve(loanRequestContract.address, borrowerTokenId);
        await txn1.wait();
        let addressApproved = await nftContract.getApproved(borrowerTokenId);
        expect(addressApproved).to.equal(loanRequestContract.address);


    });

    describe("Creating a Loan Contract", function() {

        it("Borrower raises a Loan Contract Request: 2 ETH, 50% interest, expiration 2023-3-24 (1Y)", async function() {

            loanId = await loanRequestContract.connect(borrower).createLoanRequest(
                borrowerNFT,
                borrowerTokenId,
                ethers.utils.parseEther("2"),
                50,
                Math.floor(new Date(2023, 2, 8).getTime() / 1000)
            );
            await loanId.wait();

            loanId = loanId.value.toNumber();
            expect(loanId).to.be.equal(0);

        });

        it("Borrower signs the loan contract", async function() {

            let tx = await loanRequestContract.connect(borrower).sign(borrowerAddress, loanId);
            let receipt = await tx.wait();

            let borrowerStatus = await loanRequestContract.getSignStatus(borrowerAddress, borrowerAddress, loanId);

            expect(borrowerStatus).to.be.equal(true);

        });

        it("Lender sends 2ETH to the contract and signs it.", async function() {

            lender = provider.getSigner(lenderAddress);
            // Signoff and create new contract
            tx = await loanRequestContract.connect(lender).setLender(borrowerAddress, loanId, { value: ethers.utils.parseEther("2") });
            receipt = await tx.wait();

            const events = receipt.events.map(ev => ev.event);

            expect(events).to.include('DeployedLoanContract');

            const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
            const deployedEvent = loanRequestContract.interface.parseLog(log);
            loanContractAddress = deployedEvent.args['_contract'];
            //console.log(loanContract);

            let lenderStatus = await loanRequestContract.getSignStatus(lenderAddress, borrowerAddress, loanId);

            expect(lenderStatus).to.be.equal(true);

            loanContract = new hre.ethers.Contract(loanContractAddress, loanContractAbi, borrower);

        });

        describe("Contract is now signed by both parties.", function() {

            it("Contract status should be WITHDRAWABLE for borrower", async function(){

                let status = await loanContract.getStatus();

                expect(status).to.be.equal("WITHDRAWABLE");


            });

            it("Borrower withdraws money (2 ETH) from contract. Loan is now ACTIVE.", async function() {

                let weiBorrowerBefore = await provider.getBalance(borrowerAddress);

                let wei = await provider.getBalance(loanContractAddress);
                let ether = Number(ethers.utils.formatEther(wei));
                //console.log(ether);
                expect(ether).to.be.equal(2);
                await loanContract.getMyLoan();
                wei = await provider.getBalance(loanContractAddress);
                ether = Number(ethers.utils.formatEther(wei));
                expect(ether).to.be.equal(0);

                let status = await loanContract.getStatus();

                expect(status).to.be.equal("ACTIVE");

                snapshotId = await provider.send("evm_snapshot");
                //console.log(snapshotId);


            });


            it("Flash forward 6 months from start date. Amount accrued is: 2.5 ETH", async function() {

                await provider.send("evm_increaseTime", [182 * 24 * 60 * 60 ]) // add 180 days
                await provider.send("evm_mine", []) // force mine the next block
                

                let redemption = await loanContract.calculateRedemption();
                let ether = Number(ethers.utils.formatEther(redemption)).toFixed(1);
                expect(ether).to.be.equal("2.5");

            });

            it("Borrower pre pays 1 ETH at 6 months. Remaining debt is: 1.5 ETH", async function() {

                let tx = await loanContract.payLoan({value: ethers.utils.parseEther("1")});
                await tx.wait();

                redemption = await loanContract.calculateRedemption();

                let ether = Number(ethers.utils.formatEther(redemption)).toFixed(1);
                expect(ether).to.be.equal("1.5");

            });

            it("Flash forward 12 months from start date. Remaining debt is: 1.75 ETH", async function() {

                await provider.send("evm_increaseTime", [182 * 24 * 60 * 60 ]) // add 180 days
                await provider.send("evm_mine", []) // force mine the next block
                

                let redemption = await loanContract.calculateRedemption();
                let ether = Number(ethers.utils.formatEther(redemption)).toFixed(2);
                expect(ether).to.be.equal("1.75");

            });

            it("Borrower pays debt in full. Remaining debt is: 0 ETH", async function() {

                let redemption = await loanContract.calculateRedemption();
                let tx = await loanContract.payLoan({value: redemption});
                await tx.wait();
                redemption = await loanContract.calculateRedemption();
                let ether = ethers.utils.formatEther(redemption);
                expect(ether).to.be.equal("0.0");
                

            });

            it("Contract status is now PAID", async function () {
                
                let status = await loanContract.getStatus();

                expect(status).to.be.equal("PAID");

            });

            it("Flash back to start date. Remaining debt on day 0 is: 2 ETH", async function() {

                await provider.send("evm_revert", [snapshotId]);

                let redemption = await loanContract.calculateRedemption();
                let ether = Number(ethers.utils.formatEther(redemption)).toFixed(1);
                expect(ether).to.be.equal("2.0");

            });

            it("SCENARIO 2: Flash forward to expiration date + 6 days. Borrower doesn't pay. Loan status is DEFAULT", async function() {

                tx = await loanContract.setStatus();
                await tx.wait();

                await provider.send("evm_increaseTime", [(365 + 6) * 24 * 60 * 60 ]) 
                await provider.send("evm_mine", []) 

                tx = await loanContract.setStatus();
                await tx.wait();

                let status = await loanContract.getStatus();

                expect(status).to.be.equal("DEFAULT");

            });

            it("At this point Lender collects the collateral. He is the new owner of the NFT", async function() {

                tx = await loanContract.connect(lender).withdrawLoanLender();
                await tx.wait();

                let newOwner = await nftContract.ownerOf(borrowerTokenId);

                expect(lenderAddress.toUpperCase()).to.equal(newOwner.toUpperCase());

            });



        });

    });

});