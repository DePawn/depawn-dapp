const _loanContractAddress = "0xF404Ef3a637d7e88A016C4C893b5B1F1fa8Cf8D7";
const borrowerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const lenderAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";


const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../exchange-dapp/src/artifacts/31337/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;
const loanContractAbi = require("../exchange-dapp/src/artifacts/31337/contracts/LoanContract.sol/LoanContract.json").abi;



async function main() {
    /*
    const preTransferFactory = await hre.ethers.getContractFactory("PreTransfer");
    const preTransferContract = await preTransferFactory.deploy();
    await preTransferContract.deployed();
    console.log("PreTransfer deployed to:", preTransferContract.address);
    */
    provider = new ethers.providers.Web3Provider(hre.network.provider);
    let signers = await hre.ethers.getSigners();

    const signer = provider.getSigner(borrowerAddress);

    let loanContract = new hre.ethers.Contract(_loanContractAddress, loanContractAbi, signer);

    let redemption = await loanContract.calculateRedemption();
    console.log(redemption);

    let status = await loanContract.getStatus();
    console.log(status);

    //borrower already signed
    await loanContract.getMyLoan();

    status = await loanContract.getStatus();
    console.log(status);

    await loanContract.payLoan({value: ethers.utils.parseEther("1")});

    redemption = await loanContract.calculateRedemption();
    console.log(redemption);

    await loanContract.payLoan({value: ethers.utils.parseUnits("1015342465753424657", "wei")});

    status = await loanContract.getStatus();
    console.log(status);

    let nftAddress = await loanContract.collateral();
    let tokenId = await loanContract.tokenId();

    let nftContract = new hre.ethers.Contract(nftAddress, erc721, signer);
    let owner = await nftContract.ownerOf(tokenId);
    console.log("owner of nft", owner);
    await loanContract.withdrawNFTBorrower();

    

    owner = await nftContract.ownerOf(tokenId);
    console.log("owner of nft", owner);

}

main();
