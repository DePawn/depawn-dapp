function LoanRequestForm(props) {
    return (
        <div className="container-loan-request-form">

            <div className="container-loan-request-component">
                <div className="label label-nft">NFT:</div>
                <input type="string" id="input-nft" className="input input-loan-request input-nft" placeholder='NFT Address...' defaultValue="0xB3010C222301a6F5479CAd8fAdD4D5C163FA7d8A"></input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-token-id">Token ID:</div>
                <input type="string" id="input-token-id" className="input input-loan-request input-token-id" placeholder='Token ID...' defaultValue="7"></input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-value">Amount:</div>
                <input type="string" id="input-initial-value" className="input input-loan-request input-initial-value" placeholder='Loan Value (ETH)...' defaultValue="10000"></input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-rate">Rate:</div>
                <input type="string" id="input-rate" className="input input-loan-request input-rate" placeholder='Rate...' defaultValue="1"></input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-duration">Duration:</div>
                <input type="string" id="input-duration" className="input input-loan-request input-duration" placeholder='Duration (months)...' defaultValue="36"></input>
            </div>

            <div className="container-loan-request-create">
                <div className="button button-loan-request button-loan-request-create" onClick={props.submitCallback}>Create Request</div>
            </div>
        </div>
    )
}

export default LoanRequestForm;