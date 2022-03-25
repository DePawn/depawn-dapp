export const loadAccountNftCookies = () => {
    const cookies = JSON.parse(window.localStorage.getItem("nftCookieData"));

    return cookies;
}

export const loadNftCookies = ({contract_address, token_id}) => {
    const cookies = JSON.parse(window.localStorage.getItem(`${contract_address}_${token_id}`));

    return cookies;
}

export const saveAccountNftCookies = (currentAccountNfts) => {
    const cookies = [...currentAccountNfts].map((nft, i) => {
        let { contract: { type }, contract_address, token_id } = nft;

        return { type, contract_address, token_id, i };
    });
    window.localStorage.setItem("nftCookieData", JSON.stringify(cookies));

    return cookies;
}

export const saveNftCookies = (nfts) => {
    nfts.map((nft) =>
        window.localStorage.setItem(
            `${nft.contract_address}_${nft.token_id}`,
            JSON.stringify(nft)
        )
    );
}