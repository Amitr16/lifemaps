
const KEY = 'lifesheet-stage2-data';

export function loadData(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return { assets:[], loans:[], expenses:[], goals:[], persons:[], insurance:[], formData:{} };
    return JSON.parse(raw);
  }catch(e){
    return { assets:[], loans:[], expenses:[], goals:[], persons:[], insurance:[], formData:{} };
  }
}

export function saveData(data){
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('lifesheet:update', { detail: data }));
}
