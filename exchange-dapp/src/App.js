import './App.css';
import LoanRequestForm from './components/LoanRequestForm';
import ExistingLoansForm from './components/ExistingLoansForm';

import React, { useEffect, useState } from 'react';
import env from 'react-dotenv';
import { ethers } from 'ethers';
import getProvider from './utils/getProvider';
import { config } from './utils/config.js';
import { getSubAddress } from './utils/addressUtils';
import { assert } from 'chai';

const DEFAULT_LOAN_REQUEST_PARAMETERS = {
  defaultNft: '0xB3010C222301a6F5479CAd8fAdD4D5C163FA7d8A',
  defaultTokenId: '7',
  defaultInitialLoanValue: '3.2',
  defaultRate: '0.02',
  defaultDuration: '24'
}

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [currentNftAddress, setCurrentNftAddress] = useState('');
  const [currentTokenId, setCurrentTokenId] = useState('');
  const [currentLoanValue, setCurrentLoanValue] = useState('');
  const [currentLoanRate, setCurrentLoanRate] = useState('');
  const [currentLoanDuration, setCurrentLoanDuration] = useState('');
  // eslint-disable-next-line
  const [currentLoanLender, setCurrentLoanLender] = useState('');
  // eslint-disable-next-line
  const [currentAccountLoans, setCurrentAccountLoans] = useState('');
  const [existingLoanElements, setExistingLoanElements] = useState('');

  useEffect(() => {
    checkIfWalletIsConnected()
  }, []);

  useEffect(() => {
    getAccountLoanRequests();
    // eslint-disable-next-line
  }, [
    currentAccount,
    currentNetwork,
    currentNftAddress,
    currentTokenId,
    currentLoanValue,
    currentLoanRate,
    currentLoanDuration,
    currentLoanLender
  ]);

  useEffect(() => {
    renderExistingLoanElements();
    // eslint-disable-next-line
  }, [currentAccountLoans]);

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

    let chainId = await ethereum.request({ method: 'eth_chainId' });
    chainId = parseInt(chainId, 16).toString();
    setCurrentNetwork(chainId);

    console.log('Current chain ID: ', chainId);
    ethereum.on('chainChanged', handleChainChanged);

    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  }

  const setLoanRequestListeners = async (loanRequestContract) => {
    // Set loan request listener
    loanRequestContract.on('SubmittedLoanRequest', async () => {
      await getAccountLoanRequests();
      console.log('LISTENER TRIGGERED!')
    });
  }

  /*
   * Get all loan request parameters for each loan submitted by user.
   */
  const getAccountLoanRequests = async () => {
    if (currentAccount === '' || currentNetwork === '') { return; }
    console.log('getAccountLoanRequests -- currentAccount: ', currentAccount);
    console.log('getAccountLoanRequests -- currentNetwork: ', currentNetwork)
    console.log(ethers)

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(currentAccount);
    const { loanRequestAddress, loanRequestABI } = config(currentNetwork);

    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );

    // Get loan requests
    const testData = await loanRequestContract.borrowers(ethers.constants.Zero);
    console.log('BORROWERS: ', testData);

    // const loanRequests = await loanRequestContract.getLoans(currentAccount);
    // const loans = loanRequests.map((loan) => {
    //   const { collateral, tokenId, initialLoanValue, rate, duration, lender } = loan;
    //   return { collateral, tokenId, initialLoanValue, rate, duration, lender };
    // });

    // Set loan request parameters
    // console.log('ACCOUNT LOANS: ', loans);
    // setCurrentAccountLoans(loans);
  }

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
    const tokenId = ethers.BigNumber.from(document.getElementById('input-token-id').value);
    const initialLoanValue = ethers.utils.parseUnits(document.getElementById('input-initial-value').value);
    const rate = ethers.utils.parseUnits(document.getElementById('input-rate').value);
    const duration = document.getElementById('input-duration').value;
    const lenderAddress = ethers.constants.AddressZero;

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(currentAccount);
    console.log('CURRENT ACCOUNT: ', currentAccount)

    const { loanRequestAddress, loanRequestABI } = config(currentNetwork);
    console.log(loanRequestAddress)

    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );
    await setLoanRequestListeners(loanRequestContract);
    console.log('SUBMIT LOAN REQ: ', loanRequestContract)

    // Create new loan request
    await loanRequestContract.createLoanRequest(
      nft,
      tokenId,
      initialLoanValue,
      rate,
      duration,
      lenderAddress
    );
    console.log("I made it :)")

    // await getAccountLoanRequests();
  }

  const updateLoan = async (loanId, param) => {
    // Get parameter to change
    const paramElement = document.getElementById(`input-existing-loan-${param}-${loanId}`);

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(currentAccount);

    const { loanRequestAddress, loanRequestABI } = config(currentNetwork);

    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );

    // Update parameter
    switch (param) {
      case 'nft':
        await loanRequestContract.setLoanParam(
          loanId,
          param,
          ethers.constants.Zero,
          paramElement.value
        );
        break;
      case 'token-id':
      case 'duration':
        await loanRequestContract.setLoanParam(
          loanId,
          param.replace('-', '_'),
          ethers.BigNumber.from(paramElement.value),
          ethers.constants.AddressZero
        );
        break;
      case 'value':
      case 'rate':
        await loanRequestContract.setLoanParam(
          loanId,
          param,
          ethers.utils.parseUnits(paramElement.value),
          ethers.constants.AddressZero
        );
        break;
      default:
        assert("Invalid parameter.");
    }

    // Set state variables
    if (param === 'nft') setCurrentNftAddress(paramElement.value);
    if (param === 'token-id') setCurrentTokenId(paramElement.value);
    if (param === 'value') setCurrentLoanValue(paramElement.value);
    if (param === 'rate') setCurrentLoanRate(paramElement.value);
    if (param === 'duration') setCurrentLoanDuration(paramElement.value);
  }

  // const sponsorLoan = async () => {
  //   const { isDev } = config(currentNetwork);

  //   const provider = getProvider();
  //   const lender = isDev
  //     ? provider.getSigner(env.NFT_ACCOUNT_ADDRESS)
  //     : provider.getSigner(currentAccount);
  //   const lenderAddress = await lender.getAddress();
  //   // console.log('Lender address: ', lenderAddress);

  //   // Signoff and create new contract
  //   // tx = await loanRequestContract.connect(lender).sign(borrowerAddress, loanId);

  //   // const lenderAddress = document.getElementById('input-lender').value;
  // }

  const renderExistingLoanElements = async () => {
    if (currentAccountLoans === '') { return; }

    setExistingLoanElements(currentAccountLoans.map((accountLoan, i) => {
      return (
        <ExistingLoansForm
          key={i}
          loanNumber={i}
          updateFunc={updateLoan}
          {...accountLoan}
        />
      )
    }));

    return (
      <div>
        {existingLoanElements}
      </div>
    )
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
          <div className="container-loan-forms">
            <div className="container-loan-request-form-master">
              <h2>Loan Requests</h2>
              <LoanRequestForm
                submitCallback={submitLoanRequest}
                funcCallback={getAccountLoanRequests}
                {...DEFAULT_LOAN_REQUEST_PARAMETERS}
              />
            </div>
            <div className="wedge"></div>
            <div className="container-loan-contracts-master">
              <h2>Existing Loans</h2>
              {!!existingLoanElements && existingLoanElements}
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
