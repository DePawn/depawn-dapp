import env from 'react-dotenv';
import fs from 'fs';
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

    const conn = await connect(options);

    return conn;
}

const formatParams = (params) => {
    // Reformat param values to fit database types
    params.collateral = params.collateral.toLowerCase();
    params.token_id = params.token_id.toString();
    params.duration = !!params.duration ? params.duration.toString() : undefined;
    params.initialLoanValue = !!params.initialLoanValue ? params.initialLoanValue.toString() : undefined;
    params.contract_statistics = !!params.contract_statistics ? JSON.stringify(params.contract_statistics) : undefined;
    params.metadata = !!params.metadata ? JSON.stringify(params.metadata) : undefined;
    params.rate = !!params.rate ? params.rate.toString() : undefined;
    params.committed = params.committed !== undefined ? params.committed.toString() : undefined;
    params.borrower_signed = params.borrower_signed !== undefined ? params.borrower_signed.toString() : undefined;
    params.lender_signed = params.lender_signed !== undefined ? params.lender_signed.toString() : undefined;

    return params;
}

export const insertTableRow = async (tableName, account, params = {
    collateral: undefined,
    token_id: undefined,
    lender: undefined,
    duration: undefined,
    imgUrl: undefined,
    initialLoanValue: undefined,
    chain: undefined,
    contract_statistics: undefined,
    metadata: undefined,
    mint_date: undefined,
    name: undefined,
    symbol: undefined,
    type: undefined,
    rate: undefined,
    committed: undefined,
    borrower_signed: undefined,
    lender_signed: undefined,
    contract_address: undefined
}) => {
    if (!params.collateral || !params.token_id) {
        console.log('Cannot add row to table. Collateral or Token ID not provided.');
        return;
    }

    params = formatParams(params);

    // Set row values
    let cols =
        `collateral_tokenid, ` +
        `borrower, ` +
        `${!!params.lender ? "lender, " : ''}` +
        `${!!params.duration ? "duration, " : ''}` +
        `${!!params.imgUrl ? "imgUrl, " : ''}` +
        `${!!params.initialLoanValue ? "initialLoanValue, " : ''}` +
        `${!!params.chain ? "chain, " : ''}` +
        `${!!params.contract_statistics ? "contract_statistics, " : ''}` +
        `${!!params.metadata ? "metadata, " : ''}` +
        `${!!params.mint_date ? "mint_date, " : ''}` +
        `${!!params.name ? "name, " : ''}` +
        `${!!params.symbol ? "symbol, " : ''}` +
        `${!!params.type ? "type, " : ''}` +
        `${!!params.rate ? "rate, " : ''}` +
        `${!!params.committed ? "committed, " : ''}` +
        `${!!params.borrower_signed ? "borrower_signed, " : ''}` +
        `${!!params.lender_signed ? "lender_signed, " : ''}` +
        `${!!params.contract_address ? "contract_address, " : ''}`;
    cols = cols.slice(0, -2);

    let vals =
        `'${params.collateral}_${params.token_id}', ` +
        `'${account}', ` +
        `${!!params.lender ? "'" + params.lender + "', " : ''}` +
        `${!!params.duration ? "'" + params.duration + "', " : ''}` +
        `${!!params.imgUrl ? "'" + params.imgUrl + "', " : ''}` +
        `${!!params.initialLoanValue ? "'" + params.initialLoanValue + "', " : ''}` +
        `${!!params.chain ? "'" + params.chain + "', " : ''}` +
        `${!!params.contract_statistics ? "'" + params.contract_statistics + "', " : ''}` +
        `${!!params.metadata ? "'" + params.metadata + "', " : ''}` +
        `${!!params.mint_date ? "'" + params.mint_date + "', " : ''}` +
        `${!!params.name ? "'" + params.name + "', " : ''}` +
        `${!!params.symbol ? "'" + params.symbol + "', " : ''}` +
        `${!!params.type ? "'" + params.type + "', " : ''}` +
        `${!!params.rate ? "'" + params.rate + "', " : ''}` +
        `${!!params.committed ? params.committed + ", " : ''}` +
        `${!!params.borrower_signed ? params.borrower_signed + ", " : ''}` +
        `${!!params.lender_signed ? params.lender_signed + ", " : ''}` +
        `${!!params.contract_address ? "'" + params.contract_address + "', " : ''}`;
    vals = vals.slice(0, -2);

    // Perform update
    const query = `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(query);

    return res;
}

export const updateTable = async (tableName, account, params = {
    collateral: undefined,
    token_id: undefined,
    lender: undefined,
    duration: undefined,
    imgUrl: undefined,
    initialLoanValue: undefined,
    chain: undefined,
    contract_statistics: undefined,
    metadata: undefined,
    mint_date: undefined,
    name: undefined,
    symbol: undefined,
    type: undefined,
    rate: undefined,
    committed: undefined,
    borrower_signed: undefined,
    lender_signed: undefined,
    contract_address: undefined
}) => {
    if (!params.collateral || !params.token_id) {
        console.log('Cannot update table. Collateral or Token ID not provided.');
        return;
    }

    params = formatParams(params);

    // Set row values
    const primaryKey = `collateral_tokenid='${params.collateral}_${params.token_id}'`;
    let updates =
        `borrower='${account}', ` +
        `${!!params.lender ? "lender='" + params.lender + "', " : ''}` +
        `${!!params.duration ? "duration='" + params.duration + "', " : ''}` +
        `${!!params.imgUrl ? "imgUrl='" + params.imgUrl + "', " : ''}` +
        `${!!params.initialLoanValue ? "initialLoanValue='" + params.initialLoanValue + "', " : ''}` +
        `${!!params.chain ? "chain='" + params.chain + "', " : ''}` +
        `${!!params.contract_statistics ? "contract_statistics='" + params.contract_statistics + "', " : ''}` +
        `${!!params.metadata ? "metadata='" + params.metadata + "', " : ''}` +
        `${!!params.mint_date ? "mint_date='" + params.mint_date + "', " : ''}` +
        `${!!params.name ? "name='" + params.name + "', " : ''}` +
        `${!!params.symbol ? "symbol='" + params.symbol + "', " : ''}` +
        `${!!params.type ? "type='" + params.type + "', " : ''}` +
        `${!!params.rate ? "rate='" + params.rate + "', " : ''}` +
        `${!!params.committed ? "committed=" + params.committed + ", " : ''}` +
        `${!!params.borrower_signed ? "borrower_signed=" + params.borrower_signed + ", " : ''}` +
        `${!!params.lender_signed ? "lender_signed=" + params.lender_signed + ", " : ''}` +
        `${!!params.contract_address ? "contract_address='" + params.contract_address + "', " : ''}`;
    updates = updates.slice(0, -2);

    // Perform update
    const query = `UPDATE ${tableName} SET ${updates} WHERE ${primaryKey};`;
    console.log(query);

    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(query);
    console.log(res);

    return res;
}

export const fetchAllTables = async (account) => {
    const res = await fetch(`https://testnet.tableland.network/tables/controller/${account}`);
    const out = JSON.stringify(await res.json(), null, 2);
    return out;
}

