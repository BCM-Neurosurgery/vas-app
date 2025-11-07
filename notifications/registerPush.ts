import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(apiBase: string | undefined) {
    if (!Device.isDevice) {
        throw new Error("Must use physical device for push notifications");
    } 
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        throw new Error("Permission not granted to get push token for push notification!")
    }
    // get project id
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
        throw new Error("Project ID not found");
    }
    // now try getting the push token and pushing to db!!!
    try {
        const pushTokenString = (await Notifications.getExpoPushTokenAsync({projectId})).data;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // assemble payload to send to db 
        const payload = {
            expo_push_token: pushTokenString,
            timezone: timezone,
            platform: Platform.OS,
        }

        // first check if already registered
        const res = await fetch(`${apiBase}/push/${payload.expo_push_token}`, {method: 'GET'});
        const data = await res.json();

        if (data == null) {
            await fetch(`${apiBase}/push/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }

        return payload;
    } catch (e: unknown) {
        throw new Error(`${e}`)
    }
}
