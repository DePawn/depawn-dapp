const _loanContractAddress = "0x515be5c447705f9c9ade8e3b7ff84454567fbc4c";
const borrowerAddress = "0xe67b33D7C5ff1Db9Bb12e5672c49Db3eEB87f3c6";
const lenderAddress = "0x08922a1e2a0a760ac9b1ad6dcbc1d9ce6a07cd98";


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
