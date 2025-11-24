// === ELEMENT SELECTORS ===
const el = id => document.getElementById(id);
const floorEl = el('floor'),
      hpEl = el('hp'),
      maxHpEl = el('maxHp'),
      powerEl = el('power'),
      goldEl = el('gold'),
      roleEl = el('role'); // <-- make sure you have a span with id="role" in HTML

const statusTitleEl = el('statusTitle'),
      statusTextEl = el('statusText'),
      logEl = el('log');

const nextFloorBtn = el('nextFloor'),
      restartBtn = el('restart');

const doorButtons = Array.from(document.querySelectorAll('.door'));

const combatEl = el('combat'),
      combatTitleEl = el('combatTitle'),
      combatLogEl = el('combatLog');

const attackMonsterBtn = el('attackMonster'),
      defendMonsterBtn = el('defendMonster'),
      useItemBtn = el('useItem');

const weaponNameEl = el('weaponName'),
      weaponPowerEl = el('weaponPower');

const armorNameEl = el('armorName'),
      armorHPEl = el('armorHP');

const invSlotsEl = Array.from(document.querySelectorAll('.inv-slot'));

const merchantEl = el('merchant'),
      merchantItemsEl = el('merchantItems'),
      leaveMerchantBtn = el('leaveMerchant');

let state, combatState, currentDoorTypes = [];
let merchantOpen = false; // <-- tracks merchant state

// === ROLES ===
const ROLES = {
  'Warrior': { hp: 30, power: 7, gold: 0 },
  'Paladin': { hp: 40, power: 5, gold: 0 },
  'Rogue':   { hp: 25, power: 6, gold: 30 },
  'Mage':    { hp: 22, power: 8, gold: 10 }
};

// === GEAR & ITEMS ===
const weapons = [
  {name:'Rusty Sword',power:2},
  {name:'Steel Sword',power:4},
  {name:'Fire Blade',power:6},
  {name:'Dragon Slayer',power:10}
];

const armors = [
  {name:'Leather Armor',hp:5},
  {name:'Chainmail',hp:10},
  {name:'Plate Armor',hp:15},
  {name:'Dragon Scale',hp:25}
];

const items = [
  {name:'Health Potion',type:'heal',value:20},
  {name:'One-Shot Gun',type:'damage',value:30},
  {name:'Strength Elixir',type:'buff',value:5,duration:3},
  {name:'Shield Talisman',type:'shield',value:0,duration:3},
  {name:'Fire Bomb',type:'damage',value:15}
];

const merchantInventory = [
  {name:'Mega Potion',type:'heal',value:50,cost:40},
  {name:'Thunder Gun',type:'damage',value:60,cost:100},
  {name:'Power Crystal',type:'buff',value:8,duration:5,cost:60}
];

const specialMerchantInventory = [
  {name:'Excalibur',type:'weapon',power:10,cost:180},
  {name:'Dragon Armor',type:'armor',hp:20,cost:140},
  {name:'Ultimate Potion',type:'heal',value:100,cost:80}
];

// === INIT RUN WITH ROLE ===
function pickRole(){
  let roleNames = Object.keys(ROLES);
  // *** UPDATED PROMPT WITH BONUSES SHOWN ***
  let choice = prompt(
`Choose your role (type the name):

Warrior  –  Balanced bruiser
  • HP: 30   • Power: 7   • Gold: 0
  Bonus: Higher starting strength for big early damage.

Paladin –  Holy tank
  • HP: 40   • Power: 5   • Gold: 0
  Bonus: Highest starting HP, very hard to kill.

Rogue   –  Sneaky looter
  • HP: 25   • Power: 6   • Gold: 30
  Bonus: Starts with extra gold for early shopping.

Mage    –  Glass cannon
  • HP: 22   • Power: 8   • Gold: 10
  Bonus: Highest starting power but low HP.

(Example: type "Warrior" or "Rogue")`,
    'Warrior'
  );

  if(!choice) choice = 'Warrior';
  choice = choice.trim();
  if(!roleNames.includes(choice)){
    // try case-insensitive
    const found = roleNames.find(r => r.toLowerCase() === choice.toLowerCase());
    choice = found || 'Warrior';
  }
  return choice;
}

