# Private Item Share v0.3.5

**Send only an item's image as a private chat whisper.** No item card, item name, description or stats in the message. Works for **GMs and players**.

## V11 v0.3.1 — Public chat artwork and clickable image preview

Foundry V11 now has two item right-click actions: **Send Art Privately** (existing recipient chooser) and **Send Art to Chat** (posts the artwork publicly with no recipient dialog). Clicking art sent by the module in the chat opens a larger Foundry image preview. The V11 install/update manifest is unchanged; only the V11 package is updated.

## v0.3.5 — D&D 5e 5.3.3 compatibility on V14

The V14 manifest allows dnd5e 5.3.3 again. The same image-only permission-restricted Item sharing implementation and V11 package remain intact. Live test the item context menu with the selected actor sheet.

## v0.3.4 — D&D 5e 6.1.1 compatibility

Updated the V14 package compatibility to D&D 5e 6.1.1 while preserving 6.0.6. Item art-only whispers, recipient permissions, UI, and the independent V11 release remain unchanged. Live integration with third-party 6.1.1 actor sheets should be checked.

## v0.3.1 — Native Foundry V14 interface

- **Foundry V14 / D&D 5e 5.3.3 or 6.0.6–6.1.1** uses the native `DialogV2` recipient chooser, including standard theme, window resizing and minimizing. There is no custom popup/overlay.
- **Right-click an item** in the Items Directory or a D&D 5e sheet exposing the `dnd5e.getItemContextOptions` hook.
- **Only an image** is sent into a private whisper. No item name, description, stats, card, extra chat text or item transfer.
- Both players and GMs may share items they are permitted to see.
- The **V11 package is maintained separately at v0.3.1**, with private and public image sharing.
- Automated regression tests verify private recipients, access checks, and native dialog behavior. Live V14 integration with specific third-party sheets should still be checked.

## How to use

Right-click an item in your **Items Directory** or a supported **D&D 5e actor inventory**, select **Send Art Privately**, choose another user (player or GM), and send.

The recipient and sender are the only explicitly addressed whisper users. The item is not transferred. Players may share items they can view; players cannot use the module to access GM-only items.

There are no extra chat sidebar or item sheet header buttons.

## Install

| Foundry core | Manifest |
| --- | --- |
| V11 | https://raw.githubusercontent.com/Daikaze/Private-Message/main/v11/module.json |
| V14 | https://raw.githubusercontent.com/Daikaze/Private-Message/main/module.json |

Use **Setup → Add-on Modules → Install Module**, paste the relevant Manifest URL, then enable the module in the world. To update from an older version, use the module updater and refresh the world.

- [Download V11 v0.3.1 ZIP](dist/private-item-share-v11.zip)
- [Download V14 v0.3.5 ZIP](https://github.com/Daikaze/Private-Message/releases/download/v0.3.5/private-item-share-v14.zip)

The D&D 5e embedded item menu depends on the sheet exposing the `dnd5e.getItemContextOptions` hook. Other sheets may require an integration. Automated V14 tests cover core behavior; additional third-party sheet compatibility requires a live Foundry V14 test.
