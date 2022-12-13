import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import axios from "axios";
import { google } from 'googleapis'

async function subscribe(channel) {
    const subscriptionEndpoint = `${process.env.NOTIFICATION_SUBSCRIPTION_HOST}/subscriber`;
    try {
        let { status } = await axios({
            method: 'post',
            url: 'https://pubsubhubbub.appspot.com/subscribe',
            data: {
                'hub.callback': subscriptionEndpoint,
                'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channel.channelId}`,
                'hub.verify': 'async',
                'hub.mode': 'subscribe'
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        console.log(`${status}: '${channel.title}' subscribed to ${subscriptionEndpoint}`);
    } catch (e) {
        console.log(`Unable to subscribe to ${channel.title}:`, e);
    }
}

//https://www.tabnine.com/code/javascript/functions/googleapis/Youtube/subscriptions
async function retrieveSubscribedChannels(service, auth, pageToken = '', allSubscriptions = []) {
    // get data from the subscriptions
    const { data } = await service.subscriptions.list({
        mine: true,
        auth,
        part: 'snippet',
        maxResults: 50, // max is 50, doesn't really matter as it's batched
        order: 'alphabetical', // use alphabetical to always have the same order
        pageToken
    });
    // push all the current subscriptions to the array of all subscriptions
    allSubscriptions.push(...data.items.map(item => ({
        title: item.snippet.title,
        channelId: item.snippet.resourceId.channelId
    })));
    // if there is another page of subscriptions to be looked at - repeat again
    if (data.nextPageToken) {
        await retrieveSubscribedChannels(service, auth, data.nextPageToken, allSubscriptions);
    }
    return allSubscriptions;
}

export const notificationRefreshHandler = async (event) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CLIENT_REDIRECT_URL
    );
    const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const tokensRecord = await ddbDocClient.send(new GetCommand({
        TableName : process.env.GOOLGE_TOKEN_DYNAMODB_TABLE,
        Key: {
            id: "tokens"
        },
    }));

    oauth2Client.setCredentials(tokensRecord.Item.data);

    oauth2Client.on('tokens', async (tokens) => {
        console.log('Re-new access_token using refresh_token', Object.keys(tokens));
        if (tokens.refresh_token) {
            // store the refresh_token in my database!
            await ddbDocClient.send(new PutCommand({
                TableName : process.env.GOOLGE_TOKEN_DYNAMODB_TABLE,
                Item: {
                    id : "tokens",
                    data: tokens
                }
            }));
            console.log('Store new refresh_token')
        }
    });

    const service = google.youtube({ version: "v3" });
    const channels = await retrieveSubscribedChannels(service, oauth2Client);
    console.log('Found', channels.length, 'subscribed channels');

    await Promise.all(channels.map(subscribe));

    return {
        statusCode: '200',
        body: 'Success'
    };
};
