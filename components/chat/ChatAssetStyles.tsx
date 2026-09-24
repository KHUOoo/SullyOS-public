import React from 'react';
import type { ChatAssetDecorations, ChatAssetSlot } from '../../types';
import { useBlobRefUrl } from '../../utils/blobRef';

const slotOrGlobal=(globalSlot?:ChatAssetSlot,characterSlot?:ChatAssetSlot)=>
  characterSlot?.image ? {...globalSlot,...characterSlot} : globalSlot;

const bgRules=(slot:ChatAssetSlot|undefined,url:string|undefined)=>{
  if(!slot?.image||!url)return '';
  const fit=slot.fit||'contain';
  const size=fit==='stretch'?'100% 100%':fit==='tile'?'auto':fit;
  const repeat=fit==='tile'?'repeat':'no-repeat';
  const x=slot.x??50,y=slot.y??50,scale=slot.scale??1,opacity=slot.opacity??1;
  return `
    background-image:url(${JSON.stringify(url)})!important;
    background-position:${x}% ${y}%!important;
    background-size:${size}!important;
    background-repeat:${repeat}!important;
    opacity:${opacity}!important;
    transform:scale(${scale});
    transform-origin:${x}% ${y}%;
  `;
};

export default function ChatAssetStyles({
  globalAssets,
  characterAssets,
}:{globalAssets?:ChatAssetDecorations;characterAssets?:ChatAssetDecorations}) {
  const statusBarBackground=slotOrGlobal(globalAssets?.statusBarBackground,characterAssets?.statusBarBackground);
  const headerBackground=slotOrGlobal(globalAssets?.headerBackground,characterAssets?.headerBackground);
  const headerDecoration=slotOrGlobal(globalAssets?.headerDecoration,characterAssets?.headerDecoration);
  const inputBackground=slotOrGlobal(globalAssets?.inputBackground,characterAssets?.inputBackground);
  const inputDecoration=slotOrGlobal(globalAssets?.inputDecoration,characterAssets?.inputDecoration);
  const sendButton=slotOrGlobal(globalAssets?.sendButton,characterAssets?.sendButton);

  const statusBarBackgroundUrl=useBlobRefUrl(statusBarBackground?.image);
  const headerBackgroundUrl=useBlobRefUrl(headerBackground?.image);
  const headerDecorationUrl=useBlobRefUrl(headerDecoration?.image);
  const inputBackgroundUrl=useBlobRefUrl(inputBackground?.image);
  const inputDecorationUrl=useBlobRefUrl(inputDecoration?.image);
  const sendButtonUrl=useBlobRefUrl(sendButton?.image);

  if(!statusBarBackgroundUrl&&!headerBackgroundUrl&&!headerDecorationUrl&&!inputBackgroundUrl&&!inputDecorationUrl&&!sendButtonUrl)return null;

  const sendFit=sendButton?.fit||'contain';
  const sendSize=sendFit==='stretch'?'100% 100%':sendFit==='tile'?'auto':sendFit;
  const sendRepeat=sendFit==='tile'?'repeat':'no-repeat';
  const sendX=sendButton?.x??50,sendY=sendButton?.y??50;
  return <style>{`
    .sully-chat-statusbar{isolation:isolate;}
    .sully-chat-header,.sully-chat-inputbar{position:relative!important;isolation:isolate;}
    .sully-chat-statusbar::before,.sully-chat-header::before,.sully-chat-header::after,.sully-chat-inputbar::before,.sully-chat-inputbar::after{
      content:"";position:absolute;inset:0;pointer-events:none;
    }
    .sully-chat-statusbar::before,.sully-chat-header::before,.sully-chat-inputbar::before{z-index:-1;}
    .sully-chat-header::after,.sully-chat-inputbar::after{z-index:2;}
    ${statusBarBackgroundUrl?`.sully-chat-statusbar::before{${bgRules(statusBarBackground,statusBarBackgroundUrl)}}`:''}
    ${headerBackgroundUrl?`.sully-chat-header::before{${bgRules(headerBackground,headerBackgroundUrl)}}`:''}
    ${headerDecorationUrl?`.sully-chat-header::after{${bgRules(headerDecoration,headerDecorationUrl)}}`:''}
    ${inputBackgroundUrl?`.sully-chat-inputbar::before{${bgRules(inputBackground,inputBackgroundUrl)}}`:''}
    ${inputDecorationUrl?`.sully-chat-inputbar::after{${bgRules(inputDecoration,inputDecorationUrl)}}`:''}
    ${sendButtonUrl?`
      .sully-chat-send-button{
        background-image:url(${JSON.stringify(sendButtonUrl)})!important;
        background-position:${sendX}% ${sendY}%!important;
        background-size:${sendSize}!important;
        background-repeat:${sendRepeat}!important;
        background-color:transparent!important;
        border-color:transparent!important;
        box-shadow:none!important;
        opacity:${sendButton?.opacity??1}!important;
        transform:scale(${sendButton?.scale??1});
        color:transparent!important;
      }
      .sully-chat-send-button svg,.sully-chat-send-button>span{opacity:0!important;}
    `:''}
  `}</style>;
}
