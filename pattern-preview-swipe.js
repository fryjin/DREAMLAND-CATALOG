(function(){
  'use strict';

  if(window.PatternPreviewSwipe)return;

  const state={
    active:false,
    size:'',
    items:[],
    index:0,
    initialValue:'',
    changed:false,
    scrollState:null,
    pointerId:null,
    startX:0,
    startY:0,
    startTime:0,
    lastX:0,
    lastTime:0,
    dragX:0,
    horizontal:false,
    settling:false,
    geometry:null,
    requestToken:0
  };

  const DIRECTION_RATIO=1.25;
  const DISTANCE_RATIO=.22;
  const MIN_FLING_X=32;
  const FLING_VELOCITY=.45;
  const SETTLE_MS=220;
  const RETURN_MS=170;

  function installStyles(){
    if(document.getElementById('dreamlandPatternPreviewStyles'))return;

    const style=document.createElement('style');
    style.id='dreamlandPatternPreviewStyles';
    style.textContent=`
      .preview-layer.pattern-mode .preview-view{
        overflow:hidden;
      }

      .preview-layer.pattern-mode #previewImg,
      .preview-layer.pattern-mode #previewCaption{
        display:none!important;
      }

      .pattern-preview-shell[hidden]{
        display:none!important;
      }

      .pattern-preview-shell{
        display:flex;
        flex-direction:column;
        width:100%;
        min-width:0;
      }

      .pattern-preview-viewport{
        width:100%;
        min-width:0;
        overflow:hidden;
        touch-action:pan-y;
        user-select:none;
        -webkit-user-select:none;
        cursor:grab;
      }

      .pattern-preview-viewport.is-dragging{
        cursor:grabbing;
      }

      .pattern-preview-track{
        display:flex;
        align-items:center;
        gap:12px;
        width:100%;
        will-change:transform;
        transform:translate3d(0,0,0);
      }

      .pattern-preview-track.is-settling{
        transition:transform ${SETTLE_MS}ms cubic-bezier(.22,.8,.22,1);
      }

      .pattern-preview-track.is-returning{
        transition:transform ${RETURN_MS}ms cubic-bezier(.22,.8,.22,1);
      }

      .pattern-preview-slide{
        position:relative;
        flex:0 0 calc(100% - 42px);
        aspect-ratio:1/1;
        overflow:hidden;
        border-radius:22px;
        background:#f1f2f4;
        box-shadow:0 16px 34px rgba(0,0,0,.18);
        transform:scale(.965);
        opacity:.78;
        transition:transform .16s ease,opacity .16s ease;
      }

      .pattern-preview-slide[data-relative="0"]{
        transform:scale(1);
        opacity:1;
      }

      .pattern-preview-slide img{
        width:100%;
        height:100%;
        display:block;
        object-fit:cover;
        pointer-events:none;
        -webkit-user-drag:none;
      }

      .pattern-preview-slide.is-loading::after{
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(
          100deg,
          rgba(255,255,255,0) 22%,
          rgba(255,255,255,.66) 48%,
          rgba(255,255,255,0) 74%
        );
        transform:translateX(-110%);
        animation:patternPreviewShimmer 1.1s ease-in-out infinite;
      }

      @keyframes patternPreviewShimmer{
        to{transform:translateX(110%)}
      }

      .pattern-preview-meta{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
        margin-top:13px;
        color:#fff;
      }

      .pattern-preview-name{
        min-width:0;
        font-size:15px;
        line-height:1.3;
        font-weight:950;
        letter-spacing:-.02em;
      }

      .pattern-preview-sub{
        margin-top:3px;
        color:rgba(255,255,255,.56);
        font-size:10px;
        line-height:1.35;
        font-weight:800;
      }

      .pattern-preview-count{
        flex:0 0 auto;
        padding-top:1px;
        color:rgba(255,255,255,.82);
        font-size:12px;
        line-height:1.3;
        font-weight:900;
        font-variant-numeric:tabular-nums;
      }

      .pattern-preview-labels{
        display:flex;
        align-items:flex-start;
        justify-content:center;
        gap:14px;
        width:100%;
        margin-top:13px;
        overflow:hidden;
      }

      .pattern-preview-label{
        position:relative;
        min-width:0;
        max-width:31%;
        padding-bottom:8px;
        overflow:hidden;
        color:rgba(255,255,255,.38);
        font-size:10px;
        line-height:1.25;
        font-weight:850;
        text-align:center;
        white-space:nowrap;
        text-overflow:ellipsis;
        transition:color .18s ease,transform .18s ease;
      }

      .pattern-preview-label.active{
        color:#fff;
        transform:translateY(-1px);
      }

      .pattern-preview-label.active::after{
        content:"";
        position:absolute;
        left:50%;
        bottom:0;
        width:18px;
        height:3px;
        border-radius:999px;
        background:#fff;
        transform:translateX(-50%);
      }

      .pattern-preview-hint{
        margin-top:7px;
        color:rgba(255,255,255,.42);
        font-size:9px;
        line-height:1.3;
        font-weight:800;
        text-align:center;
        letter-spacing:.02em;
      }

      .preview-layer.pattern-mode .preview-close{
        z-index:9;
      }

      @media (prefers-reduced-motion:reduce){
        .pattern-preview-track,
        .pattern-preview-slide,
        .pattern-preview-label{
          transition:none!important;
        }

        .pattern-preview-slide.is-loading::after{
          animation:none;
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
    const shell=view?.querySelector('.pattern-preview-shell')||null;
    const viewport=shell?.querySelector('.pattern-preview-viewport')||null;
    const track=shell?.querySelector('.pattern-preview-track')||null;
    const name=shell?.querySelector('.pattern-preview-name')||null;
    const sub=shell?.querySelector('.pattern-preview-sub')||null;
    const count=shell?.querySelector('.pattern-preview-count')||null;
    const labels=shell?.querySelector('.pattern-preview-labels')||null;

    return {
      layer,
      view,
      img,
      caption,
      content,
      shell,
      viewport,
      track,
      name,
      sub,
      count,
      labels
    };
  }

  function ensureShell(){
    const {view,img}=elements();
    if(!view||!img)return null;

    view.querySelectorAll('.pattern-preview-nav').forEach(node=>node.remove());

    let shell=view.querySelector('.pattern-preview-shell');
    if(!shell){
      shell=document.createElement('div');
      shell.className='pattern-preview-shell';
      shell.hidden=true;
      shell.innerHTML=`
        <div
          class="pattern-preview-viewport"
          role="group"
          aria-label="花样大图，左右滑动切换"
        >
          <div class="pattern-preview-track"></div>
        </div>
        <div class="pattern-preview-meta" aria-live="polite">
          <div>
            <div class="pattern-preview-name"></div>
            <div class="pattern-preview-sub"></div>
          </div>
          <div class="pattern-preview-count"></div>
        </div>
        <div class="pattern-preview-labels" aria-hidden="true"></div>
        <div class="pattern-preview-hint">左右滑动切换花样</div>
      `;
      view.insertBefore(shell,img);
    }

    const viewport=shell.querySelector('.pattern-preview-viewport');
    if(viewport&&viewport.dataset.patternSwipeBound!=='1'){
      viewport.dataset.patternSwipeBound='1';
      viewport.addEventListener('pointerdown',onPointerDown);
      viewport.addEventListener('pointermove',onPointerMove,{passive:false});
      viewport.addEventListener('pointerup',onPointerEnd);
      viewport.addEventListener('pointercancel',onPointerCancel);
      viewport.addEventListener('lostpointercapture',onLostPointerCapture);
    }

    return shell;
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

  function currentItem(){
    return state.items[normalizeIndex(state.index)]||null;
  }

  function loadImageCandidates(img,candidates,token){
    const sources=Array.isArray(candidates)
      ? candidates.filter(Boolean)
      : [];

    return new Promise(resolve=>{
      let cursor=0;

      const attempt=()=>{
        if(token!==state.requestToken){
          resolve(false);
          return;
        }

        const src=sources[cursor++];
        if(!src){
          resolve(false);
          return;
        }

        img.onload=()=>{
          img.onload=null;
          img.onerror=null;
          resolve(true);
        };

        img.onerror=()=>{
          img.onload=null;
          img.onerror=null;
          attempt();
        };

        img.src=src;
      };

      attempt();
    });
  }

  function relativeIndexes(){
    return [-1,0,1].map(relative=>({
      relative,
      index:normalizeIndex(state.index+relative)
    }));
  }

  function renderTrack(){
    const {track}=elements();
    if(!track||!state.items.length)return;

    const token=++state.requestToken;

    track.classList.remove('is-settling','is-returning');
    track.innerHTML=relativeIndexes().map(({relative,index})=>{
      const item=state.items[index];
      return `
        <div
          class="pattern-preview-slide is-loading"
          data-relative="${relative}"
          data-item-index="${index}"
        >
          <img alt="${escapeAttribute(item.label)}" decoding="async">
        </div>
      `;
    }).join('');

    track.querySelectorAll('.pattern-preview-slide').forEach(slide=>{
      const itemIndex=Number(slide.dataset.itemIndex);
      const item=state.items[itemIndex];
      const img=slide.querySelector('img');

      loadImageCandidates(img,item?.candidates,token).then(success=>{
        if(token!==state.requestToken)return;
        slide.classList.remove('is-loading');
        if(!success)slide.classList.add('is-error');
      });
    });

    requestAnimationFrame(()=>{
      measureGeometry();
      setTrackPosition(0,false);
      applyDragEffects(0);
    });
  }

  function escapeAttribute(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function measureGeometry(){
    const {viewport,track}=elements();
    const slide=track?.querySelector('.pattern-preview-slide');
    if(!viewport||!track||!slide)return null;

    const viewportWidth=viewport.clientWidth;
    const slideWidth=slide.getBoundingClientRect().width;
    const styles=getComputedStyle(track);
    const gap=parseFloat(styles.columnGap||styles.gap)||12;
    const peek=Math.max(0,(viewportWidth-slideWidth)/2);
    const step=slideWidth+gap;
    const base=peek-step;

    state.geometry={viewportWidth,slideWidth,gap,peek,step,base};
    return state.geometry;
  }

  function geometry(){
    return state.geometry||measureGeometry();
  }

  function setTrackPosition(offset,animateMode=false){
    const {track}=elements();
    const metrics=geometry();
    if(!track||!metrics)return;

    track.classList.remove('is-settling','is-returning');
    if(animateMode==='settle')track.classList.add('is-settling');
    if(animateMode==='return')track.classList.add('is-returning');

    track.style.transform=`translate3d(${metrics.base+offset}px,0,0)`;
  }

  function applyDragEffects(dx){
    const {track}=elements();
    const metrics=geometry();
    if(!track||!metrics)return;

    const progress=Math.min(1,Math.abs(dx)/Math.max(1,metrics.step));
    const targetRelative=dx<0?1:-1;

    track.querySelectorAll('.pattern-preview-slide').forEach(slide=>{
      const relative=Number(slide.dataset.relative);
      let scale=.965;
      let opacity=.78;

      if(relative===0){
        scale=1-progress*.03;
        opacity=1-progress*.18;
      }else if(relative===targetRelative){
        scale=.965+progress*.035;
        opacity=.78+progress*.22;
      }

      slide.style.transform=`scale(${scale})`;
      slide.style.opacity=String(opacity);
    });
  }

  function updateMeta(direction=0){
    const {name,sub,count,labels}=elements();
    const item=currentItem();
    if(!item)return;

    if(name){
      name.textContent=item.label;
      name.dataset.direction=direction>0?'next':direction<0?'prev':'';
    }

    if(sub){
      sub.textContent=`${state.size} 尺寸花样`;
    }

    if(count){
      count.textContent=`${state.index+1} / ${state.items.length}`;
    }

    if(labels){
      labels.innerHTML=state.items.map((entry,index)=>`
        <span class="pattern-preview-label ${index===state.index?'active':''}">
          ${escapeHtml(entry.label)}
        </span>
      `).join('');
    }
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function commitIndex(direction){
    state.index=normalizeIndex(state.index+direction);
    const item=currentItem();

    if(typeof config!=='undefined'&&config&&item){
      config.pattern=item.value;
      state.changed=config.pattern!==state.initialValue;
    }

    updateMeta(direction);
    renderTrack();
  }

  function settleTo(direction){
    if(state.settling||state.items.length<2)return;

    const metrics=geometry();
    if(!metrics)return;

    state.settling=true;
    setTrackPosition(-direction*metrics.step,'settle');
    applyDragEffects(-direction*metrics.step);

    window.setTimeout(()=>{
      if(!state.active)return;
      state.settling=false;
      commitIndex(direction);
    },SETTLE_MS+24);
  }

  function returnToCurrent(){
    if(state.settling)return;

    state.settling=true;
    setTrackPosition(0,'return');
    applyDragEffects(0);

    window.setTimeout(()=>{
      state.settling=false;
      const {track}=elements();
      track?.classList.remove('is-returning');
    },RETURN_MS+24);
  }

  function resetPointerState(){
    state.pointerId=null;
    state.startX=0;
    state.startY=0;
    state.startTime=0;
    state.lastX=0;
    state.lastTime=0;
    state.dragX=0;
    state.horizontal=false;

    const {viewport}=elements();
    viewport?.classList.remove('is-dragging');
  }

  function onPointerDown(event){
    if(!state.active||state.items.length<2||state.settling)return;
    if(event.button!=null&&event.button!==0)return;

    state.pointerId=event.pointerId;
    state.startX=event.clientX;
    state.startY=event.clientY;
    state.startTime=performance.now();
    state.lastX=event.clientX;
    state.lastTime=state.startTime;
    state.dragX=0;
    state.horizontal=false;

    const {viewport,track}=elements();
    viewport?.classList.add('is-dragging');
    viewport?.setPointerCapture?.(event.pointerId);
    track?.classList.remove('is-settling','is-returning');
  }

  function onPointerMove(event){
    if(event.pointerId!==state.pointerId||state.settling)return;

    const dx=event.clientX-state.startX;
    const dy=event.clientY-state.startY;

    if(!state.horizontal){
      state.horizontal=
        Math.abs(dx)>10&&
        Math.abs(dx)>Math.abs(dy)*DIRECTION_RATIO;
    }

    if(!state.horizontal)return;

    event.preventDefault();
    state.dragX=dx;
    state.lastX=event.clientX;
    state.lastTime=performance.now();

    setTrackPosition(dx,false);
    applyDragEffects(dx);
  }

  function onPointerEnd(event){
    if(event.pointerId!==state.pointerId)return;

    const dx=event.clientX-state.startX;
    const dy=event.clientY-state.startY;
    const elapsed=Math.max(1,performance.now()-state.startTime);
    const velocity=dx/elapsed;
    const metrics=geometry();
    const horizontal=
      state.horizontal&&
      Math.abs(dx)>Math.abs(dy)*DIRECTION_RATIO;

    const distancePassed=
      metrics&&
      Math.abs(dx)>=metrics.viewportWidth*DISTANCE_RATIO;

    const flingPassed=
      Math.abs(dx)>=MIN_FLING_X&&
      Math.abs(velocity)>=FLING_VELOCITY;

    resetPointerState();

    if(horizontal&&(distancePassed||flingPassed)){
      settleTo(dx<0?1:-1);
    }else{
      returnToCurrent();
    }
  }

  function onPointerCancel(event){
    if(event.pointerId!==state.pointerId)return;
    resetPointerState();
    returnToCurrent();
  }

  function onLostPointerCapture(event){
    if(event.pointerId!==state.pointerId)return;
    resetPointerState();
  }

  function deactivate(){
    const {layer,shell,track}=elements();

    state.active=false;
    state.size='';
    state.items=[];
    state.index=0;
    state.initialValue='';
    state.changed=false;
    state.scrollState=null;
    state.settling=false;
    state.geometry=null;
    state.requestToken+=1;
    resetPointerState();

    if(shell)hiddenShell(shell);
    if(track){
      track.innerHTML='';
      track.removeAttribute('style');
      track.classList.remove('is-settling','is-returning');
    }

    layer?.classList.remove('pattern-mode');
  }

  function hiddenShell(shell){
    shell.hidden=true;
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
    const shell=ensureShell();
    const {layer,img,caption,content}=elements();
    if(!shell||!layer||!img||!caption)return false;

    const size=String(
      button?.dataset?.sharedSize||
      currentSize()
    ).trim().toUpperCase();

    const items=buildItems(size);
    if(!items.length)return false;

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
    state.geometry=null;
    state.settling=false;

    const selectedValue=String(
      button?.dataset?.sharedKey||
      state.initialValue
    );

    state.index=Math.max(
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
    shell.hidden=false;

    updateMeta(0);
    renderTrack();
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
      if(event.key==='Escape'){
        event.preventDefault();
        window.closePreviewImage?.();
      }
    });

    window.addEventListener('resize',()=>{
      if(!state.active)return;
      state.geometry=null;
      requestAnimationFrame(()=>{
        measureGeometry();
        setTrackPosition(0,false);
      });
    },{passive:true});
  }

  installStyles();
  ensureShell();
  installHooks();

  window.PatternPreviewSwipe={
    openPatternPreview
  };
})();
