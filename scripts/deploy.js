const hre = require("hardhat");
const fs = require('fs');
const { NETWORK } = require('../utils/config');
const { ethers } = require("hardhat");

const erc721 = require(`../exchange-dapp/src/artifacts/${NETWORK}/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json`).abi;

const transferibles = [
    {
        ownerAddress: "0x06a51fa36188839ec6373944918d980812ea44b2",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 3320,
        recipient: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    },
    {
        ownerAddress: "0x6317b49061120855e0bc34709ed75dbeb30336ef",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 6019,
        recipient: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    },
    {
        ownerAddress: "0x8ba7ac4ff3619e0a002a7077357047b9dd8cdf84",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 5195,
        recipient: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    },
    {
        ownerAddress: "0xf158275fa2a711ada7bcbd66359ecfaf0ac56734",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 6491,
        recipient: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
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
        console.log("Owner is", tx);

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