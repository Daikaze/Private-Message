import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const path=new URL("../scripts/main-v14.js", import.meta.url);
const script=readFileSync(path,"utf8");
const manifest=JSON.parse(readFileSync(new URL("../module.json",import.meta.url),"utf8"));
const v11=JSON.parse(readFileSync(new URL("../v11/module.json",import.meta.url),"utf8"));

function setup({gm=false, allowView=true}={}) {
  const hooks=new Map(), notifications=[], messages=[],dialogs=[];
  const users=[
    {id:"p1",name:"Alice",isGM:false},
    {id:"p2",name:"Bob",isGM:false,character:{name:"Dimir"}},
    {id:"gm1",name:"GM",isGM:true}
  ];
  const user=gm?users[2]:users[0];
  let dialogResult="p2",dialogWait=null;
  const actor={
    documentName:"Actor",id:"a1",
    testUserPermission:()=>allowView
  };
  const item={
    documentName:"Item",id:"i1",img:"art/sword.webp",parent:actor,
    visible:true,isOwner:true
  };
  const sandbox={
    console,
    game:{
      user,users:{
        contents:users,get:id=>users.find(x=>x.id===id)
      },
      modules:new Map([["private-item-share",{}]]),
      i18n:{lang:"en"},items:{get:id=>id===item.id?item:null}
    },
    foundry:{applications:{api:{
      DialogV2:{
        wait:async config=>{
          dialogs.push(config);
          if(dialogWait)await dialogWait;
          return dialogResult==="send"
            ? config.buttons[1].callback({}, {form:{elements:{namedItem:()=>({value:"p2"})}}})
            : dialogResult;
        }
      }
    }}},
    Hooks:{
      on:(name,fn)=>hooks.set(name,fn),
      once:(name,fn)=>hooks.set(name,fn)
    },
    ui:{notifications:{warn:x=>notifications.push(["warn",x]),error:x=>notifications.push(["error",x])}},
    ChatMessage:{create:async data=>{messages.push(data);return {id:"chat1",...data}}},
    fromUuid:async uuid=>uuid==="Item.i1"?item:null,
    HTMLElement:class HTMLElement {}
  };
  vm.runInNewContext(script,vm.createContext(sandbox),{filename:"main-v14.js"});
  hooks.get("ready")();
  const api=sandbox.game.modules.get("private-item-share").api;
  return {
    item,actor,user,users,hooks,messages,notifications,dialogs,api,sandbox,
    setDialogResult:x=>{dialogResult=x;},
    blockDialog:promise=>{dialogWait=promise;},
    clearDialog:()=>{dialogWait=null;}
  };
}

test("native V14 manifest and V11 package remain separate",()=>{
  assert.equal(manifest.version,"0.3.1");
  assert.equal(manifest.compatibility.verified,"14");
  assert.deepEqual(manifest.esmodules,["scripts/main-v14.js"]);
  assert.deepEqual(manifest.styles,["styles/v14.css"]);
  assert.equal(manifest.relationships.systems[0].compatibility.verified,"6.0.6");
  assert.equal(v11.version,"0.3.0");
  assert.deepEqual(v11.esmodules,["scripts/main.js"]);
  assert.ok(v11.download.endsWith("private-item-share-v11.zip"));
  const css=readFileSync(new URL("../styles/v14.css",import.meta.url),"utf8");
  assert.ok(css.includes(".pis-native-dialog .pis-native-content"));
  assert.ok(!css.includes("pis-overlay"));
});
test("right-click action appears exactly once for V14 Item directory",()=>{
  const h=setup();
  assert.ok(h.hooks.has("getItemContextOptions"));
  assert.ok(h.hooks.has("dnd5e.getItemContextOptions"));
  assert.ok(!h.hooks.has("getItemDirectoryEntryContext"));
  const options=[];
  const app={collection:{get:id=>h.sandbox.game.items.get(id)}};
  h.hooks.get("getItemContextOptions")(app,options);
  h.hooks.get("getItemContextOptions")(app,options);
  assert.equal(options.length,1);
  assert.equal(options[0].label,"Send Art Privately");
  assert.equal(typeof options[0].onClick,"function");
  assert.equal(typeof options[0].visible,"function");
});
test("whisper is exactly a single item art image addressed to sender + recipient",async()=>{
  const h=setup();
  await h.api.sendItem(h.item,"p2");
  assert.equal(h.messages.length,1);
  const m=h.messages[0];
  assert.deepEqual([...m.whisper],["p2","p1"]);
  assert.equal(m.content,'<img class="pis-art-only" src="art/sword.webp" alt="">');
  assert.ok(!m.content.includes(h.item.id));
  assert.equal(m.user,"p1");
  await assert.rejects(h.api.sendItem(h.item,"p1"));
});
test("native chooser uses V14 DialogV2 with art-only preview and selected recipient",async()=>{
  const h=setup();
  h.setDialogResult("send");
  await h.api.showItem(h.item);
  assert.equal(h.dialogs.length,1);
  const dialog=h.dialogs[0];
  assert.equal(dialog.window.frame,true);
  assert.equal(dialog.window.resizable,true);
  assert.equal(dialog.window.minimizable,true);
  assert.deepEqual([...dialog.classes],["pis-native-dialog"]);
  assert.ok(dialog.content.includes('src="art/sword.webp"'));
  assert.ok(!dialog.content.includes("<form"));
  assert.ok(dialog.content.includes('name="recipient"'));
  assert.equal(h.messages.length,1);
});
test("actor inventory action works for players; no header or chat button",async()=>{
  const h=setup();
  const options=[];
  h.hooks.get("dnd5e.getItemContextOptions")(h.item,options);
  assert.equal(options.length,1);
  assert.equal(options[0].visible(),true);
  h.setDialogResult("send");
  await options[0].onClick({},null);
  assert.equal(h.messages.length,1);
  assert.ok(![...h.hooks.keys()].some(x=>x==="renderItemSheet"||x==="renderChatLog"));
});
test("restricted or hidden item cannot be shared by a player",async()=>{
  const h=setup({allowView:false});
  assert.equal((await h.api.sendItem(h.item,"p2")).id,"chat1");
  // Parent denies view, but a directly-owned embedded item requires explicit ownership.
  h.item.isOwner=false;
  await assert.rejects(h.api.sendItem(h.item,"p2"));
  h.item.visible=false;
  await assert.rejects(h.api.sendItem(h.item,"p2"));
  assert.equal(h.messages.length,1);
});
test("GM can share an item and cancel does not emit a message",async()=>{
  const h=setup({gm:true,allowView:false});
  h.setDialogResult("cancel");
  await h.api.showItem(h.item);
  assert.equal(h.messages.length,0);
  await h.api.sendItem(h.item,"p2");
  assert.equal(h.messages.length,1);
  assert.deepEqual([...h.messages[0].whisper],["p2","gm1"]);
});
test("untrusted artwork URL cannot inject markup into private message",async()=>{
  const h=setup();
  h.item.img='javascript:alert(1)';
  await h.api.sendItem(h.item,"p2");
  assert.match(h.messages[0].content,/src="icons\/svg\/item-bag.svg"/);
  h.item.img='name" onerror="alert(1).png';
  await h.api.sendItem(h.item,"p2");
  assert.ok(!h.messages[1].content.includes('onerror="alert(1)'));
  assert.ok(h.messages[1].content.includes("&quot;"));
});
