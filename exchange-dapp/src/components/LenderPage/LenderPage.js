import '../../static/css/LenderPage.css';
import '../../static/css/CardFlip.css';
import LenderAvailableLoanForm from './LenderAvailableLoanForm';
import LenderExistingLoanForm from './LenderExistingLoanForm';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { connect } from '@tableland/sdk';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config';
import { fetchNftData, fetchContractData } from '../../external/nftMetaFetcher';
import { fetchRowsWhere, insertTableRow, updateTable } from '../../external/tablelandInterface';
import { getSubAddress } from '../../utils/addressUtils';
import { saveNftCookies, loadNftCookies } from '../../utils/cookieUtils';

const DEFAULT_LOAN_REQUEST_PARAMETERS = {
    defaultNft: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    defaultTokenId: '6491',
    defaultInitialLoanValue: '3',
    defaultRate: '2',
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
    const [currentAvailableLoans, setCurrentAvailableLoans] = useState({});
    const [currentExisitingLoans, setCurrentExistingLoans] = useState({});
    const [availableLoanElements, setAvailableLoanElements] = useState('');
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

        const loanRequestContract = __getLoanRequestContract(account, chainId);
        const loans = await __fetchAvailableLoans(chainId);

        console.log(loans);

        await renderAvailableLoanElements(account, chainId, loans, loanRequestContract);


        // // Set account loan and nft data
        // const { nfts, loans, loanRequestContract } = await setAccountData(account, chainId);
        // console.log('--pageLoadSequence-- NFTs: ', nfts);
        // console.log('--pageLoadSequence-- Loans: ', loans);

        // // Set LoanRequest event listeners
        // setSubmittedLoanRequestListener(loanRequestContract);
        // setLoanRequestChangedListeners(loanRequestContract);
        // setLoanRequestLenderChangedListeners(loanRequestContract);

        // Get available LoanRequest elements for lender


        // // Render avalaible LoanRequest elements for lender
        // await renderAvailableLoanElements(nfts, chainId);

        // // Render existing loan elements for borrower
        // const _existingLoanElements = await renderExistingLoanElements(
        //     account, chainId, loans, loanRequestContract
        // );
        // setExistingLoanElements(_existingLoanElements);

        // // Page-load flag needed to prevent events from
        // // triggering on page-load
        // setIsPageLoad(false);
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
        const { success, collateral, tokenId } = await submitLoanRequest();

        // Set account loan and nft data
        let nfts = currentAccountNfts;
        let loans = currentExisitingLoans;
        let loanRequestContract = currentLoanRequestContract;

        if (success) {
            const accountData = await setAccountData(currentAccount, currentNetwork, collateral, tokenId);
            nfts = accountData.nfts;
            loans = accountData.loans;
            loanRequestContract = accountData.loanRequestContract;
        }

        console.log('--pageLoadSequence-- NFTs: ', nfts);
        console.log('--pageLoadSequence-- Loans: ', loans);

        // Render loan request elements for borrower
        await renderAvailableLoanElements(nfts, currentNetwork);

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

    const __fetchAvailableLoans = async (network) => {
        const { dbTableName } = config(network);

        const nfts = await fetchRowsWhere(
            dbTableName, [[`lender='${ethers.constants.AddressZero}'`, '']]
        );

        setCurrentAvailableLoans(nfts);

        return nfts;
    }

    const __getLoanRequestContract = (account, network) => {
        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(account);
        const { loanRequestAddress, loanRequestABI } = config(network);

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        return loanRequestContract;
    }

    const setAccountData = async (account, network, collateral = undefined, tokenId = undefined) => {
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

        const { devFront, transferibles, dbTableName } = config(network);
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

        // Update Tableland database
        if (!!collateral && !!tokenId) {
            const newLoan = loans.find((loan) => {
                return parseInt(loan.collateral, 16) === parseInt(collateral) &&
                    loan.tokenId.eq(ethers.BigNumber.from(tokenId))
            });

            console.log(newLoan);

            // Store new LoanRequest in Tableland
            const dbParams = {
                collateral: collateral,
                token_id: newLoan.tokenId,
                lender: ethers.constants.AddressZero,
                duration: newLoan.duration,
                imgUrl: newLoan.imgUrl,
                initialLoanValue: newLoan.initialLoanValue,
                chain: newLoan.nft.chain,
                contract_statistics: newLoan.nft.contract_statistics,
                metadata: newLoan.nft.metadata,
                mint_date: newLoan.nft.mint_date,
                name: newLoan.nft.name,
                symbol: newLoan.nft.symbol,
                type: newLoan.nft.type,
                rate: newLoan.rate,
                committed: false,
                borrower_signed: false,
                lender_signed: false,
                unpaid_balance: newLoan.initialLoanValue
            }

            await insertTableRow(dbTableName, currentAccount, dbParams);
        }

        setCurrentAccountNfts(nfts);
        setCurrentExistingLoans(loans);

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
        const rate = ethers.BigNumber.from(document.getElementById('input-rate').value);
        const duration = document.getElementById('input-duration').value;

        // Get contract
        const {
            loanRequestAddress,
            loanRequestABI,
            erc721,
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
            console.log('Submitting loan request...');

            // Approve transfer of NFT to LoanRequest from Borrower
            const nftContract = new ethers.Contract(nft, erc721, borrower);
            let tx = await nftContract.approve(loanRequestContract.address, tokenId);
            await tx.wait();

            // Create new LoanRequest
            tx = await loanRequestContract.createLoanRequest(
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
            return { success: false, collateral: undefined, tokenId: undefined };
        }

        return { success: true, collateral: nft, tokenId: tokenId };
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

    const callback__UpdateLoan = async (loanId, attribute, params) => {
        // Get parameter to change
        const paramElement = document.getElementById(`input-existing-loan-${attribute}-${loanId}`);

        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(currentAccount);

        const { loanRequestAddress, loanRequestABI, dbTableName } = config(currentNetwork);

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        // Update parameter
        let tx;
        let receipt;
        let dbParams;

        try {
            switch (attribute) {
                case 'duration':
                    tx = await loanRequestContract.setLoanParam(
                        loanId,
                        attribute,
                        ethers.BigNumber.from(paramElement.value),
                    );
                    receipt = await tx.wait();
                    console.log(receipt);

                    // Update Tableland database
                    dbParams = {
                        collateral: params.collateral,
                        token_id: params.tokenId,
                        duration: ethers.BigNumber.from(paramElement.value)
                    };

                    await updateTable(dbTableName, currentAccount, dbParams);

                    break;
                case 'value':
                case 'rate':
                    tx = await loanRequestContract.setLoanParam(
                        loanId,
                        attribute,
                        ethers.utils.parseUnits(paramElement.value),
                    );
                    receipt = await tx.wait();

                    // Update Tableland database
                    dbParams = {
                        collateral: params.collateral,
                        token_id: params.tokenId,
                    };
                    dbParams[attribute === 'value' ? 'initialLoanValue' : 'rate'] = ethers.utils.parseUnits(paramElement.value);

                    await updateTable(dbTableName, currentAccount, dbParams);

                    break;
                case 'lender':
                    tx = await loanRequestContract.setLender(currentAccount, loanId);
                    receipt = await tx.wait();

                    // Update Tableland database
                    dbParams = {
                        collateral: params.collateral,
                        token_id: params.tokenId,
                        lender: paramElement.value
                    };

                    await updateTable(dbTableName, currentAccount, dbParams);

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
    // const renderAvailableLoanElements = async (nfts, network) => {
    //     const { devFront } = config(network);

    //     setAvailableLoanElements(
    //         <LenderAvailableLoanForm
    //             currentAccountNfts={nfts}
    //             submitCallback={callback__SubmitLoanRequest}
    //             {...DEFAULT_LOAN_REQUEST_PARAMETERS}
    //             _dev={devFront}
    //         />
    //     )
    // }

    const renderAvailableLoanElements = async (account, network, loans, loanRequestContract) => {
        const getExistingLoanElements = async () => {
            const existingLoanElements = loans.map((loan, i) => {
                return (
                    <LenderExistingLoanForm
                        key={i}
                        loanNumber={i}
                        currentAccount={account}
                        currentNetwork={network}
                        currentLoanRequestContract={loanRequestContract}
                        updateLoanFunc={() => console.log('Do nothing')}
                        fetchNftFunc={() => console.log('Do nothing fetchNftFunc')}
                        {...loan}
                    />
                )
            });

            return existingLoanElements;
        }

        setAvailableLoanElements(
            !!loans.length && !!account && !!network
                ? (<div>{await getExistingLoanElements()}</div>)
                : (<div><div className="container-existing-loan-form">☹️💀 No loans atm 💀☹️</div></div>)
        )
    }

    const renderExistingLoanElements = async (account, network, loans, loanRequestContract) => {
        const getExistingLoanElements = async () => {
            const existingLoanElements = loans.map((loan, i) => {
                return (
                    <LenderExistingLoanForm
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
                        <div className="container-loan-contracts-master">
                            <h2>Available Loans</h2>
                            {availableLoanElements}
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
