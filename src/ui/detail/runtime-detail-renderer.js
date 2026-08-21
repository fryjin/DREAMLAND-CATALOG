(function(root){
  'use strict';

  if(root.DreamlandDetailRenderer){
    return;
  }

  const VERSION='B6-04';

  let configCard=null;
  let boundCard=null;

  let text=
    key=>
      String(
        key||
        ''
      );

  let language=
    ()=>'zh';

  let choiceLabel=
    value=>
      String(
        value??
        ''
      );

  let seriesLabel=
    value=>
      String(
        value??
        ''
      );

  let scentDisplayText=
    value=>{
      if(
        value&&
        typeof value==='object'
      ){
        return (
          value.en||
          value.zh||
          ''
        );
      }

      return String(
        value??
        ''
      );
    };

  let sizeDimensions=
    ()=> '';

  let previewData=
    ()=>null;

  let currentPackNotice=
    ()=> '';

  let money=
    value=>
      String(
        value??
        ''
      );

  let qtyUnit=
    ()=>'';

  let htmlAttr=
    value=>
      String(
        value??
        ''
      );

  let afterRender=
    ()=>{};

  let actions={
    selectOption:null,
    selectScent:null,
    setQuantity:null,
    adjustQuantity:null,
    openTier:null,
    openScentNotes:null,
    openPreview:null
  };

  function functionOr(
    value,
    fallback
  ){
    return typeof value==='function'
      ? value
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

  function safeText(
    value
  ){
    return String(
      value??
      ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#39;'
      );
  }

  function attr(
    value
  ){
    return htmlAttr(
      value
    );
  }

  function ready(){
    return Boolean(
      configCard&&
      typeof text==='function'&&
      typeof language==='function'&&
      typeof choiceLabel==='function'&&
      typeof seriesLabel==='function'&&
      typeof scentDisplayText==='function'&&
      typeof sizeDimensions==='function'&&
      typeof previewData==='function'&&
      typeof currentPackNotice==='function'&&
      typeof money==='function'&&
      typeof qtyUnit==='function'&&
      typeof htmlAttr==='function'&&
      typeof afterRender==='function'
    );
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      ready:ready(),
      bound:
        boundCard===
        configCard
    });
  }

  function unbind(){
    boundCard
      ?.removeEventListener?.(
        'click',
        onClick
      );

    boundCard
      ?.removeEventListener?.(
        'change',
        onChange
      );

    boundCard
      ?.removeEventListener?.(
        'wheel',
        onWheel
      );

    boundCard=null;
  }

  function bind(){
    if(
      !configCard||
      boundCard===
        configCard
    ){
      return;
    }

    unbind();

    configCard
      .addEventListener?.(
        'click',
        onClick
      );

    configCard
      .addEventListener?.(
        'change',
        onChange
      );

    configCard
      .addEventListener?.(
        'wheel',
        onWheel,
        {
          passive:false
        }
      );

    boundCard=
      configCard;
  }

  function configure(
    options={}
  ){
    const nextCard=
      options.configCard||
      configCard;

    if(
      nextCard!==
      configCard
    ){
      unbind();
    }

    configCard=
      nextCard;

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

    choiceLabel=
      functionOr(
        options.choiceLabel,
        choiceLabel
      );

    seriesLabel=
      functionOr(
        options.seriesLabel,
        seriesLabel
      );

    scentDisplayText=
      functionOr(
        options.scentDisplayText,
        scentDisplayText
      );

    sizeDimensions=
      functionOr(
        options.sizeDimensions,
        sizeDimensions
      );

    previewData=
      functionOr(
        options.previewData,
        previewData
      );

    currentPackNotice=
      functionOr(
        options.currentPackNotice,
        currentPackNotice
      );

    money=
      functionOr(
        options.money,
        money
      );

    qtyUnit=
      functionOr(
        options.qtyUnit,
        qtyUnit
      );

    htmlAttr=
      functionOr(
        options.htmlAttr,
        htmlAttr
      );

    afterRender=
      functionOr(
        options.afterRender,
        afterRender
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

    bind();

    return snapshot();
  }

  function ensureReady(){
    if(!ready()){
      throw new Error(
        'DreamlandDetailRenderer must be configured before rendering.'
      );
    }
  }

  function captureScrollState(){
    if(!configCard){
      return [];
    }

    return [
      ...configCard
        .querySelectorAll?.(
          '[data-config-key] .option-grid-scroll'
        )||
      []
    ]
      .map(
        scroller=>{
          const block=
            scroller
              .closest?.(
                '[data-config-key]'
              );

          if(!block){
            return null;
          }

          return {
            key:
              block.dataset
                ?.configKey||
              '',
            left:
              Number(
                scroller
                  .scrollLeft||
                0
              )
          };
        }
      )
      .filter(Boolean);
  }

  function restoreScrollState(
    scrollState
  ){
    const states=
      Array.isArray(
        scrollState
      )
        ? scrollState
        : scrollState
          ? [scrollState]
          : [];

    for(const state of states){
      if(
        !state||
        !state.key||
        !Number.isFinite(
          state.left
        )
      ){
        continue;
      }

      const scroller=
        configCard
          ?.querySelector?.(
            `[data-config-key="${attr(state.key)}"] .option-grid-scroll`
          );

      if(!scroller){
        continue;
      }

      if(
        typeof scroller
          .scrollTo===
        'function'
      ){
        scroller.scrollTo({
          left:state.left,
          behavior:'auto'
        });
      }else{
        scroller.scrollLeft=
          state.left;
      }
    }
  }

  function scrollActiveOptionsIntoView(){
    configCard
      ?.querySelectorAll?.(
        '[data-config-key] .option-grid-scroll'
      )
      ?.forEach?.(
        scroller=>{
          const active=
            scroller
              .querySelector?.(
                '.option.active'
              );

          if(!active){
            return;
          }

          const scrollerLeft=
            Number(
              scroller.scrollLeft||
              0
            );

          const scrollerRight=
            scrollerLeft+
            Number(
              scroller.clientWidth||
              0
            );

          const optionLeft=
            Number(
              active.offsetLeft||
              0
            );

          const optionRight=
            optionLeft+
            Number(
              active.offsetWidth||
              0
            );

          if(
            optionLeft<
              scrollerLeft||
            optionRight>
              scrollerRight
          ){
            scroller.scrollLeft=
              Math.max(
                0,
                optionLeft-12
              );
          }
        }
      );
  }

  function centerSelectedOption(
    key,
    behavior='smooth'
  ){
    if(
      !configCard||
      !key
    ){
      return;
    }

    const scroller=
      configCard
        .querySelector?.(
          `[data-config-key="${attr(key)}"] .option-grid-scroll`
        );

    const active=
      scroller
        ?.querySelector?.(
          '.option.active'
        );

    if(
      !scroller||
      !active
    ){
      return;
    }

    const targetLeft=
      Number(
        active.offsetLeft||
        0
      )-
      (
        Number(
          scroller.clientWidth||
          0
        )-
        Number(
          active.offsetWidth||
          0
        )
      )/2;

    const maxLeft=
      Math.max(
        0,
        Number(
          scroller.scrollWidth||
          0
        )-
        Number(
          scroller.clientWidth||
          0
        )
      );

    const nextLeft=
      Math.max(
        0,
        Math.min(
          maxLeft,
          targetLeft
        )
      );

    if(
      typeof scroller
        .scrollTo===
      'function'
    ){
      scroller.scrollTo({
        left:nextLeft,
        behavior
      });
    }else{
      scroller.scrollLeft=
        nextLeft;
    }
  }

  function onWheel(
    event
  ){
    const scroller=
      event?.target
        ?.closest?.(
          '.option-grid-scroll'
        );

    if(
      !scroller||
      !configCard
        ?.contains?.(
          scroller
        )||
      Number(
        scroller.scrollWidth||
        0
      )<=
      Number(
        scroller.clientWidth||
        0
      )
    ){
      return;
    }

    const deltaX=
      Number(
        event.deltaX||
        0
      );

    const deltaY=
      Number(
        event.deltaY||
        0
      );

    const movement=
      Math.abs(deltaX)>=
      Math.abs(deltaY)
        ? deltaX
        : deltaY;

    if(!movement){
      return;
    }

    scroller.scrollLeft=
      Number(
        scroller.scrollLeft||
        0
      )+
      movement;

    event.preventDefault?.();
  }

  function onClick(
    event
  ){
    const target=
      event?.target
        ?.closest?.(
          '[data-detail-action]'
        );

    if(
      !target||
      !configCard
        ?.contains?.(
          target
        )
    ){
      return;
    }

    const action=
      target.dataset
        ?.detailAction||
      '';

    if(
      action==='select-option'&&
      typeof actions.selectOption===
        'function'
    ){
      actions.selectOption(
        target.dataset
          ?.configKey||
        '',
        target.dataset
          ?.configValue||
        '',
        captureScrollState()
      );

      return;
    }

    if(
      action==='select-scent'&&
      typeof actions.selectScent===
        'function'
    ){
      actions.selectScent(
        target.dataset
          ?.scentId||
        '',
        captureScrollState()
      );

      return;
    }

    if(
      action==='adjust-quantity'&&
      typeof actions.adjustQuantity===
        'function'
    ){
      actions.adjustQuantity(
        Number(
          target.dataset
            ?.detailDelta||
          0
        ),
        captureScrollState()
      );

      return;
    }

    if(
      action==='open-tier'&&
      typeof actions.openTier===
        'function'
    ){
      actions.openTier();
      return;
    }

    if(
      action==='open-scent-notes'&&
      typeof actions.openScentNotes===
        'function'
    ){
      actions.openScentNotes();
      return;
    }

    if(
      action==='open-preview'&&
      typeof actions.openPreview===
        'function'
    ){
      actions.openPreview(
        target
      );
    }
  }

  function onChange(
    event
  ){
    const input=
      event?.target
        ?.closest?.(
          '[data-detail-quantity]'
        );

    if(
      !input||
      !configCard
        ?.contains?.(
          input
        )||
      typeof actions.setQuantity!==
        'function'
    ){
      return;
    }

    actions.setQuantity(
      input.value,
      captureScrollState()
    );
  }

  function optionLabel(
    key,
    value
  ){
    return key==='scentSeries'
      ? seriesLabel(
          value
        )
      : choiceLabel(
          value
        );
  }

  function shouldScroll(
    key,
    options
  ){
    return (
      key!=='size'&&
      (
        options.length>3||
        language()!=='zh'||
        options.some(
          value=>
            String(
              optionLabel(
                key,
                value
              )
            ).length>=7
        )
      )
    );
  }

  function previewHtml(
    key,
    view
  ){
    const preview=
      previewData(
        key,
        view
      );

    if(!preview){
      return '';
    }

    return `
      <button
        class="option-thumb media-frame"
        type="button"
        data-detail-action="open-preview"
        data-shared-category="${attr(preview.category)}"
        data-shared-key="${attr(preview.lookupKey)}"
        data-shared-size="${attr(preview.size)}"
        data-fallback-src="${attr(preview.fallback)}"
        data-preview-label="${attr(preview.label)}"
      >
        <span
          class="media-skeleton"
          aria-hidden="true"
        ></span>

        <img
          data-shared-category="${attr(preview.category)}"
          data-shared-key="${attr(preview.lookupKey)}"
          data-shared-size="${attr(preview.size)}"
          data-fallback-src="${attr(preview.fallback)}"
          alt="${attr(preview.label)}"
          loading="lazy"
          decoding="async"
        >

        <span>${safeText(text('view'))}</span>
      </button>
    `;
  }

  function scentInfoHtml(){
    return `
      <div class="scent-link-row">
        <button
          type="button"
          data-detail-action="open-scent-notes"
        >
          ${safeText(text('scentNotes'))}
        </button>
      </div>
    `;
  }

  function optionBlock(
    title,
    key,
    options,
    hint,
    view
  ){
    const list=
      Array.isArray(options)
        ? options
        : [];

    const scroll=
      shouldScroll(
        key,
        list
      );

    const gridClass=
      scroll
        ? 'option-grid option-grid-scroll'
        : 'option-grid';

    const config=
      view?.config||
      {};

    const tip=
      key==='size'
        ? sizeDimensions(
            config.size
          )
        : hint;

    return `
      <div
        class="config-block"
        data-config-key="${attr(key)}"
      >
        <div class="config-title">
          <h3>${safeText(title)}</h3>

          <div class="title-side">
            <div class="tip-tools">
              <span>${safeText(tip)}</span>
            </div>
          </div>
        </div>

        <div class="config-choice-row">
          <div class="${gridClass}">
            ${list.map(value=>`
              <button
                type="button"
                class="option ${config[key]===value?'active':''}"
                data-detail-action="select-option"
                data-config-key="${attr(key)}"
                data-config-value="${attr(value)}"
              >
                ${safeText(
                  optionLabel(
                    key,
                    value
                  )
                )}
              </button>
            `).join('')}
          </div>

          ${previewHtml(
            key,
            view
          )}
        </div>
      </div>
    `;
  }

  function scentBlock(
    view
  ){
    const scents=
      Array.isArray(
        view?.options?.scents
      )
        ? view.options.scents
        : [];

    const config=
      view?.config||
      {};

    return `
      <div
        class="config-block"
        data-config-key="scent"
      >
        <div class="config-title">
          <h3>${safeText(text('scent'))}</h3>

          <div class="title-side">
            <div class="tip-tools">
              <span>
                ${scents.length}
                ${safeText(text('scentHint'))}
              </span>
            </div>
          </div>
        </div>

        <div class="config-choice-row">
          <div class="option-grid option-grid-scroll">
            ${scents.map(scent=>{
              const id=
                String(
                  scent?.id||
                  ''
                );

              const name=
                scentDisplayText(
                  scent?.name
                );

              return `
                <button
                  class="option ${config.scentId===id?'active':''}"
                  type="button"
                  data-detail-action="select-scent"
                  data-scent-id="${attr(id)}"
                >
                  ${safeText(name)}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        ${scentInfoHtml()}
      </div>
    `;
  }

  function quantityBlock(
    view
  ){
    const pricing=
      view?.pricing||
      {};

    const config=
      view?.config||
      {};

    const limits=
      view?.limits||
      {};

    return `
      <div class="config-block">
        <div class="config-title">
          <h3>${safeText(text('quantity'))}</h3>

          <button
            class="tier-title-link"
            type="button"
            data-detail-action="open-tier"
          >
            ${safeText(text('viewTierPrice'))}
          </button>
        </div>

        <div class="qty-bar">
          <div>
            <div class="summary-label">
              ${safeText(text('currentUnitPrice'))}
            </div>

            <div class="amount">
              ${safeText(
                money(
                  pricing.unitPrice||
                  0
                )
              )}
            </div>

            <div class="pack-note">
              ${safeText(
                currentPackNotice(
                  view
                )
              )}
            </div>
          </div>

          <div class="qty-stepper">
            <button
              class="step"
              type="button"
              data-detail-action="adjust-quantity"
              data-detail-delta="-${attr(limits.qtyStep||1)}"
            >
              −
            </button>

            <input
              class="qty qty-input"
              id="detailQty"
              type="number"
              min="${attr(limits.qtyMin||1)}"
              max="${attr(limits.qtyMax||1000000)}"
              step="${attr(limits.qtyStep||1)}"
              value="${attr(config.qty||limits.qtyMin||1)}"
              inputmode="numeric"
              data-detail-quantity="1"
            >

            <button
              class="step"
              type="button"
              data-detail-action="adjust-quantity"
              data-detail-delta="${attr(limits.qtyStep||1)}"
            >
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function render(
    viewModel,
    options={}
  ){
    ensureReady();

    const view=
      viewModel||
      {};

    if(view.empty){
      configCard.innerHTML='';
      return Object.freeze({
        empty:true
      });
    }

    const config=
      view.config||
      {};

    const detailOptions=
      view.options||
      {};

    const blocks=[];

    blocks.push(
      optionBlock(
        text('size'),
        'size',
        detailOptions.sizes||
          [],
        `${text('currentSizeMoq')} ${view.pricing?.moq||1}`,
        view
      )
    );

    if(
      Array.isArray(
        detailOptions.scentSeries
      )&&
      detailOptions.scentSeries.length
    ){
      blocks.push(
        optionBlock(
          text('scentSeries'),
          'scentSeries',
          detailOptions.scentSeries,
          text('scentSeriesHint'),
          view
        )
      );
    }

    blocks.push(
      scentBlock(
        view
      )
    );

    blocks.push(
      optionBlock(
        text('pattern'),
        'pattern',
        detailOptions.patterns||
          [],
        text('patternHint'),
        view
      )
    );

    blocks.push(
      optionBlock(
        text('pack'),
        'pack',
        detailOptions.packs||
          [],
        '',
        view
      )
    );

    blocks.push(
      quantityBlock(
        view
      )
    );

    configCard.innerHTML=
      blocks.join('');

    const scrollState=
      options.scrollState||
      null;

    const focusKey=
      String(
        options.focusKey||
        ''
      );

    frame(()=>{
      afterRender({
        root:configCard,
        view
      });

      const hasScrollState=
        Array.isArray(
          scrollState
        )
          ? scrollState.length>0
          : Boolean(
              scrollState
            );

      restoreScrollState(
        scrollState
      );

      if(focusKey){
        frame(()=>{
          centerSelectedOption(
            focusKey,
            'smooth'
          );
        });
      }else if(!hasScrollState){
        scrollActiveOptionsIntoView();
      }
    });

    return Object.freeze({
      empty:false,
      productId:
        view.product?.id||
        '',
      size:
        config.size||
        '',
      quantity:
        config.qty||
        0
    });
  }

  root.DreamlandDetailRenderer=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      render,
      captureScrollState
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
