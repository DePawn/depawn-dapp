import React, { useState, useEffect } from 'react';

export default function LoanRequestForm(props) {
    const [currentNft, setCurrentNft] = useState(0);

    function renderNftDropdown() {
        return (
            <div className="container-loan-request-component">
                <div className="label label-nft">NFT:</div>
                <div className="input input-container">
                    {!!props.currentAccountNfts ? (
                        <select
                            id="datalist-nft"
                            className="datalist datalist-loan-request datalist-nft"
                            onChange={(ev) => {
                                setCurrentNft(ev.target.selectedIndex);
                            }}
                        >
                            {props.currentAccountNfts.map((nft, i) => {
                                return (
                                    <option
                                        value={nft.contract_address}
                                        key={i}
                                    >
                                        {nft.contract_address}
                                    </option>
                                )
                            })}
                        </select>
                    ) : (
                        <select
                            id="datalist-nft"
                            className="datalist datalist-loan-request datalist-nft"
                        >""</select>
                    )}
                </div>
            </div>
        )
    }

    function renderTokenIdDropdown() {
        return (
            <div className="container-loan-request-component">
                <div className="label label-token-id">Token ID:</div>
                <input
                    type="string"
                    id="input-token-id"
                    className="input input-loan-request input-token-id"
                    placeholder='Token ID...'
                    value={!!props.currentAccountNfts
                        ? props.currentAccountNfts[currentNft].token_id
                        : ""}
                    readOnly={true}>
                </input>
            </div>
        )
    }

    function renderNftImage() {
        if (!props.currentAccountNfts) return;

        const imgUrl = parseNftImageFromCurrentAccounts(currentNft);

        return (
            !!props.currentAccountNfts && imgUrl
                ?
                <img
                    src={imgUrl.replace('ipfs://', 'https://ipfs.io/')}
                    alt={imgUrl}
                    className="image image-loan-request image-loan-request-nft"
                />
                : <div className="container-no-image">☹️💀 No image rendered 💀☹️</div>
        )
    }

    function parseNftImageFromCurrentAccounts(idx) {
        const imgUrl = !!props.currentAccountNfts[idx].cached_file_url
            ? props.currentAccountNfts[idx].cached_file_url
            : props.currentAccountNfts[idx].file_url;

        return imgUrl;
    }

    useEffect(() => {
        renderTokenIdDropdown();
        renderNftImage();
        // eslint-disable-next-line
    }, [currentNft])

    return (
        <div className="container-loan-request-form">

            {renderNftDropdown()}
            {renderTokenIdDropdown()}

            <div className="container-loan-request-component">
                <div className="label label-value">Amount:</div>
                <input
                    type="string"
                    id="input-initial-value"
                    className="input input-loan-request input-initial-value"
                    placeholder='Loan Value (ETH)...'
                    defaultValue={props.defaultInitialLoanValue}>
                </input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-rate">Rate:</div>
                <input
                    type="string"
                    id="input-rate"
                    className="input input-loan-request input-rate"
                    placeholder='Rate...'
                    defaultValue={props.defaultRate}>
                </input>
            </div>

            <div className="container-loan-request-component">
                <div className="label label-duration">Duration:</div>
                <input
                    type="string"
                    id="input-duration"
                    className="input input-loan-request input-duration"
                    placeholder='Duration (months)...'
                    defaultValue={props.defaultDuration}>
                </input>
            </div>

            {renderNftImage()}

            <div className="container-loan-request-create">
                <div
                    className="button button-loan-request button-loan-request-create"
                    onClick={() => {
                        const type = props.currentAccountNfts[currentNft].type;
                        const imgUrl = parseNftImageFromCurrentAccounts(currentNft);
                        props.submitCallback({ type, imgUrl });
                    }}>
                    Submit Request
                </div>
            </div>
        </div >
    )
}
