module.exports = {
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