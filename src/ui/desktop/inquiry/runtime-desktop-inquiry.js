(function(root){
  'use strict';

  if(root.DreamlandDesktopInquiry){
    return;
  }

  const VERSION='B7-00B.3D';

  let config=null;
  let inquiryRoot=null;
  let mounted=false;
  let dialog=null;

  function text(value){
    return String(value??'').trim();
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function copy(){
    return config?.content?.()?.inquiryFlow||{};
  }

  function view(){
    return config?.viewModel?.()||{
      empty:true,
      items:[],
      summary:{
        itemCount:0,
        productCount:0,
        customCount:0,
        productQuantity:0,
        estimatedTotal:0
      }
    };
  }

  function money(value){
    return text(config?.money?.(Number(value)||0)||value);
  }

  function qtyUnit(){
    return text(config?.qtyUnit?.()||'pcs');
  }

  function choice(value){
    return text(config?.choiceLabel?.(value)||value);
  }

  function series(value){
    return text(config?.seriesLabel?.(value)||value);
  }

  function productName(item){
    return text(
      config?.productName?.(item)||
      item?.name||
      item?.productId||
      item?.id
    );
  }

  function itemScent(item){
    return text(config?.itemScentLabel?.(item)||item?.scent||'');
  }

  function itemMoq(item){
    return Math.max(
      1,
      Number(config?.itemMoq?.(item)||item?.moq||1)||1
    );
  }

  function progress(){
    const c=copy();
    const labels=[
      c.stepSelection||'Selection',
      c.stepContact||'Contact',
      c.stepReview||'Review'
    ];

    return `
      <div class="desktop-flow-progress" aria-label="${escapeHtml(c.progressLabel||'Inquiry progress')}">
        ${labels.map((label,index)=>`
          <span class="${index===0?'is-active':''}">
            <b>${String(index+1).padStart(2,'0')}</b>
            ${escapeHtml(label)}
          </span>
        `).join('')}
      </div>
    `;
  }

  function productConfig(item){
    const c=copy();
    const rows=[
      [c.size,item.size],
      [c.scent,itemScent(item)],
      [c.pattern,choice(item.pattern)],
      [c.packaging,choice(item.pack)]
    ].filter(row=>text(row[1]));

    return `
      <dl class="desktop-inquiry-config">
        ${rows.map(([label,value])=>`
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }

  function productRow(item){
    const c=copy();
    const quantity=Number(item.normalizedQty||item.qty||0)||0;

    return `
      <article class="desktop-inquiry-item" data-inquiry-id="${escapeHtml(item.id)}">
        <div class="desktop-inquiry-item__media">
          ${
            item.cover
              ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(productName(item))}" loading="lazy" decoding="async">`
              : `<span aria-hidden="true"></span>`
          }
        </div>

        <div class="desktop-inquiry-item__body">
          <header class="desktop-inquiry-item__head">
            <div>
              <div class="desktop-eyebrow">${escapeHtml(series(item.series))}</div>
              <h2>${escapeHtml(productName(item))}</h2>
              <small>${escapeHtml(item.productId||'')}</small>
            </div>

            <button
              class="desktop-inquiry-remove"
              type="button"
              data-desktop-inquiry-action="remove"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(c.remove)}</button>
          </header>

          ${productConfig(item)}

          <div class="desktop-inquiry-item__commercial">
            <div class="desktop-inquiry-quantity">
              <button
                type="button"
                data-desktop-inquiry-action="delta"
                data-id="${escapeHtml(item.id)}"
                data-delta="-1"
                aria-label="-"
              >−</button>

              <input
                type="number"
                value="${escapeHtml(quantity)}"
                min="1"
                step="1"
                data-desktop-inquiry-qty="${escapeHtml(item.id)}"
                aria-label="${escapeHtml(c.quantity||'Quantity')}"
              >

              <button
                type="button"
                data-desktop-inquiry-action="delta"
                data-id="${escapeHtml(item.id)}"
                data-delta="1"
                aria-label="+"
              >+</button>
            </div>

            <div class="desktop-inquiry-moq">
              ${escapeHtml(c.moq||'MOQ')} ${escapeHtml(itemMoq(item))}
            </div>

            <div class="desktop-inquiry-price">
              <span>${escapeHtml(money(item.unitPrice))} / ${escapeHtml(qtyUnit())}</span>
              <strong>${escapeHtml(money(item.subtotal))}</strong>
            </div>
          </div>

          <button
            class="desktop-inquiry-edit"
            type="button"
            data-desktop-inquiry-action="edit"
            data-id="${escapeHtml(item.id)}"
          >
            ${escapeHtml(c.editConfiguration)}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </article>
    `;
  }

  function customRow(item){
    const c=copy();
    const scents=Array.isArray(item.scents)
      ? item.scents.join(' / ')
      : text(item.scent);

    const rows=[
      [c.useCase,choice(item.use)],
      [c.quantity,item.qty ? `${item.qty} ${qtyUnit()}` : ''],
      [c.size,choice(item.sizePref)],
      [c.fragranceCollection,series(item.scentSeries)],
      [c.scents,scents],
      [c.packaging,choice(item.pack)],
      [c.branding,choice(item.branding)]
    ].filter(row=>text(row[1]));

    return `
      <article class="desktop-inquiry-item desktop-inquiry-item--custom" data-inquiry-id="${escapeHtml(item.id)}">
        <div class="desktop-inquiry-custom-mark" aria-hidden="true">C</div>

        <div class="desktop-inquiry-item__body">
          <header class="desktop-inquiry-item__head">
            <div>
              <div class="desktop-eyebrow">${escapeHtml(c.customProject)}</div>
              <h2>${escapeHtml(choice(item.use)||c.customProject)}</h2>
            </div>

            <button
              class="desktop-inquiry-remove"
              type="button"
              data-desktop-inquiry-action="remove"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(c.remove)}</button>
          </header>

          <dl class="desktop-inquiry-config desktop-inquiry-config--custom">
            ${rows.map(([label,value])=>`
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `).join('')}
          </dl>

          <div class="desktop-inquiry-custom-quote">
            <span>${escapeHtml(c.pricing)}</span>
            <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
          </div>
        </div>
      </article>
    `;
  }

  function summaryHtml(data){
    const c=copy();
    const summary=data.summary||{};

    return `
      <aside class="desktop-inquiry-summary">
        <div class="desktop-eyebrow">${escapeHtml(c.summaryKicker)}</div>
        <h2>${escapeHtml(c.summaryTitle)}</h2>

        <div class="desktop-inquiry-summary__rows">
          <div>
            <span>${escapeHtml(c.selectedItems)}</span>
            <strong>${escapeHtml(summary.itemCount||0)}</strong>
          </div>
          <div>
            <span>${escapeHtml(c.totalQuantity)}</span>
            <strong>${escapeHtml(summary.productQuantity||0)} ${escapeHtml(qtyUnit())}</strong>
          </div>
          <div>
            <span>${escapeHtml(c.productEstimate)}</span>
            <strong>${escapeHtml(money(summary.estimatedTotal||0))}</strong>
          </div>
          ${
            Number(summary.customCount||0)>0
              ? `<div>
                  <span>${escapeHtml(c.customProject)}</span>
                  <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
                </div>`
              : ''
          }
        </div>

        <p>${escapeHtml(c.finalPricingNote)}</p>

        <button
          class="desktop-flow-primary"
          type="button"
          data-desktop-inquiry-action="continue"
        >
          ${escapeHtml(c.continueContact)}
          <span aria-hidden="true">→</span>
        </button>

        <button
          class="desktop-flow-secondary"
          type="button"
          data-desktop-inquiry-action="explore"
        >${escapeHtml(c.continueExploring)}</button>
      </aside>
    `;
  }

  function dialogHtml(){
    if(!dialog){
      return '';
    }

    const c=copy();
    const clear=dialog.type==='clear';

    return `
      <div class="desktop-flow-dialog-layer" data-desktop-inquiry-dialog>
        <div class="desktop-flow-dialog" role="dialog" aria-modal="true">
          <h3>${escapeHtml(clear?c.clearTitle:c.removeTitle)}</h3>
          <p>${escapeHtml(clear?c.clearBody:c.removeBody)}</p>
          <div>
            <button
              class="desktop-flow-secondary"
              type="button"
              data-desktop-inquiry-action="dialog-cancel"
            >${escapeHtml(c.cancel)}</button>

            <button
              class="desktop-flow-danger"
              type="button"
              data-desktop-inquiry-action="dialog-confirm"
            >${escapeHtml(clear?c.clearAll:c.remove)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function emptyHtml(){
    const c=copy();

    return `
      <div class="desktop-flow-page desktop-inquiry-page">
        <div class="desktop-container">
          <div class="desktop-flow-empty">
            <div class="desktop-eyebrow">${escapeHtml(c.kicker)}</div>
            <h1>${escapeHtml(c.emptyTitle)}</h1>
            <p>${escapeHtml(c.emptyBody)}</p>
            <div>
              <button
                class="desktop-flow-primary"
                type="button"
                data-desktop-inquiry-action="explore"
              >${escapeHtml(c.exploreCollection)} <span aria-hidden="true">→</span></button>
              <button
                class="desktop-flow-secondary"
                type="button"
                data-desktop-inquiry-action="custom"
              >${escapeHtml(c.startCustom)}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function pageHtml(){
    const c=copy();
    const data=view();

    if(data.empty){
      return emptyHtml();
    }

    return `
      <div class="desktop-flow-page desktop-inquiry-page">
        <div class="desktop-container">
          <header class="desktop-flow-hero">
            <div class="desktop-eyebrow">${escapeHtml(c.kicker)}</div>
            <h1>${escapeHtml(c.title)}</h1>
            <p>${escapeHtml(c.body)}</p>
            ${progress()}
          </header>

          <div class="desktop-inquiry-layout">
            <section class="desktop-inquiry-list">
              <div class="desktop-inquiry-list__head">
                <div>
                  <span>${escapeHtml(c.selectedProducts)}</span>
                  <strong>${escapeHtml(data.summary?.itemCount||0)}</strong>
                </div>

                <button
                  class="desktop-inquiry-clear"
                  type="button"
                  data-desktop-inquiry-action="clear"
                >${escapeHtml(c.clearAll)}</button>
              </div>

              ${(data.items||[]).map(item=>
                item.type==='custom'
                  ? customRow(item)
                  : productRow(item)
              ).join('')}
            </section>

            ${summaryHtml(data)}
          </div>
        </div>

        ${dialogHtml()}
      </div>
    `;
  }

  function render(){
    if(!inquiryRoot){
      return false;
    }

    inquiryRoot.innerHTML=pageHtml();
    return true;
  }

  function syncAfterMutation(){
    dialog=null;
    config?.actions?.syncInquiry?.();
    render();
  }

  function onClick(event){
    const target=event.target.closest?.('[data-desktop-inquiry-action]');

    if(!target||!inquiryRoot?.contains(target)){
      return;
    }

    const action=target.dataset.desktopInquiryAction;
    const id=text(target.dataset.id);

    if(action==='delta'){
      config?.actions?.adjustQuantity?.(
        id,
        Number(target.dataset.delta)||0
      );
      syncAfterMutation();
      return;
    }

    if(action==='edit'){
      config?.actions?.edit?.(id);
      return;
    }

    if(action==='remove'){
      dialog={type:'remove',id};
      render();
      return;
    }

    if(action==='clear'){
      dialog={type:'clear'};
      render();
      return;
    }

    if(action==='dialog-cancel'){
      dialog=null;
      render();
      return;
    }

    if(action==='dialog-confirm'){
      if(dialog?.type==='remove'&&dialog.id){
        config?.actions?.remove?.(dialog.id);
      }

      if(dialog?.type==='clear'){
        config?.actions?.clear?.();
      }

      syncAfterMutation();
      return;
    }

    if(action==='continue'){
      const result=config?.actions?.continue?.();

      if(result?.ok===false){
        config?.actions?.feedback?.(
          result.message||
          copy().cannotContinue
        );
      }
      return;
    }

    if(action==='explore'){
      config?.actions?.explore?.();
      return;
    }

    if(action==='custom'){
      config?.actions?.custom?.();
    }
  }

  function onChange(event){
    const input=event.target.closest?.('[data-desktop-inquiry-qty]');

    if(!input||!inquiryRoot?.contains(input)){
      return;
    }

    config?.actions?.setQuantity?.(
      input.dataset.desktopInquiryQty,
      input.value
    );

    syncAfterMutation();
  }

  function onKeyDown(event){
    if(event.key==='Escape'&&dialog){
      dialog=null;
      render();
    }
  }

  function configure(options={}){
    config={
      content:typeof options.content==='function'?options.content:()=>({}),
      viewModel:typeof options.viewModel==='function'?options.viewModel:()=>({empty:true}),
      productName:options.productName,
      seriesLabel:options.seriesLabel,
      choiceLabel:options.choiceLabel,
      itemScentLabel:options.itemScentLabel,
      itemMoq:options.itemMoq,
      money:options.money,
      qtyUnit:options.qtyUnit,
      actions:options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    inquiryRoot=rootElement||inquiryRoot;

    if(!inquiryRoot){
      return false;
    }

    if(!mounted){
      inquiryRoot.addEventListener('click',onClick);
      inquiryRoot.addEventListener('change',onChange);
      inquiryRoot.addEventListener('keydown',onKeyDown);
      mounted=true;
    }

    render();
    return true;
  }

  function refresh(){
    return render();
  }

  function syncInquiry(){
    return render();
  }

  function snapshot(){
    const data=view();

    return Object.freeze({
      version:VERSION,
      configured:Boolean(config),
      mounted,
      itemCount:Number(data.summary?.itemCount||0)
    });
  }

  root.DreamlandDesktopInquiry=Object.freeze({
    version:VERSION,
    configure,
    mount,
    refresh,
    syncInquiry,
    snapshot
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
