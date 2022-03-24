const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const sqlite3 = require('sqlite3').verbose();


const erc721 = require("../dapp/artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;

async function main() {

    let db = await new sqlite3.Database('C:/Users/Alberto/depawn-dapp/exchange-dapp/db/loans.db');

    let signers = await hre.ethers.getSigners();
    let borrower = signers[5]; // Owner of the NFT

    const loanRequestContract = await hre.ethers.getContractAt("LoanRequest", "0x5d4dA1C5D567733B7552cC26612d9B3e3A0345FF", borrower);

    /*
    loanRequestContract.on("SubmittedLoanRequest", async (borrower, loanId, collateral, tokenId, loanValue, rate, expiration) => {
        console.log(borrower);
        console.log(loanId.toNumber());
        console.log(collateral);
        console.log(tokenId.toNumber());
        console.log(loanValue.toNumber());
        console.log(rate.toNumber());
        console.log(expiration.toNumber());

        let sql = `replace into loans values('${loanId.toNumber()}', '${borrower}', '${collateral}', '${tokenId.toNumber()}', '${loanValue.toNumber()}', '${rate.toNumber()}', '${expiration.toNumber()}', null)`

        await db.run(sql);



    });
    */

    loanRequestContract.on("DeployedLoanContract", async (_loanContractAddress,
        _borrower,
        _lender,
        _loanId) => {
        console.log(_loanContractAddress,
            _borrower,
            _lender,
            _loanId);




    });




}

main();