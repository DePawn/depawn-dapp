import '../../static/css/LenderPage.css';
import '../../static/css/CardFlip.css';
import LenderExistingLoanForm from './LenderExistingLoanForm';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config';
import { fetchRowsWhere, updateTable } from '../../external/tablelandInterface';
import { getSubAddress } from '../../utils/addressUtils';

export default function BorrowerPage() {
    const [isPageLoad, setIsPageLoad] = useState(true);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [currentNetwork, setCurrentNetwork] = useState(null);
    const [currentAccountNfts, setCurrentAccountNfts] = useState('');
    const [currentAvailableLoans, setCurrentAvailableLoans] = useState({});
    const [currentAvailableLoanElements, setCurrentAvailableLoanElements] = useState('');
    const [currentSponsoredLoanElements, setCurrentSponsoredLoanElements] = useState('');

    useEffect(() => {
        console.log('Page loading...');
        pageLoadSequence();
        // eslint-disable-next-line
    }, []);

    /* ---------------------------------------  *
     *       EVENT SEQUENCE FUNCTIONS           *
     * ---------------------------------------  */
    const pageLoadSequence = async () => {
        /*
         *  Sequence when the page is loaded.
         */

        // Set account, network, and LoanRequest contract info
        const { account, chainId } = await __checkIfWalletIsConnected();
        const loanRequestContract = __getLoanRequestContract(account, chainId);
        console.log('--pageLoadSequence-- Account: ', account);
        console.log('--pageLoadSequence-- Network: ', chainId);

        // Render Available loan elements
        const availableLoans = await __fetchAvailableLoans(account, chainId);
        const availableLoanElements = await renderLoanElements(
            account, chainId, availableLoans, loanRequestContract
        );
        setCurrentAvailableLoanElements(availableLoanElements);

        // Render Sponsored loan elements
        const sponsoredLoans = await __fetchSponsoredLoans(account, chainId);
        const sponsoredLoanElements = await renderLoanElements(
            account, chainId, sponsoredLoans, loanRequestContract
        );
        setCurrentSponsoredLoanElements(sponsoredLoanElements);
    }

    const sponsorLoanRequestSequence = async (props) => {
        /*
         *  Sequence following the lender signing
         *  a new loan request (clicking the 'Submit
         *  Request' button).
         * 
         *  This triggers the call of the LoanRequest's
         *  setLender() function.
         */

        // Set account, network, and LoanRequest contract info
        const { account, chainId } = await __checkIfWalletIsConnected();
        const loanRequestContract = __getLoanRequestContract(account, chainId);

        // Sign loan request
        const success = await __sponsorLoanRequest(account, chainId, loanRequestContract, props);
        if (!success) return;

        // Render Available loan elements
        const availableLoans = await __fetchAvailableLoans(account, chainId);

        console.log(availableLoans);

        const availableLoanElements = await renderLoanElements(
            account, chainId, availableLoans, loanRequestContract
        );
        setCurrentAvailableLoanElements(availableLoanElements);

        // Render Sponsored loan elements
        const sponsoredLoans = await __fetchSponsoredLoans(account, chainId);

        console.log(sponsoredLoans);

        const sponsoredLoanElements = await renderLoanElements(
            account, chainId, sponsoredLoans, loanRequestContract
        );
        setCurrentSponsoredLoanElements(sponsoredLoanElements);
    }

    /* ---------------------------------------  *
     *        PAGE MODIFIED FUNCTIONS           *
     * ---------------------------------------  */
    const __checkIfWalletIsConnected = async () => {
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

    const __fetchAvailableLoans = async (account, network) => {
        const { dbTableName } = config(network);
        console.log(dbTableName)

        const colsInclude = ['lender', 'loan_requested'];
        const valsInclude = [[ethers.constants.AddressZero], ['true']];
        const conjInclude = ['AND', ''];

        const colsExclude = ['borrower'];
        const valsExclude = [[account.toLowerCase()]];
        const conjExclude = [''];

        const nfts = await fetchRowsWhere(
            dbTableName,
            [colsInclude, valsInclude, conjInclude],
            [colsExclude, valsExclude, conjExclude]
        );
        console.log(nfts)

        setCurrentAvailableLoans(nfts);

        return nfts;
    }

    const __fetchSponsoredLoans = async (account, network) => {
        const { dbTableName } = config(network);

        const colsInclude = ['lender', 'loan_requested'];
        const valsInclude = [[account.toLowerCase()], ['true']];
        const conjInclude = ['AND', ''];

        const nfts = await fetchRowsWhere(
            dbTableName,
            [colsInclude, valsInclude, conjInclude],
        );
        console.log(nfts)

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

    const __sponsorLoanRequest = async (account, network, loanRequestContract, {
        collateral,
        tokenId,
        borrower,
        loan_number,
        initial_loan_value,

    }) => {
        const { dbTableName } = config(network);

        // Sign/sponsor LoanRequest contract
        try {
            if (borrower === account) {
                throw new Error("Lender cannot be the borrower for a loan!");
            }
            console.log(initial_loan_value)

            const tx = await loanRequestContract.setLender(
                borrower, ethers.BigNumber.from(loan_number),
                { value: ethers.BigNumber.from(initial_loan_value) }
            );
            const receipt = await tx.wait();

            // Determine if a LoanContract has been created
            const topic = loanRequestContract.interface.getEventTopic('DeployedLoanContract');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
            let dbParams;

            console.log(log)

            dbParams = {
                collateral: collateral,
                token_id: tokenId,
                lender: account,
                lender_signed: true,
            };

            if (log) {
                console.log('LOAN CONTRACT DEPLOYED!!!', log)
                const triggeredEvent = loanRequestContract.interface.parseLog(log);
                const loanContractAddress = triggeredEvent.args['_contract'];
                dbParams.contract_address = loanContractAddress;
            }

            // Update Tableland database
            await updateTable(dbTableName, dbParams);

            return true;
        }
        catch (err) {
            console.log(err);
            return false;
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
                await __checkIfWalletIsConnected();
            });
        }
        catch (err) {
            console.log(err);
        }
    }

    const __callback__SponsorLoanRequest = async (props) => {
        /*
         * Submit Loan Request Button Callback
         */

        sponsorLoanRequestSequence(props);
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
                case 'expiration':
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
                        expiration: ethers.BigNumber.from(paramElement.value)
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
                    dbParams[attribute === 'value' ? 'initial_loan_value' : 'rate'] = ethers.utils.parseUnits(paramElement.value);

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
     *           FRONTEND RENDERING             *
     * ---------------------------------------  */
    const renderLoanElements = async (account, network, loans, loanRequestContract) => {
        const getExistingLoanElements = async () => {
            const currentSponsoredLoanElements = loans.map((loan, i) => {
                return (
                    <LenderExistingLoanForm
                        key={i}
                        currentAccount={account}
                        currentNetwork={network}
                        loanRequestContract={loanRequestContract}
                        sponsorLoanRequestFunc={__callback__SponsorLoanRequest}
                        updateLoanFunc={() => console.log('Do nothing')}
                        fetchNftFunc={() => console.log('Do nothing fetchNftFunc')}
                        {...loan}
                    />
                )
            });

            return currentSponsoredLoanElements;
        }

        return (
            !!loans.length && !!account && !!network
                ? (<div>{await getExistingLoanElements()}</div>)
                : (<div><div className="container-existing-loan-form">☹️💀 No loans atm 💀☹️</div></div>)
        )
    }

    /* ---------------------------------------  *
     *          LENDERPAGE.JS RETURN            *
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
                            {currentAvailableLoanElements}
                        </div>
                        <div className="wedge"></div>
                        <div className="container-loan-contracts-master">
                            <h2>Sponsored Loans</h2>
                            {!!currentSponsoredLoanElements && currentSponsoredLoanElements}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}
