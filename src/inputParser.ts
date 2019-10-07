export interface ParseResult  { hash: string, code: string }

export function splitHashAndCode(fastBid: string): ParseResult {
    const firstLineEnd = fastBid.indexOf('\n');
    const firstLine = fastBid.substr(0, firstLineEnd).trim();
    if (firstLine.substr(0, 9) !== '// Hash: ') {
        throw new Error('No hash found in FastBid');
    }

    // Remove the hash part from the locally stored value
    const fileEncryptedHash = firstLine.substr(9);
    const publisherTag = fastBid.substr(firstLineEnd + 1);

    return {
        hash: fileEncryptedHash,
        code: publisherTag
    };
}
