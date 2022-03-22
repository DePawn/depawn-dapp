import React, { useState, useEffect } from 'react';
import { capitalizeWords } from '../../utils/stringUtils';

export default function LenderAvailableLoanForm(props) {
    const [currentNft, setCurrentNft] = useState(0);
    const tabbedBullet = '\xa0\xa0- ';

    // console.log(props)

    function renderNftDropdown() {
        return (
            <div className="container-loan-request-component">
                <div className="label label-nft">NFT:</div>
                <div className="input input-container">
                    {!!props.currentAccountNfts ? (
                        // Account has NFTs
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
                        !!props._dev ? (
                            // Dev ONLY
                            <select
                                id="datalist-nft"
                                className="datalist datalist-loan-request datalist-nft">
                                <option
                                    value={props.defaultNft}
                                    key={0}
                                >
                                    {props.defaultNft}
                                </option>
                            </select>
                        ) : (
                            // No NFTs for account
                            <select
                                id="datalist-nft"
                                className="datalist datalist-loan-request datalist-nft"
                            >
                                ""
                            </select>
                        )
                    )}
                </div>
            </div >
        )
    }

    function renderTokenIdDropdown() {
        const _currentNft = safeCurrentNft();

        return (
            <div className="container-loan-request-component">
                <div className="label label-token-id">Token ID:</div>
                <input
                    type="string"
                    id="input-token-id"
                    className="input input-loan-request input-token-id"
                    placeholder='Token ID...'
                    value={!!props.currentAccountNfts.length
                        ? props.currentAccountNfts[_currentNft].token_id
                        : ""
                    }
                    readOnly={true}>
                </input>
            </div>
        )
    }

    function renderNftImage() {
        const _currentNft = safeCurrentNft();

        const img_url = !!props.currentAccountNfts.length
            ? parseNftImageFromCurrentAccounts(_currentNft)
            : props._dev
                ? props.defaultImageUrl
                : undefined;

        return (
            !!props.currentAccountNfts.length && !!img_url
                ?
                <div className="card">
                    <div className="card__inner" id="card__inner__request" onClick={setCardFlipEventListener}>
                        <div className="card__face card__face--front">
                            <img
                                src={img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={img_url}
                                className="image image-loan-request image-loan-request-nft image-loan-request-nft-front"
                            />
                        </div>

                        <div className="card__face card__face--back">
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={img_url}
                                        className="image image-loan-request image-loan-request-nft image-loan-request-nft-back"
                                    />
                                    <h3 className="h3__header__back">{props.currentAccountNfts[_currentNft].name}</h3>
                                </div>

                                <div className="card__body">
                                    <dl>
                                        <dt>Contract Info:</dt>
                                        <dd>{tabbedBullet}<span className="attr_label">Mint Date:</span> {props.currentAccountNfts[_currentNft].mint_date}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Symbol:</span> {props.currentAccountNfts[_currentNft].symbol}</dd>
                                        <dd>{tabbedBullet}<span className="attr_label">Type:</span> {props.currentAccountNfts[_currentNft].type}</dd><br />
                                        <dt>Sales Statistics</dt>
                                        {renderNftStat(props.currentAccountNfts[_currentNft].contract_statistics)}
                                    </dl>
                                </div>

                            </div>
                        </div>

                    </div>
                </div >
                : !!props.currentAccountNfts.length
                    ? <div className="container-no-image">☹️💀 No image rendered 💀☹️</div>
                    : <div className="container-no-image">😝🙅 You have to ERC721 NFTs to leverage 🙅😝</div>
        )
    }

    function renderNftStat(contract_stats) {
        const contractStatsElements = Object.keys(contract_stats).map((key, i) => {
            return (
                <dd key={i}>{tabbedBullet}<span className="attr_label">{capitalizeWords(key) + ":"}</span> {contract_stats[key]}</dd>
            )
        })
        return contractStatsElements;
    }

    function setCardFlipEventListener() {
        const card = document.getElementById('card__inner__request');
        card.classList.toggle('is-flipped');
    }

    function parseNftImageFromCurrentAccounts(idx) {
        const img_url = !!props.currentAccountNfts[idx].cached_file_url
            ? props.currentAccountNfts[idx].cached_file_url
            : props.currentAccountNfts[idx].file_url;

        return img_url;
    }

    function safeCurrentNft() {
        // Needed to handle changes where currentNft === props.currentAccountNfts.length
        const _currentNft = currentNft <= props.currentAccountNfts.length - 1
            ? currentNft
            : props.currentAccountNfts.length - 1;

        return _currentNft;
    }

    useEffect(() => {
        renderTokenIdDropdown();
        renderNftImage();
        // eslint-disable-next-line
    }, [currentNft])

    return (
        <div className="container-loan-request-form-master">

            <h2>
                Loan Requests {props._dev && !props.currentAccountNfts ? "(dev)" : ""}
            </h2>

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
                        className="button button-loan-request button-loan-request-create  button-enabled"
                        onClick={props.submitCallback}>
                        Submit Request
                    </div>
                </div>
            </div>

        </div>
    )
}
