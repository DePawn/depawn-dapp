require('dotenv').config();
require("@nomiclabs/hardhat-waffle");

const { NETWORK } = require('./utils/config');

console.log(`running network ${NETWORK}`);

module.exports = {
  solidity: "0.8.5",
  paths: {
    artifacts: `./exchange-dapp/src/artifacts/${NETWORK}`,
  },
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.MNEMONIC
      },
      gas: 12000000,
      //allowUnlimitedContractSize: true,
      forking: {
        chainId: 31337,
        url: process.env.ALCHEMY_MAINNET_URL,
        blockNumber: 14407300 //14343332 // Jason's 14407300 doesn't work :(
      }
    }
  }
};