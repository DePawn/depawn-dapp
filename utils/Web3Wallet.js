// @ts-nocheck

require('dotenv').config({ path: '../.env' })

const Ganache = require('ganache-core');
const { utils, Wallet, ethers:
    {
        getDefaultProvider,
        providers: {
            JsonRpcProvider,
            Web3Provider,
            AlchemyProvider,
            EtherscanProvider
        }
    }
} = require('ethers');

const { RPC_PROVIDER, NETWORK, RPC_PORT } = require('./config');

/**
 * Object containing Web3Wallet input parameters.
 * 
 * @typedef {Object} WalletParamsObj
 * @property {string} [mnemonic] The mnemonic to derive the wallet accounts from.
 * @property {string} [network] The Ethereum network.
 * @property {string} [rpcPort] The JSON-RPC node port.
 * @property {string} [balance] The balance(s) of the Ethereum account(s) derived from the 
 * mnemonic.
 * @property {number} [numberOfWallets] The number of accounts to make.
 */

/**
 * An array of BIP4 wallet(s) and their associated balance(s).
 * 
 * @typedef {Array.<Array.<Wallet>, Array.<string>>} BIP44WalletArray
 * @see {@link getBIP44Wallet}
 */

/**
 * A private/public key pair.
 * 
 * @typedef {Object} KeyPair
 * @property {Array.<string>} pubKeys The array of public keys in hex form.
 * @property {Array.<string>} prvKeys The array of private keys in hex form.
 * @see {@link getKeyPairs}
 */

/**
 * Class to create a mnemonic derived wallet and query and/or set balances.
 */
class Web3Wallet {
    #mnemonic;
    #rpcProvider;
    #network;
    #rpcPort;
    #balance;
    #numberOfWallets;
    #provider;
    #bip44Wallet;

    /**
     * @param {WalletParamsObj} [walletParamsObj] The input parameter object for building the
     * Web3 wallet.
     */
    constructor(
        walletParamsObj = {
            mnemonic: process.env.MNEMONIC,
            rpcProvider: RPC_PROVIDER,
            network: NETWORK,
            rpcPort: RPC_PORT.GANACHE,
            balance: '100',
            numberOfWallets: 10
        },
        verbose = false
    ) {
        /**
         * @property {string} [mnemonic] The mnemonic to derive the wallet accounts from.
         * @property {string} [network] The Ethereum network.
         * @property {string} [rpcPort] The JSON-RPC node port.
         * @property {string} [balance] The balance(s) of the Ethereum account(s) derived
         * from the mnemonic.
         * @property {number} [numberOfWallets] The number of accounts to make.
         * @property {JsonRpcProvider|Web3Provider|AlchemyProvider} [provider] The JSON-RPC
         * node provider.
         * @property {Promise<BIP44WalletArray>} [bip44Wallet] The BIP44 wallet and
         * associated balances.
         */
        this.#mnemonic = walletParamsObj?.mnemonic ? walletParamsObj.mnemonic : process.env.MNEMONIC;
        this.#rpcProvider = walletParamsObj?.rpcProvider ? walletParamsObj.rpcProvider : RPC_PROVIDER;
        this.#network = walletParamsObj?.network ? walletParamsObj.network : NETWORK;
        this.#rpcPort = walletParamsObj?.rpcPort ? walletParamsObj.rpcPort : RPC_PORT.GANACHE;
        this.#balance = walletParamsObj?.balance ? walletParamsObj.balance.toString() : '100';
        this.#numberOfWallets = walletParamsObj?.numberOfWallets ? parseInt(walletParamsObj.numberOfWallets) : 10;
        this.#provider;
        this.#bip44Wallet;
        this.verbose = verbose;

        this.getBIP44Wallet();
    }

