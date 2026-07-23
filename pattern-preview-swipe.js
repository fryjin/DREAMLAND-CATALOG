(function(){
  'use strict';

  if(window.PatternPreviewSwipe)return;

  const state={
    active:false,
    size:'',
    items:[],
    index:0,
    requestToken:0,
    initialValue:'',
    changed:false,
    scrollState:null,
    pointerId:null,
    startX:0,
    startY:0,
    loading:false
  };

  const SWIPE_MIN_X=44;
  const DIRECTION_RATIO=1.2;

  function installStyles(){
    if(document.getElementById('dreamlandPatternPreviewStyles'))return;

    const style=document.createElement('style');
    style.id='dreamlandPatternPreviewStyles';
    style.textContent=`
      .preview-layer.pattern-mode .preview-view{
        overflow:hidden;
      }

      .preview-layer.pattern-mode #previewImg{
        touch-action:pan-y;
        user-select:none;
        -webkit-user-drag:none;
        cursor:grab;
        will-change:transform,opacity;
        transition:transform .18s ease,opacity .16s ease;
      }

      .preview-layer.pattern-mode #previewImg.is-pattern-dragging{
        cursor:grabbing;
        transition:none;
      }

      .preview-layer.pattern-mode #previewImg.is-pattern-switching{
        opacity:.72;
      }

      .pattern-preview-nav{
        position:absolute;
        top:50%;
        z-index:7;
        display:none;
        width:44px;
        height:44px;
        place-items:center;
        border:0;
        border-radius:50%;
        background:rgba(255,255,255,.9);
        color:#111;
        box-shadow:0 10px 26px rgba(0,0,0,.18);
        transform:translateY(-50%);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
      }

      .preview-layer.pattern-mode .pattern-preview-nav{
        display:grid;
      }

      .pattern-preview-nav.prev{left:22px}
      .pattern-preview-nav.next{right:22px}

      .pattern-preview-nav svg{
        width:20px;
        height:20px;
        fill:none;
        stroke:currentColor;
        stroke-width:2.4;
        stroke-linecap:round;
        stroke-linejoin:round;
      }

      .preview-layer.pattern-mode .preview-caption{
        min-height:20px;
        padding:0 52px;
        line-height:1.45;
      }

      .preview-layer.pattern-mode .preview-close{
        z-index:9;
      }

      @media (hover:hover){
        .pattern-preview-nav:hover{
          background:#fff;
          transform:translateY(-50%) scale(1.04);
        }
      }

      @media (prefers-reduced-motion:reduce){
        .preview-layer.pattern-mode #previewImg{
          transition:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function elements(){
    const layer=document.getElementById('previewLayer');
    const view=layer?.querySelector('.preview-view')||null;
    const img=document.getElementById('previewImg');
    const caption=document.getElementById('previewCaption');
    const content=document.getElementById('scentDetailContent');

    return {layer,view,img,caption,content};
  }

  function ensureControls(){
    const {view,img,caption}=elements();
    if(!view||!img)return;

    caption?.setAttribute('aria-live','polite');

    if(!view.querySelector('.pattern-preview-nav.prev')){
      const prev=document.createElement('button');
      prev.type='button';
      prev.className='pattern-preview-nav prev';
      prev.setAttribute('aria-label','上一个花样');
      prev.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
      prev.addEventListener('click',event=>{
        event.stopPropagation();
        change(-1);
      });
      view.appendChild(prev);
    }

    if(!view.querySelector('.pattern-preview-nav.next')){
      const next=document.createElement('button');
      next.type='button';
      next.className='pattern-preview-nav next';
      next.setAttribute('aria-label','下一个花样');
      next.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
      next.addEventListener('click',event=>{
        event.stopPropagation();
        change(1);
      });
      view.appendChild(next);
    }

    if(img.dataset.patternSwipeBound==='1')return;
    img.dataset.patternSwipeBound='1';

    img.addEventListener('pointerdown',onPointerDown);
    img.addEventListener('pointermove',onPointerMove,{passive:false});
    img.addEventListener('pointerup',onPointerEnd);
    img.addEventListener('pointercancel',resetPointer);
  }

  function currentSize(){
    if(typeof config!=='undefined'&&config?.size){
      return String(config.size).trim().toUpperCase();
    }
    return '';
  }

  function patternValues(size){
    if(
      typeof patternsBySize==='undefined'||
      !patternsBySize||
      !Array.isArray(patternsBySize[size])
    ){
      return [];
    }

    return patternsBySize[size].filter(Boolean);
  }

  function labelFor(value){
    return typeof choiceLabel==='function'
      ? choiceLabel(value)
      : String(value||'');
  }

  function candidatesFor(value,size,index){
    const fallback=`./images/patterns/${size}/pattern-${index+1}.jpg`;

    if(typeof sharedAssetCandidates==='function'){
      return sharedAssetCandidates(
        'pattern',
        value,
        size,
        fallback
      );
    }

    return [fallback];
  }

  function buildItems(size){
    return patternValues(size).map((value,index)=>({
      value,
      label:labelFor(value),
      candidates:candidatesFor(value,size,index)
    }));
  }

  function normalizeIndex(index){
    const count=state.items.length;
    if(!count)return 0;
    return (index%count+count)%count;
  }

  function loadNative(img,src){
    if(typeof nativeLoadImage==='function'){
      return nativeLoadImage(img,src);
    }

    return new Promise(resolve=>{
      img.onload=()=>resolve(true);
      img.onerror=()=>resolve(false);
      img.src=src;
    });
  }

  async function loadCandidates(img,candidates,token){
    for(const src of candidates){
      if(token!==state.requestToken)return false;

      img.classList.remove('is-missing');
      const success=await loadNative(img,src);

      if(token!==state.requestToken)return false;
      if(success)return true;
    }

    return false;
  }

  function captionText(item,index){
    return `${item.label} · ${index+1} / ${state.items.length}`;
  }

  function preloadNeighbor(index){
    if(state.items.length<2)return;

    [-1,1].forEach(offset=>{
      const item=state.items[normalizeIndex(index+offset)];
      const src=item?.candidates?.[0];
      if(!src)return;

      const preload=new Image();
      preload.decoding='async';
      preload.src=src;
    });
  }

  async function show(index){
    if(!state.active||!state.items.length||state.loading)return false;

    const {img,caption}=elements();
    if(!img||!caption)return false;

    const nextIndex=normalizeIndex(index);
    const item=state.items[nextIndex];
    const previousSrc=img.currentSrc||img.src||'';
    const token=++state.requestToken;

    state.loading=true;
    caption.textContent=captionText(item,nextIndex);
    img.classList.add('is-pattern-switching');
    img.style.transform='translateX(0)';
    img.style.opacity='';

    const success=await loadCandidates(
      img,
      item.candidates,
      token
    );

    if(token!==state.requestToken)return false;

    state.loading=false;
    img.classList.remove('is-pattern-switching');

    if(!success){
      if(previousSrc){
        await loadNative(img,previousSrc);
      }else if(typeof imgMiss==='function'){
        imgMiss(img);
      }
      return false;
    }

    state.index=nextIndex;

    if(typeof config!=='undefined'&&config){
      config.pattern=item.value;
      state.changed=config.pattern!==state.initialValue;
    }

    preloadNeighbor(nextIndex);
    return true;
  }

  function change(delta){
    if(!state.active||state.items.length<2||state.loading)return;
    show(state.index+delta);
  }

  function resetImageTransform(){
    const {img}=elements();
    if(!img)return;

    img.classList.remove(
      'is-pattern-dragging',
      'is-pattern-switching'
    );
    img.style.transform='translateX(0)';
    img.style.opacity='';
  }

  function onPointerDown(event){
    if(!state.active||state.items.length<2)return;
    if(event.button!=null&&event.button!==0)return;

    state.pointerId=event.pointerId;
    state.startX=event.clientX;
    state.startY=event.clientY;

    const {img}=elements();
    img?.classList.add('is-pattern-dragging');
    img?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event){
    if(event.pointerId!==state.pointerId)return;

    const dx=event.clientX-state.startX;
    const dy=event.clientY-state.startY;
    const horizontal=
      Math.abs(dx)>10&&
      Math.abs(dx)>Math.abs(dy)*DIRECTION_RATIO;

    if(!horizontal)return;

    event.preventDefault();

    const {img}=elements();
    if(!img)return;

    const limited=Math.max(-92,Math.min(92,dx*.42));
    img.style.transform=`translateX(${limited}px)`;
    img.style.opacity=String(Math.max(.76,1-Math.abs(limited)/360));
  }

  function onPointerEnd(event){
    if(event.pointerId!==state.pointerId)return;

    const dx=event.clientX-state.startX;
    const dy=event.clientY-state.startY;
    const valid=
      Math.abs(dx)>=SWIPE_MIN_X&&
      Math.abs(dx)>Math.abs(dy)*DIRECTION_RATIO;

    resetPointer();

    if(valid){
      change(dx<0?1:-1);
    }
  }

  function resetPointer(){
    state.pointerId=null;
    state.startX=0;
    state.startY=0;
    resetImageTransform();
  }

  function deactivate(){
    const {layer}=elements();

    state.active=false;
    state.size='';
    state.items=[];
    state.index=0;
    state.requestToken+=1;
    state.pointerId=null;
    state.initialValue='';
    state.changed=false;
    state.scrollState=null;
    state.loading=false;

    layer?.classList.remove('pattern-mode');
    resetImageTransform();
  }

  function syncConfigUi(){
    if(!state.changed)return;
    if(typeof renderDetail!=='function')return;

    const scrollState=state.scrollState;

    requestAnimationFrame(()=>{
      renderDetail(scrollState,'pattern');
    });
  }

  async function openPatternPreview(button){
    const {layer,img,caption,content}=elements();
    if(!layer||!img||!caption)return false;

    const size=String(
      button?.dataset?.sharedSize||
      currentSize()
    ).trim().toUpperCase();
    const items=buildItems(size);

    if(!items.length)return false;

    ensureControls();

    state.active=true;
    state.size=size;
    state.items=items;
    state.initialValue=
      typeof config!=='undefined'&&config
        ? String(config.pattern||'')
        : String(button?.dataset?.sharedKey||'');
    state.changed=false;
    state.scrollState=
      typeof captureDetailOptionScrollState==='function'
        ? captureDetailOptionScrollState()
        : null;

    const selectedValue=String(
      button?.dataset?.sharedKey||
      state.initialValue
    );
    const selectedIndex=Math.max(
      0,
      items.findIndex(item=>item.value===selectedValue)
    );

    layer.classList.remove('scent-mode');
    layer.classList.add('pattern-mode','show');

    if(content){
      content.hidden=true;
      content.innerHTML='';
    }

    img.hidden=false;
    caption.hidden=false;

    await show(selectedIndex);
    return true;
  }

  function installHooks(){
    const originalOpenShared=window.openSharedPreviewFromButton;
    const originalClose=window.closePreviewImage;
    const originalOpenImage=window.openPreviewImage;
    const originalOpenScent=window.openScentNotes;

    if(typeof originalOpenShared==='function'){
      window.openSharedPreviewFromButton=async function(button){
        const category=String(
          button?.dataset?.sharedCategory||''
        ).toLowerCase();

        if(category==='pattern'){
          const opened=await openPatternPreview(button);
          if(opened)return;
        }

        deactivate();
        return originalOpenShared.apply(this,arguments);
      };
    }

    if(typeof originalClose==='function'){
      window.closePreviewImage=function(){
        const shouldSync=state.active&&state.changed;

        if(shouldSync){
          syncConfigUi();
        }

        deactivate();
        return originalClose.apply(this,arguments);
      };
    }

    if(typeof originalOpenImage==='function'){
      window.openPreviewImage=function(){
        deactivate();
        return originalOpenImage.apply(this,arguments);
      };
    }

    if(typeof originalOpenScent==='function'){
      window.openScentNotes=function(){
        deactivate();
        return originalOpenScent.apply(this,arguments);
      };
    }

    document.addEventListener('keydown',event=>{
      if(!state.active)return;

      if(event.key==='ArrowLeft'){
        event.preventDefault();
        change(-1);
      }else if(event.key==='ArrowRight'){
        event.preventDefault();
        change(1);
      }else if(event.key==='Escape'){
        event.preventDefault();
        window.closePreviewImage?.();
      }
    });
  }

  installStyles();
  ensureControls();
  installHooks();

  window.PatternPreviewSwipe={
    change,
    openPatternPreview
  };
})();
