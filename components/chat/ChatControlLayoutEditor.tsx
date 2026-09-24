import React, {useRef, useState} from 'react';
import type {ChatControlKey,ChatControlLayout,ChatControlSlot} from '../../types';
import {putImageBlob} from '../../utils/blobRef';
import {normalizeChatControlSlot,resolveChatControlLayout} from '../../utils/chatControlLayout';
import TokenImg from '../os/TokenImg';

const META:Record<ChatControlKey,{label:string;group:'header'|'input';skin?:boolean;active?:boolean;hideable?:boolean;glyph:string}> = {
  headerAvatar:{label:'顶部头像',group:'header',glyph:'头像'},
  headerName:{label:'名字',group:'header',glyph:'名字'},
  onlineStatus:{label:'在线状态',group:'header',glyph:'online'},
  modelSwitcher:{label:'模型切换',group:'header',glyph:'模型'},
  activityStatus:{label:'输入状态',group:'header',glyph:'正在输入…'},
  tokenUsage:{label:'Token',group:'header',glyph:'90897'},
  backButton:{label:'返回按钮',group:'header',skin:true,hideable:false,glyph:'‹'},
  triggerButton:{label:'小闪电',group:'header',skin:true,active:true,glyph:'⚡'},
  actionsButton:{label:'加号',group:'input',skin:true,hideable:false,glyph:'＋'},
  voiceButton:{label:'语音',group:'input',skin:true,active:true,glyph:'🎙'},
  emojiButton:{label:'表情',group:'input',skin:true,glyph:'☺'},
  sendButton:{label:'发送',group:'input',skin:true,active:true,glyph:'➤'},
};

const BASE_POS:Record<ChatControlKey,{left:number;top:number}> = {
  backButton:{left:18,top:46},headerAvatar:{left:62,top:44},headerName:{left:118,top:34},
  onlineStatus:{left:118,top:58},modelSwitcher:{left:206,top:58},activityStatus:{left:205,top:32},tokenUsage:{left:250,top:58},triggerButton:{left:292,top:46},
  actionsButton:{left:22,top:35},voiceButton:{left:75,top:35},emojiButton:{left:238,top:35},sendButton:{left:292,top:35},
};

