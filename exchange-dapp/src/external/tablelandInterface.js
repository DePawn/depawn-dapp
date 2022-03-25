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

    const conn = await connect(options);

    return conn;
}

const formatParams = (params) => {
    // Reformat param values to fit database types
    params.collateral = params.collateral.toLowerCase();
    params.token_id = params.token_id.toString();
    params.table_id = params.table_id.toString();
    params.loan_requested = params.loan_requested !== undefined ? params.loan_requested.toString() : undefined;
    params.loan_number = params.loan_number !== undefined ? params.loan_number.toString() : undefined;
    params.borrower = !!params.borrower ? params.borrower.toLowerCase() : undefined;
    params.lender = !!params.lender ? params.lender.toLowerCase() : undefined;
    params.expiration = !!params.expiration ? params.expiration.toString() : undefined;
    params.initial_loan_value = !!params.initial_loan_value ? params.initial_loan_value.toString() : undefined;
    params.chain = !!params.chain ? params.chain.toLowerCase() : undefined;
    params.contract_statistics = !!params.contract_statistics ? JSON.stringify(params.contract_statistics) : undefined;
    params.metadata = !!params.metadata ? JSON.stringify(params.metadata) : undefined;
    params.symbol = !!params.symbol ? params.symbol.toUpperCase() : undefined;
    params.type = !!params.type ? params.type.toLowerCase() : undefined;
    params.rate = !!params.rate ? params.rate.toString() : undefined;
    params.committed = params.committed !== undefined ? params.committed.toString() : undefined;
    params.borrower_signed = params.borrower_signed !== undefined ? params.borrower_signed.toString() : undefined;
    params.lender_signed = params.lender_signed !== undefined ? params.lender_signed.toString() : undefined;
    params.contract_address = !!params.contract_address ? params.contract_address.toLowerCase() : undefined;
    params.unpaid_balance = params.unpaid_balance !== undefined ? params.unpaid_balance.toString() : undefined;
    params.loan_completed = params.loan_completed !== undefined ? params.loan_completed.toString() : undefined;

    return params;
}

