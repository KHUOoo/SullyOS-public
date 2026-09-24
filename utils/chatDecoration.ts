import type {CharacterProfile,OSTheme,ChatTheme,ChatAssetDecorations,ChatAssetSlot,ChatControlLayout,ChatControlSlot} from '../types';
import {mergeChatFineTune} from './chatFineTuneCss';
import {resolveActiveSound,stripWhiteboxSoundDirective,decodeSoundShare,parseWhiteboxSound,BUILTIN_SOUNDS} from './whiteboxSound';
import {resolveRefToDataUrl,blobToDataUrl,migrateDataUrlToRef,migrateChatThemeBlobRefs} from './blobRef';
import {extractShareFromPng,isPng,pngHasShare,SHARE_KINDS} from './pngShare';
import {CHAT_CONTROL_KEYS,resolveChatControlLayout} from './chatControlLayout';

// Explicit allowlist: presets never carry API keys, character prompts, history or system settings.
export const LAYOUT_DEFAULTS = {
 chatAvatarMode:'grouped',chatEmojiSize:'small',chatAvatarShape:'circle',chatAvatarSize:'medium',chatAvatarVisibility:'both',chatAvatarPlacement:'beside',chatAvatarAlign:'bottom',chatAvatarOffsetY:0,
 chatBubbleFontSize:0,chatBubbleLineHeight:0,chatBubbleIndent:0,chatSnapToEdge:false,chatModuleAlign:'center',
 chatBubbleStyle:'modern',chatMessageSpacing:'default',chatShowTimestamp:'always',chatHeaderStyle:'default',chatInputStyle:'rounded',chatChromeStyle:'soft',
 chatHeaderAlign:'left',chatHeaderDensity:'default',chatStatusStyle:'subtle',chatSendButtonStyle:'circle',chatPendingIndicator:true,chatHideHeaderBuffs:false,
} satisfies Partial<OSTheme>;
export type DecorationLayout=Partial<Pick<OSTheme,keyof typeof LAYOUT_DEFAULTS>>;
const choices:Record<string,string[]>={chatAvatarMode:['grouped','every_message'],chatEmojiSize:['small','medium','large'],chatAvatarShape:['circle','rounded','square'],chatAvatarSize:['small','medium','large'],chatAvatarVisibility:['both','hide_ai','hide_user','hide_both'],chatAvatarPlacement:['beside','above_group'],chatAvatarAlign:['bottom','top','center'],chatModuleAlign:['anchor','center'],chatBubbleStyle:['modern','flat','outline','shadow','wechat','ios'],chatMessageSpacing:['compact','default','spacious'],chatShowTimestamp:['always','hover','never'],chatHeaderStyle:['default','minimal','gradient','wechat','telegram','discord','pixel'],chatInputStyle:['default','rounded','flat','wechat','ios','telegram','discord','pixel'],chatChromeStyle:['soft','flat','floating','pixel'],chatHeaderAlign:['left','center'],chatHeaderDensity:['compact','default','airy'],chatStatusStyle:['subtle','pill','dot'],chatSendButtonStyle:['circle','pill','minimal']};
const record=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function pickDecorationLayout(value:unknown):DecorationLayout{
 if(!record(value))throw Error('布局内容无效');const result:Record<string,unknown>={};
 for(const [key,def] of Object.entries(LAYOUT_DEFAULTS))if(value[key]!==undefined){const v=value[key];
  if(typeof v!==typeof def||choices[key]&&!choices[key].includes(v)||typeof v==='number'&&(!Number.isFinite(v)||Math.abs(v)>200))throw Error('布局选项无效：'+key);
  result[key]=v;
 }return result as DecorationLayout;
}
export function resolveDecorationTheme(theme:OSTheme,char?:CharacterProfile):OSTheme{
 return {...theme,...pickDecorationLayout(char?.chatFineTune?.enabled===false?{}:char?.chatAppearance||{}),...(['plain','grid','paper','mesh'].includes(char?.chatAppearance?.chatBackgroundStyle||'')?{chatBackgroundStyle:char!.chatAppearance!.chatBackgroundStyle}:{}),...(char?.chatDecorationCssIsolated?{chatChromeCustomCss:undefined}:{})};
}
export const PART_LABELS={layout:'布局',controls:'控件布局与图标',bubbles:'气泡',background:'背景',assets:'图片素材',sound:'声音',css:'进阶 CSS'} as const;
export type DecorationPart=keyof typeof PART_LABELS;
export interface DecorationPreset{format:'sullyos-chat-decoration';version:1;name:string;parts:{layout?:DecorationLayout;controls?:ChatControlLayout;bubbles?:ChatTheme;background?:{image:string|null;style:OSTheme['chatBackgroundStyle']};assets?:ChatAssetDecorations;sound?:{src:string;volume?:number}|null;css?:string}}
function resource(value:unknown):string{
 if(typeof value!=='string'||value.length>40*1024*1024||!(/^(data:(image|audio)\/[\w.+-]+[;,]|https?:\/\/)/i.test(value)))throw Error('资源不是可分享的图片或音频，请重新导出原文件');return value;
}
function validateAssetSlot(value:unknown):ChatAssetSlot{
 if(!record(value))throw Error('图片素材设置无效');
 const out:ChatAssetSlot={};
 if(value.image!==undefined&&value.image!=='')out.image=resource(value.image);
 if(value.opacity!==undefined){if(typeof value.opacity!=='number'||!Number.isFinite(value.opacity)||value.opacity<0||value.opacity>1)throw Error('图片素材透明度无效');out.opacity=value.opacity;}
 for(const key of ['x','y'] as const)if(value[key]!==undefined){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<-200||n>200)throw Error('图片素材位置无效');out[key]=n;}
 if(value.scale!==undefined){if(typeof value.scale!=='number'||!Number.isFinite(value.scale)||value.scale<0.1||value.scale>10)throw Error('图片素材缩放无效');out.scale=value.scale;}
 if(value.fit!==undefined){if(!['cover','contain','stretch','tile'].includes(value.fit))throw Error('图片素材适应方式无效');out.fit=value.fit;}
 return out;
}
export function validateChatAssetDecorations(value:unknown):ChatAssetDecorations{
 if(!record(value))throw Error('图片素材内容无效');
 const result:ChatAssetDecorations={};
 for(const key of ['statusBarBackground','headerBackground','headerDecoration','inputBackground','inputDecoration','sendButton'] as const){
  if(value[key]!==undefined)result[key]=validateAssetSlot(value[key]);
 }
 return result;
}
export function resolveChatAssetDecorations(theme:OSTheme,char?:CharacterProfile):ChatAssetDecorations|undefined{
 const global=theme.chatAssetDecorations||{};const local=char?.chatAssetDecorations||{};const result:ChatAssetDecorations={};
 for(const key of ['statusBarBackground','headerBackground','headerDecoration','inputBackground','inputDecoration','sendButton'] as const){
  const slot=local[key]?.image?{...global[key],...local[key]}:global[key];if(slot?.image)result[key]=slot;
 }
 return Object.keys(result).length?result:undefined;
}
function validateChatControlSlot(value:unknown):ChatControlSlot{
 if(!record(value))throw Error('控件设置无效');const out:ChatControlSlot={};
 for(const key of ['x','y'] as const)if(value[key]!==undefined){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<-500||n>500)throw Error('控件位置无效');out[key]=n;}
 if(value.scale!==undefined){if(typeof value.scale!=='number'||!Number.isFinite(value.scale)||value.scale<.1||value.scale>5)throw Error('控件缩放无效');out.scale=value.scale;}
 if(value.opacity!==undefined){if(typeof value.opacity!=='number'||!Number.isFinite(value.opacity)||value.opacity<0||value.opacity>1)throw Error('控件透明度无效');out.opacity=value.opacity;}
 for(const key of ['hidden','locked'] as const)if(value[key]!==undefined){if(typeof value[key]!=='boolean')throw Error('控件开关无效');out[key]=value[key];}
 for(const key of ['icon','activeIcon'] as const)if(value[key])out[key]=resource(value[key]);
 return out;
}
export function validateChatControlLayout(value:unknown):ChatControlLayout{
 if(!record(value))throw Error('控件布局内容无效');const result:ChatControlLayout={};
 if(value.enabled!==undefined){if(typeof value.enabled!=='boolean')throw Error('控件自由布局开关无效');result.enabled=value.enabled;}
 for(const key of CHAT_CONTROL_KEYS)if(value[key]!==undefined){
  result[key]=validateChatControlSlot(value[key]);
  if(key==='backButton'||key==='actionsButton'){
   const slot=result[key]!;
   slot.hidden=false;
   if(slot.x!==undefined)slot.x=Math.max(-20,Math.min(240,slot.x));
   if(slot.y!==undefined)slot.y=Math.max(-50,Math.min(60,slot.y));
  }
 }
 return result;
}
async function migrateControlLayout(value:ChatControlLayout):Promise<ChatControlLayout>{
 const result:ChatControlLayout={enabled:value.enabled};
 for(const key of CHAT_CONTROL_KEYS){const slot=value[key];if(!slot)continue;result[key]={...slot,icon:slot.icon?await migrateDataUrlToRef(slot.icon):slot.icon,activeIcon:slot.activeIcon?await migrateDataUrlToRef(slot.activeIcon):slot.activeIcon};}
 return result;
}
async function migrateAssetDecorations(value:ChatAssetDecorations):Promise<ChatAssetDecorations>{
 const result:ChatAssetDecorations={};
 for(const key of ['statusBarBackground','headerBackground','headerDecoration','inputBackground','inputDecoration','sendButton'] as const){
  const slot=value[key];if(!slot)continue;result[key]={...slot,image:slot.image?await migrateDataUrlToRef(slot.image):slot.image};
 }
 return result;
}
export function validateBubble(value:unknown):ChatTheme{
 if(!record(value)||typeof value.name!=='string'||!record(value.user)||!record(value.ai))throw Error('气泡主题格式无效');
 const result:ChatTheme={id:'import-preview',name:value.name.slice(0,60),type:'custom',user:{} as any,ai:{} as any};
 for(const side of ['user','ai'] as const){const v=value[side],out:Record<string,any>={};
  for(const k of ['backgroundColor','textColor']){if(typeof v[k]!=='string'||v[k].length>300)throw Error('气泡颜色无效');out[k]=v[k];}
  for(const k of ['borderRadius','opacity','backgroundImageOpacity','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','decorationX','decorationY','decorationScale','decorationRotate','avatarDecorationX','avatarDecorationY','avatarDecorationScale','avatarDecorationRotate'])if(v[k]!==undefined){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||Math.abs(v[k])>10000)throw Error('气泡数值无效');out[k]=v[k];}
  for(const k of ['frameSliceTop','frameSliceRight','frameSliceBottom','frameSliceLeft','framePaddingTop','framePaddingRight','framePaddingBottom','framePaddingLeft','frameMinHeight'])if(v[k]!==undefined){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>1000)throw Error('图片气泡切片参数无效');out[k]=v[k];}
  for(const k of ['frameSourceWidth','frameSourceHeight'])if(v[k]!==undefined){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<=0||v[k]>5000)throw Error('图片气泡原图尺寸无效');out[k]=v[k];}
  for(const k of ['frameContentTop','frameContentRight','frameContentBottom','frameContentLeft'])if(v[k]!==undefined){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>5000)throw Error('图片气泡文字区域无效');out[k]=v[k];}
  if(v.frameScale!==undefined){if(typeof v.frameScale!=='number'||!Number.isFinite(v.frameScale)||v.frameScale<.1||v.frameScale>10)throw Error('图片气泡缩放无效');out.frameScale=v.frameScale;}
  if(v.frameOpacity!==undefined){if(typeof v.frameOpacity!=='number'||!Number.isFinite(v.frameOpacity)||v.frameOpacity<0||v.frameOpacity>1)throw Error('图片气泡透明度无效');out.frameOpacity=v.frameOpacity;}
  out.borderRadius??=20;out.opacity??=1;
  for(const k of ['backgroundImage','frameImage','decoration','avatarDecoration'])if(v[k])out[k]=resource(v[k]);
  for(const k of ['voiceBarBg','voiceBarActiveBg','voiceBarBtnColor','voiceBarWaveColor','voiceBarTextColor'])if(typeof v[k]==='string'&&v[k].length<300)out[k]=v[k];
  if(['every','last','none'].includes(v.tailMode))out.tailMode=v.tailMode;
  if(['stretch','round'].includes(v.frameRepeat))out.frameRepeat=v.frameRepeat;
  if(typeof v.frameFlipX==='boolean')out.frameFlipX=v.frameFlipX;
  result[side]=out as any;
 }
 if(value.customCss!==undefined){if(typeof value.customCss!=='string')throw Error('气泡 CSS 无效');result.customCss=value.customCss;}
 return result;
}
export function validateDecoration(value:unknown):DecorationPreset{
 if(!record(value)||value.format!=='sullyos-chat-decoration')throw Error('不是装扮预设');if(value.version!==1)throw Error('此装扮版本暂不支持，请更新应用');
 if(!record(value.parts))throw Error('装扮缺少内容');const p=value.parts,result:DecorationPreset={format:'sullyos-chat-decoration',version:1,name:typeof value.name==='string'?value.name.slice(0,60):'导入的装扮',parts:{}};
 if(p.layout!==undefined)result.parts.layout=pickDecorationLayout(p.layout);
 if(p.controls!==undefined)result.parts.controls=validateChatControlLayout(p.controls);
 if(p.bubbles!==undefined)result.parts.bubbles=validateBubble(p.bubbles);
 if(p.background!==undefined){if(!record(p.background)||!['plain','grid','paper','mesh'].includes(p.background.style))throw Error('背景格式无效');result.parts.background={image:p.background.image===null?null:resource(p.background.image),style:p.background.style};}
 if(p.assets!==undefined)result.parts.assets=validateChatAssetDecorations(p.assets);
 if(p.sound!==undefined){if(p.sound===null)result.parts.sound=null;else{if(!record(p.sound)||typeof p.sound.src!=='string')throw Error('提示音格式无效');const src=p.sound.src;if(src!=='none'&&!Object.hasOwn(BUILTIN_SOUNDS,src))resource(src);if(p.sound.volume!==undefined&&(typeof p.sound.volume!=='number'||p.sound.volume<0||p.sound.volume>1))throw Error('音量无效');result.parts.sound={src,volume:p.sound.volume??.6};}}
 if(p.css!==undefined){if(typeof p.css!=='string'||p.css.length>8*1024*1024||/<\/?(?:script|html|iframe)\b/i.test(p.css))throw Error('CSS 内容无效');result.parts.css=p.css;}
 if(!Object.keys(result.parts).length)throw Error('预设中没有可用的装扮内容');
 return result;
}
async function portable(value:string):Promise<string>{
 if(value.startsWith('blobref:')){const result=await resolveRefToDataUrl(value);if(!result||result.startsWith('blobref:'))throw Error('部分素材已丢失，请重新选择后导出');return result;}
 if(/^(blob:|\/|\.\.?\/)/.test(value)){const response=await fetch(value);if(!response.ok)throw Error('素材无法读取');return blobToDataUrl(await response.blob());}
 return value;
}
async function portableTree(value:any):Promise<any>{
 if(typeof value==='string'){
  if(/^(blobref:|blob:)/.test(value)||/^(\/(?![/*])|\.\.?\/)[^\s{}]+$/.test(value))return portable(value);
  const matches=[...value.matchAll(/url\(\s*['"]?((?:blobref:|blob:|\/|\.\.?\/)[^'"\s)]+)['"]?\s*\)/g)];
  for(const m of matches)value=value.replace(m[0],`url("${await portable(m[1])}")`);
  return value;
 }
 if(Array.isArray(value))return Promise.all(value.map(portableTree));
 if(record(value)){const out:Record<string,any>={};for(const [key,v]of Object.entries(value))out[key]=await portableTree(v);return out;}return value;
}
export async function exportDecoration(name:string,theme:OSTheme,char:CharacterProfile|undefined,bubble:ChatTheme):Promise<DecorationPreset>{
 const effective=resolveDecorationTheme(theme,char);
 const layout=char?{...effective,...mergeChatFineTune(effective,char.chatFineTune)}:theme;
 const css=[effective.chatChromeCustomCss,char?.chromeCustomCss].filter(Boolean).join('\n');
 const preset:DecorationPreset={format:'sullyos-chat-decoration',version:1,name,parts:{
  layout:{...LAYOUT_DEFAULTS,...pickDecorationLayout(layout)},controls:(theme.chatControlLayout||char?.chatControlLayout)?resolveChatControlLayout(theme.chatControlLayout,char?.chatControlLayout):undefined,bubbles:structuredClone(bubble),background:{image:(char?.chatBackground??theme.chatBackground)||null,style:effective.chatBackgroundStyle||'plain'},
  assets:resolveChatAssetDecorations(theme,char),
  sound:resolveActiveSound(char?.chromeCustomCss,char?.chatSound,effective.chatChromeCustomCss,theme.chatSound),css:stripWhiteboxSoundDirective(css),
 }};
 const result=validateDecoration(await portableTree(preset));if(new Blob([JSON.stringify(result)]).size>40*1024*1024)throw Error('整套素材超过 40 MB，请精简背景或气泡图片后导出');return result;
}
export type DecorationImport={kind:'preset';preset:DecorationPreset}|{kind:'image';image:string;name:string};
export function parseDecorationText(text:string,name='导入的装扮'):DecorationPreset{
 const source=text.replace(/^\uFEFF/,'').trim().replace(/^```(?:css)?\s*\n([\s\S]*?)\n```$/i,'$1').trim();
 if(source.startsWith('SULLYSND1:')){const sound=decodeSoundShare(source);if(!sound)throw Error('声音分享码无效');return validateDecoration({format:'sullyos-chat-decoration',version:1,name,parts:{sound}});}
 if(/^[\[{]/.test(source)){let v;try{v=JSON.parse(source);}catch{if(source.startsWith('{'))throw Error('文件格式不完整，无法导入');}if(v!==undefined){if(v?.format==='sullyos-chat-decoration')return validateDecoration(v);if(v?.user&&v?.ai)return validateDecoration({format:'sullyos-chat-decoration',version:1,name:v.name||name,parts:{bubbles:v}});throw Error('这份文件不是装扮、气泡或 CSS，请到对应功能导入');}}
 if(!source||!/[{}]/.test(source)||!/[\w-]+\s*:[^{}]+[;}]/.test(source)||/<\/?(?:html|script|style|iframe)\b/i.test(source))throw Error('没有识别到 CSS。请选择 CSS/TXT 原文件，或装扮预设');
 return validateDecoration({format:'sullyos-chat-decoration',version:1,name,parts:{css:source,...(parseWhiteboxSound(source)?{sound:parseWhiteboxSound(source)}:{})}});
}
export async function readDecorationFile(file:File):Promise<DecorationImport>{
 if(file.size>40*1024*1024)throw Error('文件超过 40 MB，请精简素材后重试');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(isPng(bytes)&&pngHasShare(bytes)){const {metadata,payload}=extractShareFromPng(bytes);if(!['chat-decoration','chrome-css','chat-theme','whitebox-sound'].includes(metadata.kind))throw Error(`这是${SHARE_KINDS[metadata.kind]}，请到对应功能导入`);return {kind:'preset',preset:parseDecorationText(new TextDecoder().decode(payload),metadata.title)};}
 if(isPng(bytes)||/^image\/(jpeg|webp|gif|avif|bmp)$/.test(file.type))return {kind:'image',image:await blobToDataUrl(new Blob([bytes],{type:isPng(bytes)?'image/png':file.type})),name:file.name.replace(/\.[^.]+$/,'')};
 return {kind:'preset',preset:parseDecorationText(await file.text(),file.name.replace(/\.[^.]+$/,''))};
}
export async function decorationPatches(preset:DecorationPreset,parts:DecorationPart[],scope:'global'|'character',char:CharacterProfile,base:OSTheme){
 const p=validateDecoration(preset).parts,character:Partial<CharacterProfile>={},theme:Partial<OSTheme>={};let bubble:ChatTheme|undefined;
 if(parts.includes('layout')&&p.layout){if(scope==='global')Object.assign(theme,LAYOUT_DEFAULTS,p.layout);else{character.chatAppearance={...LAYOUT_DEFAULTS,...p.layout,...(char.chatAppearance?.chatBackgroundStyle?{chatBackgroundStyle:char.chatAppearance.chatBackgroundStyle}:{})};character.chatFineTune={enabled:true};}}
 if(parts.includes('controls')&&p.controls){const controls=await migrateControlLayout(p.controls);if(scope==='global')theme.chatControlLayout=controls;else character.chatControlLayout=controls;}
 if(parts.includes('bubbles')&&p.bubbles){bubble=await migrateChatThemeBlobRefs({...p.bubbles,id:'decoration-'+crypto.randomUUID(),type:'custom'});if(scope==='global')theme.chatDefaultBubbleStyle=bubble.id;else character.bubbleStyle=bubble.id;}
 if(parts.includes('background')&&p.background){const ref=p.background.image?await migrateDataUrlToRef(p.background.image):'';if(scope==='global'){theme.chatBackground=ref;theme.chatBackgroundStyle=p.background.style;}else{character.chatBackground=ref;character.chatAppearance={...(character.chatAppearance||char.chatAppearance),chatBackgroundStyle:p.background.style};}}
 if(parts.includes('assets')&&p.assets){const assets=await migrateAssetDecorations(p.assets);if(scope==='global')theme.chatAssetDecorations={...(base.chatAssetDecorations||{}),...assets};else character.chatAssetDecorations={...(char.chatAssetDecorations||{}),...assets};}
 if(parts.includes('css')&&p.css!==undefined){
  // Importing just CSS must not silently change the current sound stored in a CSS comment.
  const keep=scope==='global'?resolveActiveSound(undefined,undefined,base.chatChromeCustomCss,base.chatSound):resolveActiveSound(char.chromeCustomCss,char.chatSound,base.chatChromeCustomCss,base.chatSound);
  if(scope==='global'){theme.chatChromeCustomCss=stripWhiteboxSoundDirective(p.css);theme.chatSound=keep||{src:'none'};}
  else{character.chromeCustomCss=stripWhiteboxSoundDirective(p.css);character.chatDecorationCssIsolated=true;character.chatSoundBound=false;character.chatSound=keep||{src:'none'};}
 }
 if(parts.includes('sound')&&p.sound!==undefined){const sound=p.sound||{src:'none'};if(scope==='global'){theme.chatSound=sound;theme.chatChromeCustomCss=stripWhiteboxSoundDirective(theme.chatChromeCustomCss??base.chatChromeCustomCss??'');}else{character.chatSound=sound;character.chatSoundBound=false;character.chromeCustomCss=stripWhiteboxSoundDirective(character.chromeCustomCss??char.chromeCustomCss??'');}}
 return {character,theme,bubble};
}

/** Replacing CSS alone must not discard an audio track embedded by older presets. */
export function decorationCssPatch(value:string,scope:'character'|'global',char:CharacterProfile,theme:OSTheme,reset=false):Partial<CharacterProfile>&Partial<OSTheme>{
 const old=parseWhiteboxSound(scope==='global'?theme.chatChromeCustomCss:char.chromeCustomCss);
 const preserve=old&&!parseWhiteboxSound(value);
 return scope==='global'?{chatChromeCustomCss:value,...(preserve?{chatSound:old}:{})}:{chromeCustomCss:value,...(preserve?{chatSound:old,chatSoundBound:false}:{}),...(reset?{chatDecorationCssIsolated:false}:{})};
}