    get mnemonic() { return this.#mnemonic; }
    get rpcProvider() { return this.#rpcProvider; }
    get network() { return this.#network; }
    get rpcPort() { return this.#rpcPort; }
    get balance() { return this.#balance; }
    get numberOfWallets() { return this.#numberOfWallets; }
    get provider() { return this.#provider; }
    get bip44Wallet() { return this.#bip44Wallet; }

    set rpcProvider(_rpcProvider) {
        this.#rpcProvider = _rpcProvider;
        this.#resetProvider();
    }

    set network(_network) {
        this.#network = _network;
        this.#resetProvider();
    }

    set rpcPort(_rpcPort) {
        this.#rpcPort = _rpcPort;
        this.#resetProvider();
    }

    set balance(_balance) {
        this.#balance = _balance.toString();
        this.#resetProvider();
    }

    set numberOfWallets(_numberOfWallets) {
        this.#numberOfWallets = _numberOfWallets;
        this.#resetProvider();
    }

    #resetProvider() {
        this.#provider = null;
        this.getBIP44Wallet();
    }

    /**
     * @property {Function} getRpcNodeProvider returns the ALCHEMY RPC node key for the
     * [network](network).
     * @returns {string} The ALCHEMY RPC node key for the [network](#network).
     */
    #getRpcNodeProvider = () => process.env[`${this.#rpcProvider}_${this.#network}_KEY`];

    /**
     * @property {Function} setProvider Set a JSON-RPC node provider per the set
     * [network](#network).
     * @param {Array<string>} [addresses] Required for [network](#network)='GANACHE_CORE'. An
     * array of addresses. The address(es) should be derived from the mnemonic.
     * @returns void
     */
    #setProvider = (addresses = []) => {
        let _key;

        switch (this.#network.toUpperCase()) {
            case ('GANACHE'):
                this.#consoleLog('USING GANACHE PROVIDER')
                const _url = `http://127.0.0.1:${this.#rpcPort}`;
                this.#provider = new JsonRpcProvider(_url);
                return;
            case ('GANACHE_CORE'):
                this.#consoleLog('USING GANACHE_CORE PROVIDER')
                if (addresses === []) {
                    this.#provider = null;
                }
                else {
                    const _accounts = addresses.map(address => {
                        return {
                            secretKey: Buffer.from(address, 'hex'),
                            balance: utils.parseEther(this.#balance).toString(),
                        }
                    })

                    this.#provider = new Web3Provider(
                        Ganache.provider({ accounts: _accounts, default_balance_ether: this.#balance })
                    );
                }
                return;
        }

        switch (this.#rpcProvider.toUpperCase()) {
            case ('ALCHEMY'):
                this.#consoleLog(`USING ${this.#rpcProvider} PROVIDER`)
                _key = this.#getRpcNodeProvider();
                this.#provider = new AlchemyProvider(this.#network.toLowerCase(), _key);
                return;
            case ('POCKET'):
                this.#consoleLog(`USING ${this.#rpcProvider} PROVIDER`)
                const _network = this.#network.toLowerCase();
                const _rpcProvider = this.#rpcProvider.toLowerCase();
                _key = this.#getRpcNodeProvider();

                this.#provider = new getDefaultProvider(
                    _network,
                    { _rpcProvider: _key }
                );
                return;
        }
    }

    /**
     * @property {Function} printKeyPairs Print out the public and private key pairs along with
     * the associated balances in ETH.
     * @see getBIP44Wallet
     * @returns void
     */
    printKeyPairs = () => {
        const [_wallets, _balances] = this.#bip44Wallet;

        console.log('Available Accounts\n==================');
        _wallets.forEach((_, i) => console.log(`(${i}) ${_wallets[i].address} (${_balances[i]} ETH)`))

        console.log('\nPrivate Keys\n==================');
        _wallets.forEach((_, i) => console.log(`(${i}) ${_wallets[i].privateKey}`))
        console.log();
    }

    /**
     * @property {Function} getBIP44Wallet Get an array of BIP4 wallet(s) and their
     * associated balance(s).
     * @see setProvider
     * @returns void
     */
    getBIP44Wallet = async () => {
        try {
            const _path = (step) => `m/44'/60'/0'/0/${step}`;
            const _wallet = [];
            const _balances = [];
            let _account;
            let _balance;

            for (let i = 0; i < this.#numberOfWallets; i++) {
                _account = Wallet.fromMnemonic(this.#mnemonic, _path(i));

                this.#setProvider(
                    [_account.privateKey.substring(2)], this.#network, this.#balance
                );

                _account = new Wallet(_account.privateKey, this.#provider);

                _wallet.push(_account);
            }

            // Do this after just to be sure.
            _wallet.forEach(async (w) => {
                _balance = parseFloat(utils.formatEther(
                    await w.getBalance()
                )).toString();

                _balances.push(_balance);
            });

            this.#bip44Wallet = [_wallet, _balances];
        }
        catch (err) {
            console.log('ERROR: ', err);
            process.exit(1);
        }
    }

    /**
     * @property {Function} getPrivateKeys Get an array of the private keys derived from the 
     * mnemonic.
     * @see getBIP44Wallet
     * @returns {Promise<Array.<string>>} An array of the private keys.
     */
    getPrivateKeys = async () => {
        const [_wallet, _] = this.#bip44Wallet;

        const _privateKeys = [];
        _wallet.forEach(_account => _privateKeys.push(_account.privateKey))

        this.#consoleLog(_privateKeys)

        return _privateKeys
    }

    /**
     * @property {Function} getPublicKeys Get an array of the public keys derived from the 
     * mnemonic.
     * @see getBIP44Wallet
     * @returns {Promise<Array.<string>>} An array of the public keys.
    */
    getPublicKeys = async () => {
        const [_wallet, _] = this.#bip44Wallet;

        const _publicKeys = [];
        _wallet.forEach(_account => _publicKeys.push(_account.address))

        return _publicKeys
    }

    /**
     * @property {Function} getKeyPairs Get the private/public key pairs derived from the 
     * mnemonic. The number of key pairs returned will be set by numberOfWallets.
     * @see getBIP44Wallet
     * @returns {Promise.<KeyPair>} keyPairs An array of arrays of both private and public  key 
     * pairs derived from the mnemonic using [getBIP44Wallet](#getBIP44Wallet).
    */
    getKeyPairs = async () => {
        const [_wallet, _] = this.#bip44Wallet;

        const _keyPairs = {
            pubKeys: [],
            prvKeys: []
        };

        _wallet.forEach(_account => {
            _keyPairs.pubKeys.push(_account.address);
            _keyPairs.prvKeys.push(_account.privateKey);
        });

        return _keyPairs
    }

    #consoleLog = (...params) => {
        if (this.verbose) { console.log(...params); }
    }
}

module.exports = Web3Wallet;