export const insertTableRow = async (tableName, account, params = {
    collateral: undefined,
    token_id: undefined,
    table_id: undefined,
    loan_requested: undefined,
    loan_number: undefined,
    lender: undefined,
    expiration: undefined,
    img_url: undefined,
    initial_loan_value: undefined,
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
    contract_address: undefined,
    unpaid_balance: undefined,
    loan_completed: undefined,
}) => {
    if (!params.collateral || !params.token_id || !params.table_id) {
        console.log('Cannot add row to table. Collateral or Token ID not provided.');
        return;
    }

    params = formatParams(params);

    // Set row values
    let cols =
        `collateral_tokenid_tableid, ` +
        `borrower, ` +
        `${!!params.loan_requested ? "loan_requested, " : ''}` +
        `${!!params.loan_number ? "loan_number, " : ''}` +
        `${!!params.lender ? "lender, " : ''}` +
        `${!!params.expiration ? "expiration, " : ''}` +
        `${!!params.img_url ? "img_url, " : ''}` +
        `${!!params.initial_loan_value ? "initial_loan_value, " : ''}` +
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
        `${!!params.contract_address ? "contract_address, " : ''}` +
        `${!!params.unpaid_balance ? "unpaid_balance, " : ''}` +
        `${!!params.loan_completed ? "loan_completed, " : ''}`;
    cols = cols.slice(0, -2);

    let vals =
        `'${params.collateral}_${params.token_id}_${params.table_id}', ` +
        `'${account.toLowerCase()}', ` +
        `${!!params.loan_requested ? "'" + params.loan_requested + "', " : ''}` +
        `${!!params.loan_number ? "'" + params.loan_number + "', " : ''}` +
        `${!!params.lender ? "'" + params.lender + "', " : ''}` +
        `${!!params.expiration ? "'" + params.expiration + "', " : ''}` +
        `${!!params.img_url ? "'" + params.img_url + "', " : ''}` +
        `${!!params.initial_loan_value ? "'" + params.initial_loan_value + "', " : ''}` +
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
        `${!!params.contract_address ? "'" + params.contract_address + "', " : ''}` +
        `${!!params.unpaid_balance ? "'" + params.unpaid_balance + "', " : ''}` +
        `${!!params.loan_completed ? "'" + params.loan_completed + "', " : ''}`;
    vals = vals.slice(0, -2);

    // Perform update
    console.log('---------: ', tableName);
    const query = `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
    console.log(query)
    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(query);

    return res;
}

export const updateTable = async (tableName, params = {
    collateral: undefined,
    token_id: undefined,
    table_id: undefined,
    loan_requested: undefined,
    loan_number: undefined,
    borrower: undefined,
    lender: undefined,
    expiration: undefined,
    img_url: undefined,
    initial_loan_value: undefined,
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
    contract_address: undefined,
    unpaid_balance: undefined,
    loan_completed: undefined,
}) => {
    if (!params.collateral || !params.token_id) {
        console.log('Cannot update table. Collateral or Token ID not provided.');
        return;
    }

    console.log(!!params.borrower)

    // This doesn't accept a teable_id input. This keeps us from updating old tables.
    params.table_id = !!params.table_id ? params.table_id : await fetchRowCount(tableName, params.collateral, params.token_id);
    params = formatParams(params);

    console.log(!!params.borrower)
    console.log(params)

    // Set row values
    const primaryKey = `collateral_tokenid_tableid='${params.collateral}_${params.token_id}_${params.table_id}'`;
    let updates =
        `${!!params.loan_requested ? "loan_requested='" + params.loan_requested + "', " : ''}` +
        `${!!params.loan_number ? "loan_number='" + params.loan_number + "', " : ''}` +
        `${!!params.borrower ? "borrower='" + params.borrower + "', " : ''}` +
        `${!!params.lender ? "lender='" + params.lender + "', " : ''}` +
        `${!!params.expiration ? "expiration='" + params.expiration + "', " : ''}` +
        `${!!params.img_url ? "img_url='" + params.img_url + "', " : ''}` +
        `${!!params.initial_loan_value ? "initial_loan_value='" + params.initial_loan_value + "', " : ''}` +
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
        `${!!params.contract_address ? "contract_address='" + params.contract_address + "', " : ''}` +
        `${!!params.unpaid_balance ? "unpaid_balance='" + params.unpaid_balance + "', " : ''}` +
        `${!!params.loan_completed ? "loan_completed='" + params.loan_completed + "', " : ''}`;
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

export const fetchRowsWhere = async (tableName, includes, excludes = []) => {
    includes[2][includes[2].length - 1] = '';

    const createStatement = (params, clause) => {
        let statement = '';
        params[0].forEach((col, i) => {
            let vals = params[1][i].reduce(
                (prev, curr) => prev + `'${curr}', `, ''
            );
            vals = `${vals.slice(0, -2)}`;

            statement += `${col} ${clause} (${vals}) ${params[2][i]} `;
        });
        statement = `${statement.slice(0, -2)}`;

        return statement;
    }

    const includesStatement = createStatement(includes, 'IN');
    const excludesStatement = !!excludes.length ? createStatement(excludes, 'NOT IN') : '';
    const query = !!excludes.length
        ? `SELECT * FROM ${tableName} WHERE ${includesStatement} AND ${excludesStatement}`
        : `SELECT * FROM ${tableName} WHERE ${includesStatement}`;

    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(query);
    const cols = res.data.columns;
    const rows = res.data.rows;
    console.log(res)

    const data = rows.map((row) => {
        const elem = {};
        row.forEach((val, i) => elem[cols[i].name] = val);
        [elem.collateral, elem.tokenId, elem.tableId] = elem.collateral_tokenid_tableid.split('_');

        return elem;
    });

    console.log(data)

    return data;
}

export const insertTableEntry = async (tableName, key, val) => {
    const conn = await connectTableland('https://testnet.tableland.network');
    const res = await conn.query(`INSERT INTO ${tableName} VALUES (${key}, '${val}'); `);
    const out = JSON.stringify(res, null, 2);

    return out;
};

export const fetchRowCount = async (tableName, collateral, tokenId) => {
    const conn = await connectTableland('https://testnet.tableland.network');
    const query = `SELECT COUNT('collateral_tokenid_tableid') from ${tableName} WHERE collateral_tokenid_tableid LIKE '${collateral}_${tokenId}_%';`;
    const res = await conn.query(query);

    return res.data.rows[0][0];
}

export const createTable = async (tableName) => {
    const cols =
        'collateral_tokenid_tableid text, ' +
        'loan_requested bool, ' +
        'loan_number text, ' +
        'borrower text, ' +
        'lender text, ' +
        'expiration text, ' +
        'img_url text, ' +
        'initial_loan_value text, ' +
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
        'unpaid_balance text, ' +
        'loan_completed bool';

    const query = `CREATE TABLE ${tableName} (${cols}, primary key(collateral_tokenid_tableid)); `;
    console.log(query);

    const conn = await connect({ network: 'testnet' });
    const tbl = await conn.create(query);
    console.log(tbl);

    return tbl;
}