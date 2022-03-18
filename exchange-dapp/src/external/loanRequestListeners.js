export const setSubmittedLoanRequestListener = async (loanRequestContract, funcs) => {
    // Set loan request listener
    // getAccountLoanRequests(currentAccount, currentNetwork, currentAccountNfts)
    loanRequestContract.on('SubmittedLoanRequest', async () => {
        await funcs.submitFunc();
        console.log('SUBMITTED_LOAN_REQUEST LISTENER TRIGGERED!')
    });
}

export const setLoanRequestChangedListeners = async (loanRequestContract, funcs) => {
    // Set loan request listener
    // getAccountLoanRequests(currentAccount, currentNetwork, currentAccountNfts)
    loanRequestContract.on('LoanRequestChanged', async () => {
        await funcs.submitFunc();
        console.log('LOAN_REQUEST_CHANGED LISTENER TRIGGERED!')
    });
}

export const setLoanRequestLenderChangedListeners = async (loanRequestContract, funcs) => {
    // Set loan request listener
    // getAccountLoanRequests(currentAccount, currentNetwork, currentAccountNfts)
    loanRequestContract.on('LoanRequestLenderChanged', async () => {
        await funcs.submitFunc();
        console.log('LOAN_REQUEST_LENDER_CHANGED LISTENER TRIGGERED!')
    });
}

export const setAllLoanRequestListeners = async (loanRequestContract, funcs) => {
    await setSubmittedLoanRequestListener(loanRequestContract, funcs);
    await setLoanRequestChangedListeners(loanRequestContract, funcs);
    await setLoanRequestLenderChangedListeners(loanRequestContract, funcs);
}