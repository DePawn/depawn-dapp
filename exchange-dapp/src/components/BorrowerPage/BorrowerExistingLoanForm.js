import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../../utils/getProvider';
import { config } from '../../utils/config.js';
import { capitalizeWords } from '../../utils/stringUtils';

const edit_emoji = "✍🏽";
const delete_emoji = "🗑️";
const cancel_emoji = "\u{274c}";

export default function BorrowerExistingLoanForm(props) {
    const [currentNftCommitStatus, setCurrentNftCommitStatus] = useState(false);
    const [currentSignStatus, setCurrentSignStatus] = useState(undefined);
    const [currentEdit, setCurrentEdit] = useState('');
    const tabbedBullet = '\xa0\xa0- ';

    // console.log(props)

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

            // If lender, set to address 0
            if (name === 'lender') removeLender();
        }
    }

    async function currentNftCommitStatusSetter() {
        // Get contract LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);
        const { loanRequestAddress, erc721, erc1155 } = config(props.currentNetwork);

        // Get ERC721 contract
        const nftContract = new ethers.Contract(props.collateral, props.ercType === 'erc115' ? erc1155 : erc721, borrower);
        let nftOwner = await nftContract.ownerOf(props.tokenId);

        nftContract.on('Transfer', async (ev) => { })

        // Identify if LoanRequest contract currently owns ERC721
        setCurrentNftCommitStatus(nftOwner === loanRequestAddress);
    }

    async function currentSignStatusSetter() {
        // Get Borrower sign status
        try {
            const signStatus = await props.currentLoanRequestContract.getSignStatus(
                props.currentAccount, props.currentAccount, props.loanNumber
            );
            if (!signStatus) console.log('Not signed')
            setCurrentSignStatus(signStatus);
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
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
        const durationElement = document.getElementById("input-existing-loan-duration-" + props.loanNumber);
        const lenderElement = document.getElementById("input-existing-loan-lender-" + props.loanNumber);

        if (exclusion !== "nft") nftElement.value = props.collateral;
        if (exclusion !== "token-id") tokenIdElement.value = props.tokenId;
        if (exclusion !== "value") valueElement.value = ethers.utils.formatEther(props.initialLoanValue);
        if (exclusion !== "rate") rateElement.value = ethers.utils.formatEther(props.rate);
        if (exclusion !== "duration") durationElement.value = props.duration;
        if (exclusion !== "lender") lenderElement.value = !!parseInt(props.lender, 16) ? props.lender : "Unassigned 😞";
    }

    async function commitNft() {
        // Get contract LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);
        const { loanRequestAddress, erc721 } = config(props.currentNetwork);

        try {
            // Get ERC721 contract
            const nftContract = new ethers.Contract(props.collateral, erc721, borrower);

            // Transfer ERC721 to LoanRequest contract
            await nftContract["safeTransferFrom(address,address,uint256)"](
                props.currentAccount, loanRequestAddress, props.tokenId
            );
            return true;
        }
        catch (err) {
            console.log(err);
            return currentNftCommitStatus;
        }
    }

    async function withdrawNft() {
        // Withdraw ERC721 from LoanRequest contract
        try {
            await props.currentLoanRequestContract.withdrawNFT(ethers.BigNumber.from(props.loanNumber));
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }

    async function signLoanRequest() {
        // Sign LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.sign(
                props.currentAccount, ethers.BigNumber.from(props.loanNumber)
            );
            await tx.wait();
            return true;
        }
        catch (err) {
            console.log(err);
            return currentSignStatus;
        }
    }

    async function removeSignatureFromLoanRequest() {
        // Sign LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.removeSignature(
                props.currentAccount, ethers.BigNumber.from(props.loanNumber)
            );
            await tx.wait();
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
            !!props.imgUrl
                ?
                <div className="card">
                    <div className="card__inner" id={`card__inner__existing-${props.loanNumber}`} onClick={() => setCardFlipEventListener(props.loanNumber)}>
                        <div className="card__face card__face--front">
                            <img
                                src={props.imgUrl.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.imgUrl}
                                key={props.loanNumber}
                                className={`image image-existing-loan-nft image-existing-loan-nft-front image-existing-loan-nft-${props.loanNumber}`}
                            />
                        </div>

                        <div className="card__face card__face--back">
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.imgUrl.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.imgUrl}
                                        key={props.loanNumber}
                                        className={`image image-existing-loan-nft image-existing-loan-nft-back image-existing-loan-nft-${props.loanNumber}`}
                                    />
                                    <h3 className="h3__header__back">{props.nft.name}</h3>
                                </div>

                                <div className="card__body">
                                    <dl>
                                        <dt>Contract Info:</dt>
                                        <dd>{tabbedBullet}<span className="attr_label">Mint Date: </span>{props.nft.mint_date}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Symbol: </span>{props.nft.symbol}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Type: </span>{props.nft.type}</dd><br />
                                        <dt>Sales Statistics</dt>
                                        {renderNftStat(props.nft.contract_statistics)}
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

    return (
        <div className="container-existing-loan-form">
            <h3>Loan #{props.loanNumber + 1}</h3>

            <div className="container-existing-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-existing-loan-nft-" + props.loanNumber}
                    className="input input-existing-loan-nft"
                    placeholder='NFT Address...'
                    defaultValue={props.collateral}
                    readOnly={currentEdit !== "nft"}>
                </input>
                <div
                    id={"edit-nft-" + props.loanNumber}
                    className="button button-edit button-edit-nft button-enabled">
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
                    readOnly={currentEdit !== "token-id"}>
                </input>
                <div
                    id={"edit-token-id-" + props.loanNumber}
                    className="button button-edit button-edit-token-id button-enabled">
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-value">Amount:</div>
                <input
                    type="string"
                    id={"input-existing-loan-value-" + props.loanNumber}
                    className="input input-existing-loan-value"
                    placeholder='Loan Value (ETH)...'
                    defaultValue={ethers.utils.formatEther(props.initialLoanValue)}
                    readOnly={currentEdit !== "value"}>
                </input>
                <div
                    id={"edit-value-" + props.loanNumber}
                    className="button button-edit button-edit-value button-enabled"
                    onClick={() => {
                        setEditName("value");
                        restoreVals("value");
                    }}>
                    {currentEdit !== "value" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-rate">Rate:</div>
                <input
                    type="string"
                    id={"input-existing-loan-rate-" + props.loanNumber}
                    className="input input-existing-loan-rate"
                    placeholder='Rate...'
                    defaultValue={ethers.utils.formatEther(props.rate)}
                    readOnly={currentEdit !== "rate"}>
                </input>
                <div
                    id={"edit-rate-{props.loanNumber}"}
                    className="button button-edit button-edit-rate button-enabled"
                    onClick={() => {
                        setEditName("rate");
                        restoreVals("rate");
                    }}>
                    {currentEdit !== "rate" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-duration">Duration:</div>
                <input
                    type="string"
                    id={"input-existing-loan-duration-" + props.loanNumber}
                    className="input input-existing-loan-duration"
                    placeholder='Duration (months)...'
                    defaultValue={props.duration}
                    readOnly={currentEdit !== "duration"}>
                </input>
                <div
                    id={"edit-duration-" + props.loanNumber}
                    className="button button-edit button-edit-duration button-enabled"
                    onClick={() => {
                        setEditName("duration");
                        restoreVals("duration");
                    }}>
                    {currentEdit !== "duration" ? edit_emoji : cancel_emoji}
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
                    readOnly>
                </input>
                <div
                    id={"edit-lender-" + props.loanNumber}
                    className="button button-edit button-edit-lender button-enabled"
                    onClick={() => {
                        setEditName("lender");
                        restoreVals("lender");
                    }}>
                    {currentEdit !== "lender" ? delete_emoji : cancel_emoji}
                </div>
            </div>

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
                    className="button button-existing-loan button-existing-loan-update button-enabled"
                    onClick={() => {
                        props.updateLoanFunc(props.loanNumber, currentEdit)
                            .then(() => { setCurrentEdit(''); });
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

            <div className="container-existing-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}
