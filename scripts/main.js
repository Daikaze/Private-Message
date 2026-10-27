/* Private Item Share v0.3.0 — right-click item → private image (V11/V14) */
(() => {
  "use strict";

  const MODULE = "private-item-share";
  const translations = {
    en: { action:"Send Art Privately", choose:"Choose recipient", send:"Send", cancel:"Cancel", none:"No other users available", invalid:"Item unavailable", error:"Could not send the art" },
    bg: { action:"Изпрати арта лично", choose:"Избери получател", send:"Изпрати", cancel:"Отказ", none:"Няма други потребители", invalid:"Предметът не е достъпен", error:"Артът не беше изпратен" }
  };
  const t = name => (translations[game.i18n?.lang?.startsWith("bg") ? "bg" : "en"])[name];
  const esc = input => String(input ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const isV14 = () => parseInt(game.release?.generation || game.version || "0", 10) >= 14;
  const isItem = item => item?.documentName === "Item";
  const artUrl = item => {
    const url = String(item?.img || "icons/svg/item-bag.svg").trim();
    if (!url || /^(?:javascript|vbscript|data):/i.test(url) || url.startsWith("//")) return "icons/svg/item-bag.svg";
    return url;
  };
  const allowed = item => {
    if (!isItem(item)) return false;
    if (game.user?.isGM) return true;
    if (item.visible === false) return false;
    const doc = item.parent?.documentName === "Actor" ? item.parent : item;
    return doc?.testUserPermission?.(game.user, "OBSERVER") ?? item.isOwner === true;
  };

  async function sendItem(item, targetUserId) {
    if (!allowed(item)) throw new Error(t("invalid"));
    const receiver = game.users.get(targetUserId);
    if (!receiver || receiver.id === game.user.id) throw new Error(t("choose"));

    // ChatMessage has no item card, name, description, rolls or statistics.
    const content = '<img class="pis-art-only" src="' + esc(artUrl(item)) + '" alt="">';
    const message = await ChatMessage.create({
      user: game.user.id,
      speaker: { alias: game.user.name },
      content,
      whisper: [receiver.id, game.user.id],
      blind: false
    });
    if (!message) throw new Error(t("error"));
    return message;
  }

  let dialog = null;
  let onEscape = null;
  function open(item) {
    if (!allowed(item)) return ui.notifications.warn(t("invalid"));
    const users = (game.users?.contents || []).filter(u => u.id !== game.user.id).sort((a,b) => a.name.localeCompare(b.name));
    if (!users.length) return ui.notifications.warn(t("none"));

    if (dialog) dialog.remove();
    if (onEscape) document.removeEventListener("keydown",onEscape);
    const root = document.createElement("div");
    dialog = root;
    root.className = "pis-overlay";
    const opts = users.map(u => {
      const name = u.character?.name ? u.character.name + " (" + u.name + ")" : u.name;
      return '<option value="' + esc(u.id) + '">' + esc(name) + '</option>';
    }).join("");
    root.innerHTML =
      '<section class="pis-dialog" role="dialog" aria-modal="true" aria-label="' + esc(t("action")) + '">' +
        '<form>' +
          '<header><strong>' + esc(t("action")) + '</strong><button class="pis-close" type="button" aria-label="Close">×</button></header>' +
          '<img class="pis-preview" src="' + esc(artUrl(item)) + '" alt="">' +
          '<select name="recipient" required aria-label="' + esc(t("choose")) + '">' +
            '<option value="">' + esc(t("choose")) + '</option>' + opts +
          '</select>' +
          '<footer><button class="pis-cancel" type="button">' + esc(t("cancel")) + '</button>' +
          '<button class="pis-send" type="submit">' + esc(t("send")) + '</button></footer>' +
        '</form>' +
      '</section>';
    document.body.append(root);
    const close = () => {
      root.remove();
      if (dialog === root) dialog = null;
      document.removeEventListener("keydown", keyHandler);
      if (onEscape === keyHandler) onEscape = null;
    };
    const keyHandler = event => { if (event.key === "Escape") close(); };
    onEscape = keyHandler;
    document.addEventListener("keydown", keyHandler);
    root.addEventListener("click", event => {
      if (event.target === root || event.target.closest(".pis-close, .pis-cancel")) close();
    });
    root.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = root.querySelector(".pis-send");
      const recipient = root.querySelector("select").value;
      if (!recipient) return;
      button.disabled = true;
      try { await sendItem(item, recipient); close(); }
      catch (error) { console.error(MODULE,error); ui.notifications.error(error.message || t("error")); button.disabled = false; }
    });
    root.querySelector("select").focus();
  }

  function elementFrom(value) {
    if (value?.jquery) return value[0];
    if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return value;
    if (typeof HTMLElement !== "undefined" && value?.target instanceof HTMLElement) return value.target;
    if (typeof HTMLElement !== "undefined" && value?.[0] instanceof HTMLElement) return value[0];
    return null;
  }
  async function itemFromDirectory(element, application) {
    const node = elementFrom(element);
    const entry = node?.closest("[data-uuid], [data-item-id], [data-document-id], [data-entry-id]") || node;
    if (!entry) return null;
    const uuid = entry.dataset?.uuid || entry.dataset?.documentUuid;
    if (uuid && typeof fromUuid === "function") {
      try { const item = await fromUuid(uuid); if (isItem(item)) return item; }
      catch (error) { console.warn(MODULE,error); }
    }
    const id = entry.dataset?.itemId || entry.dataset?.documentId || entry.dataset?.entryId;
    const item = application?.collection?.get?.(id) || game.items?.get?.(id);
    return isItem(item) ? item : null;
  }
  async function showDirectoryItem(element, application) {
    const item = await itemFromDirectory(element,application);
    if (allowed(item)) return open(item);
    ui.notifications.warn(t("invalid"));
  }
  function addOption(options, item=null, app=null) {
    if (!Array.isArray(options) || options.some(option => option.pisPrivateArt)) return;
    const click = (...args) => item ? open(item) : showDirectoryItem(isV14() ? args[1] || args[0] : args[0], app);
    if (isV14()) {
      options.push({
        pisPrivateArt:true,
        label:t("action"),
        icon:"fa-solid fa-image",
        visible: () => item ? allowed(item) : true,
        onClick:click
      });
    } else {
      options.push({
        pisPrivateArt:true,
        name:t("action"),
        icon:'<i class="fas fa-image"></i>',
        condition: () => item ? allowed(item) : true,
        callback:click
      });
    }
  }

  // Foundry core Items directory menus.
  Hooks.on("getItemDirectoryEntryContext", (app, options) => {
    if (!isV14()) addOption(options,null,app);
  });
  Hooks.on("getItemContextOptions", (app, options) => {
    if (isV14()) addOption(options,null,app);
  });

  // D&D 5e actor inventory / features / spells, including compatible sheet modules.
  Hooks.on("dnd5e.getItemContextOptions", (item, options) => {
    if (isItem(item)) addOption(options,item);
  });

  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE);
    if (mod) mod.api = Object.freeze({sendItem,showItem:open});
    document.querySelectorAll(".pis-launch").forEach(button => button.remove());
  });
})();