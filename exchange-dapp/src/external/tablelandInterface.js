import env from 'react-dotenv';

import { Wallet } from "ethers";
import fetch from "node-fetch";
import { connect } from "@tableland/sdk";

const connectTableland = async (url) => {
    const privateKey = env.PRIVATE_KEY;

    let options = {};
    options.signer = new Wallet(privateKey, {
        getNetwork: async () => {
            return {
                name: "rinkeby",
                chainId: 4,
            };
        },
        _isProvider: true,
    });
    options.host = url;

    const tbl = await connect(options);

    return tbl;
}

export const fetchAllTables = async (account) => {
    const res = await fetch(`https://testnet.tableland.network/tables/controller/${account}`);
    console.log(res)
    const out = JSON.stringify(await res.json(), null, 2);
    return out;
}

export const fetchTable = async (tableName) => {
    const tbl = await connectTableland('https://testnet.tableland.network');
    const res = await tbl.query(`SELECT * FROM ${tableName};`);
    const out = JSON.stringify(res, null, 2);

    return out;
};

export const insertTableEntry = async (tableName, key, val) => {
    const tbl = await connectTableland('https://testnet.tableland.network');
    const res = await tbl.query(`INSERT INTO ${tableName} VALUES (${key}, '${val}');`);
    const out = JSON.stringify(res, null, 2);

    return out;
};