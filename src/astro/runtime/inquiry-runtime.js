(function(root){
  'use strict';

  if(root.DreamlandInquiryRuntime){
    return;
  }

  const VERSION='R4.7B';
  const ID='DREAMLAND_R4_INQUIRY_RUNTIME_R4_7B';

  function number(value,fallback=0){
    const parsed=Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function supportedLanguage(
    value,
    state
  ){
    const language=
      text(value);

    return state?.languages?.[language]
      ? language
      : (
          state?.languages
            ?.[state.defaultLanguage]
            ? state.defaultLanguage
            : 'en'
        );
  }

  function inquiryCount(viewModel={}){
    return (
      number(
        viewModel.summary
          ?.productQuantity,
        0
      )+
      number(
        viewModel.summary
          ?.customCount,
        0
      )
    );
  }

  function parseState(
    documentRef
  ){
    const node=
      documentRef
        ?.getElementById(
          'inquiryRuntimeState'
        );

    if(!node){
      throw new Error(
        'Inquiry runtime state is missing.'
      );
    }

    const state=
      JSON.parse(
        node.textContent||
        '{}'
      );

    if(
      state.version!==
        VERSION||
      state.storage
        ?.languageKey!==
        'productManualLang'||
      state.storage
        ?.inquiryKey!==
        'productManualV2State'||
      state.storage
        ?.inquiryVersion!==
        2
    ){
      throw new Error(
        'Inquiry runtime state contract mismatch.'
      );
    }

    return state;
  }

  function localeView(
    state,
    language
  ){
    return (
      state.languages
        ?.[language]||
      state.languages
        ?.[state.defaultLanguage]||
      {}
    );
  }

  function pathValue(
    object,
    path
  ){
    return text(path)
      .split('.')
      .reduce(
        (
          value,
          key
        )=>
          value&&
          typeof value===
            'object'
            ? value[key]
            : undefined,
        object
      );
  }

  function productMap(state){
    return new Map(
      (
        state.products||
        []
      ).map(
        product=>[
          text(
            product.id
          )
            .toUpperCase(),
          product
        ]
      )
    );
  }

  function scentMap(state){
    return new Map(
      (
        state.scents||
        []
      ).map(
        scent=>[
          text(
            scent.id
          ),
          scent
        ]
      )
    );
  }

  function productName(
    item,
    language,
    products
  ){
    const id=
      text(
        item?.productId||
        item?.id
      )
        .toUpperCase();

    const product=
      products.get(id);

    return (
      product?.names
        ?.[language]||
      product?.names
        ?.en||
      product?.names
        ?.zh||
      item?.name||
      item?.productId||
      id
    );
  }

  function productCover(
    item,
    products
  ){
    const id=
      text(
        item?.productId
      )
        .toUpperCase();

    return (
      products
        .get(id)
        ?.cover||
      text(
        item?.cover
      )
    );
  }

  function seriesLabel(
    series,
    language,
    state
  ){
    return (
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.[language]||
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.en||
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.zh||
      text(series)
    );
  }

  function choiceLabel(
    value,
    locale
  ){
    const raw=
      text(value);

    return (
      locale.choices
        ?.[raw]||
      raw
    );
  }

  function scentLabel(
    item,
    language,
    scents
  ){
    const id=
      text(
        item?.scentId
      );

    const scent=
      id
        ? scents.get(id)
        : null;

    return (
      scent?.name
        ?.[language]||
      scent?.name
        ?.en||
      scent?.name
        ?.zh||
      text(
        item?.scent
      )
    );
  }

  function formatMoney(
    value,
    language,
    state,
    pricing
  ){
    return pricing.money(
      number(
        value,
        0
      ),
      language,
      state.currencyMap||
      {}
    );
  }

  function unitLabel(
    language,
    state,
    locale,
    pricing
  ){
    return (
      pricing.currencyUnit(
        language,
        state.currencyMap||
        {}
      )||
      locale.ui?.pieces||
      (
        language==='zh'
          ? '件'
          : language==='ko'
            ? '개'
            : 'pcs'
      )
    );
  }

  function itemMoq(
    item,
    state,
    pricing
  ){
    return pricing
      .moqForSeriesSize(
        item?.series,
        item?.size,
        state.seriesMeta||
        {}
      );
  }

  function configureInquiry(
    inquiry,
    pricing,
    state,
    storage
  ){
    return inquiry.configure({
      storage,
      storageKey:
        state.storage.inquiryKey,
      version:
        state.storage.inquiryVersion,
      normalizeQuantity:
        (
          value,
          min
        )=>
          pricing
            .normalizeQuantity(
              value,
              min,
              state.limits
                ?.maxQuantity||
              1000000
            ),
      pricingSeriesFor:
        item=>
          pricing
            .pricingSeriesFor(
              item,
              state.seriesMeta||
              {}
            ),
      tierUnitCny:
        (
          series,
          size,
          quantity
        )=>
          pricing
            .tierUnitCny(
              series,
              size,
              quantity,
              state.seriesMeta||
              {}
            ),
      packSurchargeCny:
        (
          series,
          pack
        )=>
          pricing
            .packSurchargeCny(
              series,
              pack,
              state.seriesMeta||
              {}
            ),
      convertCnyToBase:
        value=>
          pricing
            .cnyToBase(
              value,
              state.currencyMap||
              {}
            )
    });
  }

  function createElement(
    documentRef,
    tag,
    className=''
  ){
    const node=
      documentRef
        .createElement(
          tag
        );

    if(className){
      node.className=
        className;
    }

    return node;
  }

  function appendText(
    documentRef,
    parent,
    tag,
    className,
    value
  ){
    const node=
      createElement(
        documentRef,
        tag,
        className
      );

    node.textContent=
      text(value);

    parent.appendChild(
      node
    );

    return node;
  }

  function addChip(
    documentRef,
    container,
    value
  ){
    const label=
      text(value);

    if(!label){
      return;
    }

    appendText(
      documentRef,
      container,
      'span',
      'inquiry-item__chip',
      label
    );
  }

  function renderProduct(
    documentRef,
    item,
    context
  ){
    const {
      state,
      language,
      locale,
      products,
      scents,
      pricing
    }=context;

    const card=
      createElement(
        documentRef,
        'article',
        'inquiry-item inquiry-item--product'
      );

    card.dataset
      .inquiryItemId=
      text(item.id);

    const media=
      createElement(
        documentRef,
        'div',
        'inquiry-item__media'
      );

    const cover=
      productCover(
        item,
        products
      );

    if(cover){
      const image=
        createElement(
          documentRef,
          'img'
        );

      image.src=cover;
      image.alt=
        productName(
          item,
          language,
          products
        );
      image.loading='lazy';
      image.decoding='async';

      media.appendChild(
        image
      );
    }else{
      appendText(
        documentRef,
        media,
        'span',
        'inquiry-item__custom-mark',
        'D'
      );
    }

    const body=
      createElement(
        documentRef,
        'div',
        'inquiry-item__body'
      );

    appendText(
      documentRef,
      body,
      'p',
      'inquiry-item__kicker',
      [
        seriesLabel(
          item.series,
          language,
          state
        ),
        text(
          item.productId
        )
      ]
        .filter(Boolean)
        .join(' · ')
    );

    appendText(
      documentRef,
      body,
      'h3',
      'inquiry-item__title',
      productName(
        item,
        language,
        products
      )
    );

    const meta=
      createElement(
        documentRef,
        'div',
        'inquiry-item__meta'
      );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.size||
          'Size',
        text(
          item.size
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.scent||
          'Scent',
        scentLabel(
          item,
          language,
          scents
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.pattern||
          'Pattern',
        text(
          item.pattern
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.packaging||
          'Packaging',
        text(
          item.pack
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    body.appendChild(
      meta
    );

    const pricingRow=
      createElement(
        documentRef,
        'div',
        'inquiry-item__pricing'
      );

    const moq=
      itemMoq(
        item,
        state,
        pricing
      );

    const moqLabel=
      appendText(
        documentRef,
        pricingRow,
        'span',
        '',
        (
          locale.copy?.moq||
          locale.ui?.moq||
          'MOQ'
        )+
        ' '
    );

    appendText(
      documentRef,
      moqLabel,
      'strong',
      '',
      moq
    );

    const unit=
      appendText(
        documentRef,
        pricingRow,
        'span',
        '',
        (
          locale.ui?.currentUnitPrice||
          locale.copy?.pricing||
          'Pricing'
        )+
        ' '
    );

    appendText(
      documentRef,
      unit,
      'strong',
      '',
      formatMoney(
        item.unitPrice,
        language,
        state,
        pricing
      )+
      unitLabel(
        language,
        state,
        locale,
        pricing
      )
    );

    const subtotal=
      appendText(
        documentRef,
        pricingRow,
        'span',
        '',
        (
          locale.ui?.amountEstimate||
          locale.copy?.productEstimate||
          'Estimate'
        )+
        ' '
    );

    appendText(
      documentRef,
      subtotal,
      'strong',
      '',
      formatMoney(
        item.subtotal,
        language,
        state,
        pricing
      )
    );

    body.appendChild(
      pricingRow
    );

    const qty=
      createElement(
        documentRef,
        'div',
        'inquiry-item__qty'
      );

    const minus=
      createElement(
        documentRef,
        'button'
      );

    minus.type='button';
    minus.textContent='−';
    minus.dataset
      .inquiryAction=
      'quantity';
    minus.dataset
      .itemId=
      text(item.id);
    minus.dataset.delta='-1';
    minus.setAttribute(
      'aria-label',
      'Decrease quantity'
    );

    const input=
      createElement(
        documentRef,
        'input'
      );

    input.type='number';
    input.min='1';
    input.max=
      String(
        state.limits
          ?.maxQuantity||
        1000000
      );
    input.step='1';
    input.value=
      String(
        number(
          item.normalizedQty||
          item.qty,
          1
        )
      );
    input.dataset
      .inquiryQuantity=
      'true';
    input.dataset
      .itemId=
      text(item.id);
    input.setAttribute(
      'aria-label',
      locale.copy?.quantity||
      'Quantity'
    );

    const plus=
      createElement(
        documentRef,
        'button'
      );

    plus.type='button';
    plus.textContent='+';
    plus.dataset
      .inquiryAction=
      'quantity';
    plus.dataset
      .itemId=
      text(item.id);
    plus.dataset.delta='1';
    plus.setAttribute(
      'aria-label',
      'Increase quantity'
    );

    qty.append(
      minus,
      input,
      plus
    );

    body.appendChild(
      qty
    );

    const remove=
      createElement(
        documentRef,
        'button',
        'inquiry-item__remove'
      );

    remove.type='button';
    remove.dataset
      .inquiryAction=
      'remove';
    remove.dataset
      .itemId=
      text(item.id);
    remove.textContent=
      locale.copy?.remove||
      'Remove';

    card.append(
      media,
      body,
      remove
    );

    return card;
  }

  function customScents(
    item,
    language,
    scents
  ){
    const ids=
      Array.isArray(
        item?.scentIds
      )
        ? item.scentIds
        : [];

    const names=
      ids
        .map(
          id=>
            scents
              .get(
                text(id)
              )
        )
        .filter(Boolean)
        .map(
          scent=>
            scent.name
              ?.[language]||
            scent.name
              ?.en||
            scent.name
              ?.zh||
            scent.id
        );

    return names.length
      ? names.join(', ')
      : text(
          item?.scents||
          item?.scent
        );
  }

  function renderCustom(
    documentRef,
    item,
    context
  ){
    const {
      language,
      locale,
      scents
    }=context;

    const card=
      createElement(
        documentRef,
        'article',
        'inquiry-item inquiry-item--custom'
      );

    card.dataset
      .inquiryItemId=
      text(item.id);

    const media=
      createElement(
        documentRef,
        'div',
        'inquiry-item__media'
      );

    appendText(
      documentRef,
      media,
      'span',
      'inquiry-item__custom-mark',
      'C'
    );

    const body=
      createElement(
        documentRef,
        'div',
        'inquiry-item__body'
      );

    appendText(
      documentRef,
      body,
      'p',
      'inquiry-item__kicker',
      locale.copy?.customProject||
      locale.ui?.customInquiry||
      'Custom Project'
    );

    appendText(
      documentRef,
      body,
      'h3',
      'inquiry-item__title',
      choiceLabel(
        item.use,
        locale
      )||
      locale.copy?.customProject||
      'Custom Project'
    );

    const meta=
      createElement(
        documentRef,
        'div',
        'inquiry-item__meta'
      );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.quantity||
          'Quantity',
        number(
          item.qty,
          0
        ),
        locale.ui?.pieces||
          ''
      ]
        .filter(
          value=>
            value!==''
        )
        .join(' ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.size||
          'Size',
        choiceLabel(
          item.sizePref,
          locale
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.scents||
          'Scents',
        customScents(
          item,
          language,
          scents
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.packaging||
          'Packaging',
        choiceLabel(
          item.pack,
          locale
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    addChip(
      documentRef,
      meta,
      [
        locale.copy?.branding||
          'Branding',
        choiceLabel(
          item.branding,
          locale
        )
      ]
        .filter(Boolean)
        .join(': ')
    );

    if(
      text(
        item.budget
      )
    ){
      addChip(
        documentRef,
        meta,
        text(
          item.budget
        )
      );
    }

    if(
      text(
        item.date
      )
    ){
      addChip(
        documentRef,
        meta,
        text(
          item.date
        )
      );
    }

    body.appendChild(
      meta
    );

    const pricingRow=
      createElement(
        documentRef,
        'div',
        'inquiry-item__pricing'
      );

    appendText(
      documentRef,
      pricingRow,
      'span',
      '',
      locale.copy
        ?.customQuotedSeparately||
      locale.ui?.quotePending||
      'Quoted separately'
    );

    body.appendChild(
      pricingRow
    );

    const remove=
      createElement(
        documentRef,
        'button',
        'inquiry-item__remove'
      );

    remove.type='button';
    remove.dataset
      .inquiryAction=
      'remove';
    remove.dataset
      .itemId=
      text(item.id);
    remove.textContent=
      locale.copy?.remove||
      'Remove';

    card.append(
      media,
      body,
      remove
    );

    return card;
  }

  function mount(){
    if(
      typeof document===
        'undefined'
    ){
      return null;
    }

    const state=
      parseState(
        document
      );

    const inquiry=
      root.DreamlandInquiry;

    const pricing=
      root.DreamlandPricingPolicy;

    if(
      !inquiry||
      !pricing
    ){
      throw new Error(
        'R4.7B requires DreamlandInquiry + DreamlandPricingPolicy.'
      );
    }

    const storage=
      root.localStorage;

    const products=
      productMap(
        state
      );

    const scents=
      scentMap(
        state
      );

    let language=
      supportedLanguage(
        storage.getItem(
          state.storage
            .languageKey
        )||
        state.defaultLanguage,
        state
      );

    if(
      !storage.getItem(
        state.storage
          .languageKey
      )
    ){
      storage.setItem(
        state.storage
          .languageKey,
        language
      );
    }

    const itemsNode=
      document
        .querySelector(
          '[data-inquiry-items]'
        );

    const emptyNode=
      document
        .querySelector(
          '[data-inquiry-empty]'
        );

    const clearNode=
      document
        .querySelector(
          '[data-inquiry-clear]'
        );

    const continueNode=
      document
        .querySelector(
          '[data-inquiry-continue]'
        );

    const validationNode=
      document
        .querySelector(
          '[data-inquiry-validation]'
        );

    const runtimeStatus=
      document
        .querySelector(
          '[data-inquiry-runtime-status]'
        );

    const languageSelect=
      document
        .querySelector(
          '[data-home-language-select]'
        );

    function locale(){
      return localeView(
        state,
        language
      );
    }

    function rehydrate(){
      configureInquiry(
        inquiry,
        pricing,
        state,
        storage
      );

      return inquiry
        .buildViewModel();
    }

    function persistAndView(){
      inquiry.persist();

      return inquiry
        .buildViewModel();
    }

    function applyLocalizedCopy(){
      const view=
        locale();

      document
        .documentElement
        .setAttribute(
          'lang',
          language
        );

      if(
        languageSelect&&
        languageSelect.value!==
          language
      ){
        languageSelect.value=
          language;
      }

      document
        .querySelectorAll(
          '[data-home-bind]'
        )
        .forEach(
          node=>{
            const value=
              pathValue(
                view.content,
                node.dataset
                  .homeBind
              );

            if(
              typeof value===
                'string'
            ){
              node.textContent=
                value;
            }
          }
        );

      document
        .querySelectorAll(
          '[data-inquiry-bind]'
        )
        .forEach(
          node=>{
            const value=
              view.copy
                ?.[
                  node.dataset
                    .inquiryBind
                ];

            if(
              typeof value===
                'string'
            ){
              node.textContent=
                value;
            }
          }
        );

      const progress=
        document
          .querySelector(
            '[data-inquiry-progress]'
          );

      if(progress){
        progress.setAttribute(
          'aria-label',
          view.copy
            ?.progressLabel||
          'Inquiry progress'
        );
      }
    }

    function updateBadge(
      viewModel
    ){
      const count=
        inquiryCount(
          viewModel
        );

      document
        .querySelectorAll(
          '[data-home-inquiry-count]'
        )
        .forEach(
          node=>{
            node.textContent=
              String(count);
            node.setAttribute(
              'aria-label',
              String(count)+
              ' inquiry items'
            );
          }
        );
    }

    function unmetGroup(){
      return inquiry
        .firstUnmetProductMoqGroup(
          item=>
            itemMoq(
              item,
              state,
              pricing
            )
        );
    }

    function renderSummary(
      viewModel
    ){
      const view=
        locale();

      const values={
        items:
          viewModel.summary
            .itemCount,
        quantity:
          viewModel.summary
            .productQuantity,
        custom:
          viewModel.summary
            .customCount,
        estimate:
          viewModel.summary
            .productCount>
          0
            ? formatMoney(
                viewModel.summary
                  .estimatedTotal,
                language,
                state,
                pricing
              )
            : '—'
      };

      for(const [
        key,
        value
      ] of Object.entries(values)){
        const node=
          document
            .querySelector(
              '[data-inquiry-summary-value="'+
              key+
              '"]'
            );

        if(node){
          node.textContent=
            String(value);
        }
      }

      const unmet=
        viewModel.empty
          ? null
          : unmetGroup();

      const canContinue=
        !viewModel.empty&&
        !unmet;

      if(continueNode){
        continueNode.disabled=
          !canContinue;
      }

      if(validationNode){
        validationNode.hidden=
          !unmet;

        if(unmet){
          validationNode.textContent=
            (
              view.copy
                ?.cannotContinue||
              'Review the selected quantities before continuing.'
            )+
            ' '+
            seriesLabel(
              unmet.series,
              language,
              state
            )+
            ' · '+
            text(
              unmet.size
            )+
            ' · MOQ '+
            unmet.moq+
            ' · '+
            unmet.qty+
            '/'+
            unmet.moq;
        }else{
          validationNode.textContent='';
        }
      }

      return canContinue;
    }

    function renderItems(
      viewModel
    ){
      const view=
        locale();

      if(!itemsNode){
        return;
      }

      itemsNode.replaceChildren();

      for(const item of viewModel.items){
        const context={
          state,
          language,
          locale:view,
          products,
          scents,
          pricing
        };

        itemsNode.appendChild(
          item.type===
            'custom'
            ? renderCustom(
                document,
                item,
                context
              )
            : renderProduct(
                document,
                item,
                context
              )
        );
      }

      itemsNode.hidden=
        viewModel.empty;

      if(emptyNode){
        emptyNode.hidden=
          !viewModel.empty;
      }

      if(clearNode){
        clearNode.hidden=
          viewModel.empty;
      }
    }

    function render(
      viewModel,
      message=''
    ){
      applyLocalizedCopy();
      renderItems(
        viewModel
      );
      renderSummary(
        viewModel
      );
      updateBadge(
        viewModel
      );

      if(runtimeStatus){
        runtimeStatus.textContent=
          text(message);
      }

      return viewModel;
    }

    function refresh(){
      return render(
        rehydrate()
      );
    }

    function setQuantity(
      id,
      value
    ){
      const item=
        inquiry.findItem(
          id
        );

      if(
        !item||
        item.type!==
          'product'
      ){
        return;
      }

      inquiry
        .setProductQuantity(
          id,
          value,
          1
        );

      render(
        persistAndView()
      );
    }

    itemsNode
      ?.addEventListener(
        'click',
        event=>{
          const action=
            event.target
              ?.closest
              ? event.target
                  .closest(
                    '[data-inquiry-action]'
                  )
              : null;

          if(!action){
            return;
          }

          const id=
            text(
              action.dataset
                .itemId
            );

          if(
            action.dataset
              .inquiryAction===
            'remove'
          ){
            const view=
              locale();

            const confirmed=
              root.confirm(
                [
                  view.copy
                    ?.removeTitle||
                    'Remove this item?',
                  view.copy
                    ?.removeBody||
                    ''
                ]
                  .filter(Boolean)
                  .join('\n')
              );

            if(!confirmed){
              return;
            }

            inquiry.removeItem(
              id
            );

            render(
              persistAndView(),
              view.ui
                ?.removedInquiry||
              ''
            );

            return;
          }

          if(
            action.dataset
              .inquiryAction===
            'quantity'
          ){
            const item=
              inquiry.findItem(
                id
              );

            if(
              !item||
              item.type!==
                'product'
            ){
              return;
            }

            const delta=
              Number(
                action.dataset
                  .delta
              )||
              0;

            setQuantity(
              id,
              number(
                item.qty,
                1
              )+
              delta
            );
          }
        }
      );

    itemsNode
      ?.addEventListener(
        'change',
        event=>{
          const input=
            event.target;

          if(
            !input
              ?.matches
              ?.(
                '[data-inquiry-quantity]'
              )
          ){
            return;
          }

          setQuantity(
            text(
              input.dataset
                .itemId
            ),
            input.value
          );
        }
      );

    clearNode
      ?.addEventListener(
        'click',
        ()=>{
          const view=
            locale();

          if(
            !root.confirm(
              view.copy
                ?.clearConfirm||
              view.copy
                ?.clearBody||
              'Clear all items from this inquiry?'
            )
          ){
            return;
          }

          inquiry.clearItems();

          render(
            persistAndView(),
            view.ui
              ?.clearedInquiry||
            ''
          );
        }
      );

    continueNode
      ?.addEventListener(
        'click',
        ()=>{
          const viewModel=
            inquiry
              .buildViewModel();

          if(
            viewModel.empty||
            unmetGroup()
          ){
            render(
              viewModel,
              locale().copy
                ?.cannotContinue||
              ''
            );
            return;
          }

          root.location.assign(
            state.routes.contact
          );
        }
      );

    languageSelect
      ?.addEventListener(
        'change',
        ()=>{
          language=
            supportedLanguage(
              languageSelect.value,
              state
            );

          storage.setItem(
            state.storage
              .languageKey,
            language
          );

          render(
            inquiry
              .buildViewModel()
          );
        }
      );

    root.addEventListener(
      'storage',
      event=>{
        if(
          event.key===
          state.storage
            .inquiryKey
        ){
          refresh();
          return;
        }

        if(
          event.key===
          state.storage
            .languageKey
        ){
          language=
            supportedLanguage(
              storage.getItem(
                state.storage
                  .languageKey
              ),
              state
            );

          render(
            inquiry
              .buildViewModel()
          );
        }
      }
    );

    root.addEventListener(
      'pageshow',
      ()=>{
        refresh();
      }
    );

    document.addEventListener(
      'visibilitychange',
      ()=>{
        if(
          document.visibilityState===
          'visible'
        ){
          refresh();
        }
      }
    );

    return refresh();
  }

  root.DreamlandInquiryRuntime=
    Object.freeze({
      version:VERSION,
      id:ID,
      inquiryCount,
      supportedLanguage,
      mount
    });

  if(
    typeof document!==
      'undefined'
  ){
    if(
      document.readyState===
      'loading'
    ){
      document.addEventListener(
        'DOMContentLoaded',
        ()=>{
          mount();
        },
        {
          once:true
        }
      );
    }else{
      mount();
    }
  }
})(
  typeof globalThis!==
    'undefined'
    ? globalThis
    : this
);
