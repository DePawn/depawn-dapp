import logo from './logo.svg';
import './App.css';

import React, { useEffect, useMemo } from "react";
import getProvider from './dapp-utils/getProvider';
import { ethers } from 'ethers';
import { SafeInfo } from '@gnosis.pm/safe-apps-sdk';
import { EthersAdapter } from '@gnosis.pm/safe-core-sdk';
import SafeAppsSDK from '@gnosis.pm/safe-apps-sdk';
import { BaseTransaction } from '@gnosis.pm/safe-apps-sdk'

import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import { SafeAppProvider } from '@gnosis.pm/safe-apps-provider';

const OWNER1_PUBLIC_KEY = '0xe67b33D7C5ff1Db9Bb12e5672c49Db3eEB87f3c6';

const appsSdk = new SafeAppsSDK();
// console.log('appsSdk: ', appsSdk);

const onSafeInfo = (safeInfo) => {
  console.log('safeInfo: ', safeInfo);
};

const onTransactionConfirmation = ({ requestId, safeTxHash }) => {
  console.log('requestId (CONFIRM): ', requestId);
  console.log('safeTxHash (CONFIRM): ', safeTxHash);
};

const onTransactionReject = ({ requestId }) => {
  console.log('requestId (FAIL): ', requestId);
};

// appsSdk.addListeners({
//   onSafeInfo,
//   onTransactionConfirmation,
//   onTransactionReject,
// });


function App() {
  const { sdk, safe } = useSafeAppsSDK();
  const provider = useMemo(() => new ethers.providers.Web3Provider(new SafeAppProvider(safe, sdk)), [sdk, safe]);

  console.log(provider);
  console.log('SAFE: ', safe);

  const doStuffProvider = async () => {
    const owner1 = provider.getSigner(OWNER1_PUBLIC_KEY)
    console.log(await owner1.getAddress());

    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1
    });
  }

  const doStuffReact = async () => {
    const tx = [{
      to: '0x2D35bD9BEC501955e82437c1A96e4bAade2b8eeb',
      value: '10',
      data: ''
    }]

    const safeTxHash = await sdk.txs.send({ tx });
  }

  const doStuffCore = async () => {
    const owner0 = provider.getSigner(OWNER1_PUBLIC_KEY);
    console.log(await owner0.getAddress());

    const ethAdapterOwner0 = new EthersAdapter({
      ethers,
      signer: owner0
    });
  }

  const doStuffApps = async () => {
    const owner0 = provider.getSigner(OWNER1_PUBLIC_KEY);
    const owner0Address = await owner0.getAddress();

    const opts = {
      allowedDomains: [/gnosis-safe.io/],
    };

    const appsSdk = new SafeAppsSDK(opts);
    console.log(await appsSdk.eth.getBalance());

    const balance = await appsSdk.eth.getBalance([owner0Address]);
    console.log('BALANCE: ', balance);

    // const safe = await appsSdk.safe.getInfo();
    // const safe = await appsSdk.safe.experimental_getBalances({ currency: 'rub' });
    console.log('INFO: ');
  }

  useEffect(() => {
    doStuffReact()
  }, [])

  // const { sdk, connected, safe } = useSafeAppsSDK();

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div>Hi{safe.safeAddress}</div>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
