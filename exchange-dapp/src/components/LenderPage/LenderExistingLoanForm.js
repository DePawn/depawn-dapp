import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config.js';
import { capitalizeWords } from '../../utils/stringUtils';
import { getSubAddress } from '../../utils/addressUtils';
import { displayContractTime } from '../../utils/timeUtils';
import { updateTable } from '../../external/tablelandInterface';

export default function LenderExistingLoanForm(props) {
    const [isPageLoad, setIsPageLoad] = useState(true);
    const [currentLenderSignStatus, setCurrentLenderSignStatus] = useState(undefined);
    const [currentLoanContract, setCurrentLoanContract] = useState('');
    const [currentWithdrawLoanElements, setCurrentWithdrawLoanElements] = useState(null);
    const [currentLoanContractStatus, setCurrentLoanContractStatus] = useState(null);

    const tabbedBullet = '\xa0\xa0- ';

    console.log(props)

    useEffect(() => {
        if (isPageLoad) {
            currentSignStatusSetter();
            currentLoanContractSetter();
            currentLoanContractStatusSetter();
            renderWithdrawLoanElements();
            setIsPageLoad(false);
        }
        // eslint-disable-next-line
    }, []);

    async function currentSignStatusSetter() {
        // Get Borrower sign status
        setCurrentLenderSignStatus(props.lender_signed);
    }

    async function currentLoanContractSetter() {
        if (!!props.contract_address) setCurrentLoanContract(props.contract_address);
    }

    async function currentLoanContractStatusSetter() {
        if (!!props.contract_address) {
            // Get contract
            const provider = getProvider();
            const lender = provider.getSigner(props.currentAccount);

            const { loanContractABI } = config(props.currentNetwork);

            const loanContract = new ethers.Contract(
                props.contract_address,
                loanContractABI,
                lender
            );

            const status = await loanContract.getStatus();
            setCurrentLoanContractStatus(status.toLowerCase());
            console.log(status)
        }
    }

    async function calcContractBalance() {
        // Get contract
        const provider = getProvider();
        const balance = await provider.getBalance(props.contract_address);
        console.log(ethers.utils.formatEther(balance))

        return balance;
    }

    async function removeSignatureFromLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Remove sign off of LoanRequest contract
        try {
            console.log(props)
            const tx = await props.loanRequestContract.removeSignature(
                props.borrower, ethers.BigNumber.from(props.loan_number)
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                lender_signed: false
            };

            await updateTable(dbTableName, dbParams);

            setCurrentLenderSignStatus(false);

            return false;
        }
        catch (err) {
            console.log(err);
            return currentLenderSignStatus;
        }
    }

    function renderNftImage() {
        return (
            !!props.img_url
                ?
                <div className="card">
                    <div
                        className="card__inner"
                        id={`card__inner__existing-${props.loan_number}`}
                        onClick={() => setCardFlipEventListener(props.loan_number)}
                    >
                        <div className={
                            `card__face card__face--front ${props.committed && !currentLoanContract
                                ? 'card__face--nft-committed'
                                : !currentLoanContract
                                    ? 'card__face--nft-uncommitted'
                                    : ''
                            }`
                        }>
                            <img
                                src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.img_url}
                                key={props.loan_number}
                                className={`image image-available-loan-nft image-available-loan-nft-front image-available-loan-nft-${props.loan_number}`}
                            />
                        </div>

                        <div className={
                            `card__face card__face--back ${props.committed && !currentLoanContract
                                ? 'card__face--nft-committed'
                                : !currentLoanContract
                                    ? 'card__face--nft-uncommitted'
                                    : ''
                            }`
                        }>
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.img_url}
                                        key={props.loan_number}
                                        className={`image image-available-loan-nft image-available-loan-nft-back image-available-loan-nft-${props.loan_number}`}
                                    />
                                    <h3 className="h3__header__back">{props.name}</h3>
                                </div>

                                <div className="card__body">
                                    <dl>
                                        <dt>Contract Info:</dt>
                                        <dd>{tabbedBullet}<span className="attr_label">Mint Date: </span>{props.mint_date}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Symbol: </span>{props.symbol}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Type: </span>{props.type}</dd><br />
                                        <dt>Sales Statistics</dt>
                                        {renderNftStat(props.contract_statistics)}
                                    </dl>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
                : <div className="container-no-image">☹️💀 No image rendered 💀☹️</div>
        )
    }

    function renderNftStat(contract_stats) {
        const contractStatsElements = Object.keys(contract_stats).map((key, i) => {
            return (
                <dd key={i}>{tabbedBullet}<span className="attr_label">{capitalizeWords(key)}: </span>{contract_stats[key]}</dd>
            )
        })
        return contractStatsElements;
    }

    function renderUnconfirmedButtons() {
        return (
            <div className="container-available-loan-buttons">
                <div
                    id={"button-available-loan-sign-" + props.loan_number}
                    className="button button-available-loan button-available-loan-sign"
                    onClick={!!currentLenderSignStatus
                        ? removeSignatureFromLoanRequest
                        : () => { props.sponsorLoanRequestFunc(props).then((res) => { setCurrentLenderSignStatus(res) }) }
                    }
                >
                    {!!currentLenderSignStatus ? "Unsign" : "Sign"}
                </div>
            </div>
        );
    }

    function renderContractElement() {
        return (
            <div className="container-available-loan-component">
                <div className="label label-contract">Contract:</div>
                <input
                    type="string"
                    id={"input-available-loan-contract-" + props.loan_number}
                    className="input input-available-loan-contract"
                    defaultValue={currentLoanContract}
                    readOnly={true}>
                </input>
            </div>
        );
    }

    function renderUnpaidBalanceElement() {
        return (
            <div className="container-available-loan-component">
                <div className="label label-unpaid-balance">Balance:</div>
                <input
                    type="string"
                    id={"input-available-loan-unpaid-balance-" + props.loan_number}
                    className="input input-available-loan-unpaid-balance"
                    defaultValue={ethers.utils.formatEther(props.unpaid_balance)}
                    readOnly={true}>
                </input>
            </div>
        );
    }

    async function renderWithdrawLoanElements() {
        setCurrentWithdrawLoanElements(
            <div className="container-active-loan-component">
                <div
                    className="button button-active-loan-withdraw"
                    onClick={() => props.withdrawFunc(props)}
                >Pull</div>
                <input
                    type="string"
                    id={"input-available-loan-withdraw-" + props.loan_number}
                    className="input input-available-loan-withdraw"
                    value={ethers.utils.formatEther(await calcContractBalance())}
                    readOnly={true}>
                </input>
            </div>
        );
    }

    function setCardFlipEventListener(loanNumber) {
        const card = document.getElementById(`card__inner__existing-${loanNumber}`);
        card.classList.toggle('is-flipped');
    }

    console.log(currentLoanContract)
    return (
        <div className={`container-available-loan-form ${!!currentLoanContract ? 'container-active-loan' : ''}`}>
            <h3>
                {!!currentLoanContract && `${capitalizeWords(currentLoanContractStatus)} Loan `}
                {!!currentLoanContract
                    ? <span style={{ 'textDecoration': 'underline' }}>{getSubAddress(`${props.contract_address}`)}</span>
                    : ''}
            </h3>

            <div className="container-available-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-available-loan-nft-" + props.loan_number}
                    className="input input-available-loan-nft"
                    placeholder='NFT Address...'
                    value={props.collateral}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-token-id">Token ID:</div>
                <input
                    type="string"
                    id={"input-available-loan-token-id-" + props.loan_number}
                    className="input input-available-loan-token-id"
                    placeholder='Token ID...'
                    value={props.tokenId}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-value">Amount:</div>
                <input
                    type="string"
                    id={"input-available-loan-value-" + props.loan_number}
                    className="input input-available-loan-value"
                    placeholder='Loan Value (ETH)...'
                    value={ethers.utils.formatEther(props.initial_loan_value)}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-rate">Rate:</div>
                <input
                    type="string"
                    id={"input-available-loan-rate-" + props.loan_number}
                    className="input input-available-loan-rate"
                    placeholder='%...'
                    value={props.rate}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-expiration">Maturity:</div>
                <input
                    type="string"
                    id={"input-available-loan-expiration-" + props.loan_number}
                    className="input input-available-loan-expiration"
                    defaultValue={displayContractTime(props.expiration)}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-borrower">Borrower:</div>
                <input
                    type="string"
                    id={"input-available-loan-borrower-" + props.loan_number}
                    className={
                        `input input-available-loan-borrower ${props.borrower_signed && !currentLoanContract
                            ? 'input-available-loan-borrower--signed'
                            : !currentLoanContract
                                ? 'input-available-loan-borrower--unsigned'
                                : ''}`
                    }
                    placeholder='Not set...'
                    value={props.borrower}
                    readOnly={true}>
                </input>
            </div>

            {!!currentLoanContract
                ? renderContractElement() && renderUnpaidBalanceElement()
                : renderUnconfirmedButtons()
            }

            {!!currentLoanContract && ['active', 'paid', 'default'].includes(currentLoanContractStatus)
                ? currentWithdrawLoanElements
                : null
            }

            <div className="container-available-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}