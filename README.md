# Private Item Share

A tiny **right-click-only** Foundry VTT module by Daikaze, with separate packages for **V11** and **V14**.

## Installation

| Foundry core | Manifest URL |
| --- | --- |
| V11 | https://raw.githubusercontent.com/Daikaze/Private-Message/main/v11/module.json |
| V14 | https://raw.githubusercontent.com/Daikaze/Private-Message/main/module.json |

In Foundry Setup, open **Add-on Modules → Install Module** and paste the matching manifest URL.

## How to use

1. As GM, **right-click the item** (in the **Items Directory** or a **D&D 5e actor's inventory, feature or spell list**).
2. Select **Show Privately** from the item's regular context menu.
3. Choose **one player** from the recipient list and click **Show Privately**.
4. The item appears in **that player's private chat** and the sending GM's chat. Other players are not recipients.

The private message shows the item's image, name, description and relevant item details. The player gets a preview only—no inventory transfer or ownership change.

**No chat sidebar button, no item sheet header button, and no separate item search interface.**

### Downloads

- [Foundry V11 ZIP](dist/private-item-share-v11.zip)
- [Foundry V14 ZIP](dist/private-item-share-v14.zip)

ZIP archives contain `module.json` at root.

### Macro API (optional)

```js
const api = game.modules.get("private-item-share")?.api;
await api.showItem(game.items.getName("Longsword"));
await api.sendItem(game.items.getName("Longsword"), targetPlayerUserId);
```

### Support notes

The module uses the core Items Directory context hooks (V11 / V14) and D&D 5e's `dnd5e.getItemContextOptions` sheet hook. Third-party actor sheets need to emit the D&D 5e item context hook to show this option. This package has not been tested inside a live Foundry world yet.