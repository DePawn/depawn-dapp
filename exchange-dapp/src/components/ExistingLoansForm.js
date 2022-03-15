import React, { useState } from 'react';
import { ethers } from 'ethers';

const edit_emoji = "\u{270d}";
const cancel_emoji = "\u{274c}";

export default function ExistingLoansForm(props) {
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
        }
    }

    function restoreVals(exclusion) {
        const nftElement = document.getElementById("input-existing-loan-nft-" + props.loanNumber);
        const tokenIdElement = document.getElementById("input-existing-loan-token-id-" + props.loanNumber);
        const valueElement = document.getElementById("input-existing-loan-value-" + props.loanNumber);
        const rateElement = document.getElementById("input-existing-loan-rate-" + props.loanNumber);
        const durationElement = document.getElementById("input-existing-loan-duration-" + props.loanNumber);

        if (exclusion !== "nft") nftElement.value = props.collateral;
        if (exclusion !== "token-id") tokenIdElement.value = props.tokenId;
        if (exclusion !== "value") valueElement.value = ethers.utils.formatEther(props.initialLoanValue);
        if (exclusion !== "rate") rateElement.value = ethers.utils.formatEther(props.rate);
        if (exclusion !== "duration") durationElement.value = props.duration;
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
                    className="button button-edit button-edit-nft">
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
                    className="button button-edit button-edit-token-id">
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
                    className="button button-edit button-edit-value"
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
                    className="button button-edit button-edit-rate"
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
                    className="button button-edit button-edit-duration"
                    onClick={() => {
                        setEditName("duration");
                        restoreVals("duration");
                    }}>
                    {currentEdit !== "duration" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-buttons">
                <div
                    id={"button-existing-loan-update-" + props.loanNumber}
                    className="button button-existing-loan button-existing-loan-update"
                    onClick={() => {
                        props.updateFunc(props.loanNumber, currentEdit)
                            .then(() => { setCurrentEdit(''); });
                    }}>
                    Update
                </div>

                <div
                    id={"button-existing-loan-sign-" + props.loanNumber}
                    className="button button-existing-loan button-existing-loan-sign">
                    Sign
                </div>
            </div>
        </div >
    )
}
