import React from 'react';
import { ethers } from 'ethers';

export default class ExistingLoansForm extends React.Component {
    render() {
        return (
            <div className="container-existing-loan-form">
                <h3>Loan #{this.props.loanNumber}</h3>

                <div className="container-existing-loan-component">
                    <div className="label label-nft">NFT:</div>
                    <input
                        type="string"
                        id="input-existing-loan-nft"
                        className="input input-existing-loan-nft"
                        placeholder='NFT Address...'
                        defaultValue={this.props.collateral}>
                    </input>
                </div>

                <div className="container-existing-loan-component">
                    <div className="label label-token-id">Token ID:</div>
                    <input
                        type="string"
                        id="input-existing-loan-token-id"
                        className="input input-existing-loan-token-id"
                        placeholder='Token ID...'
                        defaultValue={this.props.tokenId}>
                    </input>
                </div>

                <div className="container-existing-loan-component">
                    <div className="label label-value">Amount:</div>
                    <input
                        type="string"
                        id="input-existing-loan-initial-value"
                        className="input input-existing-loan-initial-value"
                        placeholder='Loan Value (ETH)...'
                        defaultValue={ethers.utils.formatEther(this.props.initialLoanValue)}>
                    </input>
                </div>

                <div className="container-existing-loan-component">
                    <div className="label label-rate">Rate:</div>
                    <input
                        type="string"
                        id="input-existing-loan-rate"
                        className="input input-existing-loan-rate"
                        placeholder='Rate...'
                        defaultValue={ethers.utils.formatEther(this.props.rate)}>
                    </input>
                </div>

                <div className="container-existing-loan-component">
                    <div className="label label-duration">Duration:</div>
                    <input
                        type="string"
                        id="input-existing-loan-duration"
                        className="input input-existing-loan-duration"
                        placeholder='Duration (months)...'
                        defaultValue={this.props.duration}>
                    </input>
                </div>

                <div className="container-existing-loan-buttons">
                    <div
                        className="button button-existing-loan button-existing-loan-update"
                        onClick={this.props.updateFunc}>
                        Update
                    </div>

                    <div
                        className="button button-existing-loan button-existing-loan-sign">
                        Sign
                    </div>
                </div>
            </div >
        )
    }
}
