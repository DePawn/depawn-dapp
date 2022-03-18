import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import getProvider from '../utils/getProvider';
import { config } from '../utils/config.js';

const edit_emoji = "✍🏽";
const delete_emoji = "🗑️";
const cancel_emoji = "\u{274c}";

export default function ExistingLoansForm(props) {
    const [currentNftCommitStatus, setCurrentNftCommitStatus] = useState(false);
    const [currentEdit, setCurrentEdit] = useState('');

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

    useEffect(() => {
        currentNftCommitStatusSetter();
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
            return false;
        }
    }

    async function withdrawNft() {
        // Get contract LoanRequest contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);
        const { loanRequestAddress, loanRequestABI } = config(props.currentNetwork);

        const loanRequestContract = new ethers.Contract(
            loanRequestAddress,
            loanRequestABI,
            borrower
        );

        // Withdraw ERC721 from LoanRequest contract
        try {
            await loanRequestContract.withdrawNFT(ethers.BigNumber.from(props.loanNumber));
            return true;
        }
        catch (err) {
            return false;
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
                <img
                    src={props.imgUrl.replace('ipfs://', 'https://ipfs.io/')}
                    alt={props.imgUrl}
                    key={props.loanNumber}
                    className={`image image-existing-loan-nft image-existing-loan-nft-${props.loanNumber}`}
                />
                : <div className="container-no-image">☹️💀 No image rendered 💀☹️</div>
        )
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
                            withdrawNft().then((res) => { setCurrentNftCommitStatus(!res) })
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
                    className={`button button - existing - loan button - existing - loan - sign ${currentNftCommitStatus ? " button-enabled" : " button-disabled"}`}>
                    Sign
                </div>
            </div>

            {/* <div className="container-existing-loan-img"> */}
            {renderNftImage()}
            {/* </div> */}
        </div >
    )
}
