export const setSubmittedLoanRequestListener = async (loanRequestContract, funcs) => {
    // Set loan request listener
    loanRequestContract.on('SubmittedLoanRequest', async () => {
        await funcs.getAccountLoanRequests();
        console.log('SUBMITTED_LOAN_REQUEST LISTENER TRIGGERED!')
    });
}

export const setLoanRequestChangedListeners = async (loanRequestContract, funcs) => {
    // Set loan request listener
    loanRequestContract.on('LoanRequestChanged', async () => {
        await funcs.getAccountLoanRequests();
        console.log('LOAN_REQUEST_CHANGED LISTENER TRIGGERED!')
    });
}

export const setLoanRequestLenderChangedListeners = async (loanRequestContract, funcs) => {
    // Set loan request listener
    loanRequestContract.on('LoanRequestLenderChanged', async () => {
        await funcs.getAccountLoanRequests();
        console.log('LOAN_REQUEST_LENDER_CHANGED LISTENER TRIGGERED!')
    });
}

export const setAllLoanRequestListeners = async (loanRequestContract, funcs) => {
    await setSubmittedLoanRequestListener(loanRequestContract, funcs);
    await setLoanRequestChangedListeners(loanRequestContract, funcs);
    await setLoanRequestLenderChangedListeners(loanRequestContract, funcs);
}