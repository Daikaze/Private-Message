# Private Item Share

Foundry VTT module for **V11 and V14** by Daikaze. A GM can show an Item privately in chat to one selected player, without revealing it to others or transferring ownership.

## Install via Manifest URL

| Core | Manifest |
| --- | --- |
| **Foundry V14** | https://raw.githubusercontent.com/Daikaze/Private-Message/main/module.json |
| **Foundry V11** | https://raw.githubusercontent.com/Daikaze/Private-Message/main/v11/module.json |

In Foundry Setup, open **Add-on Modules → Install Module**, paste the corresponding Manifest URL and install. Activate **Private Item Share** under Manage Modules.

## How to use

- **Show Privately** in an Item sheet header, when supported by the sheet.
- **Show Privately** in the world Items sidebar context menu, when available.
- **Private Item** in the chat sidebar: select or search an Item from the world or an actor inventory, or drag an Item from a Compendium.
- Choose the player's account (assigned character name is shown), then send.

The chat preview includes the Item image, title, description and commonly available stats. The message's whisper recipient list contains **exactly the chosen player's user ID and the sending GM's user ID**. No other regular player is addressed. Secret HTML sections are stripped before sending. The module is GM-only and never changes inventories.

### ZIP downloads

- [V14](dist/private-item-share-v14.zip)
- [V11](dist/private-item-share-v11.zip)

Download archives contain module.json at the top level, as required for automatic Foundry package installation. For manual installation, extract the corresponding ZIP into Data/modules/private-item-share/.

### Macro API

```js
const api = game.modules.get("private-item-share")?.api;
await api.open();
await api.showItem(game.items.getName("Longsword"));
// await api.sendItem(itemDocument, targetPlayerUserId);
```

### Notes

Both generations use the same module ID. Use the matching package only; supported core ranges are enforced through the manifest. Uses native Foundry whispered ChatMessages, not encrypted storage. Not yet verified against a running V11/V14 game world; please report UI incompatibilities.