function newRun(){
  const chosenRole = pickRole();

  const base = ROLES[chosenRole];

  state = {
    floor: 1,
    hp: base.hp,
    maxHP: base.hp,
    power: base.power,
    gold: base.gold,
    chosenThisFloor: false,
    dead: false,
    weapon: null,
    armor: null,
    inventory: [null, null, null],
    role: chosenRole
  };

  merchantOpen = false;
  logEl.innerHTML = '';
  combatEl.style.display = 'none';
  merchantEl.style.display = 'none';

  log(`New run started as a ${chosenRole}!`,'neutral');
  generateDoors();
  displayLeaderboard();
  updateUI();
  resetFloorText();
  updateGearUI();
  updateInventoryUI();
}

// === UI ===
function updateUI(){
  floorEl.textContent = state.floor;
  hpEl.textContent = state.hp;
  maxHpEl.textContent = state.maxHP;
  powerEl.textContent = state.power;
  goldEl.textContent = state.gold;
  if(roleEl) roleEl.textContent = state.role || 'None';
}

function updateGearUI(){
  weaponNameEl.textContent = state.weapon ? state.weapon.name : 'None';
  weaponPowerEl.textContent = state.weapon ? state.weapon.power : 0;
  armorNameEl.textContent = state.armor ? state.armor.name : 'None';
  armorHPEl.textContent = state.armor ? state.armor.hp : 0;
}

function updateInventoryUI(){
  state.inventory.forEach((item,i)=>{
    invSlotsEl[i].textContent = item ? item.name : 'Empty';
    invSlotsEl[i].disabled = !item;
  });
}

function log(msg,type='neutral'){
  const d = document.createElement('div');
  d.className = `log-entry ${type}`;
  d.textContent = msg;
  logEl.prepend(d);
}

