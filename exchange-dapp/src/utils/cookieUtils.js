function loadNftCookies() {
    const cookies = JSON.parse(window.localStorage.getItem("nftCookieData"));

    return cookies;
}

function saveNftCookies(currentAccountNfts) {
    const cookies = [...currentAccountNfts].map((nft, i) => {
        let { contract: { type }, contract_address, token_id } = nft;

        return { type, contract_address, token_id, i };
    });
    window.localStorage.setItem("nftCookieData", JSON.stringify(cookies));

    return cookies;
}

module.exports = { loadNftCookies, saveNftCookies };