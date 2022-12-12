import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

import { google } from 'googleapis'

export const notificationRefreshHandler = async (event) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CLIENT_REDIRECT_URL
    );
    const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const credentials = await ddbDocClient.send(new GetCommand({
        TableName : process.env.GOOLGE_TOKEN_DYNAMODB_TABLE,
        Key: {
            id: "tokens"
        },
    }));

    oauth2Client.setCredentials(credentials.Item.data);

    oauth2Client.on('tokens', async (tokens) => {
        console.log('!!!!!!!tokens+++')
        if (tokens.refresh_token) {
            // store the refresh_token in my database!
            await ddbDocClient.send(new PutCommand({
                TableName : process.env.GOOLGE_TOKEN_DYNAMODB_TABLE,
                Item: {
                    id : "tokens",
                    data: tokens
                }
            }));
            console.log('!!!!!!!tokens---')
        }
    });

    const service = google.youtube({ version: "v3" });
    const list = await service.subscriptions.list(
        {
            auth: oauth2Client,
            "part": [
                "id,snippet,contentDetails"
            ],
            "mine": true
        }
    );

    return {
        "statusCode": 200,
        "body": list
    };
};