function randomChoice(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

// === EXTRA EVENTS ===
function doTrapEvent(){
  const dmg = 3 + Math.floor(Math.random()*5);
  state.hp -= dmg;
  log(`A hidden trap springs! You take ${dmg} damage.`,'trap');
  if(state.hp<=0){
    state.hp=0;
    log('You died to a trap.','trap');
    state.dead=true;
    nextFloorBtn.disabled=true;
    saveScore(state.gold);
  }
  updateUI();
  statusTitleEl.textContent='Trap!';
  statusTextEl.textContent='Rusty blades and spikes everywhere.';
}

function doStrangerEvent(){
  const heal = 6 + Math.floor(Math.random()*6);
  state.hp += heal;
  if(state.hp>state.maxHP) state.hp=state.maxHP;
  log(`A hooded stranger patches you up. +${heal} HP.`,'stranger');
  updateUI();
  statusTitleEl.textContent='Kind Stranger';
  statusTextEl.textContent='Not everyone in the dungeon is hostile.';
}

function doShrineEvent(){
  statusTitleEl.textContent='Ancient Shrine';
  statusTextEl.textContent='An eerie altar hums with power.';
  const choice = prompt('Shrine: type "hp" for +max HP or "power" for +power.');
  if(choice==='hp'){
    const boost = 4 + Math.floor(state.floor/5);
    state.maxHP += boost;
    state.hp += boost;
    log(`The shrine blesses your body. +${boost} max HP.`,'good');
  } else if(choice==='power'){
    const boost = 1 + Math.floor(state.floor/10);
    state.power += boost;
    log(`The shrine fills your muscles with strength. +${boost} power.`,'good');
  } else {
    log('You hesitate and the shrine goes dark.','neutral');
  }
  updateUI();
}

function doCursedEvent(){
  statusTitleEl.textContent='Cursed Door';
  statusTextEl.textContent='You feel a bad vibe from this room.';
  const sure = confirm('Risk it? Lose 8 HP now, but maybe gain something big.');
  if(!sure){
    log('You step back from the cursed energy.','neutral');
    return;
  }
  const dmg = 8;
  state.hp -= dmg;
  log(`The curse burns your flesh. -${dmg} HP.`,'trap');
  if(state.hp<=0){
    state.hp=0;
    log('The curse kills you.','trap');
    state.dead=true;
    nextFloorBtn.disabled=true;
    updateUI();
    saveScore(state.gold);
    return;
  }
  if(Math.random()<0.5){
    const hpBoost = 6 + Math.floor(state.floor/4);
    const powBoost = 2;
    state.maxHP += hpBoost;
    state.hp += hpBoost;
    state.power += powBoost;
    log(`You endure the curse and grow stronger! +${hpBoost} max HP, +${powBoost} power.`,'good');
  } else {
    addRandomItem();
    addRandomItem();
    log('The curse leaves behind strange artifacts.','item');
  }
  updateUI();
}

// === DOORS ===
function generateDoors(){
  currentDoorTypes = ['loot','loot','loot'];

  if(Math.random()<0.18) currentDoorTypes[Math.floor(Math.random()*3)]='monster';
  if(Math.random()<0.08) currentDoorTypes[Math.floor(Math.random()*3)]='merchant';
  if(Math.random()<0.10) currentDoorTypes[Math.floor(Math.random()*3)]='trap';
  if(Math.random()<0.10) currentDoorTypes[Math.floor(Math.random()*3)]='stranger';
  if(Math.random()<0.07) currentDoorTypes[Math.floor(Math.random()*3)]='shrine';
  if(Math.random()<0.05) currentDoorTypes[Math.floor(Math.random()*3)]='cursed';

  if (state.floor % 25 === 0) {
    const bossIndex = Math.floor(Math.random()*3);
    currentDoorTypes[bossIndex] = 'boss';
  }

  doorButtons.forEach((b,i)=>{
    b.textContent='Door '+(i+1);
    b.disabled=false;
    b.classList.remove('disabled');
  });
}

function handleDoorClick(idx){
  if(state.dead || state.chosenThisFloor) return;
  const type = currentDoorTypes[idx];
  state.chosenThisFloor = true;
  doorButtons.forEach(b=>b.disabled=true);
  nextFloorBtn.disabled=false;

  if(type==='loot'){
    const g = 0 + Math.floor(Math.random()*3);
    if(g>0){
      state.gold += g;
      log(`You find a few scattered coins (+${g} gold).`,'loot');
    } else {
      log('The room is picked clean. No gold here.','neutral');
    }
    updateUI();
    statusTitleEl.textContent='Empty Room';
    statusTextEl.textContent='Dust, cobwebs, maybe a rat.';
  }
  else if(type==='merchant'){
    openMerchant(false);
    statusTitleEl.textContent='Merchant';
    statusTextEl.textContent='A shady figure offers you goods.';
  }
  else if(type==='monster'){
    startCombat(false);
  }
  else if(type==='boss'){
    openMerchant(true);
    statusTitleEl.textContent='Boss Door';
    statusTextEl.textContent='You hear something massive breathing…';
    setTimeout(()=> startCombat(true), 100);
  }
  else if(type==='trap'){
    doTrapEvent();
  }
  else if(type==='stranger'){
    doStrangerEvent();
  }
  else if(type==='shrine'){
    doShrineEvent();
  }
  else if(type==='cursed'){
    doCursedEvent();
  }
}

// === MERCHANT (cannot go next floor while open) ===
function openMerchant(isSpecial=false){
  merchantOpen = true;
  merchantEl.style.display='block';
  merchantItemsEl.innerHTML='';

  const inv = isSpecial ? specialMerchantInventory : merchantInventory;
  inv.forEach((mi,i)=>{
    const btn=document.createElement('button');
    btn.textContent=`${mi.name} — ${mi.cost}g`;
    btn.addEventListener('click',()=>buyMerchantItem(i,isSpecial));
    merchantItemsEl.appendChild(btn);
  });
}

leaveMerchantBtn.addEventListener('click',()=>{
  merchantOpen = false;
  merchantEl.style.display='none';
});

// === INVENTORY ===
function addRandomItem(){
  const empty = state.inventory.findIndex(i=>!i);
  if(empty===-1){
    log('Inventory full!','trap');
    return;
  }
  const it = randomChoice(items);
  state.inventory[empty] = it;
  log(`Found item: ${it.name}`,'item');
  updateInventoryUI();
}

function buyMerchantItem(i,isSpecial=false){
  const mi = (isSpecial?specialMerchantInventory:merchantInventory)[i];
  if(state.gold<mi.cost){
    log(`Not enough gold for ${mi.name}`,'merchant');
    return;
  }
  const empty = state.inventory.findIndex(i=>!i);
  if(empty===-1 && mi.type!=='weapon' && mi.type!=='armor'){
    log('Inventory full!','merchant');
    return;
  }
  state.gold -= mi.cost;

  if(mi.type==='weapon'){
    state.weapon = {name:mi.name,power:mi.power};
    state.power = mi.power;
    log(`Equipped new weapon: ${mi.name}`,'gear');
  }else if(mi.type==='armor'){
    state.armor = {name:mi.name,hp:mi.hp};
    state.maxHP += mi.hp;
    state.hp += mi.hp;
    log(`Equipped new armor: ${mi.name}`,'gear');
  }else{
    state.inventory[empty] = mi;
    log(`Bought ${mi.name}`,'item');
  }
  updateUI();
  updateGearUI();
  updateInventoryUI();
}

function useInventory(index){
  const it = state.inventory[index];
  if(!it) return;

  if(it.type==='heal'){
    state.hp += it.value;
    if(state.hp>state.maxHP) state.hp = state.maxHP;
    log(`Used ${it.name} +${it.value} HP!`,'loot');
    updateUI();
  }
  else if(it.type==='damage' && combatState){
    combatState.monsterHP -= it.value;
    logCombat(`Used ${it.name}, dealt ${it.value} damage!`,'good');
    if(combatState.monsterHP<=0){ endCombat(true); return; }
  }
  else if(it.type==='buff' && combatState){
    combatState.playerBuff += it.value;
    combatState.buffTurns = it.duration;
    logCombat(`Used ${it.name}, +${it.value} Power for ${it.duration} turns!`,'good');
  }
  else if(it.type==='shield' && combatState){
    combatState.shieldTurns = it.duration;
    logCombat(`Used ${it.name}, shield for ${it.duration} turns!`,'good');
  }

  state.inventory[index] = null;
  updateInventoryUI();
  updateUI();
}

// === COMBAT ===
function startCombat(isBoss=false){
  combatEl.style.display='block';
  combatLogEl.innerHTML='';

  const monHP = isBoss
    ? 40 + state.floor * 2
    : 8 + Math.floor(Math.random()*4 + state.floor/2);

  const monPower = isBoss
    ? 4 + Math.floor(state.floor * 0.5)
    : 1 + Math.floor(Math.random()*Math.max(1, state.floor/3));

  combatState = {
    playerHP: state.hp,
    playerPower: state.power,
    monsterHP: monHP,
    monsterPower: monPower,
    playerDefend: false,
    monsterDefend: false,
    playerBuff: 0,
    buffTurns: 0,
    shieldTurns: 0,
    turn: 'player',
    finished: false,
    isBoss: isBoss
  };

  log(isBoss ? 'A BOSS appears!!!' : 'A monster appears!','boss');
  updateCombatUI();
}

function updateCombatUI(){
  combatTitleEl.textContent = `Combat: Player ${combatState.playerHP} | Monster ${combatState.monsterHP}`;
}

function logCombat(msg,type='neutral'){
  const d = document.createElement('div');
  d.className = `combat-log-entry ${type}`;
  d.textContent = msg;
  combatLogEl.prepend(d);
}

attackMonsterBtn.addEventListener('click',()=>{ playerCombatTurn('attack'); });
defendMonsterBtn.addEventListener('click',()=>{ playerCombatTurn('defend'); });
useItemBtn.addEventListener('click',()=>{
  const slot = prompt('Use item slot 0,1,2');
  const idx = parseInt(slot);
  if(!isNaN(idx)&&idx>=0&&idx<3) useInventory(idx);
});

function playerCombatTurn(action){
  if(combatState.finished||combatState.turn!=='player') return;

  if(combatState.buffTurns>0){
    combatState.buffTurns--;
    if(combatState.buffTurns===0){
      combatState.playerPower -= combatState.playerBuff;
      logCombat('Buff wore off.','neutral');
      combatState.playerBuff = 0;
    }
  }

  if(action==='defend'){
    combatState.playerDefend = true;
    logCombat('You brace for attack.','neutral');
  } else {
    let base = combatState.playerPower;
    let dmg = Math.floor(base/2) + Math.floor(Math.random()*base) + 1;
    combatState.monsterHP -= dmg;
    logCombat(`You hit for ${dmg} damage!`,'good');
    updateCombatUI();
    if(combatState.monsterHP<=0){ endCombat(true); return; }
  }

  combatState.playerDefend = false;
  combatState.turn = 'monster';
  updateCombatUI();
  setTimeout(monsterCombatTurn,500);
}

function monsterCombatTurn(){
  if(combatState.finished) return;

  let dmg = Math.floor(Math.random()*(combatState.monsterPower)) + 1;
  if(combatState.playerDefend) dmg = Math.floor(dmg*0.5);
  if(combatState.shieldTurns>0) dmg = Math.floor(dmg/2);
  if(dmg<1) dmg = 1;

  combatState.playerHP -= dmg;
  logCombat(`Monster hits ${dmg}!`,'bad');

  if(combatState.playerHP<=0){ endCombat(false); return; }

  combatState.turn = 'player';
  updateCombatUI();
}

// === REWARDS ===
function endCombat(playerWon){
  combatState.finished = true;
  if(playerWon){
    log('Victory!','good');
    state.hp = combatState.playerHP;

    if(combatState.isBoss){
      log('Boss defeated! You feel MASSIVELY stronger...','good');
      const hpBoost = 10 + Math.floor(state.floor/4);
      const powerBoost = 2 + Math.floor(state.floor/30);
      state.maxHP += hpBoost;
      state.hp += hpBoost;
      state.power += powerBoost;
      log(`Boss reward: +${hpBoost} max HP, +${powerBoost} power!`,'good');
      addRandomItem();
      addRandomItem();
      addRandomItem();
    } else {
      const lootBase = 8 + Math.floor(state.floor/2);
      const lootRand = Math.floor(Math.random()*8);
      const loot = lootBase + lootRand;
      state.gold += loot;
      log(`Monster dropped ${loot} gold.`,'loot');
    }

  } else {
    log('You were slain.','trap');
    state.dead = true;
    state.hp = 0;
    nextFloorBtn.disabled = true;
    saveScore(state.gold);
  }
  combatEl.style.display='none';
  updateUI();
}

// === LEADERBOARD (stores role too) ===
function saveScore(gold){
  const name = prompt("You lost! Enter your name for the leaderboard:","Player");
  if(!name) return;
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")||"[]");
  leaderboard.push({name,gold,role: state.role || 'Unknown'});
  leaderboard.sort((a,b)=>b.gold-a.gold);
  if(leaderboard.length>10) leaderboard = leaderboard.slice(0,10);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  displayLeaderboard();
}

function displayLeaderboard(){
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")||"[]");
  const boardEl = el('leaderboard');
  boardEl.innerHTML = "<h3>Leaderboard</h3>";
  leaderboard.forEach((entry,i)=>{
    const div = document.createElement('div');
    div.textContent = `${i+1}. ${entry.name} (${entry.role}) — ${entry.gold} gold`;
    boardEl.appendChild(div);
  });
}

// === FLOOR CONTROL (BLOCK NEXT FLOOR WHILE MERCHANT OPEN) ===
function resetFloorText(){
  statusTitleEl.textContent = `Floor ${state.floor}`;
  statusTextEl.textContent = 'Three doors lie ahead…';
  state.chosenThisFloor = false;
  nextFloorBtn.disabled = true;
  doorButtons.forEach(b=>{
    b.disabled = false;
    b.classList.remove('disabled');
  });
  merchantOpen = false;
  merchantEl.style.display='none';
  generateDoors();
}

nextFloorBtn.addEventListener('click',()=>{
  if(merchantOpen){
    alert("You must leave the merchant before continuing to the next floor!");
    return;
  }
  if(!state.dead && (!combatState || combatState.finished)){
    state.floor++;
    resetFloorText();
    updateUI();
    updateGearUI();
    updateInventoryUI();
  }
});

restartBtn.addEventListener('click',()=>{ newRun(); });

doorButtons.forEach((b,i)=>{
  b.addEventListener('click',()=>handleDoorClick(i));
});

// === START GAME ===
newRun();