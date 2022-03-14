import React from 'react';

export default class LoanRequestForm extends React.Component {
    render() {
        return (
            <div className="container-loan-request-form">

                <div className="container-loan-request-component">
                    <div className="label label-nft">NFT:</div>
                    <input
                        type="string"
                        id="input-nft"
                        className="input input-loan-request input-nft"
                        placeholder='NFT Address...'
                        defaultValue={this.props.defaultNft}>
                    </input>
                </div>

                <div className="container-loan-request-component">
                    <div className="label label-token-id">Token ID:</div>
                    <input
                        type="string"
                        id="input-token-id"
                        className="input input-loan-request input-token-id"
                        placeholder='Token ID...'
                        defaultValue={this.props.defaultTokenId}>
                    </input>
                </div>

                <div className="container-loan-request-component">
                    <div className="label label-value">Amount:</div>
                    <input
                        type="string"
                        id="input-initial-value"
                        className="input input-loan-request input-initial-value"
                        placeholder='Loan Value (ETH)...'
                        defaultValue={this.props.defaultInitialLoanValue}>
                    </input>
                </div>

                <div className="container-loan-request-component">
                    <div className="label label-rate">Rate:</div>
                    <input
                        type="string"
                        id="input-rate"
                        className="input input-loan-request input-rate"
                        placeholder='Rate...'
                        defaultValue={this.props.defaultRate}>
                    </input>
                </div>

                <div className="container-loan-request-component">
                    <div className="label label-duration">Duration:</div>
                    <input
                        type="string"
                        id="input-duration"
                        className="input input-loan-request input-duration"
                        placeholder='Duration (months)...'
                        defaultValue={this.props.defaultDuration}>
                    </input>
                </div>

                <div className="container-loan-request-create">
                    <div
                        className="button button-loan-request button-loan-request-create"
                        onClick={this.props.submitCallback}>
                        Create Request
                    </div>
                </div>
            </div >
        )
    }
}
