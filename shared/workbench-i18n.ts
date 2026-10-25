import resources from './workbench-translations.json';
type Locale='zh-CN'|'zh-Hant'|'en';
let locale:Locale='zh-CN';
const dictionary=resources as Record<string,{en:string;'zh-Hant':string}>;
const patterns=Object.keys(dictionary).filter(k=>k.includes('{{')).map(key=>({key,pattern:new RegExp('^'+key.split(/\{\{v\d+\}\}/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('([\\s\\S]*?)')+'$')}));
export function tr(source:string):string{
  if(locale==='zh-CN')return source;
  if(dictionary[source])return dictionary[source][locale];
  for(const {key,pattern} of patterns){const match=source.match(pattern);if(match)return dictionary[key][locale].replace(/\{\{v(\d+)\}\}/g,(_,index)=>match[Number(index)+1]);}
  for(const key of Object.keys(dictionary))if(key.endsWith('：')&&source.startsWith(key))return dictionary[key][locale]+source.slice(key.length);
  return source;
}
export function startWorkbenchLanguage(){
  const nodes:{node:Text;source:string}[]=[],attributes:{node:Element;attribute:string;source:string}[]=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let next=walker.nextNode();next;next=walker.nextNode())if(/[\u3400-\u9fff]/.test(next.textContent??'')&&!next.parentElement?.closest('script,style'))nodes.push({node:next as Text,source:next.textContent!});
  for(const node of document.querySelectorAll('[placeholder],[aria-label],[title]'))for(const attribute of ['placeholder','aria-label','title']){const source=node.getAttribute(attribute);if(source)attributes.push({node,attribute,source});}
  const title=document.title;
  const apply=(value:string)=>{locale=value==='en'?'en':value==='zh-Hant'?'zh-Hant':'zh-CN';document.documentElement.lang=locale;document.title=tr(title);for(const {node,source} of nodes)if(node.isConnected)node.textContent=source.replace(source.trim(),tr(source.trim()));for(const {node,attribute,source} of attributes)if(node.isConnected)node.setAttribute(attribute,tr(source));};
  let changed=false;nexlet.i18n.onChange(value=>{changed=true;apply(value);});void nexlet.i18n.getLocale().then(value=>{if(!changed)apply(value);});
}
