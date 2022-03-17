
const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../dapp/artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;

async function main() {

    const nftAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
    const tokenId = 5465;

    let signers = await hre.ethers.getSigners();
    let borrower = signers[0]; // Owner of the NFT
    console.log("Borrower address:", borrower.address);

    let nftContract = new hre.ethers.Contract(nftAddress, erc721, borrower);

    let txn0 = await nftContract.ownerOf(tokenId);
    console.log("Owner is indeed borrower:", txn0);

    const loanRequestContract = await hre.ethers.getContractAt("LoanRequest", "0x5d4dA1C5D567733B7552cC26612d9B3e3A0345FF", borrower);

    //Borrower approves NFT to be transfered to LoanRequest
    let txn1 = await nftContract.approve(loanRequestContract.address, tokenId);
    await txn1.wait();
    console.log("approved NFT");
    let txn2 = await loanRequestContract.createLoanRequest(nftContract.address, tokenId, 100, 5, 6, ethers.constants.AddressZero);
    await txn2.wait();

    let txn3 = await nftContract.ownerOf(tokenId);
    console.log("Owner is now LoanRequest:", txn3);

    // Get it back
    //let txn4 = await loanRequestContract.withdrawNFT(nftContract.address, tokenId);
    //await txn4.wait();

    //let txn5 = await nftContract.ownerOf(tokenId);
    //console.log("Owner is again:", txn5);




}

main();