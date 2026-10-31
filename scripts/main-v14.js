/**
 * Private Item Share v0.3.1 — Foundry V14 / D&D5e 6.0.6
 * The only chat content is the item's art. No sheet header button or custom
 * overlay. Use core DialogV2 (native resize/minimize and theme controls).
 */
(() => {
  "use strict";
  const MODULE = "private-item-share";
  const {DialogV2} = foundry.applications.api;
  const language = () => game.i18n?.lang?.startsWith("bg") ? "bg" : "en";
  const labels = {
    en: {
      action:"Send Art Privately",choose:"Choose recipient",send:"Send",cancel:"Cancel",
      none:"No other users available",invalid:"Item unavailable",
      error:"Could not send the art"
    },
    bg: {
      action:"Изпрати арта лично",choose:"Избери получател",send:"Изпрати",cancel:"Отказ",
      none:"Няма други потребители",invalid:"Предметът не е достъпен",
      error:"Артът не беше изпратен"
    }
  };
  const t = key => labels[language()][key];
  const esc = text => String(text ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isItem = item => item?.documentName === "Item";
  const artUrl = item => {
    const path = String(item?.img ?? "").trim();
    // Browser URL schemes and protocol-relative remote assets aren't accepted.
    return (!path || /[\r\n<>]/.test(path)
      || /^(?:javascript|vbscript|data|file):/i.test(path)
      || path.startsWith("//")) ? "icons/svg/item-bag.svg" : path;
  };
  function allowed(item) {
    if (!isItem(item)) return false;
    if (game.user?.isGM) return true;
    if (item.visible === false) return false;
    const owner = item.parent?.documentName === "Actor" ? item.parent : item;
    return Boolean(owner?.testUserPermission?.(game.user,"OBSERVER") ?? item.isOwner);
  }
  function recipients() {
    return [...(game.users?.contents ?? [])]
      .filter(user => user.id !== game.user?.id)
      .sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  }
  async function sendItem(item,userId) {
    if (!allowed(item)) throw new Error(t("invalid"));
    const target = game.users?.get(String(userId ?? ""));
    if (!target || target.id === game.user?.id) throw new Error(t("choose"));
    const content = '<img class="pis-art-only" src="' + esc(artUrl(item)) + '" alt="">';
    const result = await ChatMessage.create({
      user:game.user.id,
      speaker:{alias:game.user.name},
      content,
      whisper:[target.id,game.user.id],
      blind:false
    });
    if (!result) throw new Error(t("error"));
    return result;
  }

  let currentDialog = null;
  async function showItem(item) {
    if (!allowed(item)) { ui.notifications.warn(t("invalid")); return null; }
    const users = recipients();
    if (!users.length) { ui.notifications.warn(t("none")); return null; }

    // Native DialogV2 wraps content in a form. Do not render another <form>.
    const options = users.map(user => {
      const display = user.character?.name
        ? `${user.character.name} (${user.name})` : user.name;
      return `<option value="${esc(user.id)}">${esc(display)}</option>`;
    }).join("");
    const html =
      '<div class="pis-native-content">' +
        '<img class="pis-native-preview" src="' + esc(artUrl(item)) + '" alt="">' +
        '<label class="pis-recipient-label">' + esc(t("choose")) +
          '<select name="recipient" required>' +
            '<option value="" selected disabled>' + esc(t("choose")) + '</option>' +
            options +
          '</select>' +
        '</label>' +
      '</div>';

    // All UI chrome is Foundry's own. Close an old chooser before opening a new one.
    if (currentDialog?.rendered) await currentDialog.close();
    let chosen = null;
    const chooser = new DialogV2({
      classes:["pis-native-dialog"],
      window:{
        title:t("action"),
        icon:"fa-solid fa-image",
        frame:true,
        minimizable:true,
        resizable:true
      },
      position:{width:400,height:"auto"},
      content:html,
      buttons:[
        {
          action:"cancel",
          label:t("cancel")
        },
        {
          action:"send",
          label:t("send"),
          icon:"fa-solid fa-paper-plane",
          default:true,
          callback:(_event,button) =>
            String(button.form?.elements?.namedItem("recipient")?.value ?? "")
        }
      ],
      submit:(_result)=>{}
    });
    currentDialog=chooser;
    try {
      const result = await DialogV2.wait({
        classes:["pis-native-dialog"],
        window:{
          title:t("action"),
          icon:"fa-solid fa-image",
          frame:true,
          minimizable:true,
          resizable:true
        },
        position:{width:400,height:470},
        content:html,
        buttons:[
          {action:"cancel",label:t("cancel")},
          {
            action:"send",label:t("send"),icon:"fa-solid fa-paper-plane",default:true,
            callback:(_event,button) =>
              String(button.form?.elements?.namedItem("recipient")?.value ?? "")
          }
        ],
        rejectClose:false,
        modal:false
      });
      if (!result || result === "cancel") return null;
      chosen=String(result);
      if (!game.users.get(chosen)) {ui.notifications.warn(t("choose"));return null;}
      try { return await sendItem(item,chosen); }
      catch (error) {
        console.error(MODULE,error);
        ui.notifications.error(error.message || t("error"));
        return null;
      }
    } finally {
      if (currentDialog===chooser) currentDialog=null;
    }
  }

  function domElement(value) {
    if (value?.jquery) return value[0] ?? null;
    if (typeof HTMLElement!=="undefined" && value instanceof HTMLElement) return value;
    if (typeof HTMLElement!=="undefined" && value?.target instanceof HTMLElement) return value.target;
    if (typeof HTMLElement!=="undefined" && value?.[0] instanceof HTMLElement) return value[0];
    return null;
  }
  async function itemFromDirectory(value,app) {
    const element=domElement(value);
    const entry=element?.closest?.("[data-uuid], [data-document-uuid], [data-item-id], [data-document-id], [data-entry-id]")??element;
    if (!entry) return null;
    const uuid=entry.dataset?.uuid??entry.dataset?.documentUuid;
    if (uuid && typeof fromUuid==="function") {
      try {
        const result=await fromUuid(uuid);
        if (isItem(result)) return result;
      } catch (error) { console.warn(MODULE,"Item UUID lookup failed",error); }
    }
    const id=entry.dataset?.itemId??entry.dataset?.documentId??entry.dataset?.entryId??entry.dataset?.id;
    const actor=app?.document?.documentName==="Actor" ? app.document : null;
    const item=actor?.items?.get?.(id)??app?.collection?.get?.(id)??game.items?.get?.(id);
    return isItem(item)?item:null;
  }
  async function showDirectoryItem(value,app) {
    const item=await itemFromDirectory(value,app);
    if (!allowed(item)) {ui.notifications.warn(t("invalid"));return null;}
    return showItem(item);
  }

  function addEntry(options,item,app) {
    if (!Array.isArray(options) || options.some(o=>o.pisPrivateArt)) return;
    const onClick=(_event,entry)=> {
      if (item) return showItem(item);
      return showDirectoryItem(entry??_event,app);
    };
    options.push({
      pisPrivateArt:true,
      label:t("action"),
      icon:"fa-solid fa-image",
      visible:()=> item ? allowed(item) : true,
      onClick
    });
  }

  // Register at module evaluation, before V14 sidebar context menus are built.
  Hooks.on("getItemContextOptions",(app,options)=>addEntry(options,null,app));
  Hooks.on("dnd5e.getItemContextOptions",(item,options)=>{
    if (isItem(item)) addEntry(options,item,null);
  });
  Hooks.once("ready",()=>{
    const module=game.modules.get(MODULE);
    if (module) module.api=Object.freeze({sendItem,showItem,showDirectoryItem});
  });
})();
