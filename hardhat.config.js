require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
const Web3Wallet = require('./utils/Web3Wallet');
const { RPC_PROVIDER, NETWORK, CHAINID, RPC_PORT } = require('./utils/config');

// Get private key
/*
const web3Wallet = new Web3Wallet({
  mnemonic: process.env.MNEMONIC,
  rpcProvider: RPC_PROVIDER,
  network: CHAINID[NETWORK],
  numberOfWallets: 1,
});

const privateKey = web3Wallet.bip44Wallet[0][0].privateKey;
*/

module.exports = {
  solidity: "0.8.5",
  paths: {
    artifacts: `./exchange-dapp/src/artifacts/${NETWORK}`,
  },
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_MAINNET_URL,
        blockNumber: 14343332
      }
    },

    
  }
};
