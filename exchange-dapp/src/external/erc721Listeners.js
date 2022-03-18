export const setNftTransferListener = async (nftContract) => {
    nftContract.on('Transfer', async (ev) => {
        console.log('NFT Transfered!', ev)
    })
}

export const setAllErc721Listeners = async (nftContract) => {
    await setNftTransferListener(nftContract);
}