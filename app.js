const VERSION = '1.0.3';
const STORAGE_KEY = 'showcase-loan-manager-v1';
const CONFIG_KEY = 'showcase-loan-firebase-config-v1';
const SALESPEOPLE = ['Z', 'G', 'A', 'AL', 'AX', 'C', 'H'];
const PRODUCTS = ['CB-963B(1)', 'CB-970(2)', 'CB-973(2)', 'CB-991D-110V(2)', 'CB-991D-220V(1)', 'CB-998D-110V(2)', 'SD101(2)', 'SD150A-110V(2)', 'CB-994D(1)', 'SD320-110V(1)', 'CB-963A1-110V(1)', 'CB-443L-110V(1)', 'CB-440-110V(1)', '干住錫絲(0.3~1.2mm)', 'CB-300(1)'];
let state = {salespersons:[...SALESPEOPLE], products:[...PRODUCTS], transactions:[]};
let statusFilter = 'active', selectedSales = '', firebase = null, unsubscribe = null;
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),2600)}
function localSave(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){toast('本機儲存空間不足，請先匯出報表')}}
function salesOf(tx){return Object.keys(tx.salespersons||{}).filter(k=>tx.salespersons[k])}
function persist(tx){const i=state.transactions.findIndex(x=>x.id===tx.id);if(i<0)state.transactions.push(tx);else state.transactions[i]=tx;localSave();render();if(firebase)firebase.setDoc(firebase.doc(firebase.db,'artifacts',firebase.appId,'public','data','inventory_transactions',tx.id),tx).catch(()=>toast('雲端同步失敗，資料已先保存在本機'))}
function render(){
  const salesSelect=$('sales-filter'), prev=salesSelect.value;
  salesSelect.innerHTML='<option value="">所有業務</option>'+state.salespersons.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');salesSelect.value=state.salespersons.includes(prev)?prev:'';
  $('active-count').textContent=state.transactions.filter(t=>!t.isDeleted).length;
  $('archived-count').textContent=state.transactions.filter(t=>t.isDeleted).length;
  $('status-filter').value=statusFilter;
  $('table-subhead').innerHTML=state.salespersons.map(s=>`<th class="sales-heading">${esc(s)}</th>`).join('')+`<th class="customer-subhead"></th>`+state.products.map(p=>`<th class="product-heading"><span>${esc(p)}</span></th>`).join('')+`<th class="actions-subhead"></th>`;
  const rows=state.transactions.filter(t=>(statusFilter==='all'||(statusFilter==='active'?!t.isDeleted:t.isDeleted))&&(!selectedSales||salesOf(t).includes(selectedSales))).sort((a,b)=>String(b.borrowDate||'').localeCompare(String(a.borrowDate||'')));
  $('record-list').innerHTML=rows.map(tableRow).join('');$('empty-state').classList.toggle('hidden',rows.length>0);
}
function tableRow(tx){
  const sales=state.salespersons.map(s=>`<td class="sales-cell"><label class="sales-check" aria-label="業務 ${esc(s)}"><input type="checkbox" data-action="toggle-salesperson" data-id="${esc(tx.id)}" data-salesperson="${esc(s)}" ${tx.salespersons?.[s]?'checked':''} ${tx.isDeleted?'disabled':''}><span></span></label></td>`).join('');
  const products=state.products.map(p=>{const value=Number(tx.products?.[p]||0),stateClass=value===1?'is-1':value===2?'is-2':'is-empty';return `<td class="product-cell"><button type="button" class="table-product ${stateClass}" data-action="cycle-product" data-id="${esc(tx.id)}" data-product="${esc(p)}" aria-label="${esc(p)}：${value||'空'}，點選切換" ${tx.isDeleted?'disabled':''}>${value?`<b>${value}</b>`:'<span>－</span>'}</button></td>`}).join('');
  const activeActions=`<button class="row-return" data-action="return" data-id="${esc(tx.id)}" title="選擇本次歸還產品">點擊歸還</button><button data-action="edit" data-id="${esc(tx.id)}">編輯</button><button data-action="history" data-id="${esc(tx.id)}">歷史</button><button class="row-delete" data-action="delete" data-id="${esc(tx.id)}">刪除</button>`;
  const archivedActions=`<button class="row-restore" data-action="restore" data-id="${esc(tx.id)}">恢復主表</button><button data-action="history" data-id="${esc(tx.id)}">歷史</button><button class="row-delete" data-action="delete" data-id="${esc(tx.id)}">永久刪除</button>`;
  return `<tr class="loan-row ${tx.isDeleted?'is-archived':''}"><td class="date-cell"><label><span>借出</span><input type="date" data-field="borrowDate" data-id="${esc(tx.id)}" value="${esc(tx.borrowDate||'')}" ${tx.isDeleted?'disabled':''}></label><label><span>歸還</span><input type="date" data-field="returnDate" data-id="${esc(tx.id)}" value="${esc(tx.returnDate||'')}" ${tx.isDeleted?'disabled':''}></label></td>${sales}<td class="customer-cell"><input type="text" data-field="customerName" data-id="${esc(tx.id)}" value="${esc(tx.customerName||'')}" placeholder="輸入客戶" maxlength="100" ${tx.isDeleted?'disabled':''}></td>${products}<td class="row-action-cell"><div class="row-actions">${tx.isDeleted?archivedActions:activeActions}</div></td></tr>`;
}
function openDialog(id){$(id).showModal()}function closeDialog(el){el.closest('dialog')?.close()}
function openEditor(tx){$('transaction-form').reset();$('tx-id').value=tx?.id||'';$('form-title').textContent=tx?'編輯借用單':'新增借用單';$('borrow-date').value=tx?.borrowDate||today();$('return-date').value=tx?.returnDate||'';$('customer').value=tx?.customerName||'';
  $('sales-options').innerHTML=state.salespersons.map(s=>`<label class="check-item"><input type="checkbox" name="salesperson" value="${esc(s)}" ${(tx?.salespersons?.[s])?'checked':''}><span>${esc(s)}</span></label>`).join('');
  $('product-options').innerHTML=state.products.map(p=>{const n=Number(tx?.products?.[p]||0);return `<label class="product-choice"><input type="checkbox" name="product" value="${esc(p)}" ${n?'checked':''}><span>${esc(p)}</span><select aria-label="${esc(p)} 數量"><option value="1" ${n===1?'selected':''}>1</option><option value="2" ${n===2?'selected':''}>2</option></select></label>`}).join('');openDialog('transaction-dialog')}
