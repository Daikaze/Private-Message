/* Private Item Share - Foundry VTT 11 and 14 */
(() => {
  "use strict";
  const ID = "private-item-share";
  const I18N = {
    en: { title:"Show Item Privately", button:"Show Privately", chat:"Private Item", player:"Only this player can see it", search:"Search items and inventories", drop:"Drop an Item from an inventory or Compendium here", cancel:"Cancel", item:"Select an item", choose:"Select a player", none:"No players available", invalid:"Drop a valid Item", sent:"Item shown privately to", empty:"No description available", secret:"Private preview", type:"Type", rarity:"Rarity", price:"Price", weight:"Weight", damage:"Damage", quantity:"Quantity" },
    bg: { title:"Покажи предмет лично", button:"Покажи лично", chat:"Личен предмет", player:"Само този играч ще го вижда", search:"Търси предмет или в инвентар", drop:"Влачи предмет от инвентар или Compendium тук", cancel:"Отказ", item:"Избери предмет", choose:"Избери играч", none:"Няма играчи", invalid:"Влачи валиден предмет", sent:"Предметът е показан лично на", empty:"Няма описание", secret:"Личен преглед", type:"Тип", rarity:"Рядкост", price:"Цена", weight:"Тегло", damage:"Щети", quantity:"Количество" }
  };
  const txt = key => (I18N[game.i18n?.lang?.startsWith("bg") ? "bg" : "en"][key] || key);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const gm = () => !!game.user?.isGM;
  const itemOf = app => {
    const item = app?.item || app?.document || app?.object;
    return item?.documentName === "Item" ? item : null;
  };
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
  function worldItems() {
    const records = [];
    for (const item of game.items?.contents || []) records.push({item,owner:"Items"});
    for (const actor of game.actors?.contents || []) for (const item of actor.items?.contents || []) records.push({item,owner:actor.name});
    return records.sort((a,b) => a.item.name.localeCompare(b.item.name));
  }
  async function droppedItem(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer?.getData("text/plain") || "null"); } catch { return null; }
    if (!data || data.type !== "Item") return null;
    let item;
    if (data.uuid && typeof fromUuid === "function") try { item = await fromUuid(data.uuid); } catch (e) { console.warn(ID,e); }
    if (!item && typeof Item?.fromDropData === "function") try { item = await Item.fromDropData(data); } catch (e) { console.warn(ID,e); }
    return item?.documentName === "Item" ? item : null;
  }
  let opened = null;
  async function open(initial=null) {
    if (!gm()) return ui.notifications.warn("GM only");
    const users = (game.users?.contents || []).filter(u => !u.isGM).sort((a,b) => a.name.localeCompare(b.name));
    if (!users.length) return ui.notifications.warn(txt("none"));
    if (opened) opened.remove();
    const overlay = document.createElement("div");
    overlay.className = "pis-overlay";
    overlay.innerHTML = '<section class="pis-dialog" role="dialog" aria-modal="true"><header><h2><i class="fas fa-eye-slash"></i> '+esc(txt("title"))+'</h2><button class="pis-x" type="button" aria-label="Close">×</button></header><form><label>'+esc(txt("player"))+'</label><select name="recipient" required><option value="">—</option>'+users.map(u => '<option value="'+esc(u.id)+'">'+esc(recipientName(u))+(u.active?' • Online':'')+'</option>').join("")+'</select><label>'+esc(txt("item"))+'</label><input class="pis-search" type="search" autocomplete="off" placeholder="'+esc(txt("search"))+'"><div class="pis-results" hidden></div><div class="pis-drop"><i class="fas fa-box-open"></i><span>'+esc(txt("drop"))+'</span></div><div class="pis-picked" hidden></div><footer><button class="pis-cancel" type="button">'+esc(txt("cancel"))+'</button><button class="pis-send" type="submit"><i class="fas fa-lock"></i> '+esc(txt("button"))+'</button></footer></form></section>';
    document.body.append(overlay);
    opened = overlay;
    const search = overlay.querySelector(".pis-search"), results = overlay.querySelector(".pis-results"), drop = overlay.querySelector(".pis-drop"), picked = overlay.querySelector(".pis-picked");
    const entries = worldItems();
    let chosen = initial?.documentName === "Item" ? initial : null;
    let visible = [];
    const close = () => { overlay.remove(); if (opened === overlay) opened = null; document.removeEventListener("keydown",key); };
    const key = e => { if (e.key === "Escape") {e.preventDefault();close();} };
    document.addEventListener("keydown",key);
    overlay.addEventListener("click",e => { if (e.target === overlay || e.target.closest(".pis-x,.pis-cancel")) close(); if (!e.target.closest(".pis-search,.pis-results")) results.hidden = true; });
    const showSelected = () => {
      picked.hidden = !chosen;
      picked.innerHTML = chosen ? '<img src="'+esc(image(chosen.img))+'" alt=""><strong>'+esc(chosen.name)+'</strong><i class="fas fa-check-circle"></i>' : "";
      results.hidden = true;
    };
    const searchItems = () => {
      const q = search.value.trim().toLocaleLowerCase();
      visible = entries.filter(x => (x.item.name+" "+x.owner).toLocaleLowerCase().includes(q)).slice(0,60);
      results.innerHTML = visible.length ? visible.map((r,i) => '<button type="button" data-index="'+i+'"><img src="'+esc(image(r.item.img))+'" alt=""><span><strong>'+esc(r.item.name)+'</strong><small>'+esc(r.owner)+'</small></span></button>').join("") : '<p>No matching items</p>';
      results.hidden = false;
    };
    search.addEventListener("input",searchItems);
    search.addEventListener("focus",searchItems);
    results.addEventListener("click",e => {
      const btn = e.target.closest("[data-index]");
      if (!btn) return;
      chosen = visible[Number(btn.dataset.index)]?.item || null;
      if (chosen) search.value = chosen.name;
      showSelected();
    });
    drop.addEventListener("dragover",e => {e.preventDefault();drop.classList.add("pis-over");});
    drop.addEventListener("dragleave",() => drop.classList.remove("pis-over"));
    drop.addEventListener("drop",async e => {
      e.preventDefault();drop.classList.remove("pis-over");
      const item = await droppedItem(e);
      if (!item) return ui.notifications.warn(txt("invalid"));
      chosen = item; search.value = item.name; showSelected();
    });
    overlay.querySelector("form").addEventListener("submit",async e => {
      e.preventDefault();
      if (!chosen) return ui.notifications.warn(txt("item"));
      const id = overlay.querySelector("select[name='recipient']").value;
      if (!id) return ui.notifications.warn(txt("choose"));
      const submit = overlay.querySelector(".pis-send");
      submit.disabled = true;
      try { await sendItem(chosen,id); close(); }
      catch (err) {console.error(ID,err);ui.notifications.error(String(err?.message || err));submit.disabled = false;}
    });
    showSelected();
    (chosen ? overlay.querySelector("select") : search).focus();
    return overlay;
  }
  function headerV11(app,buttons) {
    if (!gm() || !Array.isArray(buttons)) return;
    const item = itemOf(app);
    if (item && !buttons.some(b => b.class === "pis-item-share")) buttons.unshift({label:txt("button"),class:"pis-item-share",icon:"fas fa-eye-slash",onclick:() => open(item)});
  }
  function headerV14(app,controls) {
    if (!gm() || !Array.isArray(controls)) return;
    const item = itemOf(app);
    if (item && !controls.some(b => b.action === ID)) controls.push({action:ID,label:txt("button"),icon:"fa-solid fa-eye-slash",onClick:() => open(item),visible:true});
  }
  function menuItem(el) {
    const node = el?.jquery ? el[0] : el;
    const row = node?.closest?.("[data-document-id],[data-entry-id],[data-item-id]") || node;
    return game.items.get(row?.dataset?.documentId || row?.dataset?.entryId || row?.dataset?.itemId);
  }
  Hooks.on("getApplicationHeaderButtons",headerV11);
  Hooks.on("getItemSheetHeaderButtons",headerV11);
  Hooks.on("getHeaderControlsApplicationV2",headerV14);
  Hooks.on("getItemDirectoryEntryContext",(_html,options) => {
    if (!Array.isArray(options)) return;
    options.push({name:txt("button"),icon:'<i class="fas fa-eye-slash"></i>',condition:gm,callback:el => {const item=menuItem(el);if(item)open(item);}});
  });
  Hooks.on("getItemContextOptions",(_app,options) => {
    if (!Array.isArray(options)) return;
    options.push({label:txt("button"),classes:ID,icon:"fa-solid fa-eye-slash",visible:gm,onClick:(_event,el) => {const item=menuItem(el);if(item)open(item);}});
  });
  function mount() {
    if (!gm()) return;
    const chat = document.querySelector("#chat") || document.querySelector("#sidebar-chat") || document.querySelector('.sidebar-tab[data-tab="chat"]');
    if (!chat || chat.querySelector(".pis-launch")) return;
    const wrap = document.createElement("div");
    wrap.className = "pis-launch";
    wrap.innerHTML = '<button type="button"><i class="fas fa-eye-slash"></i> '+esc(txt("chat"))+'</button>';
    wrap.querySelector("button").addEventListener("click",() => open());
    (chat.querySelector(".chat-controls") || chat.querySelector(".directory-header") || chat).prepend(wrap);
  }
  for (const hook of ["renderChatLog","renderChatLogV2","renderSidebarTab","renderSidebar"]) Hooks.on(hook,() => setTimeout(mount,0));
  Hooks.once("ready",() => {
    const mod = game.modules.get(ID);
    if (mod) mod.api = Object.freeze({open,showItem:open,sendItem});
    setTimeout(mount,0);
    console.info("[Private Item Share] Ready for Foundry "+game.version);
  });
})();
