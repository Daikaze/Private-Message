import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../scripts/main.js",import.meta.url),"utf8");
const manifest = JSON.parse(readFileSync(new URL("../v11/module.json",import.meta.url),"utf8"));

function setup({canSee=true}={}) {
  const hooks = new Map(), listeners = new Map(), messages = [], popouts = [];
  const users = [{id:"p1",name:"Alice"},{id:"p2",name:"Bob"}];
  const item = {documentName:"Item",id:"i1",img:"art/sword.webp",
    visible:true,parent:{documentName:"Actor",testUserPermission:()=>canSee}};
  const sandbox = {
    console,
    game:{user:users[0],release:{generation:11},i18n:{lang:"en"},
      modules:new Map([["private-item-share",{}]]),
      items:{get:id=>id==="i1"?item:null},
      users:{contents:users,get:id=>users.find(u=>u.id===id)}},
    Hooks:{on:(name,fn)=>hooks.set(name,fn),once:(name,fn)=>hooks.set(name,fn)},
    ui:{notifications:{warn:()=>{},error:msg=>{throw new Error(msg)}}},
    document:{addEventListener:(type,fn)=>listeners.set(type,fn),querySelectorAll:()=>[]},
    ImagePopout:class {constructor(src,opts){this.src=src;this.opts=opts;}
      render(){popouts.push(this);}},
    ChatMessage:{create:async data=>{messages.push(data);return {id:"m1",...data};}},
    HTMLElement:class HTMLElement {}
  };
  vm.runInNewContext(source,vm.createContext(sandbox),{filename:"main.js"});
  hooks.get("ready")();
  return {hooks,listeners,messages,popouts,item,api:sandbox.game.modules.get("private-item-share").api};
}

test("V11 package uses legacy script and independent version",()=>{
  assert.equal(manifest.version,"0.3.1");
  assert.deepEqual(manifest.esmodules,["scripts/main.js"]);
});
test("V11 item right-click menu has private and public actions exactly once",()=>{
  const h=setup(),opts=[];
  h.hooks.get("dnd5e.getItemContextOptions")(h.item,opts);
  h.hooks.get("dnd5e.getItemContextOptions")(h.item,opts);
  assert.deepEqual(opts.map(o=>o.name),["Send Art Privately","Send Art to Chat"]);
  assert.ok(opts.every(o=>o.condition()));
});
test("public action posts only artwork to everyone, private whisper is preserved",async()=>{
  const h=setup(),opts=[];
  h.hooks.get("dnd5e.getItemContextOptions")(h.item,opts);
  await opts[1].callback();
  await h.api.sendItem(h.item,"p2");
  assert.equal(h.messages.length,2);
  assert.deepEqual([...h.messages[0].whisper],[]);
  assert.equal(h.messages[0].content,'<img class="pis-art-only" src="art/sword.webp" alt="">');
  assert.deepEqual([...h.messages[1].whisper],["p2","p1"]);
});
test("clicking a module image opens large ImagePopout",()=>{
  const h=setup();
  let prevented=false,stopped=false;
  const img={getAttribute:key=>key==="src"?"art/sword.webp":null};
  h.listeners.get("click")({target:{closest:()=>img},
    preventDefault:()=>{prevented=true},stopPropagation:()=>{stopped=true}});
  assert.equal(h.popouts.length,1);
  assert.equal(h.popouts[0].src,"art/sword.webp");
  assert.equal(prevented,true);
  assert.equal(stopped,true);
});
test("viewing permissions apply equally to private and public sharing",async()=>{
  const h=setup({canSee:false});
  await assert.rejects(h.api.postItem(h.item));
  await assert.rejects(h.api.sendItem(h.item,"p2"));
  assert.equal(h.messages.length,0);
});
