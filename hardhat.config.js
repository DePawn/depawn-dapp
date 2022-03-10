require('dotenv').config();
require("@nomiclabs/hardhat-waffle");


module.exports = {
  solidity: "0.8.5",
  paths: {
    artifacts: './dapp/artifacts'
  },
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_PINNED_BLOCK_FORK,
        blockNumber: 14343332
      }
    },
    /*
    localhost: {
      url: `http://127.0.0.1:${RPC_PORT.GANACHE}`,
    },
    rinkeby: {
      url: process.env.ALCHEMY_RINKEBY_URL,
      accounts: [privateKey],
    },
    kovan: {
      url: process.env.ALCHEMY_KOVAN_URL,
      accounts: [privateKey],
    }
    */
  }
};
