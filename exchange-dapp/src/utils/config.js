require('dotenv').config();
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

const ALCHEMY_MAINNET_URL = process.env.ALCHEMY_MAINNET_URL;

export const alchemy = () => {
    return createAlchemyWeb3(ALCHEMY_MAINNET_URL);
}

export const config = async (network) => {
    console.log(`${network}`)
    // const loanRequestABI = require(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestABI = require(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestAddress = require(`../static/${network}/LoanRequestAddress.json`);

    return {
        isDev: true,
        loanRequestABI: loanRequestABI.abi,
        loanRequestAddress: loanRequestAddress.loanRequestAddress,
        RPC_PROVIDER: 'ALCHEMY',
        NETWORK: '1337',
        GAS_LIMIT: 100000,
        RPC_PORT: {
            GANACHE: '8535',
        },
        CHAINID: {
            '31337': 'HARDHAT',
            '1337': 'MAINNET_FORK',
            '1447': 'GANACHE',
            '4': 'RINKEBY',
            '42': 'KOVAN',
            '1': 'MAINNET',
            '80001': 'MUMBAI'
        }
    }
};
