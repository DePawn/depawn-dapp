import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config.js';
import { capitalizeWords } from '../../utils/stringUtils';
import { getSubAddress } from '../../utils/addressUtils';
import { displayContractTime } from '../../utils/timeUtils';
import { updateTable } from '../../external/tablelandInterface';

export default function LenderExistingLoanForm(props) {
    const [currentLenderSignStatus, setCurrentLenderSignStatus] = useState(undefined);
    const offsetLoanNumber = props.loanNumber + props.offset;
    const tabbedBullet = '\xa0\xa0- ';

    // console.log(props)

    async function currentSignStatusSetter() {
        // Get Borrower sign status
        setCurrentLenderSignStatus(props.lender_signed);
    }

    useEffect(() => {
        currentSignStatusSetter();
        // eslint-disable-next-line
    }, []);

    async function removeSignatureFromLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Remove sign off of LoanRequest contract
        try {
            console.log(props)
            const tx = await props.loanRequestContract.removeSignature(
                props.borrower, ethers.BigNumber.from(offsetLoanNumber)
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                lender_signed: false
            };

            await updateTable(dbTableName, dbParams);

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
                        id={`card__inner__existing-${offsetLoanNumber}`}
                        onClick={() => setCardFlipEventListener(offsetLoanNumber)}
                    >
                        <div className={`card__face card__face--front ${props.committed ? 'card__face--nft-committed' : 'card__face--nft-uncommitted'}`}>
                            <img
                                src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.img_url}
                                key={offsetLoanNumber}
                                className={`image image-available-loan-nft image-available-loan-nft-front image-available-loan-nft-${offsetLoanNumber}`}
                            />
                        </div>

                        <div className={`card__face card__face--back ${props.committed ? 'card__face--nft-committed' : 'card__face--nft-uncommitted'}`}>
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.img_url}
                                        key={offsetLoanNumber}
                                        className={`image image-available-loan-nft image-available-loan-nft-back image-available-loan-nft-${offsetLoanNumber}`}
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

    function setCardFlipEventListener(idx) {
        const card = document.getElementById(`card__inner__existing-${idx}`);
        card.classList.toggle('is-flipped');
    }

    console.log(props)
    // console.log(ethers.utils.formatEther(props.initial_loan_value))

    return (
        <div className="container-available-loan-form">
            <h3>Loan {!!props.contract_address
                ? <span style={{ 'textDecoration': 'underline' }}>{getSubAddress(`${props.contract_address}`)}</span>
                : `# ${props.loanNumber + 1}`}
            </h3>

            <div className="container-available-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-available-loan-nft-" + offsetLoanNumber}
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
                    id={"input-available-loan-token-id-" + offsetLoanNumber}
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
                    id={"input-available-loan-value-" + offsetLoanNumber}
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
                    id={"input-available-loan-rate-" + offsetLoanNumber}
                    className="input input-available-loan-rate"
                    placeholder='Rate...'
                    value={props.rate}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-expiration">Maturity:</div>
                <input
                    type="string"
                    id={"input-available-loan-expiration-" + offsetLoanNumber}
                    className="input input-available-loan-expiration"
                    defaultValue={displayContractTime(props.expiration)}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-borrower">Borrower:</div>
                <input
                    type="string"
                    id={"input-available-loan-borrower-" + offsetLoanNumber}
                    className={`input input-available-loan-borrower ${props.borrower_signed ? 'input-available-loan-borrower--signed' : 'input-available-loan-borrower--unsigned'}`}
                    placeholder='Not set...'
                    value={props.borrower}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-buttons">

                <div
                    id={"button-available-loan-sign-" + offsetLoanNumber}
                    className="button button-available-loan button-available-loan-sign"
                    onClick={() => {
                        !!currentLenderSignStatus
                            ? removeSignatureFromLoanRequest().then((res) => { setCurrentLenderSignStatus(res) })
                            : props.sponsorLoanRequestFunc(props).then((res) => { setCurrentLenderSignStatus(res) })
                    }}
                >
                    {!!currentLenderSignStatus ? "Unsign" : "Sign"}
                </div>

            </div>

            <div className="container-available-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}
