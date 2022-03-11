import ethers from 'ethers';

export default function getEventSignature(abi, eventName) {
    // Parse event from ABI
    const events = abi.filter(obj => obj.type ? obj.type === 'event' : false);
    const event = events.find(x => x.name === eventName);

    // Create signature hash from event signature
    const types = event.inputs.map(input => input.type);
    const signature = `${event.name}(${types.toString()})`;
    const signatureHash = ethers.utils.id(signature);

    return signatureHash;
}
