const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

export const alchemy = (ALCHEMY_MAINNET_URL) => {
    console.log(ALCHEMY_MAINNET_URL)
    return createAlchemyWeb3(ALCHEMY_MAINNET_URL);
}

export const config = (network) => {
    console.log(`Grabbing artifacts from ../artifacts/${network}`);
    console.log(`Grabbing contract address from ../static/${network}`);

    const loanRequestABI = require(`../artifacts/${network}/contracts/LoanRequest.sol/LoanRequest.json`);
    const loanRequestConfig = require(`../static/${network}/LoanRequestConfig.json`);
    const erc721 = require(`../artifacts/${network}/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json`);
    const erc1155 = require(`../artifacts/${network}/@openzeppelin/contracts/token/ERC1155/IERC1155.sol/IERC1155.json`);

    const rpc_port = {
        HARDHAT: '8545',
        GANACHE: '8555',
        RINKEBY: '8545',
        KOVAN: '8545',
        MAINNET_FORK: '8545',
        MAINNET: '8545',
        MUMBAI: '8545',
    };

    const chainId = {
        '31337': 'HARDHAT',
        '1447': 'GANACHE',
        '4': 'RINKEBY',
        '42': 'KOVAN',
        '1': 'MAINNET',
        '80001': 'MUMBAI'
    };

    const protocol = {
        '31337': 'ethereum',
        '1447': 'ethereum',
        '4': 'rinkeby',
        '42': 'ethereum',
        '1': 'ethereum',
        '80001': 'polygon'
    };
    console.log('CONFIG: ', protocol[network])

    return {
        dev: true,
        loanRequestABI: loanRequestABI.abi,
        loanRequestAddress: loanRequestConfig.loanRequestAddress,
        transferibles: loanRequestConfig.transferibles,
        erc721: erc721.abi,
        erc1155: erc1155.abi,
        rpcProvider: 'ALCHEMY',
        network: network,
        gasLimit: 100000,
        rpcPort: rpc_port[chainId[network]],
        chainId: chainId[network],
        protocol: protocol[network]
    }
};