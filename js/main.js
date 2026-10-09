import { loadAssets } from './assets.js';
import { Game, STATES } from './game.js';
import { attachInput } from './input.js';
import { RankingService, normalizeName, normalizePhone, rankingCSV } from './ranking.js';
const $=id=>document.getElementById(id);
const ranking=new RankingService();let current=null,player='',saving=Promise.resolve();
const screens={MENU:'menu',PLAYING:'playing',GAME_OVER:'game-over',RANKING:'ranking'};
function show(state){game.state=state;document.body.dataset.state=state;Object.values(screens).forEach(id=>$(id).hidden=id!==screens[state]);$('menu-ranking').hidden=state===STATES.PLAYING;}
$('play').disabled=true;
const assets=await loadAssets();
document.querySelectorAll('[data-asset]').forEach(img=>{const source=assets[img.dataset.asset];if(source)img.src=source.src || source.toDataURL();else img.hidden=true;});
const game=new Game($('arena'),assets,g=>{
  $('score').textContent=g.score;$('time').textContent=g.remaining;$('collected').textContent=g.collected;$('growth').textContent=`HIPER ROLL: ${Math.round(g.scale*100)}%`;$('timer-box').classList.toggle('urgent',g.remaining<=5);
},result=>{
  show(STATES.GAME_OVER);$('result-name').textContent=result.name;$('result-score').textContent=result.score;$('result-collected').textContent=result.collected;
  saving=ranking.saveScore({...result,runId:makeRunId()}).then(entry=>{current=entry;$('storage-notice').textContent=entry.synced?'Pontuação enviada ao ranking global.':`Não foi possível sincronizar com o ranking global. ${ranking.persistent?'A pontuação foi salva neste navegador.':'A pontuação ficará disponível apenas nesta sessão.'}`;}).catch(error=>{current=null;$('storage-notice').textContent='Não foi possível salvar esta pontuação.';console.error('Falha ao salvar pontuação:',error);});
  $('replay').focus();
});
game.input=attachInput($('arena'),game);$('play').disabled=false;
function makeRunId(){if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.random()*256;bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}
function start(){$('name').blur();$('phone').blur();$('virtual-keyboard').hidden=true;show(STATES.PLAYING);$('player-name').textContent=player;game.start(player);$('arena').focus({preventScroll:true});}
$('start-form').addEventListener('submit',event=>{event.preventDefault();let field=$('name');try { player=normalizeName(field.value);field.value=player;field.setAttribute('aria-invalid','false');field=$('phone');field.value=normalizePhone(field.value);field.setAttribute('aria-invalid','false'); } catch(error) { $('name-error').textContent=error.message;field.setAttribute('aria-invalid','true');field.focus();return; }$('name-error').textContent='';start();});
$('replay').addEventListener('click',start);$('ranking-replay').addEventListener('click',start);
async function showRanking(){
  await saving;show(STATES.RANKING);$('export-password').value='';$('export-error').textContent='';const rows=await ranking.getRanking();$('ranking-notice').textContent=ranking.lastError?'Ranking global indisponível; exibindo os resultados locais salvos neste navegador.':'Ranking global atualizado.';$('ranking-list').replaceChildren();$('ranking-empty').hidden=rows.length>0;$('ranking-replay').hidden=!player;
  rows.forEach((entry,index)=>{const row=document.createElement('li');row.className='ranking-row';if(entry.id===current?.id)row.classList.add('current');const position=document.createElement('span');position.className='position';position.textContent=String(index+1).padStart(2,'0');const name=document.createElement('span');name.className='rank-name';name.textContent=entry.name;if(entry.id===current?.id){const you=document.createElement('span');you.className='you';you.textContent='ESTA PARTIDA';name.append(you);}const score=document.createElement('span');score.className='rank-score';score.textContent=entry.score;const unit=document.createElement('small');unit.textContent='PTS';score.append(unit);const date=document.createElement('time');date.className='rank-date';date.dateTime=entry.date;date.textContent=new Date(entry.date).toLocaleString('pt-BR');row.append(position,name,score,date);$('ranking-list').append(row);});
}
$('menu-ranking').addEventListener('click',showRanking);$('result-ranking').addEventListener('click',showRanking);
document.querySelectorAll('.home').forEach(button=>button.addEventListener('click',()=>{show(STATES.MENU);$('name').focus();}));

$('export-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if($('export-password').value!=='bobroll2026'){$('export-error').textContent='Senha incorreta.';return;}
  await saving;
  const rows=await ranking.getRanking(10);
  if(!rows.length){$('export-error').textContent='Ainda não há partidas para exportar.';return;}
  const url=URL.createObjectURL(new Blob([rankingCSV(rows)],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='hiper-roll-top10.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('export-password').value='';$('export-error').textContent='CSV gerado.';
});

let keyboardField=$('name');
const keyboard=$('virtual-keyboard');
function renderKeyboard(){
  keyboard.replaceChildren();
  const rows=keyboardField.id==='phone'?['1234567890']:['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM','ÁÀÂÃÉÊÍÓÔÕÚÇ'];
  for(const letters of rows){const row=document.createElement('div');row.className='keyboard-row';for(const key of [...letters])addKey(row,key,key);keyboard.append(row);}
  const controls=document.createElement('div');controls.className='keyboard-row';
  if(keyboardField.id==='name')addKey(controls,'Espaço',' ');
  addKey(controls,'Apagar','Backspace');addKey(controls,'Próximo','Next');addKey(controls,'Fechar','Close');keyboard.append(controls);
}
function addKey(row,label,key){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('pointerdown',event=>event.preventDefault());
  button.addEventListener('click',()=>{
    if(key==='Close'){keyboard.hidden=true;$('keyboard-toggle').setAttribute('aria-expanded','false');return;}
    if(key==='Next'){keyboardField=keyboardField.id==='name'?$('phone'):$('name');keyboardField.focus({preventScroll:true});renderKeyboard();return;}
    const input=keyboardField,start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
    if(key==='Backspace'){const from=start===end?Math.max(0,start-1):start;input.value=input.value.slice(0,from)+input.value.slice(end);input.setSelectionRange(from,from);}
    else if(input.value.length-(end-start)+key.length<=input.maxLength){input.value=input.value.slice(0,start)+key+input.value.slice(end);input.setSelectionRange(start+key.length,start+key.length);}
    input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});
  });row.append(button);
}
for(const id of ['name','phone'])$(id).addEventListener('focus',()=>{keyboardField=$(id);renderKeyboard();});
$('keyboard-toggle').addEventListener('click',()=>{keyboard.hidden=!keyboard.hidden;$('keyboard-toggle').setAttribute('aria-expanded',String(!keyboard.hidden));renderKeyboard();if(!keyboard.hidden)keyboardField.focus({preventScroll:true});});
// Dispositivos com tela sensível ao toque utilizam o teclado integrado automaticamente, evitando um segundo teclado do sistema operacional.
if(matchMedia('(pointer: coarse)').matches){
  for(const id of ['name','phone']){$(id).setAttribute('inputmode','none');$(id).addEventListener('focus',()=>{keyboard.hidden=false;$('keyboard-toggle').setAttribute('aria-expanded','true');});}
}
