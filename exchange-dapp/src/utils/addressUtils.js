const getSubAddress = (addrStr) => {
    return `${addrStr.slice(0, 5)}...${addrStr.slice(-4)}`;
}

module.exports = { getSubAddress };