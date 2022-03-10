
const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../dapp/artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;

transferibles = [
    {
        owner: "0x5f7bd8e190d30b9db5656749c745b8988ab69cd0",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 5465,
        recipient: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        abi: erc721
    },
    {
        owner: "0xb855567a17c266c1d82a52bb093ef5b6a66deb01",
        nft: "0x3ba8c518530B8217a810eDaC019455F110923Cdc",
        tokenId: 22,
        recipient: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        abi: erc721
    },
    {
        owner: "0x8cb377959625e693986c6adef82fff01d4d91af8",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 6482,
        recipient: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
        abi: erc721
    }

]

async function main() {

    const preTransferFactory = await hre.ethers.getContractFactory("PreTransfer");
    const preTransferContract = await preTransferFactory.deploy();
    await preTransferContract.deployed();
    console.log("PreTransfer deployed to:", preTransferContract.address);

    provider = new ethers.providers.Web3Provider(hre.network.provider);
    let signers = await hre.ethers.getSigners();

    for(let tr of transferibles) {

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [tr.owner],
        });

        const signer = provider.getSigner(tr.owner);

        let nftContract = new hre.ethers.Contract(tr.nft, tr.abi, signer);
        let txn0 = await nftContract.ownerOf(tr.tokenId);
        console.log("Owner is", txn0);
        let txn1 = await nftContract.approve(preTransferContract.address, tr.tokenId);
        await txn1.wait();
        console.log("Approve Token Transfer from Contract");

        //const PreTransfer = await hre.ethers.getContractAt("PreTransfer", preTransferContract.address, signer);
        //let txn2 = await PreTransfer.transfer(tr.recipient, tr.nft, tr.tokenId);
        let preTransfer = preTransferContract.connect(signer);
        let txn2 = await preTransfer.transfer(tr.recipient, tr.nft, tr.tokenId);

        let txn3 = await nftContract.ownerOf(tr.tokenId);
        console.log("Owner is", txn3);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [tr.owner],
        });

    }

    const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest", signers[19]);

    loanRequestContract = await LoanRequestFactory.deploy();
    await loanRequestContract.deployed();
    console.log("LoanRequest deployed: ", loanRequestContract.address);

    

    

    
    //Owner 0x5f7bd8e190d30b9db5656749c745b8988ab69cd0
    //NFT 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
    //Token ID 5465




    
    
    
  


}

main();