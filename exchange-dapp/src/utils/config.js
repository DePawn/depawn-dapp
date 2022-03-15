const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

export const alchemy = (ALCHEMY_MAINNET_URL) => {
    console.log(ALCHEMY_MAINNET_URL)
    return createAlchemyWeb3(ALCHEMY_MAINNET_URL);
}

export const config = (network) => {
    console.log(`Grabbing artifacts from ../artifacts/${network}`);
    console.log(`Grabbing contract address from ../static/${network}`);

    const loanRequestABI = require(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestAddress = require(`../static/${network}/LoanRequestAddress.json`);
    const erc721 = require(`../artifacts/${network}/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json`);

    return {
        isDev: true,
        loanRequestABI: loanRequestABI.abi,
        loanRequestAddress: loanRequestAddress.loanRequestAddress,
        erc721: erc721.abi,
        RPC_PROVIDER: 'ALCHEMY',
        NETWORK: network,
        GAS_LIMIT: 100000,
        RPC_PORT: {
            GANACHE: '8555',
            HARDHAT: '8545',
            MAINNET_FORK: '8545'
        },
        CHAINID: {
            '31337': 'HARDHAT',
            '1447': 'GANACHE',
            '4': 'RINKEBY',
            '42': 'KOVAN',
            '1': 'MAINNET',
            '80001': 'MUMBAI'
        }
    }
};