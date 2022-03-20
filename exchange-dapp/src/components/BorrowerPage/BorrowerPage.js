import '../../static/css/BorrowerPage.css';
import '../../static/css/CardFlip.css';
import BorrowerLoanRequestForm from './BorrowerLoanRequestForm';
import BorrowerExistingLoanForm from './BorrowerExistingLoanForm';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config';
import { fetchNftData, fetchContractData } from '../../external/nftMetaFetcher';
import { getSubAddress } from '../../utils/addressUtils';
import { saveNftCookies, loadNftCookies } from '../../utils/cookieUtils';

const DEFAULT_LOAN_REQUEST_PARAMETERS = {
    defaultNft: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    defaultTokenId: '6491',
    defaultInitialLoanValue: '3.2',
    defaultRate: '0.02',
    defaultDuration: '24',
    defaultImageUrl: 'https://storage.googleapis.com/sentinel-nft/raw-assets/e5a44a819a164708012efbb36298051ebf6453544c28a7ea358bc6547d7b1335.png',
    defaultNetwork: config('31337').network,
    defaultLoanRequestAddress: config('31337').loanRequestAddress
}

export default function BorrowerPage() {
    const [isPageLoad, setIsPageLoad] = useState(true);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const [currentLoanRequestContract, setCurrentLoanRequestContract] = useState(null);
    const [currentSubmitRequestStatus, setCurrentSubmitRequestStatus] = useState(false);
    const [currentAccountNfts, setCurrentAccountNfts] = useState('');
    const [currentAccountLoans, setCurrentAccountLoans] = useState('');
    const [loanRequestElement, setLoanRequestElement] = useState('');
    const [existingLoanElements, setExistingLoanElements] = useState('');

    useEffect(() => {
        console.log('Page loading...');
        pageLoadSequence();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (currentSubmitRequestStatus) submitLoanRequestSequence();
        // eslint-disable-next-line
    }, [currentSubmitRequestStatus]);

    /* ---------------------------------------  *
     *       EVENT SEQUENCE FUNCTIONS           *
     * ---------------------------------------  */
    const pageLoadSequence = async () => {
        /*
         *  Sequence when the page is loaded.
         */

        // Set account and network info
        const { account, chainId } = await checkIfWalletIsConnected();
        console.log('--pageLoadSequence-- Account: ', account);
        console.log('--pageLoadSequence-- Network: ', chainId);


        // Set account loan and nft data
        const { nfts, loans, loanRequestContract } = await setAccountData(account, chainId);
        console.log('--pageLoadSequence-- NFTs: ', nfts);
        console.log('--pageLoadSequence-- Loans: ', loans);

        // Set LoanRequest event listeners
        setSubmittedLoanRequestListener(loanRequestContract);
        setLoanRequestChangedListeners(loanRequestContract);
        setLoanRequestLenderChangedListeners(loanRequestContract);

        // Render loan request elements for borrower
        await renderLoanRequestElements(nfts, chainId);

        // Render existing loan elements for borrower
        const _existingLoanElements = await renderExistingLoanElements(
            account, chainId, loans, loanRequestContract
        );
        setExistingLoanElements(_existingLoanElements);

        // Page-load flag needed to prevent events from
        // triggering on page-load
        setIsPageLoad(false);
    }

    const submitLoanRequestSequence = async () => {
        /*
         *  Sequence following the borrower submitting
         *  a new loan request (clicking the 'Submit
         *  Request' button).
         * 
         *  This triggers the call of the LoanRequest's
         *  createLoanRequest() function.
         */

        // Submit loan request
        const success = await submitLoanRequest();

        // Set account loan and nft data
        let nfts = currentAccountNfts;
        let loans = currentAccountLoans;
        let loanRequestContract = currentLoanRequestContract;

        if (success) {
            const accountData = await setAccountData(currentAccount, currentNetwork);
            nfts = accountData.nfts;
            loans = accountData.loans;
            loanRequestContract = accountData.loanRequestContract;
        }

        console.log('--pageLoadSequence-- NFTs: ', nfts);
        console.log('--pageLoadSequence-- Loans: ', loans);

        // Render loan request elements for borrower
        await renderLoanRequestElements(nfts, currentNetwork);

        // Render existing loan elements for borrower
        const _existingLoanElements = await renderExistingLoanElements(
            currentAccount, currentNetwork, loans, loanRequestContract
        );
        setExistingLoanElements(_existingLoanElements);

        // Reset currentSubmitRequestStatus
        setCurrentSubmitRequestStatus(false);
    }

    /* ---------------------------------------  *
     *        PAGE MODIFIED FUNCTIONS           *
     * ---------------------------------------  */
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
        let account = accounts.length !== 0 ? accounts[0] : null;

        // Update state variables
        chainId = !!chainId ? chainId : null;
        account = !!account ? account : null;
        setCurrentNetwork(chainId);
        setCurrentAccount(account);

        // Set wallet event listeners
        ethereum.on('accountsChanged', () => window.location.reload());
        ethereum.on('chainChanged', () => window.location.reload());

        return { account, chainId };
    }

    const setAccountData = async (account, network) => {
        /*
         * Set NFT, Loan, and Contract data.
         *
         *  - NFT data is retrieved from NFT Port API.
         *  - Loan data is retrieved from LoanRequest.
         *  - Contract data is retrieved from NFT Port API.
         *
         *  Function to read in NFT, Account, and Loan data from
         *  sources. NFT and Contract data are merged and compared
         *  to existing Loan data, and trimmed accordingly.
         */

        let nfts = null;
        let loans = [];
        let loanRequestContract = null;

        const { devFront, transferibles } = config(network);
        if (devFront) account = transferibles[0].recipient;

        if (!!account && !!network) {
            /* Fetch and store the current NFT data from NFT Port */
            console.log('Fetching account NFT data...');
            nfts = await fetchNftData(account, network);

            /* Get account loan data from LoanRequest contract */
            console.log('Getting account loan data...');
            const accountLoanRequests = await getAccountLoanRequests(account, network, nfts);
            loans = accountLoanRequests.loans;
            loanRequestContract = accountLoanRequests.loanRequestContract;

            /* Add contract statistics to NFTs */
            nfts = await Promise.all(nfts.map(async (nft) => {
                // Fetch NFTs from cookies
                let cookieNft = loadNftCookies(nft);

                if (!cookieNft) {
                    // If cookies do not exist for NFT, fetch it from NFT Port
                    console.log(`Fetching NFT ${nft.symbol}_${nft.token_id} from NFT Port...`);

                    let stats = await fetchContractData(
                        [nft.contract_address],
                        network
                    )
                    nft.contract_statistics = stats[0];
                    saveNftCookies([nft]);
                }
                else {
                    console.log(`Fetching NFT ${nft.symbol}_${nft.token_id} from cookies...`);
                    // If cookies do exist for NFT, replace nft with it and do
                    // not fetch from NFT Port
                    nft = cookieNft;
                }

                return nft;
            }));
        }
        else {
            console.log('disconnected');
        }

        console.log(nfts)

        /* Add NFTs of existing loan requests to loans */
        loans = loans.map((loan) => {
            loan.nft = nfts.find((nft) =>
                parseInt(loan.collateral, 16) === parseInt(nft.contract_address) &&
                loan.tokenId.eq(ethers.BigNumber.from(nft.token_id))
            )

            return loan;
        });

        /* Remove NFTs of existing loan requests */
        nfts = nfts.filter((nft) =>
            !loans.find((loan) =>
                parseInt(loan.collateral, 16) === parseInt(nft.contract_address) &&
                loan.tokenId.eq(ethers.BigNumber.from(nft.token_id))
            )
        );

        setCurrentAccountNfts(nfts);
        setCurrentAccountLoans(loans);

        return { nfts, loans, loanRequestContract };
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

        // Get loan requests and nft image url
        const loanRequests = await loanRequestContract.getLoans(account);
        const loans = loanRequests.map((loan) => {
            // Loan request data
            const { collateral, tokenId, initialLoanValue, rate, duration, lender } = loan;

            // Nft image url
            const nftData = [...nfts].find(nft =>
                parseInt(collateral, 16) === parseInt(nft.contract_address, 16) &&
                tokenId.eq(ethers.BigNumber.from(nft.token_id))
            )

            // If no NFT matched, exit
            if (!nftData) return {};

            // Get image URL
            const imgUrl = !!nftData.cached_file_url ? nftData.cached_file_url : nftData.file_url;

            return { collateral, tokenId, initialLoanValue, rate, duration, lender, imgUrl };
        });

        setCurrentLoanRequestContract(loanRequestContract);

        return { loanRequestContract, loans };
    }

    const submitLoanRequest = async () => {
        /*
         * Function to trigger the LoanRequest's createLoanRequest()
         * function.
         */

        // Get input values
        const nft = document.getElementById('datalist-nft').value;
        const tokenId = ethers.BigNumber.from(document.getElementById('input-token-id').value);
        const initialLoanValue = ethers.utils.parseUnits(document.getElementById('input-initial-value').value);
        const rate = ethers.utils.parseUnits(document.getElementById('input-rate').value);
        const duration = document.getElementById('input-duration').value;

        // Get contract
        const {
            loanRequestAddress,
            loanRequestABI,
            devFront,
            transferibles
        } = config(currentNetwork);

        const provider = getProvider();
        const borrower = provider.getSigner(
            !devFront ? currentAccount : transferibles[0].recipient
        );

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        try {
            // Create new loan request
            const tx = await loanRequestContract.createLoanRequest(
                nft,
                tokenId,
                initialLoanValue,
                rate,
                duration,
            );
            const receipt = await tx.wait();
            console.log('receipt: ', receipt);
        }
        catch (err) {
            console.log(err);
            return false;
        }

        return true;
    }

    /* ---------------------------------------  *
     *           FRONTEND CALLBACKS             *
     * ---------------------------------------  */
    const callback__ConnectWallet = async () => {
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

    const callback__SubmitLoanRequest = async () => {
        /*
         * Submit Loan Request Button Callback
         */

        setCurrentSubmitRequestStatus(true);
    }

    const callback__UpdateLoan = async (loanId, param) => {
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
        let tx;
        let receipt;

        try {
            switch (param) {
                case 'duration':
                    tx = await loanRequestContract.setLoanParam(
                        loanId,
                        param.replace('-', '_'),
                        ethers.BigNumber.from(paramElement.value),
                    );
                    receipt = await tx.wait();
                    console.log(receipt);
                    break;
                case 'value':
                case 'rate':
                    tx = await loanRequestContract.setLoanParam(
                        loanId,
                        param,
                        ethers.utils.parseUnits(paramElement.value),
                    );
                    receipt = await tx.wait();
                    break;
                case 'lender':
                    tx = await loanRequestContract.setLender(currentAccount, loanId);
                    receipt = await tx.wait();
                    break;
                default:
                    console.log("Incorrect params string for callback__UpdateLoan().");
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    /* ---------------------------------------  *
     *            EVENT LISTENERS               *
     * ---------------------------------------  */
    const setSubmittedLoanRequestListener = (loanRequestContract) => {
        // Set loan request listener
        loanRequestContract.on('SubmittedLoanRequest', () => {
            if (!isPageLoad) {
                console.log('SUBMITTED_LOAN_REQUEST LISTENER TRIGGERED!');
            }
        });
    }

    const setLoanRequestChangedListeners = (loanRequestContract) => {
        // Set loan request listener
        loanRequestContract.on('LoanRequestChanged', () => {
            if (!isPageLoad) {
                console.log('LOAN_REQUEST_CHANGED LISTENER TRIGGERED!');
            }
        });
    }

    const setLoanRequestLenderChangedListeners = (loanRequestContract) => {
        // Set loan request listener
        loanRequestContract.on('LoanRequestLenderChanged', () => {
            if (!isPageLoad) {
                console.log('LOAN_REQUEST_LENDER_CHANGED LISTENER TRIGGERED!');
            }
        });
    }

    /* ---------------------------------------  *
     *           FRONTEND RENDERING             *
     * ---------------------------------------  */
    const renderLoanRequestElements = async (nfts, network) => {
        const { devFront } = config(network);

        setLoanRequestElement(
            <BorrowerLoanRequestForm
                currentAccountNfts={nfts}
                submitCallback={callback__SubmitLoanRequest}
                {...DEFAULT_LOAN_REQUEST_PARAMETERS}
                _dev={devFront}
            />
        )
    }

    const renderExistingLoanElements = async (account, network, loans, loanRequestContract) => {
        const getExistingLoanElements = async () => {
            const existingLoanElements = loans.map((loan, i) => {
                return (
                    <BorrowerExistingLoanForm
                        key={i}
                        loanNumber={i}
                        currentAccount={account}
                        currentNetwork={network}
                        currentLoanRequestContract={loanRequestContract}
                        updateLoanFunc={callback__UpdateLoan}
                        fetchNftFunc={fetchNftData}
                        {...loan}
                    />
                )
            });

            return existingLoanElements;
        }

        return (
            !!loans.length && !!account && !!network
                ? (<div>{await getExistingLoanElements()}</div>)
                : (<div><div className="container-existing-loan-form">☹️💀 No loans atm 💀☹️</div></div>)
        )
    }

    /* ---------------------------------------  *
     *         BORROWERPAGE.JS RETURN           *
     * ---------------------------------------  */
    return (
        <div className="borrower-page">
            <div>
                <h1>DePawn</h1>
                {currentAccount
                    ? (<div className="button button-connected-account">{getSubAddress(currentAccount)}</div>)
                    : (<div className="button button-connect-wallet" onClick={callback__ConnectWallet}>Connect Wallet</div>)
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
