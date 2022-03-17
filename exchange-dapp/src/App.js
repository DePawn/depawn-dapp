import './App.css';
import LoanRequestForm from './components/LoanRequestForm';
import ExistingLoansForm from './components/ExistingLoansForm';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from './utils/getProvider';
import { config } from './utils/config';
import { fetchAccountNfts, fetchNftData } from './external/metaNft';
import { getSubAddress } from './utils/addressUtils';

const DEFAULT_LOAN_REQUEST_PARAMETERS = {
  defaultNft: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  defaultTokenId: '5465',
  defaultInitialLoanValue: '3.2',
  defaultRate: '0.02',
  defaultDuration: '24'
}

function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [currentLoanValue, setCurrentLoanValue] = useState('');
  const [currentLoanRate, setCurrentLoanRate] = useState('');
  const [currentLoanDuration, setCurrentLoanDuration] = useState('');
  const [currentLoanLender, setCurrentLoanLender] = useState('');

  const [currentAccountNfts, setCurrentAccountNfts] = useState('');
  const [currentAccountLoans, setCurrentAccountLoans] = useState('');

  const [loanRequestElement, setLoanRequestElement] = useState('');
  const [existingLoanElements, setExistingLoanElements] = useState('');

  useEffect(() => {
    checkIfWalletIsConnected();
    // .then(() => fetchAccountNfts());
    // eslint-disable-next-line
  }, []);

  // useEffect(() => {
  //   const fetchNftData = async () => {
  //     const nftData = await fetchNftData(currentAccount, currentNetwork);
  //     setCurrentAccountNfts(nftData);
  //   };

  //   fetchNftData().catch(console.error);

  //   // eslint-disable-next-line
  // }, [currentAccount])

  // useEffect(() => {
  //   getAccountLoanRequests();
  //   // eslint-disable-next-line
  // }, [
  //   currentAccount,
  //   currentNetwork,
  //   currentLoanValue,
  //   currentLoanRate,
  //   currentLoanDuration,
  //   currentLoanLender
  // ]);

  // useEffect(() => {
  //   renderLoanRequestElements()
  //   renderExistingLoanElements();

  //   // eslint-disable-next-line
  // }, [currentAccountNfts]);

  // useEffect(() => {
  //   renderExistingLoanElements();
  //   // eslint-disable-next-line
  // }, [currentAccountLoans]);

  const connectWallet = async () => {
    /*
     * Connect Wallet Callback
     */
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

  const checkIfWalletIsConnected = async () => {
    /*
     * Connect Wallet State Change Function
     */

    // Get wallet's ethereum object
    const { ethereum } = window;

    if (!ethereum) {
      console.log('Make sure you have MetaMask!');
      return;
    }
    else {
      console.log('Wallet connected.');
    }

    // Get network
    let chainId = await ethereum.request({ method: 'eth_chainId' });
    chainId = parseInt(chainId, 16).toString();

    // Get account, if one is authorized
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const account = accounts.length !== 0 ? accounts[0] : null;

    // If account or network are changed, set account loan and nft data
    if (account !== currentAccount || chainId !== currentNetwork) {
      await setAccountData(account, chainId);
    }

    // Update state variables
    !!chainId ? setCurrentNetwork(chainId) : setCurrentNetwork(null);
    !!account ? setCurrentAccount(account) : setCurrentAccount(null);

    // Set wallet event listeners
    ethereum.on('accountsChanged', () => window.location.reload());
    ethereum.on('chainChanged', () => window.location.reload());
  }

  const setAccountData = async (account, network) => {
    console.log('Account: ', account);
    console.log('Network: ', network);
    if (!!account && !!network) {
      // Fetch and store the current NFT data
      console.log('Setting account NFT data...');
      const nfts = await fetchNftData(account, network);
      setCurrentAccountNfts(nfts);
      console.log('--setAccountData--: ', nfts);

      // Get account loan data
      console.log('Getting account loan data...');
      const loans = await getAccountLoanRequests(account, network, nfts);
      setCurrentAccountLoans(loans);
      console.log('--getAccountLoanRequests--: ', loans);
    }
    else {
      setCurrentAccountNfts('');
      setCurrentAccountLoans('');
      console.log('disconnected');
    }
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

  const getAccountLoanRequests = async (account, network, nfts) => {
    /*
     * Get all loan request parameters for each loan submitted by user.
     */
    if (account === '' || network === '') { return; }

    // Get contract
    const provider = getProvider();
    const borrower = provider.getSigner(account);
    const { loanRequestAddress, loanRequestABI } = config(network);

    const loanRequestContract = new ethers.Contract(
      loanRequestAddress,
      loanRequestABI,
      borrower
    );

    /* Get loan requests and nft image url */
    const loanRequests = await loanRequestContract.getLoans(account);
    const loans = loanRequests.map((loan) => {
      // Loan request data
      const { collateral, tokenId, initialLoanValue, rate, duration, lender } = loan;

      // Nft image url
      const nftData = [...nfts].find(nft =>
        parseInt(collateral, 16) === parseInt(nft.contract_address, 16) &&
        tokenId.eq(ethers.BigNumber.from(nft.token_id))
      )
      const imgUrl = !!nftData.cached_file_url ? nftData.cached_file_url : nftData.file_url;

      // Return loan request and nft image url
      return { collateral, tokenId, initialLoanValue, rate, duration, lender, imgUrl };
    });

    return loans;
  }

  const submitLoanRequest = async (ercType) => {
    /*
     * Submit Loan Request Callback
     * 
     * If all loan components are set and borrower and lender have signed off,
     * this loan request will generate a loan contract.
     * 
     */
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
    await fetchNftData([], network)
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
      return (
        <ExistingLoansForm
          key={i}
          loanNumber={i}
          currentAccount={currentAccount}
          currentNetwork={currentNetwork}
          currentType={currentAccountNfts[i].type.toLowerCase()}
          updateFunc={updateLoan}
          fetchNftFunc={fetchNftData}
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
              {/* {!!existingLoanElements && existingLoanElements} */}
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
