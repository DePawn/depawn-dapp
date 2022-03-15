const hre = require("hardhat");
const fs = require('fs');
const { NETWORK } = require('../utils/config');

const transferibles = [
    {
        owner: "0x5f7bd8e190d30b9db5656749c745b8988ab69cd0",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 5465,
    },
    {
        owner: "0xb855567a17c266c1d82a52bb093ef5b6a66deb01",
        nft: "0x3ba8c518530B8217a810eDaC019455F110923Cdc",
        tokenId: 22,
    },
    {
        owner: "0x8cb377959625e693986c6adef82fff01d4d91af8",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 6482,
    }
];

const main = async () => {
    const loanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");
    const loanRequestContract = await loanRequestFactory.deploy();
    await loanRequestContract.deployed();

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