const config = async (network) => {
    const loanRequestABI = await import(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestAddress = await import(`../static/${network}/LoanRequestAddress.json`);

    return {
        isDev: true,
        loanRequestABI: loanRequestABI.abi,
        loanRequestAddress: loanRequestAddress.loanRequestAddress,
        RPC_PROVIDER: 'ALCHEMY',
        NETWORK: '1337',
        GAS_LIMIT: 100000,
        RPC_PORT: {
            GANACHE: '8555',
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
}

export default config;
