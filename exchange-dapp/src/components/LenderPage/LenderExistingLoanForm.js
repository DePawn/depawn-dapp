import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config.js';
import { capitalizeWords } from '../../utils/stringUtils';
import { updateTable } from '../../external/tablelandInterface';

export default function LenderExistingLoanForm(props) {
    const [currentLenderSignStatus, setCurrentLenderSignStatus] = useState(undefined);
    const tabbedBullet = '\xa0\xa0- ';

    // console.log(props)

    async function sponsorLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Sign/sponsor LoanRequest contract
        try {
            console.log(props)

            if (props.borrower === props.currentAccount) {
                throw new Error("Lender cannot be the borrower for a loan!");
            }

            // console.log(ethers.BigNumber.from(props))

            console.log('z')

            const tx = await props.currentLoanRequestContract.setLender(
                props.borrower, props.loanNumber,
                { value: props.initial_loan_value }
            );
            const receipt = await tx.wait();
            console.log(receipt);

            console.log('a')

            // Determine if contract has been created
            const topic = props.currentLoanRequestContract.interface.getEventTopic('DeployedLoanContract');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
            let dbParams;

            console.log('b')

            console.log(log)

            dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                lender: props.currentAccount,
                lender_signed: true,
            };

            if (log) {
                console.log('LOAN CONTRACT DEPLOYED!!!', log)
                const triggeredEvent = props.currentLoanRequestContract.interface.parseLog(log);
                const loanContractAddress = triggeredEvent.args['_contract'];
                dbParams.contract_address = loanContractAddress;
            }

            // Update Tableland database
            await updateTable(dbTableName, dbParams);

            return true;
        }
        catch (err) {
            console.log(err);
            return currentLenderSignStatus;
        }
    }

    async function removeSignatureFromLoanRequest() {
        // // Sign LoanRequest contract
        // try {
        //     console.log(props)
        //     const tx = await props.currentLoanRequestContract.removeSignature(
        //         props.currentAccount, ethers.BigNumber.from(props.loanNumber)
        //     );
        //     await tx.wait();
        //     return false;
        // }
        // catch (err) {
        //     console.log(err);
        //     return currentLenderSignStatus;
        // }
    }

    function removeLender() {
        // const lenderElement = document.getElementById("input-available-loan-lender-" + props.loanNumber);
        // lenderElement.value = ethers.constants.AddressZero;
    }

    function renderNftImage() {
        return (
            !!props.img_url
                ?
                <div className="card">
                    <div
                        className="card__inner"
                        id={`card__inner__existing-${props.loanNumber}`}
                        onClick={() => setCardFlipEventListener(props.loanNumber)}
                    >
                        <div className={`card__face card__face--front ${props.committed ? 'card__face--nft-committed' : 'card__face--nft-uncommitted'}`}>
                            <img
                                src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.img_url}
                                key={props.loanNumber}
                                className={`image image-available-loan-nft image-available-loan-nft-front image-available-loan-nft-${props.loanNumber}`}
                            />
                        </div>

                        <div className={`card__face card__face--back ${props.committed ? 'card__face--nft-committed' : 'card__face--nft-uncommitted'}`}>
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.img_url}
                                        key={props.loanNumber}
                                        className={`image image-available-loan-nft image-available-loan-nft-back image-available-loan-nft-${props.loanNumber}`}
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
            <h3>Loan #{props.loanNumber + 1}</h3>

            <div className="container-available-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-available-loan-nft-" + props.loanNumber}
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
                    id={"input-available-loan-token-id-" + props.loanNumber}
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
                    id={"input-available-loan-value-" + props.loanNumber}
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
                    id={"input-available-loan-rate-" + props.loanNumber}
                    className="input input-available-loan-rate"
                    placeholder='Rate...'
                    value={props.rate}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-duration">Duration:</div>
                <input
                    type="string"
                    id={"input-available-loan-duration-" + props.loanNumber}
                    className="input input-available-loan-duration"
                    placeholder='Duration (months)...'
                    defaultValue={props.duration}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-component">
                <div className="label label-borrower">Borrower:</div>
                <input
                    type="string"
                    id={"input-available-loan-borrower-" + props.loanNumber}
                    className={`input input-available-loan-borrower ${props.borrower_signed ? 'input-available-loan-borrower--signed' : 'input-available-loan-borrower--unsigned'}`}
                    placeholder='Not set...'
                    value={props.borrower}
                    readOnly={true}>
                </input>
            </div>

            <div className="container-available-loan-buttons">

                <div
                    id={"button-available-loan-sign-" + props.loanNumber}
                    className="button button-available-loan button-available-loan-sign"
                    onClick={() => {
                        if (!currentLenderSignStatus) {
                            sponsorLoanRequest().then((res) => { setCurrentLenderSignStatus(res) });
                        }
                        else if (currentLenderSignStatus) {
                            removeSignatureFromLoanRequest().then((res) => { setCurrentLenderSignStatus(res) });
                        }
                    }}>
                    {!currentLenderSignStatus ? "Sign" : "Unsign"}
                </div>

            </div>

            <div className="container-available-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}