export const fetchTable = async (tableName) => {
    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(`SELECT * FROM ${tableName};`);
    const out = JSON.stringify(res, null, 2);

    return out;
};

export const insertTableEntry = async (tableName, key, val) => {
    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(`INSERT INTO ${tableName} VALUES (${key}, '${val}');`);
    const out = JSON.stringify(res, null, 2);

    return out;
};

export const createTable = async (tableName) => {
    const cols =
        'collateral_tokenId text, ' +
        'borrower text, ' +
        'lender text, ' +
        'duration text, ' +
        'imgUrl text, ' +
        'initialLoanValue text, ' +
        'chain text, ' +
        'contract_statistics json, ' +
        'metadata json, ' +
        'mint_date text, ' +
        'name text, ' +
        'symbol text, ' +
        'type text, ' +
        'rate text, ' +
        'committed bool, ' +
        'borrower_signed bool, ' +
        'lender_signed bool, ' +
        'contract_address text, ' +
        'unpaid_balance text';

    const query = `CREATE TABLE ${tableName} (${cols}, primary key (collateral_tokenId));`;
    console.log(query);

    const conn = await connect({ network: 'testnet' });
    const tbl = await conn.create(query);
    console.log(tbl);

    fs.writeFileSync('../static/tableland/tableland_depawn.json', JSON.stringify({ tableName: tbl }, null, 2))

    return tbl;
}