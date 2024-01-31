/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
*/

import {onCall} from "firebase-functions/v2/https";

const fetch = require("node-fetch");
const FormStuff = require("form-data");

// Start writing functions
// https://firebase.google.com/docs/functions/typescript
export const tokenExchange = onCall((request) => {
  const body = new FormStuff();
  body.append("grant_type", "authorization_code");
  body.append("client_id", process.env.CLIENT_ID);
  body.append("client_secret", process.env.CLIENT_SECRET);
  body.append("redirect_uri", process.env.REDIRECT_URI);
  body.append("code", request.data.code);

  const fetchFromUrl = async () => await (await fetch("https://api.monzo.com/oauth2/token", {
    method: "post",
    body: body,
  })).json();

  return fetchFromUrl().then((data) => data);
});
