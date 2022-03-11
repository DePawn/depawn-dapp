const hre = require("hardhat");
const fs = require('fs');
const { NETWORK, STATIC } = require('../utils/config');

const main = async () => {
    const loanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");
    const loanRequest = await loanRequestFactory.deploy();
    await loanRequest.deployed();

    const config = {
        loanRequestAddress: loanRequest.address
    }

    fs.writeFileSync(`./exchange-dapp/src/static/${NETWORK}/LoanRequestAddress.json`, JSON.stringify(config, null, 2));
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