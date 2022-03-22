const hre = require("hardhat");
const fs = require('fs');
const { NETWORK } = require('../utils/config');
const { ethers } = require("hardhat");

const erc721 = require(`../exchange-dapp/src/artifacts/${NETWORK}/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json`).abi;

const transferibles = [
    {
        ownerAddress: "0x8bc47be1e3abbaba182069c89d08a61fa6c2b292",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 7894,
        recipient: "0xF86aDc48d86E173485fc4A6E3EF49939d4400e6a"
    },
    {
        ownerAddress: "0x9ca8749220a0d626098b38afa5dadeb3dbe30232",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 212,
        recipient: "0xF86aDc48d86E173485fc4A6E3EF49939d4400e6a"
    },
    {
        ownerAddress: "0xc0dc04aac2d5f1d35769e54b95c22194500a69f7",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 3311,
        recipient: "0xF86aDc48d86E173485fc4A6E3EF49939d4400e6a"
    },
    {
        ownerAddress: "0x5ea00bc260417e58087a010c85703683bfa6419f",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 2838,
        recipient: "0xF86aDc48d86E173485fc4A6E3EF49939d4400e6a"
    }
];

const main = async () => {
    provider = new ethers.providers.Web3Provider(hre.network.provider);
    let signers = await hre.ethers.getSigners();

    for (let tr of transferibles) {

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [tr.ownerAddress],
        });

        const signer = provider.getSigner(tr.ownerAddress);

        let nftContract = new hre.ethers.Contract(tr.nft, erc721, signer);
        let tx = await nftContract.ownerOf(tr.tokenId);
        console.log("Owner is", tx);

        tx = await nftContract["safeTransferFrom(address,address,uint256)"](tr.ownerAddress, tr.recipient, tr.tokenId);
        await tx.wait();

        tx = await nftContract.ownerOf(tr.tokenId);
        console.log("New owner is", tx);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [tr.ownerAddress],
        });
    }

    const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest", signers[19]);

    loanRequestContract = await LoanRequestFactory.deploy();
    await loanRequestContract.deployed();
    console.log("LoanRequest deployed: ", loanRequestContract.address);

    const config = {
        loanRequestAddress: loanRequestContract.address,
        transferibles: transferibles
    }

    fs.writeFileSync(`./exchange-dapp/src/static/${NETWORK}/LoanRequestConfig.json`, JSON.stringify(config, null, 2));
}

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
}

runMain();