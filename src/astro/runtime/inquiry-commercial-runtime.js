(function(root){
  'use strict';

  if(root.DreamlandInquiryCommercialUi){
    return;
  }

  const VERSION='R4.11B4.1E-C3';

  let cachedState=null;

  function text(value){
    return String(
      value??
      ''
    ).trim();
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

  function runtimeState(){
    if(cachedState){
      return cachedState;
    }

    const node=
      document.getElementById(
        'inquiryRuntimeState'
      );

    if(!node){
      return null;
    }

    try{
      cachedState=
        JSON.parse(
          node.textContent||
          '{}'
        );
    }catch(_){
      cachedState=null;
    }

    return cachedState;
  }

  function ui(
    state,
    language,
    key
  ){
    return (
      state
        ?.languages
        ?.[language]
        ?.ui
        ?.[key]||
      state
        ?.languages
        ?.[state.defaultLanguage]
        ?.ui
        ?.[key]||
      state
        ?.languages
        ?.en
        ?.ui
        ?.[key]||
      ''
    );
  }

  function seriesLabel(
    state,
    language,
    key
  ){
    return (
      state
        ?.seriesMeta
        ?.[key]
        ?.labels
        ?.[language]||
      state
        ?.seriesMeta
        ?.[key]
        ?.labels
        ?.en||
      state
        ?.seriesMeta
        ?.[key]
        ?.labels
        ?.zh||
      text(key)
    );
  }

  function pieces(
    state,
    language
  ){
    return (
      state
        ?.languages
        ?.[language]
        ?.ui
        ?.pieces||
      (
        language==='zh'
          ? '件'
          : language==='ko'
            ? '개'
            : 'pcs'
      )
    );
  }

  function create(
    tag,
    className=''
  ){
    const node=
      document.createElement(
        tag
      );

    if(className){
      node.className=
        className;
    }

    return node;
  }

  function line(
    parent,
    label,
    value,
    className=''
  ){
    const row=
      create(
        'span',
        className
      );

    const key=
      create(
        'em'
      );

    key.textContent=
      text(label);

    const strong=
      create(
        'strong'
      );

    strong.textContent=
      text(value);

    row.append(
      key,
      strong
    );

    parent.appendChild(
      row
    );

    return row;
  }

  function commercialSnapshot(
    item,
    language,
    state,
    inquiry,
    pricing
  ){
    const pricingQuantity=
      Math.max(
        1,
        number(
          inquiry
            .pricingGroupQuantity(
              item
            ),
          number(
            item?.normalizedQty||
            item?.qty,
            1
          )
        )
      );

    return pricing
      .commercialSnapshot({
        item:{
          ...item,
          quantity:
            pricingQuantity
        },
        size:
          item?.size,
        scentSeries:
          item?.scentSeries,
        pack:
          item?.pack,
        quantity:
          pricingQuantity,
        language,
        seriesMeta:
          state.seriesMeta||
          {},
        currencyMap:
          state.currencyMap||
          {}
      });
  }

  function itemCard(item){
    return Array
      .from(
        document.querySelectorAll(
          '[data-inquiry-item-id]'
        )
      )
      .find(
        node=>
          text(
            node.dataset
              .inquiryItemId
          )===
          text(
            item?.id
          )
      )||
      null;
  }

  function renderItem(
    item,
    snapshot,
    state,
    language
  ){
    const card=
      itemCard(
        item
      );

    const body=
      card?.querySelector(
        '.inquiry-item__body'
      );

    if(!body){
      return;
    }

    body
      .querySelector(
        '[data-inquiry-commercial-item]'
      )
      ?.remove();

    const block=
      create(
        'div',
        'inquiry-item__commercial'
      );

    block.dataset
      .inquiryCommercialItem=
      'true';

    line(
      block,
      ui(
        state,
        language,
        'currentPriceTier'
      )||
      'Current price tier',
      snapshot.currentTier
        ?.rangeLabel||
      '—'
    );

    if(snapshot.nextTier){
      line(
        block,
        ui(
          state,
          language,
          'nextPriceBreak'
        )||
        'Next price break',
        snapshot.nextTier
          .minQty+
        ' '+
        pieces(
          state,
          language
        )+
        ' · '+
        snapshot.nextTier
          .displayUnitPrice+
        snapshot.currencyUnit
      );

      if(
        snapshot.nextTier
          .hasUnitSaving
      ){
        line(
          block,
          ui(
            state,
            language,
            'unitSaving'
          )||
          'Save per piece',
          snapshot.nextTier
            .displayUnitSaving+
          snapshot.currencyUnit
        );
      }
    }else{
      const terminal=
        create(
          'p',
          'inquiry-item__commercial-terminal'
        );

      terminal.textContent=
        snapshot.hasVolumeBreaks
          ? (
              ui(
                state,
                language,
                'bestTierReached'
              )||
              'Best tier price already unlocked'
            )
          : (
              ui(
                state,
                language,
                'noMorePriceBreaks'
              )||
              'No additional volume price breaks'
            );

      block.appendChild(
        terminal
      );
    }

    body.appendChild(
      block
    );
  }

  function groupLabel(
    snapshot,
    state,
    language
  ){
    const product=
      seriesLabel(
        state,
        language,
        snapshot.productSeries
      );

    if(
      snapshot.productSeries===
        'holiday'&&
      snapshot.pricingSeries&&
      snapshot.pricingSeries!==
        snapshot.productSeries
    ){
      return (
        product+
        ' · '+
        seriesLabel(
          state,
          language,
          snapshot.pricingSeries
        )+
        ' · '+
        text(
          snapshot.size
        )
      );
    }

    return (
      product+
      ' · '+
      text(
        snapshot.size
      )
    );
  }

  /*
   * F3-B5-FIX2R1 — Unified Grouping Visibility
   * RULE1 already owns the single commercial quantity group. This layer only
   * exposes that canonical membership in the left list and right summary.
   */
  function groupMeta(
    group,
    state,
    language
  ){
    const models=
      ui(
        state,
        language,
        'models'
      )||
      (
        language==='zh'
          ? '款'
          : language==='ko'
            ? '개 상품'
            : 'items'
      );

    return (
      group.itemCount+
      ' '+
      models+
      ' · '+
      group.quantity+
      ' '+
      pieces(
        state,
        language
      )
    );
  }

  function renderItemGroupStatus(
    item,
    group,
    moqGroup,
    state,
    language
  ){
    const card=
      itemCard(
        item
      );

    const body=
      card?.querySelector(
        '.inquiry-item__body'
      );

    if(!body){
      return;
    }

    body
      .querySelector(
        '[data-inquiry-group-status]'
      )
      ?.remove();

    const status=
      create(
        'div',
        'inquiry-item__group-status'
      );

    status.dataset
      .inquiryGroupStatus=
      group.key;

    const label=
      create(
        'span'
      );

    label.textContent=
      ui(
        state,
        language,
        'groupTotal'
      )||
      'Group total';

    const value=
      create(
        'strong'
      );

    const moq=
      Number(
        moqGroup?.moq
      )||
      0;

    value.textContent=
      group.quantity+
      ' '+
      pieces(
        state,
        language
      )+
      (
        moq>0
          ? ' · MOQ '+
            moq
          : ''
      );

    status.append(
      label,
      value
    );

    const commercial=
      body.querySelector(
        '[data-inquiry-commercial-item]'
      );

    body.insertBefore(
      status,
      commercial||
      null
    );
  }

  function renderGroupSections(
    groups,
    state,
    language
  ){
    const container=
      document.querySelector(
        '[data-inquiry-items]'
      );

    if(
      !container||
      !groups.length
    ){
      return;
    }

    const productIds=
      new Set(
        groups.flatMap(
          group=>
            group.items.map(
              item=>
                text(
                  item?.id
                )
            )
        )
      );

    const customCards=
      Array.from(
        container.querySelectorAll(
          '[data-inquiry-item-id]'
        )
      ).filter(
        card=>
          !productIds.has(
            text(
              card.dataset
                .inquiryItemId
            )
          )
      );

    const fragment=
      document.createDocumentFragment();

    groups.forEach(group=>{
      const section=
        create(
          'section',
          'inquiry-quantity-group'
        );

      section.dataset
        .inquiryQuantityGroup=
        group.key;

      const header=
        create(
          'header',
          'inquiry-quantity-group__header'
        );

      const heading=
        create(
          'div',
          'inquiry-quantity-group__heading'
        );

      const eyebrow=
        create(
          'span'
        );

      eyebrow.textContent=
        ui(
          state,
          language,
          'quantityGroup'
        )||
        'Quantity group';

      const title=
        create(
          'strong'
        );

      title.textContent=
        groupLabel(
          group.snapshot,
          state,
          language
        );

      heading.append(
        eyebrow,
        title
      );

      const meta=
        create(
          'span',
          'inquiry-quantity-group__meta'
        );

      meta.textContent=
        groupMeta(
          group,
          state,
          language
        );

      header.append(
        heading,
        meta
      );

      const rule=
        create(
          'p',
          'inquiry-quantity-group__rule'
        );

      rule.textContent=
        ui(
          state,
          language,
          'quantityGroupRule'
        )||
        ui(
          state,
          language,
          'tierRule'
        )||
        'Same-series, same-size products combine for MOQ and tier pricing';

      const body=
        create(
          'div',
          'inquiry-quantity-group__body'
        );

      group.items.forEach(item=>{
        const card=
          itemCard(
            item
          );

        if(card){
          body.appendChild(
            card
          );
        }
      });

      section.append(
        header,
        rule,
        body
      );

      fragment.appendChild(
        section
      );
    });

    customCards.forEach(
      card=>
        fragment.appendChild(
          card
        )
    );

    container.replaceChildren(
      fragment
    );
  }

  function renderGroups(
    groups,
    state,
    language
  ){
    const section=
      document.querySelector(
        '[data-inquiry-commercial-summary]'
      );

    const container=
      document.querySelector(
        '[data-inquiry-commercial-groups]'
      );

    if(
      !section||
      !container
    ){
      return;
    }

    document.querySelector(
      '[data-inquiry-commercial-title]'
    ).textContent=
      ui(
        state,
        language,
        'quantityGroups'
      )||
      ui(
        state,
        language,
        'tierPriceTable'
      )||
      'Quantity groups';

    document.querySelector(
      '[data-inquiry-commercial-rule]'
    ).textContent=
      ui(
        state,
        language,
        'quantityGroupRule'
      )||
      ui(
        state,
        language,
        'tierRule'
      )||
      'Same-series, same-size products combine for MOQ and tier pricing';

    section.hidden=
      groups.length===0;

    const fragment=
      document.createDocumentFragment();

    groups.forEach(group=>{
      const card=
        create(
          'article',
          'inquiry-commercial-group'
        );

      card.dataset
        .inquiryCommercialGroup=
        group.key;

      const heading=
        create(
          'div',
          'inquiry-commercial-group__heading'
        );

      const title=
        create(
          'strong'
        );

      title.textContent=
        groupLabel(
          group.snapshot,
          state,
          language
        );

      const qty=
        create(
          'span'
        );

      qty.textContent=
        group.quantity+
        ' '+
        pieces(
          state,
          language
        );

      heading.append(
        title,
        qty
      );

      card.appendChild(
        heading
      );

      line(
        card,
        ui(
          state,
          language,
          'currentPriceTier'
        )||
        'Current price tier',
        group.snapshot
          .currentTier
          ?.rangeLabel||
        '—',
        'inquiry-commercial-group__line'
      );

      if(group.snapshot.nextTier){
        line(
          card,
          ui(
            state,
            language,
            'nextPriceBreak'
          )||
          'Next price break',
          group.snapshot
            .nextTier
            .minQty+
          ' '+
          pieces(
            state,
            language
          ),
          'inquiry-commercial-group__line'
        );

        line(
          card,
          ui(
            state,
            language,
            'moreToNextBreak'
          )||
          'More to next break',
          group.snapshot
            .nextTier
            .additionalQty+
          ' '+
          pieces(
            state,
            language
          ),
          'inquiry-commercial-group__line'
        );
      }else{
        const terminal=
          create(
            'p',
            'inquiry-commercial-group__terminal'
          );

        terminal.textContent=
          group.snapshot
            .hasVolumeBreaks
            ? (
                ui(
                  state,
                  language,
                  'bestTierReached'
                )||
                'Best tier price already unlocked'
              )
            : (
                ui(
                  state,
                  language,
                  'noMorePriceBreaks'
                )||
                'No additional volume price breaks'
              );

        card.appendChild(
          terminal
        );
      }

      fragment.appendChild(
        card
      );
    });

    container.replaceChildren(
      fragment
    );
  }

  function render(event){
    const viewModel=
      event?.detail
        ?.viewModel;

    const language=
      text(
        event?.detail
          ?.language||
        'en'
      );

    const state=
      runtimeState();

    const inquiry=
      root.DreamlandInquiry;

    const pricing=
      root.DreamlandPricingPolicy;

    if(
      !viewModel||
      !state||
      !inquiry
        ?.commercialGroupKey||
      !inquiry
        ?.pricingGroupQuantity||
      !inquiry
        ?.productMoqGroups||
      !pricing
        ?.commercialSnapshot
    ){
      return null;
    }

    const groups=
      new Map();

    (
      viewModel.items||
      []
    )
      .filter(
        item=>
          item?.type===
          'product'
      )
      .forEach(item=>{
        const snapshot=
          commercialSnapshot(
            item,
            language,
            state,
            inquiry,
            pricing
          );

        renderItem(
          item,
          snapshot,
          state,
          language
        );

        const key=
          inquiry
            .commercialGroupKey(
              item
            );

        if(!groups.has(key)){
          groups.set(
            key,
            {
              key,
              quantity:
                snapshot.quantity,
              itemCount:0,
              items:[],
              snapshot
            }
          );
        }

        const group=
          groups.get(
            key
          );

        group.itemCount+=1;
        group.items.push(
          item
        );
      });

    const projected=[
      ...groups.values()
    ];

    const moqGroups=
      new Map(
        inquiry
          .productMoqGroups(
            item=>
              pricing
                .moqForSeriesSize(
                  item?.series,
                  item?.size,
                  state.seriesMeta||
                  {}
                )
          )
          .map(
            group=>[
              group.key,
              group
            ]
          )
      );

    projected.forEach(group=>{
      group.items.forEach(
        item=>
          renderItemGroupStatus(
            item,
            group,
            moqGroups.get(
              group.key
            ),
            state,
            language
          )
      );
    });

    renderGroupSections(
      projected,
      state,
      language
    );

    renderGroups(
      projected,
      state,
      language
    );

    return Object.freeze({
      language,
      groupCount:
        projected.length,
      groups:
        Object.freeze(
          projected
        )
    });
  }

  if(
    typeof document!==
    'undefined'
  ){
    document.addEventListener(
      'dreamland:inquiry-render',
      render
    );
  }

  root.DreamlandInquiryCommercialUi=
    Object.freeze({
      version:VERSION,
      render
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
