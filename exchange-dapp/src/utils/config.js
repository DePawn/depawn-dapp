const { createAlchemyWeb3 } = require("@alch/alchemy-web3");


export const alchemy = (ALCHEMY_MAINNET_URL) => {
    console.log(ALCHEMY_MAINNET_URL)
    return createAlchemyWeb3(ALCHEMY_MAINNET_URL);
}

export const config = async (network) => {
    const loanRequestABI = require(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestAddress = require(`../static/${network}/LoanRequestAddress.json`);

    return {
        isDev: true,
        loanRequestABI: loanRequestABI.abi,
        loanRequestAddress: loanRequestAddress.loanRequestAddress,
        RPC_PROVIDER: 'ALCHEMY',
        NETWORK: '1447',
        GAS_LIMIT: 100000,
        RPC_PORT: {
            GANACHE: '8555',
            HARDHAT: '8555',
            MAINNET_FORK: '8535'
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
