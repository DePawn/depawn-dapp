const hre = require("hardhat");

const main = async () => {
    const loanRequestFactory = await hre.ethers.getContractFactory("LoanRequest");
    const loanRequest = await loanRequestFactory.deploy();
    await loanRequest.deployed();
    console.log("LoanRequest contract deployed to: ", loanRequest.address);
}