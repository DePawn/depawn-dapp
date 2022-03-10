const hre = require("hardhat");

const main = async () => {
    const loanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");
    const loanRequest = await loanRequestFactory.deploy();
    await loanRequest.deployed();
    console.log("LoanRequest contract deployed to: ", loanRequest.address);
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