import './App.css';
import LoanRequestForm from './components/LoanRequestForm';
import ExistingLoansForm from './components/ExistingLoansForm';

import React, { useEffect, useState } from 'react';
import env from 'react-dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
import getProvider from './utils/getProvider';
import { config } from './utils/config';
// import { loadNftCookies, saveNftCookies } from './utils/cookieUtils';
import { getSubAddress } from './utils/addressUtils';

const DEFAULT_LOAN_REQUEST_PARAMETERS = {
  defaultNft: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  defaultTokenId: '5465',
  defaultInitialLoanValue: '3.2',
  defaultRate: '0.02',
  defaultDuration: '24'
}

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [currentLoanValue, setCurrentLoanValue] = useState('');
  const [currentLoanRate, setCurrentLoanRate] = useState('');
  const [currentLoanDuration, setCurrentLoanDuration] = useState('');
  const [currentLoanLender, setCurrentLoanLender] = useState('');

  const [currentAccountNfts, setCurrentAccountNfts] = useState('');
  const [currentAccountLoans, setCurrentAccountLoans] = useState('');

  const [loanRequestElement, setLoanRequestElement] = useState('');
  const [existingLoanElements, setExistingLoanElements] = useState('');

  useEffect(() => {
    checkIfWalletIsConnected()
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    getAccountLoanRequests();
    // eslint-disable-next-line
  }, [
    currentAccount,
    currentNetwork,
    currentLoanValue,
    currentLoanRate,
    currentLoanDuration,
    currentLoanLender
  ]);

  useEffect(() => {
    console.log("i'm doin it")
    renderLoanRequestElements();
    renderExistingLoanElements();

    // eslint-disable-next-line
  }, [currentAccountNfts]);

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

    if (!!account) await fetchAccountsNft(account, chainId);

    console.log('Current chain ID: ', chainId);
    ethereum.on('chainChanged', handleChainChanged);

    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  }

  const fetchAccountsNft = async (account, network) => {
    if (!account || !network) return {};

    const { dev, protocol } = config(network);

    /* DEV ONLY */
    if (dev) {
      console.log('running dev')
      await fetchNftData(network);
    }
    else {
      // Get NFT metadata
      const metaOptions = {
        method: 'GET',
        url: `https://api.nftport.xyz/v0/accounts/${account}`,
        params: {
          chain: protocol,
          include: 'metadata',
          page_size: '25'
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: env.NFT_PORT_KEY
        }
      };
      const nftMetaResponse = await axios.request(metaOptions);

      // Get NFT Contract information
      const contractOptions = {
        method: 'GET',
        url: `https://api.nftport.xyz/v0/accounts/${account}`,
        params: {
          chain: protocol,
          // exclude: 'erc1155',
          include: 'contract_information',
          page_size: '25'
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: env.NFT_PORT_KEY
        }
      };
      const nftContractResponse = await axios.request(contractOptions);
      nftMetaResponse.data.nfts.forEach((nft, i) => {
        nft.contract = nftContractResponse.data.nfts[i].contract;
      });

      setCurrentAccountNfts(nftMetaResponse.data.nfts);
    }
  }

  const fetchNftData = async (network) => {
    const { protocol, transferibles } = config(network);

    // Get NFT metadata
    const nftMetaResponse = {
      data: []
    };

    for (let tr of transferibles) {
      let metaOptions = {
        method: 'GET',
        url: `https://api.nftport.xyz/v0/nfts/${tr.nft}/${tr.tokenId}`,
        params: { chain: protocol },
        headers: {
          'Content-Type': 'application/json',
          Authorization: env.NFT_PORT_KEY
        }
      };

      let metaResponse = await axios.request(metaOptions);
      nftMetaResponse.data.push({ ...metaResponse.data.nft, ...metaResponse.data.contract });
    }

    console.log(nftMetaResponse.data)
    setCurrentAccountNfts(nftMetaResponse.data);
  }

  const setSubmittedLoanRequestListener = async (loanRequestContract) => {
    // Set loan request listener
    loanRequestContract.on('SubmittedLoanRequest', async () => {
      await getAccountLoanRequests();
      console.log('SUBMITTED_LOAN_REQUEST LISTENER TRIGGERED!')
    });
  }

  const setLoanRequestChangedListeners = async (loanRequestContract) => {
    // Set loan request listener
    loanRequestContract.on('LoanRequestChanged', async () => {
      await getAccountLoanRequests();
      console.log('LOAN_REQUEST_CHANGED LISTENER TRIGGERED!')
    });
  }

  const setLoanRequestLenderChangedListeners = async (loanRequestContract) => {
    // Set loan request listener
    loanRequestContract.on('LoanRequestLenderChanged', async () => {
      await getAccountLoanRequests();
      console.log('LOAN_REQUEST_LENDER_CHANGED LISTENER TRIGGERED!')
    });
  }

  const setNftTransferListener = async (nftContract) => {
    nftContract.on('Transfer', async (ev) => {
      console.log('NFT Transfered!', ev)
    })
  }

  /*
   * Get all loan request parameters for each loan submitted by user.
   */
  const getAccountLoanRequests = async () => {
    if (currentAccount === '' || currentNetwork === '') { return; }

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
    const loanRequests = await loanRequestContract.getLoans(currentAccount);
    const loans = loanRequests.map((loan) => {
      let { collateral, tokenId, initialLoanValue, rate, duration, lender } = loan;
      return { collateral, tokenId, initialLoanValue, rate, duration, lender };
    });

    // Set loan request parameters
    setCurrentAccountLoans(loans);
  }

  /*
   * Submit Loan Request Callback
   * 
   * If all loan components are set and borrower and lender have signed off,
   * this loan request will generate a loan contract.
   * 
   */
  const submitLoanRequest = async (ercType) => {
    ercType = ercType.toLowerCase();

    // Get input values
    const nft = document.getElementById('datalist-nft').value;
    const tokenId = ethers.BigNumber.from(document.getElementById('input-token-id').value);
    const initialLoanValue = ethers.utils.parseUnits(document.getElementById('input-initial-value').value);
    const rate = ethers.utils.parseUnits(document.getElementById('input-rate').value);
    const duration = document.getElementById('input-duration').value;

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(currentAccount);

    const { loanRequestAddress, loanRequestABI, erc721, erc1155, network } = config(currentNetwork);

    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );

    // Set contract event listeners
    await setSubmittedLoanRequestListener(loanRequestContract);
    await setLoanRequestChangedListeners(loanRequestContract);
    await setLoanRequestLenderChangedListeners(loanRequestContract);

    // Create new loan request
    await loanRequestContract.createLoanRequest(
      nft,
      tokenId,
      initialLoanValue,
      rate,
      duration,
    );

    // Transfer NFT to LoanRequest contract
    const nftContract = new ethers.Contract(nft, ercType === 'erc115' ? erc1155 : erc721, borrower);
    await setNftTransferListener(nftContract, ercType);

    // // Update Existing Loans frontend
    await fetchNftData(network)
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
      case 'duration':
        await loanRequestContract.setLoanParam(
          loanId,
          param.replace('-', '_'),
          ethers.BigNumber.from(paramElement.value),
        );
        break;
      case 'value':
      case 'rate':
        await loanRequestContract.setLoanParam(
          loanId,
          param,
          ethers.utils.parseUnits(paramElement.value),
        );
        break;
      case 'lender':
        await loanRequestContract.setLender(currentAccount, loanId);
        break;
      default:
        console.log("Incorrect params string for updateLoan().");
    }

    // Set state variables
    if (param === 'value') setCurrentLoanValue(paramElement.value);
    if (param === 'rate') setCurrentLoanRate(paramElement.value);
    if (param === 'duration') setCurrentLoanDuration(paramElement.value);
    if (param === 'lender') setCurrentLoanLender(paramElement.value);
  }

  const renderLoanRequestElements = async () => {
    setLoanRequestElement(
      <div className="container-loan-request-form-master">
        <h2>Loan Requests</h2>
        <LoanRequestForm
          currentAccountNfts={currentAccountNfts}
          submitCallback={submitLoanRequest}
          {...DEFAULT_LOAN_REQUEST_PARAMETERS}
        />
      </div>
    )
  }

  const renderExistingLoanElements = async () => {
    if (currentAccountLoans === '') { return; }
    if (currentAccountNfts === '') { return; }

    setExistingLoanElements(currentAccountLoans.map((accountLoan, i) => {
      console.log(currentAccountNfts[i])
      return (
        <ExistingLoansForm
          key={i}
          loanNumber={i}
          currentAccount={currentAccount}
          currentNetwork={currentNetwork}
          currentType={currentAccountNfts[i].type.toLowerCase()}
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
            {loanRequestElement}
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
