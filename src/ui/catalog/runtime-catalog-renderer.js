(function(root){
  'use strict';

  if(root.DreamlandCatalogRenderer){
    return;
  }

  const VERSION='B6-02';

  let tabsElement=null;
  let seriesCountElement=null;
  let gridElement=null;
  let contentElement=null;

  let boundTabs=null;
  let boundGrid=null;
  let boundContent=null;

  let batchSize=5;
  let renderToken=0;
  let batchTimer=null;
  let catalogList=[];
  let cursor=0;
  let loading=false;

  let text=
    key=>
      String(
        key||
        ''
      );

  let language=
    ()=>'zh';

  let seriesLabel=
    key=>
      String(
        key||
        ''
      );

  let seriesTabLabel=
    key=>
      String(
        key||
        ''
      );

  let productDisplayName=
    product=>
      String(
        product?.name||
        product?.id||
        ''
      );

  let productCover=
    product=>
      String(
        product?.cover||
        ''
      );

  let fromPrice=
    value=>
      String(
        value??
        ''
      );

  let catalogUnit=
    ()=>0;

  let htmlAttr=
    value=>
      String(
        value??
        ''
      );

  let afterAppendBatch=
    ()=>{};

  let actions={
    selectSeries:null,
    openDetail:null,
    quickAdd:null
  };

  function functionOr(
    value,
    fallback
  ){
    return typeof value==='function'
      ? value
      : fallback;
  }

  function positiveInteger(
    value,
    fallback
  ){
    const parsed=
      Math.trunc(
        Number(value)
      );

    return (
      Number.isFinite(parsed)&&
      parsed>0
    )
      ? parsed
      : fallback;
  }

  function frame(
    callback
  ){
    if(
      typeof root
        .requestAnimationFrame===
      'function'
    ){
      return root
        .requestAnimationFrame(
          callback
        );
    }

    return root.setTimeout(
      callback,
      0
    );
  }

  function cancelTimer(){
    if(
      batchTimer==
      null
    ){
      return;
    }

    if(
      typeof root
        .cancelIdleCallback===
      'function'
    ){
      root.cancelIdleCallback(
        batchTimer
      );
    }

    root.clearTimeout?.(
      batchTimer
    );

    batchTimer=null;
  }

  function ready(){
    return Boolean(
      tabsElement&&
      seriesCountElement&&
      gridElement&&
      contentElement&&
      typeof text==='function'&&
      typeof language==='function'&&
      typeof seriesLabel==='function'&&
      typeof seriesTabLabel==='function'&&
      typeof productDisplayName==='function'&&
      typeof productCover==='function'&&
      typeof fromPrice==='function'&&
      typeof catalogUnit==='function'&&
      typeof htmlAttr==='function'&&
      typeof afterAppendBatch==='function'
    );
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      ready:ready(),
      batchSize,
      renderToken,
      listCount:
        catalogList.length,
      cursor,
      loading,
      tabsBound:
        boundTabs===
        tabsElement,
      gridBound:
        boundGrid===
        gridElement,
      scrollBound:
        boundContent===
        contentElement
    });
  }

  function unbindEvents(){
    boundTabs
      ?.removeEventListener?.(
        'click',
        onTabsClick
      );

    boundGrid
      ?.removeEventListener?.(
        'click',
        onGridClick
      );

    boundContent
      ?.removeEventListener?.(
        'scroll',
        onScroll
      );

    boundTabs=null;
    boundGrid=null;
    boundContent=null;
  }

  function bindEvents(){
    if(
      boundTabs===
        tabsElement&&
      boundGrid===
        gridElement&&
      boundContent===
        contentElement
    ){
      return;
    }

    unbindEvents();

    tabsElement
      ?.addEventListener?.(
        'click',
        onTabsClick
      );

    gridElement
      ?.addEventListener?.(
        'click',
        onGridClick
      );

    contentElement
      ?.addEventListener?.(
        'scroll',
        onScroll,
        {
          passive:true
        }
      );

    boundTabs=tabsElement;
    boundGrid=gridElement;
    boundContent=contentElement;
  }

  function configure(
    options={}
  ){
    const nextTabs=
      options.tabs||
      tabsElement;

    const nextSeriesCount=
      options.seriesCount||
      seriesCountElement;

    const nextGrid=
      options.grid||
      gridElement;

    const nextContent=
      options.content||
      contentElement;

    if(
      nextTabs!==tabsElement||
      nextGrid!==gridElement||
      nextContent!==contentElement
    ){
      unbindEvents();
    }

    tabsElement=nextTabs;
    seriesCountElement=
      nextSeriesCount;
    gridElement=nextGrid;
    contentElement=
      nextContent;

    batchSize=
      positiveInteger(
        options.batchSize,
        batchSize
      );

    text=
      functionOr(
        options.text,
        text
      );

    language=
      functionOr(
        options.language,
        language
      );

    seriesLabel=
      functionOr(
        options.seriesLabel,
        seriesLabel
      );

    seriesTabLabel=
      functionOr(
        options.seriesTabLabel,
        seriesTabLabel
      );

    productDisplayName=
      functionOr(
        options.productDisplayName,
        productDisplayName
      );

    productCover=
      functionOr(
        options.productCover,
        productCover
      );

    fromPrice=
      functionOr(
        options.fromPrice,
        fromPrice
      );

    catalogUnit=
      functionOr(
        options.catalogUnit,
        catalogUnit
      );

    htmlAttr=
      functionOr(
        options.htmlAttr,
        htmlAttr
      );

    afterAppendBatch=
      functionOr(
        options.afterAppendBatch,
        afterAppendBatch
      );

    if(
      options.actions&&
      typeof options.actions===
        'object'
    ){
      actions={
        ...actions,
        ...options.actions
      };
    }

    bindEvents();

    return snapshot();
  }

  function ensureReady(){
    if(!ready()){
      throw new Error(
        'DreamlandCatalogRenderer must be configured before rendering.'
      );
    }
  }

  function attr(
    value
  ){
    return htmlAttr(
      value
    );
  }

  function onTabsClick(
    event
  ){
    const target=
      event?.target
        ?.closest?.(
          '[data-catalog-series]'
        );

    if(
      !target||
      !tabsElement
        ?.contains?.(
          target
        )||
      typeof actions.selectSeries!==
        'function'
    ){
      return;
    }

    actions.selectSeries(
      target.dataset
        ?.catalogSeries||
      ''
    );
  }

  function onGridClick(
    event
  ){
    const target=
      event?.target
        ?.closest?.(
          '[data-catalog-action]'
        );

    if(
      !target||
      !gridElement
        ?.contains?.(
          target
        )
    ){
      return;
    }

    const action=
      target.dataset
        ?.catalogAction||
      '';

    const productId=
      target.dataset
        ?.productId||
      '';

    if(
      action==='quick-add'&&
      typeof actions.quickAdd===
        'function'
    ){
      actions.quickAdd(
        productId
      );

      return;
    }

    if(
      action==='open-detail'&&
      typeof actions.openDetail===
        'function'
    ){
      actions.openDetail(
        productId
      );
    }
  }

  function onScroll(){
    maybeLoadMore();
  }

  function renderTabs(
    viewModel
  ){
    ensureReady();

    const view=
      viewModel||
      {};

    const activeSeries=
      String(
        view.activeSeries||
        ''
      );

    const seriesIds=
      Array.isArray(
        view.availableSeries
      )
        ? view.availableSeries
        : [];

    tabsElement.className=
      `tabs lang-${String(
        language()||
        'zh'
      )}`;

    tabsElement.innerHTML=
      seriesIds
        .map(
          key=>
            `<button class="tab ${key===activeSeries?'active':''}" type="button" data-catalog-series="${attr(key)}">${seriesTabLabel(key)}</button>`
        )
        .join('');

    return Object.freeze({
      activeSeries,
      count:
        seriesIds.length
    });
  }

  function cardHtml(
    product,
    index,
    tall=false
  ){
    const id=
      attr(
        product?.id||
        ''
      );

    const name=
      productDisplayName(
        product
      );

    const cover=
      attr(
        productCover(
          product
        )
      );

    const priority=
      index<2
        ? 'high'
        : 'auto';

    const color=
      attr(
        product?.color||
        ''
      );

    return `
      <article
        class="product-card ${tall?'tall':''}"
        style="animation-delay:${Math.min(index%batchSize,4)*42}ms"
        data-catalog-action="open-detail"
        data-product-id="${id}"
      >
        <div class="product-visual media-frame">
          <span
            class="media-skeleton"
            aria-hidden="true"
          ></span>

          <img
            class="product-cover"
            data-image-manager-catalog="1"
            data-responsive-source="${cover}"
            data-responsive-priority="${priority}"
            alt="${attr(name)}"
            width="480"
            height="720"
            loading="lazy"
            decoding="async"
          >
        </div>

        <button
          class="add-mini"
          type="button"
          data-catalog-action="quick-add"
          data-product-id="${id}"
          aria-label="+"
        >
          +
        </button>

        <div class="product-name">
          ${name}
        </div>

        <div class="price-row">
          <span class="price">
            ${fromPrice(
              catalogUnit(
                product
              )
            )}
          </span>
        </div>
      </article>
    `;
  }

  function cancel(){
    renderToken+=1;
    catalogList=[];
    cursor=0;
    loading=false;
    cancelTimer();

    return snapshot();
  }

  function appendBatch(
    token
  ){
    if(
      token!==renderToken||
      cursor>=
        catalogList.length
    ){
      return 0;
    }

    const left=
      gridElement
        ?.querySelector?.(
          '[data-catalog-col="left"]'
        );

    const right=
      gridElement
        ?.querySelector?.(
          '[data-catalog-col="right"]'
        );

    if(
      !left||
      !right
    ){
      return 0;
    }

    const start=
      cursor;

    const end=
      Math.min(
        start+
          batchSize,
        catalogList.length
      );

    let leftHtml='';
    let rightHtml='';

    for(
      let index=start;
      index<end;
      index+=1
    ){
      const product=
        catalogList[index];

      const html=
        cardHtml(
          product,
          index,
          index===0
        );

      if(index===0){
        rightHtml+=html;
      }else if(
        (index-1)%2===
        0
      ){
        leftHtml+=html;
      }else{
        rightHtml+=html;
      }
    }

    if(leftHtml){
      left.insertAdjacentHTML?.(
        'beforeend',
        leftHtml
      );
    }

    if(rightHtml){
      right.insertAdjacentHTML?.(
        'beforeend',
        rightHtml
      );
    }

    cursor=end;

    afterAppendBatch({
      grid:gridElement,
      start,
      end
    });

    return end-start;
  }

  function ensureScrollable(
    token=renderToken
  ){
    if(
      token!==renderToken||
      cursor>=
        catalogList.length||
      !contentElement
    ){
      return;
    }

    if(
      contentElement.scrollHeight<=
      contentElement.clientHeight+
        80
    ){
      scheduleBatch();
    }
  }

  function scheduleBatch(){
    if(
      loading||
      cursor>=
        catalogList.length
    ){
      return false;
    }

    loading=true;

    const token=
      renderToken;

    const run=()=>{
      batchTimer=null;

      if(
        token===
        renderToken
      ){
        appendBatch(
          token
        );
      }

      loading=false;

      if(
        contentElement&&
        cursor<
          catalogList.length&&
        (
          contentElement.scrollHeight-
          contentElement.scrollTop-
          contentElement.clientHeight
        )<
          280
      ){
        batchTimer=
          root.setTimeout(
            scheduleBatch,
            80
          );
      }
    };

    if(
      typeof root
        .requestIdleCallback===
      'function'
    ){
      batchTimer=
        root.requestIdleCallback(
          run,
          {
            timeout:180
          }
        );
    }else{
      batchTimer=
        root.setTimeout(
          run,
          40
        );
    }

    return true;
  }

  function maybeLoadMore(){
    if(
      cursor>=
        catalogList.length||
      !contentElement
    ){
      return false;
    }

    if(
      (
        contentElement.scrollHeight-
        contentElement.scrollTop-
        contentElement.clientHeight
      )<
        520
    ){
      return scheduleBatch();
    }

    return false;
  }

  function render(
    viewModel
  ){
    ensureReady();

    const view=
      viewModel||
      {};

    cancel();

    const token=
      renderToken;

    catalogList=
      Array.isArray(
        view.products
      )
        ? [
            ...view.products
          ]
        : [];

    cursor=0;

    const displayCount=
      Number.isFinite(
        Number(
          view.displayCount
        )
      )
        ? Number(
            view.displayCount
          )
        : catalogList.length;

    const activeSeries=
      String(
        view.activeSeries||
        ''
      );

    seriesCountElement.innerHTML=
      `<span>${seriesLabel(activeSeries)}</span><span>${text('total')} ${displayCount} ${text('models')}</span>`;

    gridElement.innerHTML=
      `<div class="catalog-col left" data-catalog-col="left"><div class="series-count-card"><div class="series-kicker">${text('discover')}</div><div class="series-highlight"><span class="series-number">${displayCount}</span><span class="series-word">${text('dreams')}</span></div></div></div><div class="catalog-col right" data-catalog-col="right"></div>`;

    contentElement.scrollTop=0;

    appendBatch(
      token
    );

    frame(
      ()=>ensureScrollable(
        token
      )
    );

    return Object.freeze({
      activeSeries,
      displayCount,
      rendered:
        Math.min(
          cursor,
          catalogList.length
        )
    });
  }

  root.DreamlandCatalogRenderer=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      renderTabs,
      render,
      cancel,
      maybeLoadMore,
      ensureScrollable
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
