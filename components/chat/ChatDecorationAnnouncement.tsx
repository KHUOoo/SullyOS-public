import React, {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './ChatDecorationAnnouncement.css';
const acknowledged = new Set<string>();
const prefix = 'sully-chat-decoration-announcement-v6:';
export default function ChatDecorationAnnouncement({surface}:{surface:'appearance'|'chat'}) {
 const key=prefix+surface;
 const legacyKey=surface==='chat'?prefix+'decoration':key;
 const [visible,setVisible]=useState(()=>{try{return !acknowledged.has(key)&&localStorage.getItem(key)!=='seen'&&localStorage.getItem(legacyKey)!=='seen';}catch{return !acknowledged.has(key);}});
 const dialog=useRef<HTMLDialogElement>(null);const title=useId();
 useEffect(()=>{if(visible&&!dialog.current?.open)dialog.current?.showModal();},[visible]);
 const dismiss=()=>{acknowledged.add(key);try{localStorage.setItem(key,'seen');}catch{/* Read-only storage: remember for this session. */}dialog.current?.close();setVisible(false);};
 if(!visible)return null;
 return createPortal(<dialog ref={dialog} className="chat-decoration-announcement" aria-labelledby={title} onCancel={event=>{event.preventDefault();dismiss();}}>
  <small>CHATAPP · 装扮更新</small>
  <h2 id={title}>喜欢的样子，在一处调好。</h2>
  <p className="decoration-announcement-intro">聊天装扮继续扩展：除了图片气泡与背景素材，现在顶部头像、名字、在线状态、模型按钮，以及闪电、加号、语音、表情和发送按钮都可以自由移动；常用按钮也能直接换成自己的图片。</p>
  <ol>
   <li><h3>一个入口，调整整套聊天</h3><p>打开聊天 →「＋」→「聊天装扮」。外观 App 的聊天界面与布局、聊天设置里的背景，以及加号里的聊天装扮、提示音和白框，都整合到这里。白框在「进阶」，提示音在「声音」。</p></li>
   <li><h3>顶栏与输入栏可以直接拖</h3><p>到「布局」开启自由布局，在预览里拖动顶部头像、名字、在线状态、模型按钮，以及闪电、加号、语音、表情和发送。也能隐藏、锁定、调大小和透明度。</p></li><li><h3>按钮可以换自己的图片</h3><p>闪电、返回、加号、语音、表情和发送按钮都支持自定义图片。闪电 / 语音 / 发送还能单独设置“工作中”图片；没设置时会回退系统状态图标。</p></li><li><h3>图片气泡不会被硬拉变形</h3><p>到「气泡」→「气泡工坊」上传完整 PNG / WebP 气泡。编辑器现在拆成两个独立步骤：「修改拉伸区域」决定哪一小块可以伸缩，「修改内容区域」直接规定文字能出现在哪里，并在下面实时显示实际文字效果。</p></li><li><h3>预设可以整套分享</h3><p>布局、自由控件、气泡、背景、图片素材、声音和进阶样式，可以一起保存、导出，再整套导入；也能只勾选需要的部分。</p></li>
   <li><h3>导入文件，自动识别内容</h3><p>在「预设」导入整套装扮、CSS / TXT、分享图或普通图片。系统会识别内容，再引导你选择用途和应用范围，确认后才修改。</p></li>
  </ol>
  <button type="button" onClick={dismiss} autoFocus>知道了</button>
 </dialog>,document.body);
}
