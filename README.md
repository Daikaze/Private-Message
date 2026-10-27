# Private Item Share v0.3.0

**Send only an item's image as a private chat whisper.** No item card, item name, description or stats in the message. Works for **GMs and players**.

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

- [Download V11 ZIP](dist/private-item-share-v11.zip)
- [Download V14 ZIP](dist/private-item-share-v14.zip)

The D&D 5e embedded item menu depends on the sheet exposing the `dnd5e.getItemContextOptions` hook. Other sheets may require an integration. Not yet tested in live V11/V14 clients.