function saveEditor(e){e.preventDefault();const id=$('tx-id').value||`tx_${Date.now().toString(36)}`;const sales={};document.querySelectorAll('input[name="salesperson"]:checked').forEach(x=>sales[x.value]=true);const products={};document.querySelectorAll('input[name="product"]:checked').forEach(x=>products[x.value]=Number(x.closest('label').querySelector('select').value));const old=state.transactions.find(x=>x.id===id);persist({id,borrowDate:$('borrow-date').value,returnDate:$('return-date').value,customerName:$('customer').value.trim(),salespersons:sales,products,isDeleted:old?.isDeleted||false,history:old?.history||[]});$('transaction-dialog').close();toast('借用單已儲存')}
function beginReturn(tx){if(!salesOf(tx).length){tx.isDeleted=true;tx.returnDate=today();persist(tx);toast('借用單已封存');return}$('return-tx-id').value=tx.id;$('return-sales').innerHTML=salesOf(tx).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('return-products').innerHTML=Object.entries(tx.products||{}).filter(([,n])=>Number(n)>0).map(([p,n])=>`<label class="product-choice"><input type="checkbox" name="return-product" value="${esc(p)}" checked><span>${esc(p)}</span><b>×${esc(n)}</b></label>`).join('')||'<p>沒有尚未歸還的產品</p>';openDialog('return-dialog')}
function submitReturn(e){e.preventDefault();const tx=state.transactions.find(x=>x.id===$('return-tx-id').value);if(!tx)return;const who=$('return-sales').value, checked=[...document.querySelectorAll('input[name="return-product"]:checked')];if(!checked.length){toast('請至少選擇一項歸還產品');return}const returned={};checked.forEach(x=>returned[x.value]=tx.products[x.value]);const copy=JSON.parse(JSON.stringify(tx));copy.id=`tx_${Date.now().toString(36)}`;copy.salespersons={[who]:true};copy.products=returned;copy.returnDate=today();copy.isDeleted=true;copy.history=[...(tx.history||[]),{type:'partial-return',date:today(),salesperson:who,products:returned}];persist(copy);for(const p of Object.keys(returned))delete tx.products[p];tx.salespersons[who]=false;tx.history=[...(tx.history||[]),{type:'return',date:today(),salesperson:who,products:returned}];if(!salesOf(tx).length||!Object.values(tx.products).some(n=>Number(n)>0)){tx.isDeleted=true;tx.returnDate=today()}persist(tx);$('return-dialog').close();toast('歸還紀錄已保存')}
function showHistory(tx){const records=state.transactions.filter(t=>!selectedSales||salesOf(t).includes(selectedSales));$('history-list').innerHTML=records.length?records.map(t=>`<div class="history-row"><strong>${esc(t.customerName||'未填寫客戶名稱')} · ${t.isDeleted?'已封存':'未歸還'}</strong><p>借出 ${esc(t.borrowDate||'—')}　歸還 ${esc(t.returnDate||'—')}<br>${Object.entries(t.products||{}).map(([p,n])=>`${esc(p)} ×${esc(n)}`).join('、')||'無產品'}<br>業務 ${salesOf(t).map(esc).join('、')||'未指定'}</p><button data-action="restore" data-id="${esc(t.id)}">恢復主表</button> <button class="delete" data-action="delete" data-id="${esc(t.id)}">永久刪除</button></div>`).join(''):'<p class="empty">目前沒有歷史紀錄</p>';openDialog('history-dialog')}
function handleAction(e){
  const b=e.target.closest('[data-action]');if(!b)return;
  const tx=state.transactions.find(t=>t.id===b.dataset.id);if(!tx)return;
  switch(b.dataset.action){
    case'return':beginReturn(tx);break;
    case'edit':openEditor(tx);break;
    case'history':showHistory(tx);break;
    case'restore':tx.isDeleted=false;tx.returnDate='';persist(tx);toast('已恢復至未歸還主表');break;
    case'toggle-salesperson':{
      if(tx.isDeleted)return;
      const name=b.dataset.salesperson;
      tx.salespersons ||= {};
      tx.salespersons[name]=!tx.salespersons[name];
      persist(tx);break;
    }
    case'cycle-product':{
      if(tx.isDeleted)return;
      const product=b.dataset.product;
      tx.products ||= {};
      const value=Number(tx.products[product]||0);
      if(value===0)tx.products[product]=1;
      else if(value===1)tx.products[product]=2;
      else delete tx.products[product];
      persist(tx);break;
    }
    case'delete':
      if(confirm('永久刪除此紀錄？此操作無法復原。')){
        state.transactions=state.transactions.filter(t=>t.id!==tx.id);localSave();render();
        if(firebase)firebase.deleteDoc(firebase.doc(firebase.db,'artifacts',firebase.appId,'public','data','inventory_transactions',tx.id)).catch(()=>{});
        toast('紀錄已永久刪除');
      }
      break;
  }
}
function handleCellEdit(e){const input=e.target.closest('[data-field]');if(!input)return;const tx=state.transactions.find(t=>t.id===input.dataset.id);if(!tx||tx.isDeleted)return;tx[input.dataset.field]=input.dataset.field==='customerName'?input.value.trim():input.value;persist(tx)}
function exportExcel(){if(!window.XLSX){toast('Excel 匯出元件尚未載入');return}const data=[['借出日期','歸還日期','客戶名稱','業務員','產品型號','數量','狀態']];for(const tx of state.transactions){for(const [p,n] of Object.entries(tx.products||{}))data.push([tx.borrowDate||'',tx.returnDate||'',tx.customerName||'',salesOf(tx).join(', '),p,n,tx.isDeleted?'已封存':'未歸還'])}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'借貨表');XLSX.writeFile(wb,`展示品借貨_${today().replaceAll('-','')}.xlsx`)}
async function connectFirebase(config){const [appMod,authMod,dbMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js')]);const app=appMod.initializeApp(config);const auth=authMod.getAuth(app);const db=dbMod.getFirestore(app);await authMod.signInAnonymously(auth);const appId='demo-inventory-app';const ref=dbMod.collection(db,'artifacts',appId,'public','data','inventory_transactions');if(unsubscribe)unsubscribe();firebase={...dbMod,db,appId,ref};unsubscribe=dbMod.onSnapshot(ref,snap=>{state.transactions=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.borrowDate||'').localeCompare(String(a.borrowDate||'')));localSave();render();$('sync-status').textContent='Firebase 已同步'},()=>{$('sync-status').textContent='離線本機保存'});$('sync-status').textContent='Firebase 連線中'}
async function initialize(){ $('version').textContent=`v${VERSION}`;try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)state={...state,...JSON.parse(saved)}}catch{}render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});try{const raw=localStorage.getItem(CONFIG_KEY);if(raw)await connectFirebase(JSON.parse(raw))}catch{$('sync-status').textContent='離線本機保存'}
  $('add').addEventListener('click',()=>openEditor());$('export').addEventListener('click',exportExcel);$('sales-filter').addEventListener('change',e=>{selectedSales=e.target.value;render()});$('status-filter').addEventListener('change',e=>{statusFilter=e.target.value;render()});$('record-list').addEventListener('click',handleAction);$('record-list').addEventListener('change',handleCellEdit);$('history-list').addEventListener('click',handleAction);$('transaction-form').addEventListener('submit',saveEditor);$('return-form').addEventListener('submit',submitReturn);$('settings-open').addEventListener('click',()=>{const raw=localStorage.getItem(CONFIG_KEY);$('firebase-config').value=raw||'';openDialog('settings-dialog')});$('settings-form').addEventListener('submit',async e=>{e.preventDefault();try{const cfg=JSON.parse($('firebase-config').value);localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));await connectFirebase(cfg);$('settings-dialog').close();toast('Firebase 同步已設定')}catch(err){toast(`連線設定失敗：${err.message}`)}});$('disconnect').addEventListener('click',()=>{if(unsubscribe)unsubscribe();unsubscribe=null;firebase=null;localStorage.removeItem(CONFIG_KEY);$('sync-status').textContent='本機保存';$('firebase-config').value='';toast('已清除 Firebase 設定')});document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b)))}
initialize();
