import { XMLParser } from 'fast-xml-parser'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import TelegramBot from 'node-telegram-bot-api';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.VIDEOS_DYNAMODB_TABLE;

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const bot = new TelegramBot(token, {polling: false});

export const notificationSubscriberHandler = async (event) => {
    const { queryStringParameters, body } = event;
    console.log(event);

    if (queryStringParameters != undefined) {
        const durationDays = queryStringParameters['hub.lease_seconds'] / 60 / 60 / 24;
        const endsDate = new Date();
        endsDate.setDate(endsDate.getDate() + durationDays);

        try {
            await bot.sendMessage(channelId, `Subscribed to channel ${queryStringParameters['hub.topic']} until ${endsDate.toISOString()}: ${queryStringParameters['hub.challenge']}`);
        } catch (err) {
            console.log("TG send err:", err.message);
        }

        console.log("Acknowledge with:", queryStringParameters['hub.challenge'])

        return {
            "statusCode": 200,
            "body": queryStringParameters['hub.challenge']
        }
    }

    const parser = new XMLParser();
    const jObj = parser.parse(body);
    const videoId = jObj.feed.entry['yt:videoId']
    const channelname = jObj.feed.entry.author.name

    try {
        const data = await ddbDocClient.send(new GetCommand({
            TableName : tableName,
            Key: {
                id: videoId
            },
        }));
        if (data.Item != undefined) {
            return {
                "statusCode": 200,
                "body": `VideoId ${videoId} already registered, skip`
            }
        }
    } catch (err) {
        console.log("DB get err:", err.message);
    }

    try {
        const data = await ddbDocClient.send(new PutCommand({
            TableName : tableName,
            Item: {
                id : videoId,
                data: jObj.feed.entry
            }
        }));
        console.log("Success - item added or updated:", videoId);
    } catch (err) {
        console.log("DB put err:", err.message);
    }

    try {
        await bot.sendMessage(channelId, `${channelname}\nhttps://www.youtube.com/watch?v=${videoId}`);
    } catch (err) {
        console.log("TG send err:", err.message);
    }

    return {
        "statusCode": 200,
        "body": 'Success'
    };
};
