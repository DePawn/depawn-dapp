/*
 *  NFT Port Api interace (https://docs.nftport.xyz/docs/nftport) for reading
 *  account NFTs and NFT metadata.
 */
import { config } from '../utils/config';
import env from 'react-dotenv';
import axios from 'axios';

export const fetchAccountNfts = async (account, network) => {
    if (!account || !network) return {};

    const { dev, protocol } = config(network);

    /* DEV ONLY */
    if (dev) {
        await fetchNftData([], network);
    }
    else {
        // Get NFT metadata
        const metaOptions = {
            method: 'GET',
            url: `https://api.nftport.xyz/v0/accounts/${account}`,
            params: {
                chain: protocol,
                include: 'metadata',
                page_size: '25'
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.NFT_PORT_KEY
            }
        };
        const nftMetaResponse = await axios.request(metaOptions);

        // Get NFT Contract information
        const contractOptions = {
            method: 'GET',
            url: `https://api.nftport.xyz/v0/accounts/${account}`,
            params: {
                chain: protocol,
                // exclude: 'erc1155',
                include: 'contract_information',
                page_size: '25'
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.NFT_PORT_KEY
            }
        };
        const nftContractResponse = await axios.request(contractOptions);
        nftMetaResponse.data.nfts.forEach((nft, i) => {
            nft.contract = nftContractResponse.data.nfts[i].contract;
        });

        return nftMetaResponse.data;
    }
}

export const fetchNftData = async (nfts, network) => {
    let { devFront, protocol, transferibles } = config(network);

    // If nfts is passed as empty and in dev mode, swap to dev nfts
    if (!!nfts && devFront) [nfts, transferibles] = [transferibles, nfts];
    if (!!nfts && !devFront) return [];

    // Get NFT metadata
    const nftMetaResponse = {
        data: []
    };

    for (let nft of nfts) {
        let metaOptions = {
            method: 'GET',
            url: `https://api.nftport.xyz/v0/nfts/${nft.nft}/${nft.tokenId}`,
            params: { chain: protocol },
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.NFT_PORT_KEY
            }
        };

        let metaResponse = await axios.request(metaOptions);
        nftMetaResponse.data.push({ ...metaResponse.data.nft, ...metaResponse.data.contract });
    }

    // Set state variable only when nfts is passed as []
    [nfts, transferibles] = [transferibles, nfts];

    return nftMetaResponse.data;
}

export const fetchContractData = async (contracts, network) => {
    let { protocol } = config(network);

    // Get contract metadata
    const contractMetaResponse = [];

    for (let contract of contracts) {
        const metaOptions = {
            method: 'GET',
            url: `https://api.nftport.xyz/v0/transactions/stats/${contract}`,
            params: { chain: protocol },
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.NFT_PORT_KEY
            }
        };

        let metaResponse = await axios.request(metaOptions);
        contractMetaResponse.push(metaResponse.data.statistics);
    }

    return contractMetaResponse;
}