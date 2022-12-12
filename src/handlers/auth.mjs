import { google } from 'googleapis'
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";

const scopes = ["https://www.googleapis.com/auth/youtube.readonly"];

export const authInitHandler = async (event) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CLIENT_REDIRECT_URL
    );

    const url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes
    });
    console.log('Auth redirect url', url);

    return {
        statusCode: 301,
        headers: {
            Location: url,
        }
    }
};

export const authCallbackHandler = async (event) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CLIENT_REDIRECT_URL
    );
    const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const { queryStringParameters } = event;

    let resp;

    try {
        resp = await oauth2Client.getToken(queryStringParameters.code)
    } catch (err) {
        console.log("Unable to get token:", err);
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json",
            },
            body: err
        }
    }
    console.log("Tokens successfully retrieved", resp.tokens);

    try {
        await ddbDocClient.send(new PutCommand({
            TableName : process.env.GOOLGE_TOKEN_DYNAMODB_TABLE,
            Item: {
                id : "tokens",
                data: resp.tokens
            }
        }));
    } catch (err) {
        console.log("Unable to store token:", err);
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json",
            },
            body: err
        }
    }

    console.log("Tokens successfully stored");

    return {
        statusCode: 200,
        body: "Tokens successfully stored"
    }
};
