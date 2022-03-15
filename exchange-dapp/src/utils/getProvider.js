import { ethers } from 'ethers';

export default function getProvider() {
    const { ethereum } = window;
    const network = parseInt(ethereum.chainId, 16).toString()

    let provider;
    switch (network) {
        case '1447':
            // GANACHE
            const url = `http://127.0.0.1:8555`;
            provider = new ethers.providers.JsonRpcProvider(url);
            break;
        case '31337':
            // HARDHAT
            provider = new ethers.providers.Web3Provider(ethereum);
            break;
        case '4':
        case '42':
            // RINKEBY / KOVAN
            provider = new ethers.providers.Web3Provider(ethereum);
            break;
        default:
            provider = new ethers.providers.Web3Provider(ethereum);
            break;
    }

    return provider;
};