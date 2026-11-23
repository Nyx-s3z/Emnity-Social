# Push notifications setup

Emnity Social uses Web Push (VAPID). The application code is ready, but push delivery stays disabled until the server's VAPID keys are configured.

## Configure Railway

1. Generate a VAPID key pair on your computer:

   `npx web-push generate-vapid-keys`

2. In the Railway service for Emnity Social, add these variables:

   - `WEB_PUSH_PUBLIC_KEY`: the generated public key
   - `WEB_PUSH_PRIVATE_KEY`: the generated private key
   - `WEB_PUSH_SUBJECT`: a contact URI such as `mailto:you@example.com`

3. Redeploy the service. Keep the private key only in Railway variables; never commit it to GitHub or put it in frontend code.

The database creates two additive tables automatically: `push_subscriptions` and `call_invites`. Existing users, passwords, messages, and other records are not rewritten.

## Turn notifications on

Sign in to Emnity Social, open **Settings → My profile → Push notifications**, and choose **Enable push notifications**. Each browser/device needs its own permission and subscription.

On iPhone, use iOS 16.4 or newer, add Emnity Social to the Home Screen from Safari, open the installed app, and enable notifications from its settings. Then allow notifications in the iOS permission prompt and in **Settings → Notifications** if needed.

## What gets sent

- Direct messages: sender name and a generic message alert (message contents are not included on the lock screen).
- Server messages: sender name and channel name.
- Direct voice calls: incoming-call alert; opening Emnity checks for the still-valid call invite so the in-app Accept/Decline dialog can appear.

The app's **Do Not Disturb** and **Invisible** statuses suppress push delivery. iOS Focus settings can also silence notifications. Web Push cannot provide CallKit's native full-screen call UI or guarantee a custom background ringtone.

Signing out removes the current browser/device's push subscription.
