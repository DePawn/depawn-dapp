import { ethers } from 'ethers';
import { CHAINID, RPC_PORT } from './config';


export default function getProvider() {
    const { ethereum } = window;
    const network = CHAINID[parseInt(ethereum.chainId, 16).toString()]

    let provider;
    switch (network) {
        case CHAINID['1447']:
            // GANACHE
            const url = `http://127.0.0.1:${RPC_PORT.GANACHE}`;
            provider = new ethers.providers.JsonRpcProvider(url);
            break;
        case CHAINID['4']:
        case CHAINID['42']:
            // RINKEBY / KOVAN
            provider = new ethers.providers.Web3Provider(ethereum);
            break;
        default:
            provider = new ethers.providers.Web3Provider(ethereum);
            break;
    }

    return provider;
};