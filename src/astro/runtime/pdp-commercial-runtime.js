(function(root){
  'use strict';

  if(root.DreamlandPdpCommercialUi){
    return;
  }

  const VERSION='R4.11B4.1E-C2';

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function state(){
    const node=
      document.getElementById(
        'pdpRuntimeState'
      );

    if(!node){
      return null;
    }

    try{
      return JSON.parse(
        node.textContent||
        ''
      );
    }catch(_){
      return null;
    }
  }

  function ui(
    runtimeState,
    language,
    key
  ){
    return (
      runtimeState
        ?.languages
        ?.[language]
        ?.ui
        ?.[key]||
      runtimeState
        ?.languages
        ?.en
        ?.ui
        ?.[key]||
      ''
    );
  }

  function set(
    selector,
    value
  ){
    const node=
      document.querySelector(
        selector
      );

    if(node){
      node.textContent=
        text(value);
    }

    return node;
  }

  function pieces(
    runtimeState,
    language
  ){
    return (
      ui(
        runtimeState,
        language,
        'pieces'
      )||
      (
        language==='zh'
          ? '件'
          : language==='ko'
            ? '개'
            : 'pcs'
      )
    );
  }

  function renderTiers(
    container,
    snapshot
  ){
    const fragment=
      document.createDocumentFragment();

    snapshot.tiers.forEach(tier=>{
      const row=
        document.createElement('div');

      row.className=
        'pdp-tier-row'+
        (
          tier.isCurrent
            ? ' is-current'
            : ''
        );

      row.dataset
        .pdpCommercialTier=
        tier.rangeLabel;

      const qty=
        document.createElement('span');

      qty.textContent=
        tier.rangeLabel;

      const price=
        document.createElement('strong');

      price.textContent=
        tier.displayUnitPrice+
        snapshot.currencyUnit;

      row.append(
        qty,
        price
      );

      fragment.appendChild(
        row
      );
    });

    container.replaceChildren(
      fragment
    );
  }

  function render(event){
    const view=
      event?.detail?.view;

    const language=
      text(
        event?.detail?.language||
        'en'
      );

    const runtimeState=
      state();

    const pricing=
      root.DreamlandPricingPolicy;

    const rootNode=
      document.querySelector(
        '[data-pdp-commercial]'
      );

    if(
      !view||
      !runtimeState||
      !pricing
        ?.commercialSnapshot||
      !rootNode
    ){
      return null;
    }

    const snapshot=
      pricing.commercialSnapshot({
        item:{
          ...runtimeState.product,
          size:view.config.size,
          scentSeries:
            view.config
              .scentSeries,
          pack:view.config.pack,
          quantity:view.config.qty
        },
        size:view.config.size,
        scentSeries:
          view.config.scentSeries,
        pack:view.config.pack,
        quantity:view.config.qty,
        language,
        seriesMeta:
          runtimeState.seriesMeta,
        currencyMap:
          runtimeState.currencies
      });

    rootNode.hidden=
      !snapshot.currentTier;

    rootNode.dataset
      .pdpCommercialPricingSeries=
      snapshot.pricingSeries;

    rootNode.dataset
      .pdpCommercialMoqReached=
      snapshot.meetsMoq
        ? 'true'
        : 'false';

    set(
      '[data-pdp-commercial-current-tier]',
      snapshot.currentTier
        ?.rangeLabel||
      ui(
        runtimeState,
        language,
        'tierUnavailable'
      )
    );

    const moqGap=
      document.querySelector(
        '[data-pdp-commercial-moq-gap]'
      );

    if(moqGap){
      moqGap.hidden=
        snapshot.meetsMoq;

      if(!snapshot.meetsMoq){
        moqGap.textContent=
          (
            ui(
              runtimeState,
              language,
              'moreToMoq'
            )||
            'More to MOQ'
          )+
          ' '+
          snapshot.quantityToMoq+
          ' '+
          pieces(
            runtimeState,
            language
          );
      }
    }

    const next=
      document.querySelector(
        '[data-pdp-commercial-next]'
      );

    if(next){
      next.hidden=
        !snapshot.nextTier;

      if(snapshot.nextTier){
        next.textContent=
          (
            ui(
              runtimeState,
              language,
              'buyMorePrefix'
            )||
            'Add'
          )+
          ' '+
          snapshot.nextTier
            .additionalQty+
          ' '+
          pieces(
            runtimeState,
            language
          )+
          ' '+
          (
            ui(
              runtimeState,
              language,
              'buyMoreSuffix'
            )||
            'to unlock'
          )+
          ' '+
          snapshot.nextTier
            .displayUnitPrice+
          snapshot.currencyUnit;
      }
    }

    const saving=
      document.querySelector(
        '[data-pdp-commercial-saving]'
      );

    if(saving){
      saving.hidden=
        !snapshot.nextTier
          ?.hasUnitSaving;

      if(
        snapshot.nextTier
          ?.hasUnitSaving
      ){
        set(
          '[data-pdp-commercial-saving-value]',
          snapshot.nextTier
            .displayUnitSaving+
          snapshot.currencyUnit
        );
      }
    }

    const terminal=
      document.querySelector(
        '[data-pdp-commercial-terminal]'
      );

    if(terminal){
      terminal.hidden=
        Boolean(
          snapshot.nextTier
        );

      if(!snapshot.nextTier){
        terminal.textContent=
          snapshot.hasVolumeBreaks
            ? (
                ui(
                  runtimeState,
                  language,
                  'bestTierReached'
                )||
                'Best tier price already unlocked'
              )
            : (
                ui(
                  runtimeState,
                  language,
                  'noMorePriceBreaks'
                )||
                'No additional volume price breaks'
              );
      }
    }

    const tiers=
      document.querySelector(
        '[data-pdp-tier-rows]'
      );

    if(tiers){
      renderTiers(
        tiers,
        snapshot
      );
    }

    return snapshot;
  }

  document.addEventListener(
    'dreamland:pdp-render',
    render
  );

  root.DreamlandPdpCommercialUi=
    Object.freeze({
      version:VERSION,
      render
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
