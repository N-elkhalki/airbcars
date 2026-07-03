import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let asked = false;

/**
 * Ensures notification permission. Follows the contextual-permission contract:
 * only requests when we actually have something to notify, respects
 * canAskAgain, and never dead-ends the user (in-app toast is the fallback).
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (!settings.canAskAgain) return false;
    if (asked && settings.status === "denied") return false;
    asked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function notifyStatusChange(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // immediate
    });
  } catch {
    // ignore — in-app toast still informs the user
  }
}