function ControlPreview({control,slot,selected,onSelect,onDrag}:{control:ChatControlKey;slot:ChatControlSlot|undefined;selected:boolean;onSelect:()=>void;onDrag:(dx:number,dy:number)=>void}){
  const v=normalizeChatControlSlot(slot);
  const meta=META[control];
  const p=BASE_POS[control];
  const drag=useRef<{x:number;y:number}|null>(null);
  return <div
    role="button"
    aria-label={meta.label}
    onPointerDown={e=>{
      onSelect();
      if(v.locked)return;
      drag.current={x:e.clientX,y:e.clientY};
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e=>{
      if(!drag.current)return;
      const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;
      drag.current={x:e.clientX,y:e.clientY};
      onDrag(dx,dy);
    }}
    onPointerUp={()=>{drag.current=null;}}
    onPointerCancel={()=>{drag.current=null;}}
    className={`absolute flex items-center justify-center rounded-lg border text-[10px] font-semibold shadow-sm select-none ${selected?'border-indigo-500 ring-2 ring-indigo-200 bg-white':'border-slate-200 bg-white/90'} ${v.locked?'cursor-default':'cursor-move'}`}
    style={{left:p.left,top:p.top,transform:`translate(-50%,-50%) translate(${v.x}px,${v.y}px) scale(${v.scale})`,opacity:v.hidden ? .35 : v.opacity,touchAction:'none',minWidth:meta.skin?34:46,height:meta.skin?34:28,padding:'0 7px',zIndex:selected?4:2}}
  >
    {meta.skin&&slot?.icon?<TokenImg value={slot.icon} className="w-6 h-6 object-contain pointer-events-none"/>:<span className="pointer-events-none whitespace-nowrap">{meta.glyph}</span>}
    {v.hidden&&<span className="absolute -right-1 -top-1 rounded-full bg-rose-500 text-white text-[8px] px-1">隐</span>}
  </div>;
}

async function storeImage(file:File){return putImageBlob(file);}

export default function ChatControlLayoutEditor({value,fallback,inherited=false,onChange}:{value?:ChatControlLayout;fallback?:ChatControlLayout;inherited?:boolean;onChange:(next:ChatControlLayout|undefined)=>void}){
  const effective=resolveChatControlLayout(fallback,value);
  const [selected,setSelected]=useState<ChatControlKey>('headerAvatar');
  const meta=META[selected];
  const slot=normalizeChatControlSlot(effective[selected]);
  const selectedCritical=selected==='backButton'||selected==='actionsButton';
  const xMin=selectedCritical?-20:-280,xMax=selectedCritical?240:280;
  const yMin=selectedCritical?-50:-140,yMax=selectedCritical?60:140;

  const updateSlot=(key:ChatControlKey,patch:Partial<ChatControlSlot>)=>{
    const own=value?.[key]||{};
    onChange({...value,[key]:{...own,...patch}});
  };
  const resetSlot=(key:ChatControlKey)=>{
    if(!value?.[key])return;
    const next={...value};delete next[key];
    onChange(Object.keys(next).length?next:undefined);
  };
  const clearSlotField=(key:ChatControlKey,field:'icon'|'activeIcon')=>{
    if(!value?.[key])return;
    const own={...value[key]};delete own[field];
    const next={...value};
    if(Object.keys(own).length)next[key]=own;else delete next[key];
    onChange(Object.keys(next).length?next:undefined);
  };
  const setEnabled=(enabled:boolean)=>onChange({...value,enabled});
  const upload=async(kind:'icon'|'activeIcon',file?:File)=>{
    if(!file)return;
    const ref=await storeImage(file);
    updateSlot(selected,{[kind]:ref});
  };
  const renderGroup=(group:'header'|'input')=>{
    const keys=(Object.keys(META) as ChatControlKey[]).filter(k=>META[k].group===group);
    return <div className={`chat-control-preview ${group==='header'?'is-header':'is-input'}`}>
      <div className="chat-control-preview-label">{group==='header'?'顶部区域 · 直接拖动':'输入区域 · 直接拖动'}</div>
      {keys.map(key=><ControlPreview key={key} control={key} slot={effective[key]} selected={selected===key} onSelect={()=>setSelected(key)} onDrag={(dx,dy)=>{
        const current=normalizeChatControlSlot(resolveChatControlLayout(fallback,value)[key]);
        const critical=key==='backButton'||key==='actionsButton';
        updateSlot(key,{x:Math.max(critical?-20:-280,Math.min(critical?240:280,current.x+dx)),y:Math.max(critical?-50:-140,Math.min(critical?60:140,current.y+dy))});
      }}/>)}
    </div>;
  };

  return <section className="chat-control-editor">
    <label className="chat-decoration-toggle">
      <span>开启顶栏 / 输入栏自由布局<small>关闭时完全使用原布局；开启后才应用移动、隐藏和自定义图标。</small></span>
      <input type="checkbox" checked={effective.enabled===true} onChange={e=>setEnabled(e.target.checked)}/>
    </label>
    <div className="chat-control-inherit">
      <span>{inherited?(value?'当前角色已有专属控件设置。':'当前跟随全局控件设置。'):(value?'当前已有全局自由控件设置。':'尚未设置自由控件。')}</span>
      {value&&<button type="button" className="chat-decoration-link" onClick={()=>onChange(undefined)}>{inherited?'全部跟随全局':'恢复全部默认'}</button>}
    </div>
    <p className="chat-decoration-note">在下面预览里直接拖按钮；也可以用滑杆精调。拖出预览也不用怕，下面的控件列表随时能重新选中并重置。这里只移动视觉控件，不改它原本的点击功能。</p>
    {renderGroup('header')}
    {renderGroup('input')}
    <div className="chat-control-picker" role="group" aria-label="选择要编辑的聊天控件">
      {(Object.keys(META) as ChatControlKey[]).map(key=><button key={key} type="button" aria-pressed={selected===key} onClick={()=>setSelected(key)}>{META[key].label}</button>)}
    </div>

    <div className="chat-control-card">
      <div className="chat-control-card-head">
        <div><b>{meta.label}</b><small>{slot.locked?'已锁定拖动':'可拖动'}</small></div>
        <button type="button" className="chat-decoration-link" onClick={()=>resetSlot(selected)}>重置这一项</button>
      </div>
      <div className="chat-control-toggle-row">
        {meta.hideable===false
          ? <button type="button" disabled title="安全入口不可隐藏">安全入口 · 保持显示</button>
          : <button type="button" aria-pressed={slot.hidden} onClick={()=>updateSlot(selected,{hidden:!slot.hidden})}>{slot.hidden?'显示控件':'隐藏控件'}</button>}
        <button type="button" aria-pressed={slot.locked} onClick={()=>updateSlot(selected,{locked:!slot.locked})}>{slot.locked?'解除锁定':'锁定拖动'}</button>
      </div>
      <div className="chat-control-grid">
        <label><span>左右 <output>{Math.round(slot.x)}px</output></span><input type="range" min={xMin} max={xMax} step="1" value={Math.max(xMin,Math.min(xMax,slot.x))} onChange={e=>updateSlot(selected,{x:Number(e.target.value)})}/></label>
        <label><span>上下 <output>{Math.round(slot.y)}px</output></span><input type="range" min={yMin} max={yMax} step="1" value={Math.max(yMin,Math.min(yMax,slot.y))} onChange={e=>updateSlot(selected,{y:Number(e.target.value)})}/></label>
        <label><span>大小 <output>{slot.scale.toFixed(2)}×</output></span><input type="range" min="0.45" max="2.5" step="0.05" value={slot.scale} onChange={e=>updateSlot(selected,{scale:Number(e.target.value)})}/></label>
        <label><span>透明度 <output>{Math.round(slot.opacity*100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={slot.opacity} onChange={e=>updateSlot(selected,{opacity:Number(e.target.value)})}/></label>
      </div>

      {meta.skin&&<div className="chat-control-icons">
        <div className="chat-control-icon-slot">
          <div><b>默认图片</b><small>{selected==='triggerButton'?'平常的小闪电':selected==='voiceButton'?'平常的麦克风':selected==='sendButton'?'发送状态':'按钮默认视觉'}</small></div>
          <div className="chat-control-icon-actions">
            {effective[selected]?.icon&&<TokenImg value={effective[selected]!.icon!} className="w-10 h-10 object-contain rounded-lg border border-slate-100"/>}
            <label className="chat-decoration-upload">上传<input type="file" accept="image/png,image/webp,image/jpeg,image/gif" onChange={e=>{void upload('icon',e.target.files?.[0]);e.target.value='';}}/></label>
            {value?.[selected]?.icon&&<button type="button" className="chat-decoration-link" onClick={()=>clearSlotField(selected,'icon')}>恢复</button>}
          </div>
        </div>
        {meta.active&&<div className="chat-control-icon-slot">
          <div><b>工作中图片</b><small>{selected==='triggerButton'?'生成中的停止图':selected==='voiceButton'?'录音中的停止图':'切到“生成回复”时的图'}</small></div>
          <div className="chat-control-icon-actions">
            {effective[selected]?.activeIcon&&<TokenImg value={effective[selected]!.activeIcon!} className="w-10 h-10 object-contain rounded-lg border border-slate-100"/>}
            <label className="chat-decoration-upload">上传<input type="file" accept="image/png,image/webp,image/jpeg,image/gif" onChange={e=>{void upload('activeIcon',e.target.files?.[0]);e.target.value='';}}/></label>
            {value?.[selected]?.activeIcon&&<button type="button" className="chat-decoration-link" onClick={()=>clearSlotField(selected,'activeIcon')}>恢复</button>}
          </div>
          <p className="chat-decoration-note">不上传工作中图片时，会自动回退到系统原本的停止 / 生成图标，避免状态看不出来。</p>
        </div>}
      </div>}
    </div>
  </section>;
}
