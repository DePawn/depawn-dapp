import './App.css';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from './utils/getProvider';
import { networks } from './utils/networks';
import config from './utils/config';

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [nftAddress, setNftAddress] = useState('');
  const [loanValue, setLoanValue] = useState('');
  const [loanRate, setLoanRate] = useState('');
  const [loanDuration, setLoanDuration] = useState('');
  const [loanLender, setLoanLender] = useState('');

  /*
   * Connect Wallet Callback
   */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask -> https://metamask.io/');
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Connected to account: ', accounts[0]);
      setCurrentAccount(accounts[0]);

      ethereum.on('accountsChanged', async (_) => {
        await checkIfWalletIsConnected();
      });
    }
    catch (err) {
      console.log(err);
    }
  }

  /*
   * Connect Wallet State Change Function
   */
  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log('Make sure you have MetaMask!');
      return;
    }
    else {
      console.log('We have the ethereum object: ', ethereum);
    }

    // Check for an authorized account
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const account = accounts.length !== 0 ? accounts[0] : null;

    if (!!account) {
      console.log('Found an authorized account: ', account);
      setCurrentAccount(account);
    }
    else {
      console.log('No authorized account found :(');
      setCurrentAccount(null)
    }

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    setCurrentNetwork(parseInt(chainId, 16).toString());

    ethereum.on('chainChanged', handleChainChanged);

    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  }

  const setLoanRequestListeners = async (account) => {
    // Get contract
    console.log(currentAccount)
    const provider = getProvider();
    const borrower = provider.getSigner(account);

    const { loanRequestAddress, loanRequestABI } = await config(currentNetwork);
    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );

    // Set loan request listener
    loanRequestContract.on('DeployedLoanContract', async (_contract, _borrower, _lender) => {
      console.log('CONTRACT DEPLOYED!');
      console.log('contract: ', _contract);
      console.log('borrower: ', _borrower);
      console.log('lender: ', _lender);
    });
  }

  const getSubAddress = (addrStr) => {
    return `${addrStr.slice(0, 5)}...${addrStr.slice(-4)}`;
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  /*
   * Submit Loan Request Callback
   * 
   * If all loan components are set and borrower and lender have signed off,
   * this loan request will generate a loan contract.
   * 
   */
  const submitLoanRequest = async () => {
    // Get input values
    const nft = document.getElementById('input-nft').value;
    const initialLoanValue = ethers.BigNumber.from(document.getElementById('input-initial-value').value);
    const rate = ethers.BigNumber.from(document.getElementById('input-rate').value);
    const duration = ethers.BigNumber.from(document.getElementById('input-duration').value);
    const lenderAddress = document.getElementById('input-lender').value;

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(currentAccount);
    const lender = provider.getSigner(lenderAddress);
    const borrowerAddress = await borrower.getAddress();

    const { loanRequestAddress, loanRequestABI } = await config(currentNetwork);
    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );
    await setLoanRequestListeners();

    // Create loan request
    const borrowerLoans = await loanRequestContract.getLoans(borrowerAddress);
    const loanId = ethers.BigNumber.from(borrowerLoans.length.toString());
    let tx = await loanRequestContract.createLoanRequest(
      nft,
      initialLoanValue,
      rate,
      duration,
      lenderAddress
    );

    // Signoff and create new contract
    tx = await loanRequestContract.connect(lender).sign(borrowerAddress, loanId);
    let receipt = await tx.wait();
    let events = receipt.events.map(ev => ev.event);

    console.log(events);

    // Set state variables
    setNftAddress(nft);
    setLoanValue(initialLoanValue.toNumber());
    setLoanRate(rate.toNumber());
    setLoanDuration(duration.toNumber());
    setLoanLender(lenderAddress);
  }

  return (
    <div className="App">
      <div>
        <h1>DePawn</h1>
        {currentAccount
          ? (<div className="button button-connected-account">{getSubAddress(currentAccount)}</div>)
          : (<div className="button button-connect-wallet" onClick={connectWallet}>Connect Wallet</div>)
        }

        <div className="container">
          <h2>Loan Requests</h2>
          <div className="container-loan-request">

            <div className="container-loan-request-component">
              <div className="label label-nft">NFT:</div>
              <input type="string" id="input-nft" className="input input-loan-request input-nft" placeholder='NFT Address...' defaultValue="0xB3010C222301a6F5479CAd8fAdD4D5C163FA7d8A"></input>
            </div>

            <div className="container-loan-request-component">
              <div className="label label-value">Amount:</div>
              <input type="string" id="input-initial-value" className="input input-loan-request input-initial-value" placeholder='Loan Value (ETH)...' defaultValue="10000"></input>
            </div>

            <div className="container-loan-request-component">
              <div className="label label-rate">Rate:</div>
              <input type="string" id="input-rate" className="input input-loan-request input-rate" placeholder='Rate...' defaultValue="1"></input>
            </div>

            <div className="container-loan-request-component">
              <div className="label label-duration">Duration:</div>
              <input type="string" id="input-duration" className="input input-loan-request input-duration" placeholder='Duration (months)...' defaultValue="36"></input>
            </div>

            <div className="container-loan-request-component">
              <div className="label label-lender">Lender:</div>
              <input type="string" id="input-lender" className="input input-loan-request input-lender" placeholder='Lender...' defaultValue="0x2D35bD9BEC501955e82437c1A96e4bAade2b8eeb"></input>
            </div>

            <div className="container-loan-request-create">
              <div className="button button-loan-request button-loan-request-create" onClick={submitLoanRequest}>Create Request</div>
            </div>

          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
