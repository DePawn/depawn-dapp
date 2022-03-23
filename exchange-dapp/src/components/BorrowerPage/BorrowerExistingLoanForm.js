import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config.js';
import { capitalizeWords } from '../../utils/stringUtils';
import { getSubAddress } from '../../utils/addressUtils';
import { displayContractTime } from '../../utils/timeUtils';
import { updateTable } from '../../external/tablelandInterface';

const edit_emoji = "✍🏽";
const delete_emoji = "🗑️";
const cancel_emoji = "\u{274c}";

export default function BorrowerExistingLoanForm(props) {
    const [currentNftCommitStatus, setCurrentNftCommitStatus] = useState(false);
    const [currentSignStatus, setCurrentSignStatus] = useState(undefined);
    const [currentEdit, setCurrentEdit] = useState('');
    const tabbedBullet = '\xa0\xa0- ';

    console.log(props)

    function setEditName(name) {
        if (name === currentEdit) {
            /* If the cancel button ("❌") is hit... */
            // Restore currentEdit to default
            setCurrentEdit('');

            // Restore all inputs to defaults
            restoreVals('');
        }
        else {
            /* If the change button ("✍️") is hit... */
            // Set currentEdit to the field being editted
            setCurrentEdit(name);
            console.log(name)

            // If lender, set to address 0
            if (name === 'lender') removeLender();
        }
    }

    async function currentNftCommitStatusSetter() {
        // Get contract LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);
        const { loanRequestAddress, erc721 } = config(props.currentNetwork);

        // Get ERC721 contract
        const nftContract = new ethers.Contract(props.collateral, erc721, borrower);
        let nftOwner = await nftContract.ownerOf(props.tokenId);

        nftContract.on('Transfer', async (ev) => { })

        // Identify if LoanRequest contract currently owns ERC721
        setCurrentNftCommitStatus(nftOwner === loanRequestAddress);
    }

    async function currentSignStatusSetter() {
        // Get Borrower sign status
        setCurrentSignStatus(props.borrower_signed);
    }

    useEffect(() => {
        currentNftCommitStatusSetter();
        currentSignStatusSetter();
        // eslint-disable-next-line
    }, []);

    function restoreVals(exclusion) {
        const nftElement = document.getElementById("input-existing-loan-nft-" + props.loanNumber);
        const tokenIdElement = document.getElementById("input-existing-loan-token-id-" + props.loanNumber);
        const valueElement = document.getElementById("input-existing-loan-value-" + props.loanNumber);
        const rateElement = document.getElementById("input-existing-loan-rate-" + props.loanNumber);
        const durationElement = document.getElementById("input-existing-loan-expiration-" + props.loanNumber);
        const lenderElement = document.getElementById("input-existing-loan-lender-" + props.loanNumber);

        if (exclusion !== "nft") nftElement.value = props.collateral;
        if (exclusion !== "token-id") tokenIdElement.value = props.tokenId;
        if (exclusion !== "value") valueElement.value = ethers.utils.formatEther(props.initial_loan_value);
        if (exclusion !== "rate") rateElement.value = props.rate;
        if (exclusion !== "expiration") durationElement.value = displayContractTime(props.expiration);
        if (exclusion !== "lender") lenderElement.value = !!parseInt(props.lender, 16) ? props.lender : "Unassigned 😞";
    }

    async function commitNft() {
        // Get contract LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);
        const { loanRequestAddress, erc721, dbTableName } = config(props.currentNetwork);

        try {
            // Get ERC721 contract
            const nftContract = new ethers.Contract(props.collateral, erc721, borrower);

            // Transfer ERC721 to LoanRequest contract
            const tx = await nftContract["safeTransferFrom(address,address,uint256)"](
                props.currentAccount, loanRequestAddress, ethers.BigNumber.from(props.tokenId)
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                committed: true
            };

            await updateTable(dbTableName, dbParams);

            return true;
        }
        catch (err) {
            console.log(err);
            return currentNftCommitStatus;
        }
    }

    async function withdrawNft() {
        const { dbTableName } = config(props.currentNetwork);

        // Withdraw ERC721 from LoanRequest contract
        try {
            await props.currentLoanRequestContract.withdrawNFT(props.loanNumber);

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                committed: false
            };

            await updateTable(dbTableName, dbParams);

            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }

    async function signLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Sign LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.sign(
                props.currentAccount, ethers.BigNumber.from(props.loanNumber.toString())
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                borrower_signed: true
            };

            await updateTable(dbTableName, dbParams);

            return true;
        }
        catch (err) {
            console.log(err);
            return currentSignStatus;
        }
    }

    async function removeSignatureFromLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Remove sign off of LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.removeSignature(
                props.currentAccount, ethers.BigNumber.from(props.loanNumber.toString())
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                borrower_signed: false
            };

            await updateTable(dbTableName, dbParams);
            return false;
        }
        catch (err) {
            console.log(err);
            return currentSignStatus;
        }
    }

    function removeLender() {
        const lenderElement = document.getElementById("input-existing-loan-lender-" + props.loanNumber);
        lenderElement.value = ethers.constants.AddressZero;
    }

    function renderNftImage() {
        return (
            !!props.img_url
                ?
                <div className="card">
                    <div className="card__inner" id={`card__inner__existing-${props.loanNumber}`} onClick={() => setCardFlipEventListener(props.loanNumber)}>
                        <div className="card__face card__face--front">
                            <img
                                src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.img_url}
                                key={props.loanNumber.toString()}
                                className={`image image-existing-loan-nft image-existing-loan-nft-front image-existing-loan-nft-${props.loanNumber}`}
                            />
                        </div>

                        <div className="card__face card__face--back">
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.img_url}
                                        key={props.loanNumber.toString()}
                                        className={`image image-existing-loan-nft image-existing-loan-nft-back image-existing-loan-nft-${props.loanNumber}`}
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

    function renderLoanRequestButtons() {
        return (
            <div className="container-existing-loan-buttons">
                <div
                    id={"button-existing-loan-update-" + props.loanNumber}
                    className="button button-existing-loan button-existing-loan-commit button-enabled"
                    onClick={() => {
                        if (!currentNftCommitStatus) {
                            commitNft().then((res) => { setCurrentNftCommitStatus(res); });
                        }
                        else {
                            removeSignatureFromLoanRequest().then((res) => { setCurrentSignStatus(res) });
                            withdrawNft().then((res) => { setCurrentNftCommitStatus(!res) });
                        }
                    }}>
                    {currentNftCommitStatus ? "Withdraw NFT" : "Commit NFT"}
                </div>

                <div
                    id={"button-existing-loan-update-" + props.loanNumber}
                    className={`button button-existing-loan button-existing-loan-update ${!!currentEdit ? " button-enabled" : " button-disabled"}`}
                    onClick={() => {
                        if (!!currentEdit) {
                            props.updateLoanFunc(currentEdit, props)
                                .then(() => { setCurrentEdit(''); });
                        }
                    }}>
                    Update
                </div>

                <div
                    id={"button-existing-loan-sign-" + props.loanNumber}
                    className={`button button-existing-loan button-existing-loan-sign ${currentNftCommitStatus || currentSignStatus ? " button-enabled" : " button-disabled"}`}
                    onClick={() => {
                        if (!currentSignStatus && currentNftCommitStatus) {
                            signLoanRequest().then((res) => { setCurrentSignStatus(res) });
                        }
                        else if (currentSignStatus) {
                            removeSignatureFromLoanRequest().then((res) => { setCurrentSignStatus(res) });
                        }
                    }}>
                    {!currentSignStatus ? "Sign" : "Unsign"}
                </div>
            </div>
        );
    }

    function renderActiveLoanContractElement() {
        return (
            <div className="container-existing-loan-component">
                <div className="label label-contract">Contract:</div>
                <input
                    type="string"
                    id={"input-existing-loan-contract-" + props.loanNumber}
                    className="input input-existing-loan-contract"
                    defaultValue={props.contract_address}
                    readOnly={true}>
                </input>
                <div
                    className="button-none">
                </div>
            </div>
        );
    }

    function renderPayLoanElements() {
        return (
            <div className="container-active-loan-component">
                <div className="button-existing-loan-pay button-enabled">Pay</div>
                <input
                    type="string"
                    id={"input-existing-loan-lender-" + props.loanNumber}
                    className="input input-existing-loan-pay"
                    placeholder='(ETH)...'>
                </input>
                <div id={"edit-pay-" + props.loanNumber} className="button-none"></div>
            </div>
        );
    }

    function setCardFlipEventListener(idx) {
        const card = document.getElementById(`card__inner__existing-${idx}`);
        card.classList.toggle('is-flipped');
    }

    return (
        <div className={`container-existing-loan-form ${!!props.contract_address ? 'container-active-loan' : ''}`}>
            <h3>
                {!!props.contract_address && 'Active Loan '}
                {!!props.contract_address
                    ? <span style={{ 'textDecoration': 'underline' }}>{getSubAddress(props.contract_address)}</span>
                    : `Loan Request #${props.loanNumber + 1 - props.offset}`}
            </h3>

            <div className="container-existing-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-existing-loan-nft-" + props.loanNumber}
                    className="input input-existing-loan-nft"
                    placeholder='NFT Address...'
                    defaultValue={props.collateral}
                    readOnly={currentEdit !== "nft"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-nft-" + props.loanNumber}
                    className="button button-edit button-edit-nft button-disabled">
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-token-id">Token ID:</div>
                <input
                    type="string"
                    id={"input-existing-loan-token-id-" + props.loanNumber}
                    className="input input-existing-loan-token-id"
                    placeholder='Token ID...'
                    defaultValue={props.tokenId}
                    readOnly={currentEdit !== "token-id"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-token-id-" + props.loanNumber}
                    className="button button-edit button-edit-token-id button-disabled">
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-value">{!!props.contract_address ? 'Balance:' : 'Amount:'}</div>
                <input
                    type="string"
                    id={"input-existing-loan-value-" + props.loanNumber}
                    className="input input-existing-loan-value"
                    placeholder='Loan Value (ETH)...'
                    defaultValue={ethers.utils.formatEther(props.unpaid_balance)}
                    readOnly={currentEdit !== "value"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-value-" + props.loanNumber}
                    className={`${!!props.contract_address ? 'button-none' : 'button button-edit button-edit-value'}`}
                    onClick={() => {
                        if (!props.contract_address) {
                            setEditName("value");
                            restoreVals("value");
                        }
                    }}>
                    {currentEdit !== "value" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-rate">Rate:</div>
                <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    id={"input-existing-loan-rate-" + props.loanNumber}
                    className="input input-existing-loan-rate"
                    placeholder='Rate...'
                    defaultValue={props.rate}
                    readOnly={currentEdit !== "rate"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-rate-{props.loanNumber}"}
                    className={`${!!props.contract_address ? 'button-none' : 'button button-edit button-edit-rate button-enabled'}`}
                    onClick={() => {
                        if (!props.contract_address) {
                            setEditName("rate");
                            restoreVals("rate");
                        }
                    }}>
                    {currentEdit !== "rate" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-expiration">Maturity:</div>
                <input
                    type="date"
                    id={"input-existing-loan-expiration-" + props.loanNumber}
                    className="input input-existing-loan-expiration"
                    min={displayContractTime(props.expiration)}
                    defaultValue={displayContractTime(props.expiration)}
                    readOnly={currentEdit !== "expiration"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-expiration-" + props.loanNumber}
                    className={`${!!props.contract_address ? 'button-none' : 'button button-edit button-edit-expiration button-enabled'}`}
                    onClick={() => {
                        if (!props.contract_address) {
                            setEditName("expiration");
                            restoreVals("expiration");
                        }
                    }}>
                    {currentEdit !== "expiration" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-lender">Lender:</div>
                <input
                    type="string"
                    id={"input-existing-loan-lender-" + props.loanNumber}
                    className="input input-existing-loan-lender"
                    placeholder='Not set...'
                    defaultValue={!!parseInt(props.lender, 16) ? props.lender : "Unassigned 😞"}
                    readOnly
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-lender-" + props.loanNumber}
                    className={`${!!props.contract_address ? 'button-none' : 'button button-edit button-edit-lender button-enabled'}`}
                    onClick={() => {
                        if (!props.contract_address) {
                            setEditName("lender");
                            restoreVals("lender");
                        }
                    }}>
                    {currentEdit !== "lender" ? delete_emoji : cancel_emoji}
                </div>
            </div>

            {!!props.contract_address
                ? renderActiveLoanContractElement() && renderPayLoanElements()
                : renderLoanRequestButtons()
            }

            <div className="container-existing-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}
