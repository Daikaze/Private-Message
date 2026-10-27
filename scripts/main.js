/* Private Item Share v0.2.0 - right-click only - Foundry VTT 11 and 14 */
(() => {
  "use strict";
  const ID = "private-item-share";
  const I18N = {
    en: {title:"Show Item Privately",button:"Show Privately",player:"Select the player who will see this item",choose:"Select a player",none:"No players available",invalid:"Unable to locate the item",sent:"Item shown privately to",empty:"No description available",secret:"Private preview",type:"Type",rarity:"Rarity",price:"Price",weight:"Weight",damage:"Damage",quantity:"Quantity",cancel:"Cancel"},
    bg: {title:"Покажи предмет лично",button:"Покажи лично",player:"Избери играча, който ще вижда предмета",choose:"Избери играч",none:"Няма играчи",invalid:"Предметът не е намерен",sent:"Предметът е показан лично на",empty:"Няма описание",secret:"Личен преглед",type:"Тип",rarity:"Рядкост",price:"Цена",weight:"Тегло",damage:"Щети",quantity:"Количество",cancel:"Отказ"}
  };
  const txt = key => (I18N[game.i18n?.lang?.startsWith("bg") ? "bg" : "en"][key] || key);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const gm = () => !!game.user?.isGM;
  const image = value => {
    const s = String(value || "").trim();
    return !s || /^(javascript|data|vbscript):/i.test(s) || s.startsWith("//") ? "icons/svg/item-bag.svg" : s;
  };
  function description(item) {
    const html = item.system?.description?.value || item.system?.description?.chat || item.description || "";
    const doc = new DOMParser().parseFromString(String(html), "text/html");
    doc.querySelectorAll("script,style,iframe,object,form,input,button,textarea,.secret,[data-secret],.gm-only,[data-visibility='gm']").forEach(e => e.remove());
    doc.querySelectorAll("br").forEach(e => e.replaceWith("\n"));
    doc.querySelectorAll("p,div,li,h1,h2,h3,h4,section").forEach(e => e.append("\n"));
    return String(doc.body.textContent || "").replace(/\r/g,"").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,8000);
  }
  function details(item) {
    const s = item.system || {};
    const pairs = [];
    const add = (k,v) => { if (v !== undefined && v !== null && v !== "" && typeof v !== "object") pairs.push([txt(k),String(v)]); };
    add("type",item.type);
    if (s.rarity && s.rarity !== "none") add("rarity",s.rarity);
    if (s.price != null) add("price",typeof s.price === "object" ? [s.price.value,s.price.denomination || s.price.denom].filter(Boolean).join(" ") : s.price);
    if (s.weight) add("weight",typeof s.weight === "object" ? s.weight.value : s.weight);
    if (s.quantity > 1) add("quantity",s.quantity);
    const parts = s.damage?.parts;
    if (Array.isArray(parts)) add("damage",parts.map(p => Array.isArray(p) ? p.join(" ") : "").filter(Boolean).join(", "));
    else if (s.damage?.base?.formula) add("damage",s.damage.base.formula);
    return pairs;
  }
  function recipientName(u) { return u.character?.name ? u.character.name + " (" + u.name + ")" : u.name; }
  function card(item,u) {
    const stats = details(item).map(kv => '<div><b>'+esc(kv[0])+'</b><span>'+esc(kv[1])+'</span></div>').join("");
    const desc = esc(description(item) || txt("empty")).replace(/\n/g,"<br>");
    return '<article class="pis-card"><div class="pis-kicker"><i class="fas fa-lock"></i> '+esc(txt("secret"))+' • '+esc(recipientName(u))+'</div><div class="pis-heading"><img src="'+esc(image(item.img))+'" alt=""><div><small>ITEM PREVIEW</small><h3>'+esc(item.name)+'</h3></div></div>'+(stats ? '<div class="pis-stats">'+stats+'</div>' : "")+'<div class="pis-description">'+desc+'</div></article>';
  }
  async function sendItem(item,recipientId) {
    if (!gm()) throw new Error("GM only");
    if (item?.documentName !== "Item") throw new Error(txt("invalid"));
    const target = game.users.get(recipientId);
    if (!target || target.isGM) throw new Error(txt("choose"));
    const whisper = [...new Set([target.id,game.user.id])];
    const created = await ChatMessage.create({user:game.user.id,speaker:{alias:game.user.name},content:card(item,target),whisper,blind:false,flags:{[ID]:{privatePreview:true}}});
    if (!created) throw new Error("Unable to create chat message");
    ui.notifications.info(txt("sent") + ": " + recipientName(target));
    return created;
  }
  let opened = null;
  function open(item) {
    if (!gm()) return ui.notifications.warn("GM only");
    if (item?.documentName !== "Item") return ui.notifications.warn(txt("invalid"));
    const users = (game.users?.contents || []).filter(u => !u.isGM).sort((a,b) => a.name.localeCompare(b.name));
    if (!users.length) return ui.notifications.warn(txt("none"));
    if (opened?.isConnected) opened.remove();
    const overlay = document.createElement("div");
    overlay.className = "pis-overlay";
    const playerOptions = users.map(u => '<option value="'+esc(u.id)+'">'+esc(recipientName(u))+(u.active?' • Online':'')+'</option>').join("");
    overlay.innerHTML =
      '<section class="pis-dialog" role="dialog" aria-modal="true" aria-label="'+esc(txt("title"))+'">' +
      '<header><h2><i class="fas fa-eye-slash"></i> '+esc(txt("title"))+'</h2><button class="pis-x" type="button" aria-label="Close">×</button></header>' +
      '<form><div class="pis-picked"><img src="'+esc(image(item.img))+'" alt=""><strong>'+esc(item.name)+'</strong><i class="fas fa-check-circle"></i></div>' +
      '<label for="pis-recipient">'+esc(txt("player"))+'</label>' +
      '<select id="pis-recipient" name="recipient" required><option value="">— '+esc(txt("choose"))+' —</option>'+playerOptions+'</select>' +
      '<footer><button class="pis-cancel" type="button">'+esc(txt("cancel"))+'</button>' +
      '<button class="pis-send" type="submit"><i class="fas fa-lock"></i> '+esc(txt("button"))+'</button></footer></form></section>';
    document.body.append(overlay);
    opened = overlay;
    const key = e => { if (e.key === "Escape") {e.preventDefault();close();} };
    const close = () => {overlay.remove();if(opened === overlay)opened=null;document.removeEventListener("keydown",key);};
    document.addEventListener("keydown",key);
    overlay.addEventListener("click", e => {
      if (e.target === overlay || e.target.closest(".pis-x,.pis-cancel")) close();
    });
    overlay.querySelector("form").addEventListener("submit",async e => {
      e.preventDefault();
      const recipientId = overlay.querySelector('select[name="recipient"]').value;
      if (!recipientId) return ui.notifications.warn(txt("choose"));
      const submit = overlay.querySelector(".pis-send");
      submit.disabled = true;
      try { await sendItem(item,recipientId);close(); }
      catch (err) { console.error(ID,err);ui.notifications.error(String(err?.message || err));submit.disabled=false; }
    });
    overlay.querySelector("select").focus();
    return overlay;
  }
  function isV14() { return Number.parseInt(String(game.version || game.release?.generation || "0"),10) >= 14; }
  function elementOf(value) {
    if (!value) return null;
    if (value instanceof HTMLElement) return value;
    if (value[0] instanceof HTMLElement) return value[0];
    return value?.target instanceof HTMLElement ? value.target : null;
  }
  // The Item Directory passes a row. Embedded items use a D&D 5e hook that
  // already supplies the Item document, avoiding ambiguous item IDs.
  async function directoryItem(element,app) {
    const el = elementOf(element);
    const row = el?.closest("[data-item-id],[data-document-id],[data-entry-id],[data-uuid]") || el;
    if (!row) return null;
    const uuid = row.dataset.uuid || row.dataset.documentUuid || row.dataset.entryUuid;
    if (uuid && typeof fromUuid === "function") {
      try {
        const document = await fromUuid(uuid);
        if (document?.documentName === "Item") return document;
      } catch(err) { console.warn(ID,err); }
    }
    const id = row.dataset.documentId || row.dataset.entryId || row.dataset.itemId || row.dataset.entityId;
    if (!id) return null;
    const item = app?.collection?.get?.(id) || game.items?.get?.(id);
    return item?.documentName === "Item" ? item : null;
  }
  async function onDirectoryItem(element,app) {
    const item = await directoryItem(element,app);
    return item ? open(item) : ui.notifications.warn(txt("invalid"));
  }
  function appendLegacy(options,getItem,app) {
    if (!gm() || !Array.isArray(options) || options.some(o => o.pisAction)) return;
    options.push({
      pisAction:true,name:txt("button"),icon:'<i class="fas fa-eye-slash"></i>',
      condition:() => gm(),
      callback: element => getItem ? open(getItem) : onDirectoryItem(element,app)
    });
  }
  function appendV14(options,getItem,app) {
    if (!gm() || !Array.isArray(options) || options.some(o => o.pisAction)) return;
    options.push({
      pisAction:true,label:txt("button"),icon:"fa-solid fa-eye-slash",
      visible:() => gm(),
      onClick:(_event,element) => getItem ? open(getItem) : onDirectoryItem(element,app)
    });
  }
  // Core V11's Items sidebar right-click menu.
  Hooks.on("getItemDirectoryEntryContext",(html,options) => {
    if (!isV14()) appendLegacy(options,null,null);
  });
  // Core V14's Items sidebar right-click menu.
  Hooks.on("getItemContextOptions",(app,options) => {
    if (isV14()) appendV14(options,null,app);
  });
  // D&D 5e actor inventory / features / spells context menu, both generations.
  Hooks.on("dnd5e.getItemContextOptions",(item,options) => {
    if (item?.documentName !== "Item") return;
    if (isV14()) appendV14(options,item,null);
    else appendLegacy(options,item,null);
  });
  Hooks.once("ready",() => {
    const mod = game.modules.get(ID);
    if (mod) mod.api = Object.freeze({showItem:open,sendItem});
    // Clean up a stale sidebar button after upgrading from v0.1.0.
    document.querySelectorAll(".pis-launch").forEach(el => el.remove());
    console.info("[Private Item Share] Context menu mode active on Foundry "+game.version);
  });
})();
