import type { CSSProperties } from 'react';
import type { BubbleStyle } from '../types';

const n=(value:number|undefined,fallback:number,min=0,max=200)=>{
  const parsed=Number.isFinite(value)?Number(value):fallback;
  return Math.min(max,Math.max(min,parsed));
};
const optionalN=(value:number|undefined,min=0,max=5000)=>
  Number.isFinite(value)?Math.min(max,Math.max(min,Number(value))):undefined;

export const DEFAULT_BUBBLE_FRAME = {
  sliceTop: 24,
  sliceRight: 28,
  sliceBottom: 24,
  sliceLeft: 28,
  paddingTop: 12,
  paddingRight: 18,
  paddingBottom: 12,
  paddingLeft: 18,
  scale: 0.75,
  opacity: 1,
  repeat: 'stretch' as const,
  minHeight: 36,
};

export function hasBubbleFrame(style:BubbleStyle|undefined|null):boolean{
  return !!style?.frameImage;
}

export function resolveBubbleFrameValues(style:BubbleStyle){
  return {
    sliceTop:n(style.frameSliceTop,DEFAULT_BUBBLE_FRAME.sliceTop,0,5000),
    sliceRight:n(style.frameSliceRight,DEFAULT_BUBBLE_FRAME.sliceRight,0,5000),
    sliceBottom:n(style.frameSliceBottom,DEFAULT_BUBBLE_FRAME.sliceBottom,0,5000),
    sliceLeft:n(style.frameSliceLeft,DEFAULT_BUBBLE_FRAME.sliceLeft,0,5000),
    sourceWidth:n(style.frameSourceWidth,0,0,5000),
    sourceHeight:n(style.frameSourceHeight,0,0,5000),
    contentTop:optionalN(style.frameContentTop),
    contentRight:optionalN(style.frameContentRight),
    contentBottom:optionalN(style.frameContentBottom),
    contentLeft:optionalN(style.frameContentLeft),
    paddingTop:n(style.framePaddingTop,DEFAULT_BUBBLE_FRAME.paddingTop,0,80),
    paddingRight:n(style.framePaddingRight,DEFAULT_BUBBLE_FRAME.paddingRight,0,100),
    paddingBottom:n(style.framePaddingBottom,DEFAULT_BUBBLE_FRAME.paddingBottom,0,80),
    paddingLeft:n(style.framePaddingLeft,DEFAULT_BUBBLE_FRAME.paddingLeft,0,100),
    scale:n(style.frameScale,DEFAULT_BUBBLE_FRAME.scale,.25,4),
    opacity:n(style.frameOpacity,DEFAULT_BUBBLE_FRAME.opacity,0,1),
    repeat:style.frameRepeat==='round'?'round' as const:'stretch' as const,
    minHeight:n(style.frameMinHeight,DEFAULT_BUBBLE_FRAME.minHeight,0,160),
  };
}

function visualFrameWidths(style:BubbleStyle){
  const v=resolveBubbleFrameValues(style);
  const fallback=[v.sliceTop,v.sliceRight,v.sliceBottom,v.sliceLeft];
  const normalized=v.sourceWidth>0&&v.sourceHeight>0
    ? [
        (v.sliceTop/v.sourceHeight)*48,
        (v.sliceRight/v.sourceWidth)*120,
        (v.sliceBottom/v.sourceHeight)*48,
        (v.sliceLeft/v.sourceWidth)*120,
      ]
    : fallback;
  return {
    values:v,
    widths:[
      Math.max(1,Math.min(40,normalized[0]*v.scale)),
      Math.max(1,Math.min(64,normalized[1]*v.scale)),
      Math.max(1,Math.min(40,normalized[2]*v.scale)),
      Math.max(1,Math.min(64,normalized[3]*v.scale)),
    ] as [number,number,number,number],
  };
}

const mappedContentPadding=(contentInset:number|undefined,sourceSlice:number,renderedEdge:number,fallback:number)=>{
  if(contentInset===undefined||sourceSlice<=0)return fallback;
  return Math.max(0,Math.min(120,renderedEdge*(Math.min(contentInset,sourceSlice)/sourceSlice)));
};

export function bubbleFrameLayerStyle(style:BubbleStyle,url:string):CSSProperties{
  const {values:v,widths}=visualFrameWidths(style);
  return {
    position:'absolute',
    inset:0,
    zIndex:1,
    pointerEvents:'none',
    borderStyle:'solid',
    borderWidth:`${widths[0]}px ${widths[1]}px ${widths[2]}px ${widths[3]}px`,
    borderImageSource:`url(${JSON.stringify(url)})`,
    borderImageSlice:`${v.sliceTop} ${v.sliceRight} ${v.sliceBottom} ${v.sliceLeft} fill`,
    borderImageWidth:`${widths[0]}px ${widths[1]}px ${widths[2]}px ${widths[3]}px`,
    borderImageRepeat:`${v.repeat} ${v.repeat}`,
    boxSizing:'border-box',
    opacity:v.opacity,
    ...(style.frameFlipX ? { transform:'scaleX(-1)', transformOrigin:'center' } : {}),
  };
}

export function bubbleFrameContainerStyle(style:BubbleStyle):CSSProperties{
  const {values:v,widths}=visualFrameWidths(style);
  const visualLeftWidth=style.frameFlipX?widths[1]:widths[3];
  const visualRightWidth=style.frameFlipX?widths[3]:widths[1];
  const visualLeftSlice=style.frameFlipX?v.sliceRight:v.sliceLeft;
  const visualRightSlice=style.frameFlipX?v.sliceLeft:v.sliceRight;
  const visualContentLeft=style.frameFlipX?v.contentRight:v.contentLeft;
  const visualContentRight=style.frameFlipX?v.contentLeft:v.contentRight;
  const paddingTop=mappedContentPadding(v.contentTop,v.sliceTop,widths[0],v.paddingTop);
  const paddingRight=mappedContentPadding(visualContentRight,visualRightSlice,visualRightWidth,v.paddingRight);
  const paddingBottom=mappedContentPadding(v.contentBottom,v.sliceBottom,widths[2],v.paddingBottom);
  const paddingLeft=mappedContentPadding(visualContentLeft,visualLeftSlice,visualLeftWidth,v.paddingLeft);
  return {
    backgroundColor:'transparent',
    border:'none',
    boxShadow:'none',
    backdropFilter:'none',
    borderRadius:0,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    minWidth:Math.max(56,visualLeftWidth+visualRightWidth+16),
    minHeight:Math.max(v.minHeight,widths[0]+widths[2]+8),
    boxSizing:'border-box',
  };
}
