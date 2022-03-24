import '../../static/css/BorrowerPage.css';
import '../../static/css/CardFlip.css';
import BorrowerLoanRequestForm from './BorrowerLoanRequestForm';
import BorrowerExistingLoanForm from './BorrowerExistingLoanForm';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config';
import { loanContractTime } from '../../utils/timeUtils';
import { fetchNftData, fetchContractData } from '../../external/nftMetaFetcher';
import { fetchRowsWhere, insertTableRow, updateTable } from '../../external/tablelandInterface';
import { getSubAddress } from '../../utils/addressUtils';

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
    const [currentUpdateRequestStatus, setCurrentUpdateRequestStatus] = useState({});
    const [currentNftWithdrawStatus, setCurrentNftWithdrawStatus] = useState({});
    const [currentAccountLoans, setCurrentAccountLoans] = useState('');
    const [currentLoanRequestElement, setCurrentLoanRequestElement] = useState('');
    const [currentExistingLoanElements, setCurrentExistingLoanElements] = useState('');

    useEffect(() => {
        console.log('Page loading...');
        if (isPageLoad) pageLoadSequence();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (currentSubmitRequestStatus) submitLoanRequestSequence();
        // eslint-disable-next-line
    }, [currentSubmitRequestStatus]);

    useEffect(() => {
        console.log('here i am')
        if (!!Object.keys(currentUpdateRequestStatus).length) updateLoanRequestSequence();
        // eslint-disable-next-line
    }, [currentUpdateRequestStatus]);

    useEffect(() => {
        console.log('here i am')
        if (!!Object.keys(currentNftWithdrawStatus).length) withdrawNftSequence();
        // eslint-disable-next-line
    }, [currentNftWithdrawStatus]);

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

        // Get LoanRequestContract
        const loanRequestContract = getLoanRequestContract(account, chainId);

        // Set account loan and nft data
        const loans = await setAccountData(account, chainId);
        console.log('--pageLoadSequence-- Loans: ', loans);

        // Render loan request elements for borrower
        await renderLoanRequestElements(loans, chainId);

        // Render existing loan elements for borrower
        const existingLoanElements = await renderExistingLoanElements(
            account, chainId, loans, loanRequestContract
        );
        setCurrentExistingLoanElements(existingLoanElements);

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
        let loans = currentAccountLoans;

        if (success) {
            loans = await setAccountData(currentAccount, currentNetwork);
        }
        console.log('--pageLoadSequence-- Loans: ', loans);

        // Render loan request elements for borrower
        await renderLoanRequestElements(loans, currentNetwork);

        // Render existing loan elements for borrower
        const existingLoanElements = await renderExistingLoanElements(
            currentAccount, currentNetwork, loans, currentLoanRequestContract
        );
        setCurrentExistingLoanElements(existingLoanElements);

        // Reset currentSubmitRequestStatus
        setCurrentSubmitRequestStatus(false);
    }

    const updateLoanRequestSequence = async () => {
        console.log(currentAccount, currentNetwork)

        const { dbTableName } = config(currentNetwork);
        const { attribute, loan_number, collateral, tokenId } = currentUpdateRequestStatus;

        // Get LoanRequestContract
        const loanRequestContract = getLoanRequestContract(currentAccount, currentNetwork);

        // Update LoanRequest
        const { success, dbParams } = await updateLoanRequest(
            currentAccount, currentNetwork, attribute, loan_number, collateral, tokenId
        );

        if (success) {
            // Set account loan and nft data
            let loans = await setAccountData(currentAccount, currentNetwork);

            // Update Tableland database
            console.log('updating tableland')
            await updateTable(dbTableName, dbParams);

            // Render existing loan elements for borrower
            const existingLoanElements = await renderExistingLoanElements(
                currentAccount, currentNetwork, loans, loanRequestContract
            );
            setCurrentExistingLoanElements(existingLoanElements);
        }

        // Reset currentSubmitRequestStatus
        setCurrentUpdateRequestStatus({});
    }

    const withdrawNftSequence = async () => {
        console.log(currentAccount, currentNetwork)

        const { dbTableName } = config(currentNetwork);
        const { collateral, tokenId, contract_address } = currentNftWithdrawStatus;

        // Get LoanRequestContract
        const loanRequestContract = getLoanRequestContract(currentAccount, currentNetwork);

        // Update LoanRequest
        const { success, dbParams } = await withdrawCollateral(collateral, tokenId, contract_address);

        if (success) {
            // Update Tableland database
            console.log('updating tableland')
            await updateTable(dbTableName, dbParams);
            
            // Set account loan and nft data
            let loans = await setAccountData(currentAccount, currentNetwork);

            // Render loan request elements for borrower
            await renderLoanRequestElements(loans, currentNetwork);

            // Render existing loan elements for borrower
            const existingLoanElements = await renderExistingLoanElements(
                currentAccount, currentNetwork, loans, loanRequestContract
            );
            setCurrentExistingLoanElements(existingLoanElements);
        }

        // Reset currentSubmitRequestStatus
        setCurrentNftWithdrawStatus({});
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

    const getLoanRequestContract = (account, network) => {
        // Get LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(account);
        const { loanRequestAddress, loanRequestABI } = config(network);

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        setCurrentLoanRequestContract(loanRequestContract);

        return loanRequestContract
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

        let nfts = [];
        let loans = [];

        // This is kludgy. I know...
        const waitInsertTableRow = async (tblName, borrower, params) => {
            try {
                setTimeout(await insertTableRow(tblName, borrower, params), 2000);
            }
            catch (__) {
                setTimeout(await insertTableRow(tblName, borrower, params), 2000);
            }
        };

        const { dbTableName } = config(network);

        if (!!account && !!network) {
            /* Fetch current account NFT data from NFT Port */
            console.log('Fetching account NFT data...');
            nfts = await fetchNftData(account, network);
            console.log(nfts)

            /* Fetch current account LoanRequest data from Tableland */
            loans = await fetchBorrowerLoans(account, network);
            console.log(loans)

            loans = await Promise.all(nfts.map(async (nft) => {
                let commonNft = loans.find((loan) => {
                    return parseInt(nft.contract_address, 16) === parseInt(loan.collateral, 16) &&
                        nft.token_id === loan.tokenId
                })
                console.log(commonNft)

                /* If NFT does not exist in Tableland database */
                if (!commonNft) {

                    // Fetch contract stats from NFT Port
                    console.log(`Fetching NFT ${nft.symbol}_${nft.token_id} contract stats from NFT Port...`);

                    const stats = await fetchContractData(
                        [nft.contract_address],
                        network
                    )
                    nft.contract_statistics = stats[0];
                    nft.borrower = account.toLowerCase();
                    nft.lender = ethers.constants.AddressZero;

                    // Store potential LoanRequest in Tableland
                    const dbParams = {
                        collateral: nft.contract_address,
                        token_id: nft.token_id,
                        loan_requested: false,
                        borrower: nft.borrower,
                        lender: nft.lender,
                        img_url: !!nft.cached_file_url ? nft.cached_file_url : nft.file_url,
                        chain: nft.chain,
                        contract_statistics: nft.contract_statistics,
                        metadata: nft.metadata,
                        mint_date: nft.mint_date,
                        name: nft.name,
                        symbol: nft.symbol,
                        type: nft.type,
                        committed: false,
                        borrower_signed: false
                    };

                    await waitInsertTableRow(dbTableName, nft.borrower, dbParams);

                    return nft;
                }
                else {
                    return commonNft;
                }
            }));
        }
        else {
            console.log('disconnected');
        }

        console.log(loans)
        setCurrentAccountLoans(loans);

        return loans;
    }

    const fetchBorrowerLoans = async (account, network) => {
        const { dbTableName } = config(network);
        console.log(dbTableName)
        console.log(account)

        const colsInclude = ['borrower'];
        const valsInclude = [[account]];
        const conjInclude = [''];

        const loans = await fetchRowsWhere(
            dbTableName, [colsInclude, valsInclude, conjInclude]
        );
        console.log(loans)

        return loans;
    }

    const submitLoanRequest = async () => {
        /*
         * Function to trigger the LoanRequest's createLoanRequest()
         * function.
         */

        // Get input values
        const nft = document.getElementById('datalist-nft').value;
        const tokenId = ethers.BigNumber.from(document.getElementById('input-token-id').value);
        const initial_loan_value = ethers.utils.parseEther(document.getElementById('input-initial-value').value);
        const rate = ethers.BigNumber.from(document.getElementById('input-rate').value);
        const expiration = loanContractTime(...document.getElementById('input-expiration').value.split('-'));
        console.log(expiration)

        // Get contract
        const {
            loanRequestAddress,
            loanRequestABI,
            dbTableName,
            erc721
        } = config(currentNetwork);

        const provider = getProvider();
        const borrower = provider.getSigner(currentAccount);
        console.log(borrower)

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        try {
            console.log('Submitting loan request...');

            // Approve transfer of NFT to LoanRequest from Borrower
            const nftContract = new ethers.Contract(nft, erc721, borrower);
            let tx = await nftContract.approve(loanRequestAddress, tokenId);
            await tx.wait();

            // Create new LoanRequest
            tx = await loanRequestContract.createLoanRequest(
                nft,
                tokenId,
                initial_loan_value,
                rate,
                expiration,
            );

            const receipt = await tx.wait();
            console.log('receipt: ', receipt);

            // Pull _loanId from SubmittedLoanRequest triggered event
            const topic = loanRequestContract.interface.getEventTopic('SubmittedLoanRequest');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
            const triggeredEvent = loanRequestContract.interface.parseLog(log);
            const loan_number = triggeredEvent.args['_loanId'];

            // Update Tableland with newly submitted LoanRequest parameters
            const dbParams = {
                collateral: nft,
                token_id: tokenId,
                loan_requested: true,
                loan_number: loan_number,
                expiration: expiration,
                initial_loan_value: initial_loan_value,
                rate: rate,
                committed: true,
                unpaid_balance: initial_loan_value
            }

            await updateTable(dbTableName, dbParams);
        }
        catch (err) {
            console.log(err);
            return false;
        }

        return true;
    }

    const updateLoanRequest = async (
        account, network, attribute, loan_number, collateral, tokenId
    ) => {
        // Get parameter to change
        const paramElement = document.getElementById(`input-existing-loan-${attribute}-${loan_number}`);

        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(account);

        const { loanRequestAddress, loanRequestABI } = config(network);

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
                case 'expiration':
                    tx = await loanRequestContract.setLoanParam(
                        loan_number,
                        'duration',
                        loanContractTime(...paramElement.value.split('-')),
                    );
                    receipt = await tx.wait();
                    console.log(receipt);

                    // Update Tableland database
                    dbParams = {
                        collateral: collateral,
                        token_id: tokenId,
                        expiration: loanContractTime(...paramElement.value.split('-')),
                        lender_signed: false,
                    };

                    break;
                case 'value':
                    tx = await loanRequestContract.setLoanParam(
                        loan_number,
                        attribute,
                        ethers.utils.parseEther(paramElement.value),
                    );
                    receipt = await tx.wait();

                    // Update Tableland database
                    dbParams = {
                        collateral: collateral,
                        token_id: tokenId,
                        initial_loan_value: ethers.utils.parseEther(paramElement.value),
                        unpaid_balance: ethers.utils.parseEther(paramElement.value),
                        lender_signed: false,
                    };

                    break;
                case 'rate':
                    tx = await loanRequestContract.setLoanParam(
                        loan_number,
                        attribute,
                        ethers.utils.parseEther(paramElement.value),
                    );
                    receipt = await tx.wait();

                    // Update Tableland database
                    dbParams = {
                        collateral: collateral,
                        token_id: tokenId,
                        rate: paramElement.value,
                        lender_signed: false,
                    };

                    break;
                case 'lender':
                    tx = await loanRequestContract.setLender(account, loan_number);
                    receipt = await tx.wait();

                    console.log('doin it')

                    // Update Tableland database
                    dbParams = {
                        collateral: collateral,
                        token_id: tokenId,
                        lender: ethers.constants.AddressZero,
                        lender_signed: false,
                    };

                    // Set UI
                    const lenderElement = document.getElementById("input-existing-loan-lender-" + loan_number);
                    lenderElement.value = "Unassigned 😞";

                    break;
                default:
                    console.log(`Incorrect params string for callback__UpdateLoan() of ${attribute}.`);
            }
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }

        return { success: true, dbParams: dbParams };
    }

    const withdrawCollateral = async (collateral, tokenId, contract_address) => {
        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(currentAccount);

        const { loanContractABI } = config(currentNetwork);

        const loanContract = new ethers.Contract(
            contract_address,
            loanContractABI,
            borrower
        );

        try {
            // Make payment
            const tx = await loanContract.withdrawNFTBorrower();
            const receipt = await tx.wait();

            // Get unpaid balance on loan
            const topic = loanContract.interface.getEventTopic('NFTEvent');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

            console.log(log);

            // Update Tableland database
            const dbParams = {
                collateral: collateral,
                token_id: tokenId,
                loan_requested: false,
                committed: false
            };

            return { success: true, dbParams: dbParams };
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }
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

    const callback__UpdateLoan = async (attribute, params) => {
        setCurrentUpdateRequestStatus({ ...{ effect: true, attribute: attribute }, ...params });
    }

    const callback__WithdrawNft = async (params) => {
        setCurrentNftWithdrawStatus({ ...{ effect: true }, ...params });
    }

    /* ---------------------------------------  *
     *           FRONTEND RENDERING             *
     * ---------------------------------------  */
    const renderLoanRequestElements = async (loans, network) => {
        const { devFront } = config(network);
        const potentialLoans = loans.filter(loan => !loan.loan_requested);

        setCurrentLoanRequestElement(
            <BorrowerLoanRequestForm
                currentAccountNfts={potentialLoans}
                submitCallback={callback__SubmitLoanRequest}
                {...DEFAULT_LOAN_REQUEST_PARAMETERS}
                _dev={devFront}
            />
        )
    }

    const renderExistingLoanElements = async (account, network, loans, loanRequestContract) => {
        const getExistingLoanElements = async () => {
            const activeLoans = loans.filter(loan => loan.loan_requested && !!loan.contract_address);
            const requestedLoans = loans.filter(loan => loan.loan_requested && !loan.contract_address);

            const currentExistingLoanElements = [];
            currentExistingLoanElements.push(
                activeLoans.map((loan) => {
                    return (
                        <BorrowerExistingLoanForm
                            key={loan.loan_number}
                            currentAccount={account}
                            currentNetwork={network}
                            currentLoanRequestContract={loanRequestContract}
                            updateLoanFunc={callback__UpdateLoan}
                            withdrawNftFunc={callback__WithdrawNft}
                            fetchNftFunc={fetchNftData}
                            {...loan}
                        />
                    )
                })
            );

            currentExistingLoanElements.push(
                requestedLoans.map((loan) => {
                    return (
                        <BorrowerExistingLoanForm
                            key={loan.loan_number}
                            currentAccount={account}
                            currentNetwork={network}
                            currentLoanRequestContract={loanRequestContract}
                            updateLoanFunc={callback__UpdateLoan}
                            fetchNftFunc={fetchNftData}
                            {...loan}
                        />
                    )
                })
            );

            return currentExistingLoanElements;
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
                        {currentLoanRequestElement}
                        <div className="wedge"></div>
                        <div className="container-loan-contracts-master">
                            <h2>Existing Loans</h2>
                            {!!currentExistingLoanElements && currentExistingLoanElements}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}