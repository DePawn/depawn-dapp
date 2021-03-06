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
    const [isPageLoad, setIsPageLoad] = useState(true);
    const [currentLoanContract, setCurrentLoanContract] = useState('');
    const [currentNftCommitStatus, setCurrentNftCommitStatus] = useState(false);
    const [currentSignStatus, setCurrentSignStatus] = useState(undefined);
    const [currentLoanContractStatus, setCurrentLoanContractStatus] = useState(undefined);
    const [currentLoanContractBalance, setCurrentLoanContractBalance] = useState(undefined);
    const [currentUnpaidBalanceElement, setCurrentUnpaidBalanceElement] = useState(null);
    const [currentWithdrawableElements, setCurrentWithdrawableElements] = useState(null);
    const [currentPayLoanElements, setCurrentPayLoanElements] = useState(null);
    const [currentPaidLoanElements, setCurrentPaidLoanElements] = useState(null);
    const [currentEdit, setCurrentEdit] = useState('');
    const tabbedBullet = '\xa0\xa0- ';

    console.log(props)

    useEffect(() => {
        if (isPageLoad) {
            currentNftCommitStatusSetter();
            currentSignStatusSetter();
            currentLoanContractSetter();
            currentLoanContractStatusSetter()
            currentLoanContractBalanceSetter();
            renderUnpaidBalanceElement();
            renderWithdrawableContractElement();
            renderPayLoanElements();
            renderPaidContractElement();
            setIsPageLoad(false);
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (!isPageLoad) currentLoanContractBalanceSetter();
        // eslint-disable-next-line
    }, [currentLoanContractStatus]);

    useEffect(() => {
        if (!!currentLoanContractBalance) updateUnpaidBalanceElement();
        // eslint-disable-next-line
    }, [currentLoanContractBalance])

    function currentEditSetter(name) {
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

    function currentNftCommitStatusSetter() {
        // Identify if LoanRequest contract currently owns ERC721
        setCurrentNftCommitStatus(!!props.committed);
    }

    function currentSignStatusSetter() {
        // Get Borrower sign status
        setCurrentSignStatus(props.borrower_signed);
    }

    function currentLoanContractSetter() {
        if (!!props.contract_address) setCurrentLoanContract(props.contract_address);
    }

    async function currentLoanContractStatusSetter() {
        if (!!props.contract_address) {
            // Get contract
            const provider = getProvider();
            const borrower = provider.getSigner(props.currentAccount);

            const { loanContractABI } = config(props.currentNetwork);

            const loanContract = new ethers.Contract(
                props.contract_address,
                loanContractABI,
                borrower
            );

            const status = await loanContract.getStatus();
            setCurrentLoanContractStatus(status.toLowerCase());
            console.log(status)
        }
    }

    async function currentLoanContractBalanceSetter() {
        const balance = await calcRedemeption();
        setCurrentLoanContractBalance(!!currentLoanContractStatus ? balance : props.unpaid_balance);
    }

    async function calcRedemeption() {
        if (!!props.contract_address) {
            // Get contract
            const provider = getProvider();
            const borrower = provider.getSigner(props.currentAccount);

            const { loanContractABI } = config(props.currentNetwork);

            const loanContract = new ethers.Contract(
                props.contract_address,
                loanContractABI,
                borrower
            );

            // Get redemption balance
            const redemption = await loanContract.calculateRedemption();

            return redemption;
        }
    }

    function restoreVals(exclusion) {
        const nftElement = document.getElementById("input-existing-loan-nft-" + props.loan_number);
        const tokenIdElement = document.getElementById("input-existing-loan-token-id-" + props.loan_number);
        const valueElement = document.getElementById("input-existing-loan-value-" + props.loan_number);
        const rateElement = document.getElementById("input-existing-loan-rate-" + props.loan_number);
        const durationElement = document.getElementById("input-existing-loan-expiration-" + props.loan_number);
        const lenderElement = document.getElementById("input-existing-loan-lender-" + props.loan_number);

        if (exclusion !== "nft") nftElement.value = props.collateral;
        if (exclusion !== "token-id") tokenIdElement.value = props.tokenId;
        if (exclusion !== "value") valueElement.value = ethers.utils.formatEther(props.initial_loan_value);
        if (exclusion !== "rate") rateElement.value = props.rate;
        if (exclusion !== "expiration") durationElement.value = displayContractTime(props.expiration);
        if (exclusion !== "lender") lenderElement.value = !!parseInt(props.lender, 16) ? props.lender : "Unassigned 😞";
    }

    async function commitNft() {
        console.log('in here')
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
            const receipt = await tx.wait();

            // Determine if a LoanContract has been created
            const topic = props.currentLoanRequestContract.interface.getEventTopic('DeployedLoanContract');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

            // Update Tableland database
            let dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                committed: true
            };

            if (log) {
                console.log('LOAN CONTRACT DEPLOYED!!!', log)
                const triggeredEvent = props.currentLoanRequestContract.interface.parseLog(log);
                const loanContractAddress = triggeredEvent.args['_contract'];
                dbParams.contract_address = loanContractAddress;
                setCurrentLoanContract(loanContractAddress);
            }

            await updateTable(dbTableName, dbParams);

            setCurrentNftCommitStatus(true);

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
            await props.currentLoanRequestContract.withdrawNFT(ethers.BigNumber.from(props.loan_number));

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                committed: false
            };

            await updateTable(dbTableName, dbParams);

            setCurrentNftCommitStatus(false);
            removeSignatureFromLoanRequest();

            return false;
        }
        catch (err) {
            console.log(err);
            return currentNftCommitStatus;
        }
    }

    async function signLoanRequest() {
        const { dbTableName } = config(props.currentNetwork);

        // Sign LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.sign(
                props.currentAccount, ethers.BigNumber.from(props.loan_number)
            );
            const receipt = await tx.wait();

            // Determine if a LoanContract has been created
            const topic = props.currentLoanRequestContract.interface.getEventTopic('DeployedLoanContract');
            const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

            console.log(log)

            // Update Tableland database
            let dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                borrower_signed: true
            };

            if (log) {
                console.log('LOAN CONTRACT DEPLOYED!!!', log)
                const triggeredEvent = props.currentLoanRequestContract.interface.parseLog(log);
                const loanContractAddress = triggeredEvent.args['_contract'];
                dbParams.contract_address = loanContractAddress;
                setCurrentLoanContract(loanContractAddress);
            }

            await updateTable(dbTableName, dbParams);

            // Update local state variables
            setCurrentSignStatus(true);
            await currentLoanContractStatusSetter();

            return true;
        }
        catch (err) {
            console.log(err);
            return currentSignStatus;
        }
    }

    async function removeSignatureFromLoanRequest() {
        if (!currentSignStatus) return currentSignStatus;

        const { dbTableName } = config(props.currentNetwork);

        // Remove sign off of LoanRequest contract
        try {
            console.log(props)
            const tx = await props.currentLoanRequestContract.removeSignature(
                props.currentAccount, ethers.BigNumber.from(props.loan_number)
            );
            await tx.wait();

            // Update Tableland database
            const dbParams = {
                collateral: props.collateral,
                token_id: props.tokenId,
                borrower_signed: false
            };

            await updateTable(dbTableName, dbParams);

            setCurrentSignStatus(false);
            await withdrawNft();

            return false;
        }
        catch (err) {
            console.log(err);
            return currentSignStatus;
        }
    }

    function removeLender() {
        const lenderElement = document.getElementById("input-existing-loan-lender-" + props.loan_number);
        lenderElement.value = ethers.constants.AddressZero;
    }

    async function receiveFunds() {
        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);

        const { loanContractABI } = config(props.currentNetwork);

        const loanContract = new ethers.Contract(
            props.contract_address,
            loanContractABI,
            borrower
        );

        // Retrieve funds from loan
        const tx = await loanContract.getMyLoan();
        await tx.wait();

        // Update LoanContract state locally
        currentLoanContractStatusSetter();
        renderPayLoanElements();
    }

    async function payLoan() {
        // Get contract
        const provider = getProvider();
        const borrower = provider.getSigner(props.currentAccount);

        const { loanContractABI, dbTableName } = config(props.currentNetwork);

        const loanContract = new ethers.Contract(
            props.contract_address,
            loanContractABI,
            borrower
        );

        // Get payment from UI
        let payment = document.getElementById(`input-existing-loan-pay-${props.loan_number}`).value;
        payment = ethers.utils.parseEther(payment);

        // Make payment
        const tx = await loanContract.payLoan({ value: payment });
        const receipt = await tx.wait();

        // Get unpaid balance on loan
        const topic = loanContract.interface.getEventTopic('UnpaidBalance');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);

        console.log(log);

        const redemption = await calcRedemeption();

        // Update Tableland database
        const dbParams = {
            collateral: props.collateral,
            token_id: props.tokenId,
            unpaid_balance: redemption,
        };

        await updateTable(dbTableName, dbParams);

        // Update LoanContract state locally
        await currentLoanContractStatusSetter()
        await currentLoanContractBalanceSetter();
    }

    async function updateUnpaidBalanceElement() {
        // Update UI
        const redemption = await calcRedemeption();
        const balanceElement = document.getElementById(`input-existing-loan-unpaid-balance-${props.loan_number}`);
        if (!!redemption && !!balanceElement) balanceElement.value = ethers.utils.formatEther(redemption);

        const payLoanElement = document.getElementById(`input-existing-loan-pay-${props.loan_number}`);
        if (!!payLoanElement) payLoanElement.value = '';
    }

    function renderNftImage() {
        return (
            !!props.img_url
                ?
                <div className="card">
                    <div className="card__inner" id={`card__inner__existing-${props.loan_number}`} onClick={() => setCardFlipEventListener(props.loan_number)}>
                        <div className="card__face card__face--front">
                            <img
                                src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                alt={props.img_url}
                                key={props.loan_number}
                                className={`image image-existing-loan-nft image-existing-loan-nft-front image-existing-loan-nft-${props.loan_number}`}
                            />
                        </div>

                        <div className="card__face card__face--back">
                            <div className="card__content">

                                <div className="card__header">
                                    <img
                                        src={props.img_url.replace('ipfs://', 'https://ipfs.io/')}
                                        alt={props.img_url}
                                        key={props.loan_number}
                                        className={`image image-existing-loan-nft image-existing-loan-nft-back image-existing-loan-nft-${props.loan_number}`}
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
                    id={"button-existing-loan-update-" + props.loan_number}
                    className="button button-existing-loan button-existing-loan-commit button-enabled"
                    onClick={!!currentNftCommitStatus ? withdrawNft : commitNft}
                >
                    {currentNftCommitStatus ? "Withdraw NFT" : "Commit NFT"}
                </div>

                <div
                    id={"button-existing-loan-update-" + props.loan_number}
                    className={`button button-existing-loan button-existing-loan-update ${!!currentEdit ? " button-enabled" : " button-disabled"}`}
                    onClick={() => {
                        if (!!currentEdit) {
                            props.updateLoanFunc(currentEdit, props)
                                .then(() => {setCurrentEdit('');s });
                        }
                    }}>
                    Update
                </div>

                <div
                    id={"button-existing-loan-sign-" + props.loan_number}
                    className={`button button-existing-loan button-existing-loan-sign ${currentNftCommitStatus || currentSignStatus ? " button-enabled" : " button-disabled"}`}
                    onClick={!currentSignStatus && currentNftCommitStatus ? signLoanRequest : currentNftCommitStatus ? removeSignatureFromLoanRequest : null}
                >
                    {!currentSignStatus ? "Sign" : "Unsign"}
                </div>
            </div>
        );
    }

    function renderUnpaidBalanceElement() {
        if (currentLoanContractBalance || !props.contract_address) return;

        setCurrentUnpaidBalanceElement(
            <div className="container-existing-loan-component">
                <div className="label label-unpaid-balance">Balance:</div>
                <input
                    type="string"
                    id={`input-existing-loan-unpaid-balance-${props.loan_number}`}
                    className="input input-existing-loan-unpaid-balance"
                    defaultValue={ethers.utils.formatEther(currentLoanContractBalance || props.contract_address)}
                    readOnly={true}
                >
                </input>
                <div
                    id={`edit-unpaid-balance-${props.loan_number}`}
                    className="button-none"
                >
                </div>
            </div>
        );
    }

    function renderWithdrawableContractElement() {
        setCurrentWithdrawableElements(
            <div className="container-existing-loan-buttons">
                <div
                    id={`button-existing-loan-distribute-${props.loan_number}`}
                    className="button button-existing-loan button-existing-loan-distribute button-enabled"
                    onClick={receiveFunds}
                >
                    Distribute
                </div>
            </div>
        );
    }

    function renderPaidContractElement() {
        setCurrentPaidLoanElements(
            <div className="container-existing-loan-buttons">
                <div
                    id={`button-existing-loan-withdraw-nft-${props.loan_number}`}
                    className="button button-existing-loan button-existing-loan-withdraw-nft button-enabled"
                    onClick={() => props.withdrawNftFunc(props)}
                >
                    Withdraw NFT
                </div>
            </div>
        );
    }

    function renderPayLoanElements() {
        setCurrentPayLoanElements(
            <div className="container-active-loan-component">
                <div
                    className="button-existing-loan-pay button-enabled"
                    onClick={payLoan}
                >
                    Pay
                </div>
                <input
                    type="string"
                    id={`input-existing-loan-pay-${props.loan_number}`}
                    className="input input-existing-loan-pay"
                    placeholder='(ETH)...'>
                </input>
                <div id={"edit-pay-" + props.loan_number} className="button-none"></div>
            </div>
        );
    }

    function setCardFlipEventListener(idx) {
        const card = document.getElementById(`card__inner__existing-${idx}`);
        card.classList.toggle('is-flipped');
    }

    return (
        <div className={`container-existing-loan-form ${!!currentLoanContract ? 'container-active-loan' : ''}`}>
            <h3>
                {!!currentLoanContract && `${capitalizeWords(currentLoanContractStatus)} Loan `}
                {!!currentLoanContract
                    ? <span style={{ 'textDecoration': 'underline' }}>{getSubAddress(currentLoanContract)}</span>
                    : `Loan Request #${parseInt(props.loan_number) + 1}`}
            </h3>

            <div className="container-existing-loan-component">
                <div className="label label-nft">NFT:</div>
                <input
                    type="string"
                    id={"input-existing-loan-nft-" + props.loan_number}
                    className="input input-existing-loan-nft"
                    placeholder='NFT Address...'
                    defaultValue={props.collateral}
                    readOnly={currentEdit !== "nft"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-nft-" + props.loan_number}
                    className="button button-edit button-edit-nft button-disabled">
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-token-id">Token ID:</div>
                <input
                    type="string"
                    id={"input-existing-loan-token-id-" + props.loan_number}
                    className="input input-existing-loan-token-id"
                    placeholder='Token ID...'
                    defaultValue={props.tokenId}
                    readOnly={currentEdit !== "token-id"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-token-id-" + props.loan_number}
                    className="button button-edit button-edit-token-id button-disabled">
                </div>
            </div>

            <div className="container-existing-loan-component">
                <div className="label label-value">Value</div>
                <input
                    type="string"
                    id={"input-existing-loan-value-" + props.loan_number}
                    className="input input-existing-loan-value"
                    placeholder='Loan Value (ETH)...'
                    defaultValue={ethers.utils.formatEther(props.initial_loan_value)}
                    readOnly={currentEdit !== "value"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-value-" + props.loan_number}
                    className={`${!!currentLoanContract ? 'button-none' : 'button button-edit button-edit-value'}`}
                    onClick={() => {
                        if (!currentLoanContract) {
                            currentEditSetter("value");
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
                    id={"input-existing-loan-rate-" + props.loan_number}
                    className="input input-existing-loan-rate"
                    placeholder='%...'
                    defaultValue={props.rate}
                    readOnly={currentEdit !== "rate"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-rate-{props.loan_number}"}
                    className={`${!!currentLoanContract ? 'button-none' : 'button button-edit button-edit-rate button-enabled'}`}
                    onClick={() => {
                        if (!currentLoanContract) {
                            currentEditSetter("rate");
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
                    id={"input-existing-loan-expiration-" + props.loan_number}
                    className="input input-existing-loan-expiration"
                    min={displayContractTime(props.expiration)}
                    defaultValue={displayContractTime(props.expiration)}
                    readOnly={currentEdit !== "expiration"}
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-expiration-" + props.loan_number}
                    className={`${!!currentLoanContract ? 'button-none' : 'button button-edit button-edit-expiration button-enabled'}`}
                    onClick={() => {
                        if (!currentLoanContract) {
                            currentEditSetter("expiration");
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
                    id={"input-existing-loan-lender-" + props.loan_number}
                    className="input input-existing-loan-lender"
                    placeholder='Not set...'
                    defaultValue={!!parseInt(props.lender, 16) ? props.lender : "Unassigned 😞"}
                    readOnly
                    onClick={(ev) => navigator.clipboard.writeText(ev.target.value)}>
                </input>
                <div
                    id={"edit-lender-" + props.loan_number}
                    className={`${!!currentLoanContract ? 'button-none' : 'button button-edit button-edit-lender button-enabled'}`}
                    onClick={() => {
                        if (!currentLoanContract) {
                            currentEditSetter("lender");
                            restoreVals("lender");
                        }
                    }}>
                    {currentEdit !== "lender" ? delete_emoji : cancel_emoji}
                </div>
            </div>

            {(currentLoanContractBalance || !props.contract_address)
                && currentUnpaidBalanceElement}

            {currentLoanContractStatus === undefined
                && renderLoanRequestButtons()}

            {(currentLoanContractStatus === 'active' || currentLoanContractStatus === 'default')
                && currentPayLoanElements}

            {currentLoanContractStatus === 'withdrawable'
                && currentWithdrawableElements}

            {currentLoanContractStatus === 'paid' && currentNftCommitStatus
                && currentPaidLoanElements}

            <div className="container-existing-loan-img">
                {renderNftImage()}
            </div>
        </div >
    )
}