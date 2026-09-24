import React, {useEffect,useState} from 'react';
import type { ChatAssetDecorations, ChatAssetFit, ChatAssetSlot } from '../../types';
import { putImageBlob, useBlobRefUrl } from '../../utils/blobRef';

type SlotKey = keyof ChatAssetDecorations;

const FIT_OPTIONS: Array<{value:ChatAssetFit;label:string}> = [
  {value:'cover',label:'铺满'},
  {value:'contain',label:'完整显示'},
  {value:'stretch',label:'拉伸'},
  {value:'tile',label:'平铺'},
];

const SLOT_META: Array<{key:SlotKey;title:string;hint:string}> = [
  {key:'statusBarBackground',title:'状态栏背景',hint:'铺在聊天最顶部时间 / 电量状态栏后面，仅在聊天界面生效。'},
  {key:'headerBackground',title:'顶栏背景',hint:'铺在聊天顶栏底层，适合整张背景图。'},
  {key:'headerDecoration',title:'顶栏装饰',hint:'适合透明 PNG / WebP 装饰，叠在顶栏上。'},
  {key:'inputBackground',title:'输入栏背景',hint:'铺在底部输入区底层，按钮仍可正常点击。'},
  {key:'inputDecoration',title:'输入栏装饰',hint:'适合透明装饰图，可自由移动与缩放。'},
  {key:'sendButton',title:'发送按钮图片',hint:'直接替换发送按钮的视觉图片，不影响点击区域。'},
];

const DEFAULT_SLOT: Required<Omit<ChatAssetSlot,'image'>> = {
  opacity: 1,
  x: 50,
  y: 50,
  scale: 1,
  fit: 'contain',
};

function normalize(slot?:ChatAssetSlot):ChatAssetSlot {
  return {...DEFAULT_SLOT,...slot};
}

const AssetSlotEditor:React.FC<{
  slotKey:SlotKey;
  title:string;
  hint:string;
  value?:ChatAssetSlot;
  fallback?:ChatAssetSlot;
  inherited?:boolean;
  onChange:(value:ChatAssetSlot|undefined)=>void;
}> = ({title,hint,value,fallback,inherited,onChange}) => {
  const effective=value?.image?value:fallback;
  const slot=normalize(effective);
  const preview=useBlobRefUrl(effective?.image);
  const [urlDraft,setUrlDraft]=useState(()=>effective?.image&&/^https?:\/\//i.test(effective.image)?effective.image:'');
  useEffect(()=>{setUrlDraft(effective?.image&&/^https?:\/\//i.test(effective.image)?effective.image:'');},[effective?.image]);
  const patch=(next:Partial<ChatAssetSlot>)=>onChange({...slot,...next});
  const commitUrl=()=>{
    const next=urlDraft.trim();
    if(!next){if(value?.image&&/^https?:\/\//i.test(value.image))onChange(undefined);return;}
    if(/^https?:\/\//i.test(next))patch({image:next});
  };
  const upload=async(file?:File)=>{
    if(!file)return;
    const ref=await putImageBlob(file);
    patch({image:ref});
  };
  return <section className="chat-decoration-asset-card">
    <div className="chat-decoration-asset-head">
      <div><h4>{title}</h4><p>{hint}</p></div>
      {value?.image&&<button type="button" className="chat-decoration-link" onClick={()=>onChange(undefined)}>清除</button>}
    </div>
    {inherited&&!value?.image&&<p className="chat-decoration-note">{fallback?.image?'正在跟随全局素材；调整任一参数就会保存为这个角色的专属设置。':'当前没有全局素材，可以直接添加这个角色的专属图片。'}</p>}
    <label className="chat-decoration-upload">
      {preview?<span className="chat-decoration-asset-preview"><img src={preview} alt={title}/><b>更换图片</b></span>:<span>＋ 选择图片</span>}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/>
    </label>
    <label className="chat-decoration-field">或粘贴图片 URL
      <input value={urlDraft} placeholder="https://..." onChange={e=>setUrlDraft(e.target.value)} onBlur={commitUrl} onKeyDown={e=>{if(e.key==='Enter')(e.currentTarget as HTMLInputElement).blur();}}/>
    </label>
    {effective?.image&&<>
      <label className="chat-decoration-field">适应方式
        <select value={slot.fit} onChange={e=>patch({fit:e.target.value as ChatAssetFit})}>
          {FIT_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="chat-decoration-slider"><span>透明度 <output>{Math.round((slot.opacity??1)*100)}%</output></span>
        <input type="range" min="0" max="1" step="0.05" value={slot.opacity??1} onChange={e=>patch({opacity:Number(e.target.value)})}/>
      </label>
      <label className="chat-decoration-slider"><span>水平位置 <output>{slot.x??50}%</output></span>
        <input type="range" min="-50" max="150" step="1" value={slot.x??50} onChange={e=>patch({x:Number(e.target.value)})}/>
      </label>
      <label className="chat-decoration-slider"><span>垂直位置 <output>{slot.y??50}%</output></span>
        <input type="range" min="-50" max="150" step="1" value={slot.y??50} onChange={e=>patch({y:Number(e.target.value)})}/>
      </label>
      <label className="chat-decoration-slider"><span>缩放 <output>{(slot.scale??1).toFixed(2)}×</output></span>
        <input type="range" min="0.25" max="3" step="0.05" value={slot.scale??1} onChange={e=>patch({scale:Number(e.target.value)})}/>
      </label>
    </>}
  </section>;
};

export default function ChatAssetEditor({
  value,
  fallback,
  inherited=false,
  onChange,
}:{value?:ChatAssetDecorations;fallback?:ChatAssetDecorations;inherited?:boolean;onChange:(next:ChatAssetDecorations|undefined)=>void}) {
  const update=(key:SlotKey,slot:ChatAssetSlot|undefined)=>{
    const next={...(value||{})};
    if(slot)next[key]=slot;
    else delete next[key];
    onChange(Object.keys(next).length?next:undefined);
  };
  return <div className="chat-decoration-assets">
    <p className="chat-decoration-note">这些是可视化图片素材槽。上传图片后可以直接调透明度、位置、缩放和铺图方式，不需要写 CSS。</p>
    {value&&Object.keys(value).length>0&&<button type="button" className="chat-decoration-link" onClick={()=>onChange(undefined)}>{inherited?'清空此角色专属素材，全部跟随全局':'清空全部全局图片素材'}</button>}
    {SLOT_META.map(meta=><AssetSlotEditor key={meta.key} {...meta} value={value?.[meta.key]} fallback={fallback?.[meta.key]} inherited={inherited} onChange={slot=>update(meta.key,slot)}/>)}
  </div>;
}
