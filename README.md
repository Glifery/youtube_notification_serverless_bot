# youtube_notification_serverless_bot

### Prepare
* copy `.parameters.example` into `.parameters` and fill with proper data


### Build
```bash
sam build
sam deploy --parameter-overrides $(cat .parameters_deploy)
```

### Local run
```bash
sam local start-api --parameter-overrides $(cat .parameters)
```

### Local run single function
```bash
sam local invoke authCallbackFunction --event events/auth_callback/code.json --parameter-overrides $(cat .parameters)
sam local invoke notificationRefreshFunction --parameter-overrides $(cat .parameters)
sam local invoke notificationSubscriberFunction --event events/notification-subscriber/acknowledge.json --parameter-overrides $(cat .parameters)
sam local invoke notificationSubscriberFunction --event events/notification-subscriber/notification.json --parameter-overrides $(cat .parameters)
```
