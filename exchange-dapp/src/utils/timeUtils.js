export const loanContractTime = (y, m, d) => {
    return Math.floor(new Date(y, (parseInt(m) - 1).toString(), d).getTime() / 1000);
};

export const displayContractTime = (unixTime) => {
    return new Date(unixTime * 1000).toISOString().split('T')[0];
}