/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
*/

/*
 * IMPORTANT
 *
 * Turns out on 15th Jan 2020, Google changed the security settings where 
 * all new functions no longer have a Cloud Functions Invoker. This means
 * that all newly created functions will have their access forbidden, 
 * thus resulting in a CORS policy block.
 * 
 * Here is how you fix it, as it's not all that obvious:
 * 
 * https://cloud.google.com/functions/docs/securing/managing-access-iam#allowing_unauthenticated_function_invocation
*/

import {onCall, HttpsError} from "firebase-functions/v2/https";

const fetch = require("node-fetch");

// Start writing functions
// https://firebase.google.com/docs/functions/typescript
export const tokenExchange = onCall({
    cors: true // Enable CORS for all origins
}, async (request) => {
    try {
        // Validate input
        if (!request.data || !request.data.code) {
            throw new HttpsError('invalid-argument', 'Authorization code is required');
        }

        // Use URLSearchParams for form data instead of form-data library
        const body = new URLSearchParams();
        body.append("grant_type", "authorization_code");
        body.append("client_id", process.env.REACT_APP_MONZO_CLIENT_ID || "");
        body.append("client_secret", process.env.REACT_APP_MONZO_CLIENT_SECRET || "");
        body.append("redirect_uri", process.env.REACT_APP_MONZO_REDIRECT_URI || "");
        body.append("code", request.data.code);

        console.log(body)
        const response = await fetch("https://api.monzo.com/oauth2/token", {
            method: "post",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Monzo API error details:', {
                status: response.status,
                statusText: response.statusText,
                responseData: data,
                requestData: {
                    grant_type: "authorization_code",
                    client_id: process.env.REACT_APP_MONZO_CLIENT_ID,
                    client_secret: process.env.REACT_APP_MONZO_CLIENT_SECRET || "N/A",
                    redirect_uri: process.env.REACT_APP_MONZO_REDIRECT_URI,
                    code: request.data.code
                }
            });
            throw new HttpsError('internal', `Monzo API error: ${response.status} - ${JSON.stringify(data)}`);
        }

        return data;
    } catch (error) {
        console.error('Token exchange error:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Failed to exchange token');
    }
});
