const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../exchange-dapp/src/artifacts/31337/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;

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

    let borrowerAddress = transferibles[0].recipient;
    let borrowerNFT = transferibles[0].nft;
    let borrowerTokenId = transferibles[0].tokenId;

    it("New NFT owners should be recipients listed in config object", async function () {

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

    it("NFT owner approves newly created LoanRequest contract to transfer ownership.", async function () {

        const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest", signers[19]);

        loanRequestContract = await LoanRequestFactory.deploy();
        await loanRequestContract.deployed();

        let borrower = provider.getSigner(borrowerAddress);

        nftContract = new hre.ethers.Contract(borrowerNFT, erc721, borrower);

        let txn0 = await nftContract.ownerOf(borrowerTokenId);

        let txn1 = await nftContract.approve(loanRequestContract.address, borrowerTokenId);
        await txn1.wait();
        let addressApproved = await nftContract.getApproved(borrowerTokenId);
        expect(addressApproved).to.equal(loanRequestContract.address);


    });

    //describe("")

});