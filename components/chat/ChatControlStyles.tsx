import React from 'react';
import type { ChatControlLayout, ChatControlSlot } from '../../types';
import { useBlobRefUrl } from '../../utils/blobRef';
import { normalizeChatControlSlot, resolveChatControlLayout } from '../../utils/chatControlLayout';

interface RuleSpec {
  selector:string;
  slot?:ChatControlSlot;
  canSkin?:boolean;
}

function ControlRule({selector,slot,canSkin=false}:RuleSpec){
  const iconUrl=useBlobRefUrl(canSkin?slot?.icon:undefined);
  const activeIconUrl=useBlobRefUrl(canSkin?slot?.activeIcon:undefined);
  if(!slot)return null;
  const v=normalizeChatControlSlot(slot);
  const movement=`
    ${selector}{
      transform:translate3d(${v.x}px,${v.y}px,0) scale(${v.scale})!important;
      transform-origin:center!important;
      opacity:${v.opacity}!important;
      ${v.hidden?'display:none!important;':''}
    }
  `;
  if(!canSkin||(!iconUrl&&!activeIconUrl))return <style>{movement}</style>;
  const defaultSkin=iconUrl ? `
    ${selector}{
      background-image:url(${JSON.stringify(iconUrl)})!important;
      background-size:contain!important;
      background-position:center!important;
      background-repeat:no-repeat!important;
      background-color:transparent!important;
      border-color:transparent!important;
      box-shadow:none!important;
    }
    ${selector}>svg,${selector}>span{opacity:0!important;}
  ` : '';
  const activeSkin=activeIconUrl
    ? `
      ${selector}[data-control-state="active"]{
        background-image:url(${JSON.stringify(activeIconUrl)})!important;
        background-size:contain!important;
        background-position:center!important;
        background-repeat:no-repeat!important;
        background-color:transparent!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }
      ${selector}[data-control-state="active"]>svg,${selector}[data-control-state="active"]>span{opacity:0!important;}
    `
    : iconUrl ? `
      ${selector}[data-control-state="active"]{background-image:none!important;}
      ${selector}[data-control-state="active"]>svg,${selector}[data-control-state="active"]>span{opacity:1!important;}
    ` : '';
  return <style>{movement+defaultSkin+activeSkin}</style>;
}

export default function ChatControlStyles({globalLayout,characterLayout}:{globalLayout?:ChatControlLayout;characterLayout?:ChatControlLayout}){
  const layout=resolveChatControlLayout(globalLayout,characterLayout);
  if(!layout.enabled)return null;
  return <>
    <style>{`.sully-chat-root .sully-chat-inputbar,.sully-chat-root .sully-chat-input-wrap{overflow:visible!important;}`}</style>
    <ControlRule selector=".sully-chat-header .sully-chat-avatar" slot={layout.headerAvatar}/>
    <ControlRule selector=".sully-chat-header .sully-chat-name" slot={layout.headerName}/>
    <ControlRule selector=".sully-chat-header .sully-chat-online-status" slot={layout.onlineStatus}/>
    <ControlRule selector=".sully-chat-header .sully-chat-model" slot={layout.modelSwitcher}/>
    <ControlRule selector=".sully-chat-header .sully-chat-activity-badge" slot={layout.activityStatus}/>
    <ControlRule selector=".sully-chat-header .sully-chat-token" slot={layout.tokenUsage}/>
    <ControlRule selector=".sully-chat-header .sully-chat-back" slot={layout.backButton} canSkin/>
    <ControlRule selector=".sully-chat-header .sully-chat-trigger" slot={layout.triggerButton} canSkin/>
    <ControlRule selector=".sully-chat-inputbar .sully-chat-actions-button" slot={layout.actionsButton} canSkin/>
    <ControlRule selector=".sully-chat-inputbar .sully-chat-voice-button" slot={layout.voiceButton} canSkin/>
    <ControlRule selector=".sully-chat-inputbar .sully-chat-emoji-button" slot={layout.emojiButton} canSkin/>
    <ControlRule selector=".sully-chat-inputbar .sully-chat-send-button" slot={layout.sendButton} canSkin/>
  </>;
}
