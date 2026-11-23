# Emnity Social roles and chat commands

## Server roles

Every server creator is automatically its **Owner**. The Owner is the only person who can assign or remove server moderator roles. The Owner role cannot be granted with a command or removed from the original owner.

In a server text channel, use:

- `/role @username Sr. Mod`
- `/role @username Jr. Mod`
- `/role @username Mod`
- `/role @username remove`

The target must already be a member of that server. Only the server Owner can run these commands.

## Site-wide roles

Site roles appear before a person's name across the site:

| Role | Badge color |
| --- | --- |
| Sr. Mod | Orange |
| Jr. Mod | Red |
| Mod | Green |
| Dev | Blue |

Site roles are separate from server roles. The built-in `Emnity` account is the site-wide Dev administrator and can assign or remove all site roles. Additional site administrators can be configured through Railway.

### Configure site administrators

In Railway, add an environment variable named `SITE_ADMIN_USERNAMES` containing the exact Emnity usernames allowed to manage site-wide roles. For multiple administrators, separate usernames with commas.

Example:

```text
SITE_ADMIN_USERNAMES=yourusername,anotheradmin
```

Do not put this list in frontend JavaScript or commit private administrator credentials. The `Emnity` account remains an administrator even if this variable is empty. Other accounts need to be listed here.

The `Emnity` account (and any configured site administrator) can use these commands in a chat:

- `/site-role @username Sr. Mod`
- `/site-role @username Jr. Mod`
- `/site-role @username Mod`
- `/site-role @username Dev`
- `/site-role @username remove`

## Other chat commands

- `@username` highlights a mention in a message.
- `/leave` asks for confirmation, then leaves the current server. The original Owner cannot leave until ownership transfer is implemented.

Commands are processed by the server and are not posted as ordinary chat messages. Database changes are additive and preserve existing accounts and server data.

## Typing indicators

When someone types in a channel or direct message, other participants see a live “is typing...” indicator. Typing events are sent only to people who can access that chat and are not stored as messages.
