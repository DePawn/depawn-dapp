
const { ethers } = require("hardhat");
const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const erc721 = require("../exchange-dapp/src/artifacts/31337/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json").abi;

transferibles = [
    {
        ownerAddress: "0x8bc47be1e3abbaba182069c89d08a61fa6c2b292",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 7894,
        recipient: "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6",
        abi: erc721
    },
    {
        ownerAddress: "0x9ca8749220a0d626098b38afa5dadeb3dbe30232",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 212,
        recipient: "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6",
        abi: erc721
    },
    {
        ownerAddress: "0xc0dc04aac2d5f1d35769e54b95c22194500a69f7",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 3311,
        recipient: "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6",
        abi: erc721
    },
    {
        ownerAddress: "0x5ea00bc260417e58087a010c85703683bfa6419f",
        nft: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: 2838,
        recipient: "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6",
        abi: erc721
    }

]

async function main() {
    /*
    const preTransferFactory = await hre.ethers.getContractFactory("PreTransfer");
    const preTransferContract = await preTransferFactory.deploy();
    await preTransferContract.deployed();
    console.log("PreTransfer deployed to:", preTransferContract.address);
    */
    provider = new ethers.providers.Web3Provider(hre.network.provider);
    let signers = await hre.ethers.getSigners();

    for (let tr of transferibles) {

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [tr.ownerAddress],
        });

        const signer = provider.getSigner(tr.ownerAddress);

        let nftContract = new hre.ethers.Contract(tr.nft, tr.abi, signer);
        console.log("check1");
        let txn0 = await nftContract.ownerOf(tr.tokenId);
        console.log("Owner is", txn0);

        let tx1 = await nftContract["safeTransferFrom(address,address,uint256)"](tr.ownerAddress, tr.recipient, tr.tokenId);
        await tx1.wait();

        /*
        let txn1 = await nftContract.approve(preTransferContract.address, tr.tokenId);
        await txn1.wait();
        console.log("Approve Token Transfer from Contract");
        
        //const PreTransfer = await hre.ethers.getContractAt("PreTransfer", preTransferContract.address, signer);
        //let txn2 = await PreTransfer.transfer(tr.recipient, tr.nft, tr.tokenId);
        let preTransfer = preTransferContract.connect(signer);
        let txn2 = await preTransfer.transfer(tr.recipient, tr.nft, tr.tokenId);
        */


        let txn3 = await nftContract.ownerOf(tr.tokenId);
        console.log("Owner is", txn3);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [tr.ownerAddress],
        });
    }

    /*
    const LoanRequestEventsFactory = await hre.ethers.getContractFactory("LoanRequestEvents", signers[19]);

    let loanRequestEventsContract = await LoanRequestEventsFactory.deploy();
    await loanRequestEventsContract.deployed();
    */

    const LoanRequestFactory = await hre.ethers.getContractFactory("LoanRequest", signers[19]);

    let loanRequestContract = await LoanRequestFactory.deploy();
    await loanRequestContract.deployed();
    console.log("LoanRequest deployed: ", loanRequestContract.address);


    // Borrower with NFT"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    let borrowerAddress = "0xe67b33d7c5ff1db9bb12e5672c49db3eeb87f3c6";
    let borrowerNFT = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
    let borrowerTokenId = 7894;

    let borrower = provider.getSigner(borrowerAddress);

    let nftContract = new hre.ethers.Contract(borrowerNFT, erc721, borrower);

    let txn0 = await nftContract.ownerOf(borrowerTokenId);
    console.log("Owner is indeed borrower:", txn0);

    let txn1 = await nftContract.approve(loanRequestContract.address, borrowerTokenId);
    await txn1.wait();

    let loanId = await loanRequestContract.connect(borrower).createLoanRequest(
        borrowerNFT,
        borrowerTokenId,
        ethers.utils.parseEther("2"),
        10,
        Math.floor(new Date(2022, 3, 7).getTime() / 1000)
    );
    await loanId.wait();

    console.log("loanId", loanId.value.toNumber());
    loanId = loanId.value.toNumber();

    let tx = await loanRequestContract.connect(borrower).sign(borrowerAddress, loanId);
    let receipt = await tx.wait();
    console.log("ok");

    let lenderAddress = "0x2d35bd9bec501955e82437c1a96e4baade2b8eeb";
    let lender = provider.getSigner(lenderAddress);
    // Signoff and create new contract
    tx = await loanRequestContract.connect(lender).setLender(borrowerAddress, loanId, { value: ethers.utils.parseEther("2") });
    receipt = await tx.wait();

    console.log(receipt)



    //Owner 0x5f7bd8e190d30b9db5656749c745b8988ab69cd0
    //NFT 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
    //Token ID 5465










}

main();