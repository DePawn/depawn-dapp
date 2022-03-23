export const loanContractTime = (y, m, d) => {
    return Math.floor(new Date(y, m, d).getTime() / 1000)
};