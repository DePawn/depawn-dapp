export const capitalizeWords = (str) => {
    const capitalizedStr = str.split('_').map(
        word => word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    return capitalizedStr;
}