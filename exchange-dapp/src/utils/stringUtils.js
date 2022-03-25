export const capitalizeWords = (str) => {
    if (!str) return '';

    const capitalizedStr = str.split('_').map(
        word => word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    return capitalizedStr;
}