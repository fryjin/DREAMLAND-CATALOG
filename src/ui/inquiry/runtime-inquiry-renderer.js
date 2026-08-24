(function(root){
  'use strict';

  if(root.DreamlandInquiryRenderer){
    return;
  }

  const VERSION='B5-04';

  let listElement=null;
  let summaryElement=null;
  let boundList=null;

  let quantityMin=1;
  let quantityStep=1;

  let text=
    key=>
      String(key||'');

  let seriesLabel=
    key=>
      String(key||'');

  let choiceLabel=
    value=>
      String(value||'');

  let qtyUnit=
    ()=>'';

  let htmlAttr=
    value=>
      String(value??'');

  let money=
    value=>
      String(value??'');

  let currencyUnit=
    ()=>'';

  let itemScentLabel=
    item=>
      String(
        item?.scent||
        ''
      );

  let productDisplayName=
    item=>
      String(
        item?.name||
        item?.id||
        ''
      );

  let maximumQuantity=
    ()=>1000000;

  let actions={
    go:null,
    removeItem:null,
    adjustQuantity:null,
    setQuantity:null,
    editItem:null,
    openTier:null
  };

  function functionOr(
    value,
    fallback
  ){
    return typeof value==='function'
      ? value
      : fallback;
  }

  function number(
    value,
    fallback=0
  ){
    const parsed=
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function ready(){
    return Boolean(
      listElement&&
      summaryElement&&
      typeof text==='function'&&
      typeof seriesLabel==='function'&&
      typeof choiceLabel==='function'&&
      typeof qtyUnit==='function'&&
      typeof htmlAttr==='function'&&
      typeof money==='function'&&
      typeof currencyUnit==='function'&&
      typeof itemScentLabel==='function'&&
      typeof productDisplayName==='function'&&
      typeof maximumQuantity==='function'
    );
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      ready:ready(),
      bound:
        boundList===
        listElement,
      quantityMin,
      quantityStep
    });
  }

  function unbindEvents(){
    if(!boundList){
      return;
    }

    boundList.removeEventListener?.(
      'click',
      onClick
    );

    boundList.removeEventListener?.(
      'change',
      onChange
    );

    boundList.removeEventListener?.(
      'keydown',
      onKeyDown
    );

    boundList=null;
  }

  function bindEvents(){
    if(
      !listElement||
      boundList===
      listElement
    ){
      return;
    }

    unbindEvents();

    listElement.addEventListener?.(
      'click',
      onClick
    );

    listElement.addEventListener?.(
      'change',
      onChange
    );

    listElement.addEventListener?.(
      'keydown',
      onKeyDown
    );

    boundList=
      listElement;
  }

  function configure(
    options={}
  ){
    if(
      options.list&&
      options.list!==
      listElement
    ){
      unbindEvents();
      listElement=
        options.list;
    }

    if(options.summary){
      summaryElement=
        options.summary;
    }

    text=
      functionOr(
        options.text,
        text
      );

    seriesLabel=
      functionOr(
        options.seriesLabel,
        seriesLabel
      );

    choiceLabel=
      functionOr(
        options.choiceLabel,
        choiceLabel
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

    money=
      functionOr(
        options.money,
        money
      );

    currencyUnit=
      functionOr(
        options.currencyUnit,
        currencyUnit
      );

    itemScentLabel=
      functionOr(
        options.itemScentLabel,
        itemScentLabel
      );

    productDisplayName=
      functionOr(
        options.productDisplayName,
        productDisplayName
      );

    maximumQuantity=
      functionOr(
        options.maximumQuantity,
        maximumQuantity
      );

    quantityMin=
      Math.max(
        1,
        Math.trunc(
          number(
            options.quantityMin,
            quantityMin
          )
        )
      );

    quantityStep=
      Math.max(
        1,
        Math.trunc(
          number(
            options.quantityStep,
            quantityStep
          )
        )
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
        'DreamlandInquiryRenderer must be configured before rendering.'
      );
    }
  }

  function actionTarget(
    event
  ){
    const target=
      event?.target
        ?.closest?.(
          '[data-inquiry-action]'
        );

    if(
      !target||
      !listElement
        ?.contains?.(
          target
        )
    ){
      return null;
    }

    return target;
  }

  function onClick(
    event
  ){
    const target=
      actionTarget(
        event
      );

    if(!target){
      return;
    }

    const action=
      target.dataset
        ?.inquiryAction||
      '';

    const itemId=
      target.dataset
        ?.itemId||
      '';

    if(
      action==='go'&&
      typeof actions.go===
      'function'
    ){
      actions.go(
        target.dataset
          ?.screen||
        ''
      );

      return;
    }

    if(
      action==='delete'&&
      typeof actions.removeItem===
      'function'
    ){
      actions.removeItem(
        itemId
      );

      return;
    }

    if(
      action==='adjust-quantity'&&
      typeof actions.adjustQuantity===
      'function'
    ){
      actions.adjustQuantity(
        itemId,
        number(
          target.dataset
            ?.delta,
          0
        )
      );

      return;
    }

    if(
      action==='edit-item'&&
      typeof actions.editItem===
      'function'
    ){
      actions.editItem(
        itemId
      );

      return;
    }

    if(
      action==='open-tier'&&
      typeof actions.openTier===
      'function'
    ){
      actions.openTier(
        itemId
      );
    }
  }

  function quantityInput(
    target
  ){
    return Boolean(
      target
        ?.matches?.(
          '[data-inquiry-qty-input]'
        )
    );
  }

  function onChange(
    event
  ){
    const target=
      event?.target;

    if(
      !quantityInput(
        target
      )||
      !listElement
        ?.contains?.(
          target
        )||
      typeof actions.setQuantity!==
      'function'
    ){
      return;
    }

    actions.setQuantity(
      target.dataset
        ?.itemId||
      '',
      target.value
    );
  }

  function onKeyDown(
    event
  ){
    const target=
      event?.target;

    if(
      event?.key!==
      'Enter'||
      !quantityInput(
        target
      )
    ){
      return;
    }

    target.blur?.();
  }

  function attr(
    value
  ){
    return htmlAttr(
      value
    );
  }

  function renderCustomItem(
    item
  ){
    const title=
      `${text('customInquiry')} · ${choiceLabel(item.use)||text('notFilled')}`;

    const line1=
      `${item.qty||text('qtyPending')}${qtyUnit()} · ${choiceLabel(item.sizePref)||text('sizeRecommend')} · ${itemScentLabel(item)||text('scentRecommend')}`;

    const line2=
      `${item.color||text('colorPending')} · ${choiceLabel(item.pack)||text('packRecommend')}`;

    return `<div class="swipe-shell" data-id="${attr(item.id)}">
      <div class="swipe-card">
        <div class="inquiry-row">
          <div class="inquiry-media"><span class="custom-icon">✦</span></div>
          <div class="inquiry-main">
            <div class="inquiry-title">${title}</div>
            <div class="inquiry-attr">${line1}</div>
            <div class="inquiry-attr">${line2}</div>

            <div class="qty-line">
              <div class="inquiry-attr">
                ${text('quantity')}：${item.qty||text('toConfirm')} ${qtyUnit()}
              </div>
            </div>
          </div>

          <div class="inquiry-side">
            <button
              class="delete-action"
              type="button"
              aria-label="删除"
              data-inquiry-action="delete"
              data-item-id="${attr(item.id)}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6"/><path d="M5 7h14"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
            </button>

            <div class="price-stack">
              <div class="price-unit">
                ${item.budget||text('budgetPending')}
              </div>

              <div class="price-total">
                ${text('quotePending')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderProductItem(
    item
  ){
    const media=
      item.cover
        ? `<img src="${attr(item.cover)}" alt="${attr(item.name||'')}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="product-img ${attr(item.color||'color-1')}" style="display:none"></div>`
        : `<div class="product-img ${attr(item.color||'color-1')}"></div>`;

    const line1=
      `${
        seriesLabel(item.series)||
        item.series||
        text('toConfirm')
      } · ${
        item.size||
        item.sizeCode||
        text('toConfirm')
      } · ${
        itemScentLabel(item)
      }`;

    const line2=
      `${choiceLabel(item.pattern)||text('toConfirm')} · ${choiceLabel(item.pack)||text('toConfirm')}`;

    return `<div class="swipe-shell" data-id="${attr(item.id)}">
      <div class="swipe-card">
        <div class="inquiry-row">
          <div class="inquiry-media">${media}</div>

          <div class="inquiry-main">
            <div class="inquiry-title">
              ${productDisplayName(item)||text('notFilled')}
            </div>

            <div class="inquiry-attr">${line1}</div>
            <div class="inquiry-attr">${line2}</div>

            <div class="qty-line">
              <div class="mini-stepper">
                <button
                  class="step"
                  type="button"
                  data-inquiry-action="adjust-quantity"
                  data-item-id="${attr(item.id)}"
                  data-delta="${-quantityStep}"
                >−</button>

                <input
                  class="qty-edit"
                  type="number"
                  min="${quantityMin}"
                  max="${attr(maximumQuantity())}"
                  step="${quantityStep}"
                  value="${attr(item.qty)}"
                  inputmode="numeric"
                  data-inquiry-qty-input
                  data-item-id="${attr(item.id)}"
                >

                <button
                  class="step"
                  type="button"
                  data-inquiry-action="adjust-quantity"
                  data-item-id="${attr(item.id)}"
                  data-delta="${quantityStep}"
                >+</button>
              </div>
            </div>
          </div>

          <div class="inquiry-side">
            <button
              class="delete-action"
              type="button"
              aria-label="删除"
              data-inquiry-action="delete"
              data-item-id="${attr(item.id)}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6"/><path d="M5 7h14"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
            </button>

            <div class="price-stack">
              <div class="price-unit">
                ${money(item.unitPrice)}${currencyUnit()}
              </div>

              <div class="price-total">
                ${money(item.subtotal)}
              </div>

              <div class="item-actions item-actions-side">
                <button
                  class="item-action"
                  type="button"
                  data-inquiry-action="edit-item"
                  data-item-id="${attr(item.id)}"
                >
                  ${text('editConfig')}
                </button>

                <button
                  class="item-action"
                  type="button"
                  data-inquiry-action="open-tier"
                  data-item-id="${attr(item.id)}"
                >
                  ${text('tierShort')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderItem(
    item
  ){
    return item?.type==='custom'
      ? renderCustomItem(
          item
        )
      : renderProductItem(
          item
        );
  }

  function renderEmpty(){
    listElement.innerHTML=`
      <div class="empty">
        <div class="empty-icon">◒</div>

        <h3>${text('emptyTitle')}</h3>

        <p style="margin-top:8px;font-size:12px;line-height:1.5">
          ${text('emptyText')}
        </p>

        <div
          class="btn-row"
          style="margin-top:20px;width:100%"
        >
          <button
            class="btn btn-primary full"
            type="button"
            data-inquiry-action="go"
            data-screen="catalog"
          >
            ${text('goProducts')}
          </button>

          <button
            class="btn btn-secondary full"
            type="button"
            data-inquiry-action="go"
            data-screen="custom"
          >
            ${text('makeCustom')}
          </button>
        </div>
      </div>
    `;

    summaryElement.innerHTML='';
  }

  function renderGroups(
    groups
  ){
    listElement.innerHTML=
      groups
        .map(group=>{
          const title=
            group.type==='custom'
              ? text('customInquiry')
              : seriesLabel(
                  group.key
                );

          const countText=
            group.type==='custom'
              ? `${group.itemCount} ${text('records')}`
              : `${group.quantity} ${qtyUnit()}`;

          return `
            <div
              class="group-title"
              data-group-key="${attr(group.key)}"
            >
              <span>${title}</span>

              <span data-group-total>
                ${countText}
              </span>
            </div>

            ${group.items.map(renderItem).join('')}
          `;
        })
        .join('');
  }

  function renderSummary(
    summary
  ){
    summaryElement.innerHTML=`
      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">
            ${text('inquiryContent')}
          </span>

          <span
            class="summary-value"
            id="inquiryItemCount"
          >
            ${summary.itemCount} ${text('items')}
          </span>
        </div>

        <div class="summary-row">
          <span class="summary-label">
            ${text('tierPrice')}
          </span>

          <span class="summary-value">
            ${text('tierRule')}
          </span>
        </div>

        <div class="summary-row">
          <span class="summary-label">
            ${text('productEstimate')}
          </span>

          <span
            class="amount"
            id="inquiryEstimateTotal"
          >
            ${money(
              summary.estimatedTotal
            )}
          </span>
        </div>

        <p class="note">
          ${text('summaryNote')}
        </p>
      </div>
    `;
  }

  function render(
    viewModel
  ){
    ensureReady();

    if(
      !viewModel||
      !Array.isArray(
        viewModel.items
      )||
      !Array.isArray(
        viewModel.groups
      )||
      !viewModel.summary
    ){
      throw new Error(
        'DreamlandInquiryRenderer requires a valid Inquiry View Model.'
      );
    }

    if(viewModel.empty){
      renderEmpty();

      return Object.freeze({
        empty:true,
        itemCount:0
      });
    }

    renderGroups(
      viewModel.groups
    );

    renderSummary(
      viewModel.summary
    );

    return Object.freeze({
      empty:false,
      itemCount:
        viewModel.summary
          .itemCount
    });
  }

  function itemShell(
    itemId
  ){
    const target=
      String(
        itemId||
        ''
      );

    return Array.from(
      listElement
        ?.querySelectorAll?.(
          '.swipe-shell[data-id]'
        )||
      []
    ).find(
      shell=>
        String(
          shell.dataset
            ?.id||
          ''
        )===
        target
    )||null;
  }

  function update(
    viewModel
  ){
    ensureReady();

    if(
      !viewModel||
      !Array.isArray(
        viewModel.items
      )||
      !Array.isArray(
        viewModel.groups
      )||
      !viewModel.summary
    ){
      throw new Error(
        'DreamlandInquiryRenderer requires a valid Inquiry View Model.'
      );
    }

    viewModel.items.forEach(
      item=>{
        if(item.type!=='product'){
          return;
        }

        const shell=
          itemShell(
            item.id
          );

        if(!shell){
          return;
        }

        const qtyInput=
          shell.querySelector?.(
            '.qty-edit'
          );

        const unitPrice=
          shell.querySelector?.(
            '.price-unit'
          );

        const subtotal=
          shell.querySelector?.(
            '.price-total'
          );

        if(qtyInput){
          qtyInput.value=
            item.normalizedQty;
        }

        if(unitPrice){
          unitPrice.textContent=
            `${money(
              item.unitPrice
            )}${currencyUnit()}`;
        }

        if(subtotal){
          subtotal.textContent=
            money(
              item.subtotal
            );
        }
      }
    );

    const groupsByKey=
      new Map(
        viewModel.groups.map(
          group=>[
            String(
              group.key||
              ''
            ),
            group
          ]
        )
      );

    Array.from(
      listElement
        ?.querySelectorAll?.(
          '.group-title[data-group-key]'
        )||
      []
    ).forEach(
      groupElement=>{
        const key=
          String(
            groupElement
              .dataset
              ?.groupKey||
            ''
          );

        const group=
          groupsByKey.get(
            key
          );

        const totalElement=
          groupElement.querySelector?.(
            '[data-group-total]'
          );

        if(
          !group||
          !totalElement
        ){
          return;
        }

        totalElement.textContent=
          group.type==='custom'
            ? `${group.itemCount} ${text('records')}`
            : `${group.quantity} ${qtyUnit()}`;
      }
    );

    const itemCount=
      summaryElement.querySelector?.(
        '#inquiryItemCount'
      );

    if(itemCount){
      itemCount.textContent=
        `${viewModel.summary.itemCount} ${text('items')}`;
    }

    const estimateTotal=
      summaryElement.querySelector?.(
        '#inquiryEstimateTotal'
      );

    if(estimateTotal){
      estimateTotal.textContent=
        money(
          viewModel.summary
            .estimatedTotal
        );
    }

    return true;
  }

  root.DreamlandInquiryRenderer=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      render,
      update
    });
})(
  typeof window!=='undefined'
    ? window
    : globalThis
);
