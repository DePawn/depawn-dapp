import React, { useState } from 'react';
import { ethers } from 'ethers';

const edit_emoji = "\u{270d}";
const cancel_emoji = "\u{274c}";

export default function ExistingLoansForm(props) {
    const [currentEdit, setCurrentEdit] = useState('');

    function setEditName(name) {
        name === currentEdit
            ? setCurrentEdit('')
            : setCurrentEdit(name);
    }

    return (
        <div className="container-existing-loan-form">
            <h3>Loan #{props.loanNumber}</h3>

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
                    className="button button-edit"
                    onClick={() => { setEditName("nft") }}>
                    {currentEdit !== "nft" ? edit_emoji : cancel_emoji}
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
                    readOnly={currentEdit !== "token_id"}>
                </input>
                <div
                    id={"edit-token-id-" + props.loanNumber}
                    className="button button-edit"
                    onClick={() => { setEditName("token_id") }}>
                    {currentEdit !== "token_id" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-value">Amount:</div>
                <input
                    type="string"
                    id={"input-existing-loan-initial-value-" + props.loanNumber}
                    className="input input-existing-loan-initial-value"
                    placeholder='Loan Value (ETH)...'
                    defaultValue={ethers.utils.formatEther(props.initialLoanValue)}
                    readOnly={currentEdit !== "value"}>
                </input>
                <div
                    id={"edit-value-" + props.loanNumber}
                    className="button button-edit"
                    onClick={() => { setEditName("value") }}>
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
                    className="button button-edit"
                    onClick={() => { setEditName("rate") }}>
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
                    className="button button-edit"
                    onClick={() => { setEditName("duration") }}>
                    {currentEdit !== "duration" ? edit_emoji : cancel_emoji}
                </div>
            </div>

            <div className="container-existing-loan-buttons">
                <div
                    id={"button-existing-loan-update-" + props.loanNumber}
                    className="button button-existing-loan button-existing-loan-update"
                    onClick={() => {
                        props.updateFunc(props.loanNumber)
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
