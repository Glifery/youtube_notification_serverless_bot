# youtube_notification_serverless_bot

### Prepare
* copy `.parameters.example` into `.parameters` and fill with proper data


### Build
```bash
sam build
sam deploy --parameter-overrides $(cat .parameters)
```

### Local run
```bash
sam local invoke notificationSubscriberFunction --event events/notification-subscriber/acknowledge.json --parameter-overrides $(cat .parameters)
sam local invoke notificationSubscriberFunction --event events/notification-subscriber/notification.json --parameter-overrides $(cat .parameters)
```
