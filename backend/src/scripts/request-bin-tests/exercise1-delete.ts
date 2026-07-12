import { getRequestBinUrl } from '../../config/env';
import { deleteRequest } from '../../services/requestBinService';

async function main() {
    const baseURL = getRequestBinUrl();

    if (!baseURL) throw new Error('REQUEST_BIN_URL Not found.');
    
    const result = await deleteRequest(baseURL);

    const isDeletionSuccessful = result.status >= 200 && result.status <= 300;

    isDeletionSuccessful ? console.log('Deletion is successful.') : console.log('It did not delete.');

    console.log('Status: ', result.status);
    console.log('Body: ', result.data);

};

main().catch((err) => {
    console.error('Error: ', err);
    process.exit(1);
});


