import { getRequestBinUrl } from '../../config/env';
import { putRequestWithJSONDataAndCustomHeaders } from "../../services/requestBinService";

async function main() {
  const baseURL = getRequestBinUrl();

  const result = await putRequestWithJSONDataAndCustomHeaders(baseURL);
  console.log("Status:", result.status);
  console.log("Body:", result.data);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
