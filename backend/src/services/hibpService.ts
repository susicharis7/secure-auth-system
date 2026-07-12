import crypto from "crypto";
import { httpClient } from "./httpClient";

export type HIBPResult = {
    isPwned: boolean;
    count: number;
};

export async function checkPasswordHIBP(password: string): Promise<HIBPResult> {
    const sha1 = crypto 
        .createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();

    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await httpClient( 
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
            method: "GET",
            headers: {
                "Add-Padding": "true",
            },
        }
    );

    if (response.status !== 200 || typeof response.data !== "string") {
        throw new Error(`HIBP Request failed with status: ${response.status}`);
    };

    const lines = response.data.split("\n");

    for (const line of lines) {
        const [hashSuffix, countRaw] = line.trim().split(":");

        if (hashSuffix === suffix) {
            return {
                isPwned: true,
                count: Number(countRaw || 0),
            };
        }
    };

    return { isPwned: false, count: 0 };
}