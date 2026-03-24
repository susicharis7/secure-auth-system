import { getRequestBinUrl } from '../../config/env';
import { getRequestWithCustomHeaders } from '../../services/httpClient';

async function main() {
    const baseURL = getRequestBinUrl();

    if (!baseURL) {
        throw new Error('REQUEST_BIN_URL is not defined.');
    };

    const result = await getRequestWithCustomHeaders(baseURL);
    console.log('Status: ', result.status);
    console.log('Body: ', result.data);
    

};

main().catch((err) => {
    console.error('Error: ', err);
    process.exit(1);
});

