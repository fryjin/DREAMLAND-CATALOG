(function(root){
  'use strict';

  if(root.DreamlandPdpInquiryEdit){
    return;
  }

  const VERSION='F3-B3';
  let mounted=false;

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function parseState(){
    if(
      typeof document===
      'undefined'
    ){
      return null;
    }

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
        '{}'
      );
    }catch(_){
      return null;
    }
  }

  function buildItem(
    state,
    view,
    id
  ){
    const product=
      state?.product||
      {};

    return {
      id:text(id),
      type:'product',
      productId:text(product.id),
      name:product.name,
      names:{
        ...(
          product.names||
          {}
        )
      },
      series:text(product.series),
      color:product.color,
      colorCode:product.colorCode,
      cover:product.cover,
      moq:view?.pricing?.moq,
      size:view?.config?.size,
      scentSeries:
        view?.config?.scentSeries,
      scentId:
        view?.config?.scentId,
      scent:
        view?.config?.scent,
      pattern:
        view?.config?.pattern,
      pack:
        view?.config?.pack,
      qty:
        view?.config?.qty
    };
  }

  function requestedItemId(){
    try{
      return text(
        new URL(
          root.location.href
        ).searchParams.get(
          'edit'
        )
      );
    }catch(_){
      return '';
    }
  }

  function currentLanguage(state){
    try{
      return (
        text(
          root.localStorage
            ?.getItem(
              state?.storage
                ?.languageKey
            )
        )||
        state?.defaultLanguage||
        'en'
      );
    }catch(_){
      return (
        state?.defaultLanguage||
        'en'
      );
    }
  }

  function syncBack(
    state,
    backLabel
  ){
    if(!backLabel){
      return;
    }

    const language=
      currentLanguage(
        state
      );

    backLabel.textContent=
      state?.languages
        ?.[language]
        ?.content
        ?.navigation
        ?.inquiry||
      'Inquiry';
  }

  function mount(){
    if(
      mounted||
      typeof document===
        'undefined'
    ){
      return mounted
        ? true
        : null;
    }

    const itemId=
      requestedItemId();

    if(!itemId){
      return null;
    }

    const state=
      parseState();

    const detail=
      root.DreamlandDetail;

    const inquiry=
      root.DreamlandInquiry;

    const pdp=
      root.DreamlandPdpRuntime;

    if(
      !state||
      !detail||
      !inquiry||
      !pdp
    ){
      return null;
    }

    const item=
      inquiry.findItem(
        itemId
      );

    if(
      !item||
      item.type!==
        'product'||
      text(
        item.productId
      ).toUpperCase()!==
      text(
        state.product?.id
      ).toUpperCase()
    ){
      return null;
    }

    const view=
      detail.openItem(
        item
      );

    if(!view){
      return null;
    }

    const button=
      document.querySelector(
        '[data-pdp-add-inquiry]'
      );

    if(!button){
      return null;
    }

    /*
     * The base PDP adapter already owns the normal Add-to-Inquiry click.
     * Clone only this button in edit mode so the normal listener is detached
     * without changing the protected 36 KiB PDP adapter.
     */
    const saveButton=
      button.cloneNode(
        true
      );

    button.replaceWith(
      saveButton
    );

    saveButton.dataset
      .pdpInquiryEdit=
      itemId;

    const actionLabel=
      saveButton.querySelector(
        '[data-pdp-ui]'
      );

    if(actionLabel){
      actionLabel.dataset
        .pdpUi=
        'saveChanges';
    }

    const back=
      document.querySelector(
        '.pdp-back'
      );

    const backLabel=
      back?.querySelector(
        '[data-pdp-bind="detail.back"]'
      )||
      null;

    if(back){
      back.href=
        '/inquiry/';
    }

    if(backLabel){
      backLabel.removeAttribute(
        'data-pdp-bind'
      );
    }

    pdp.render(
      view
    );

    syncBack(
      state,
      backLabel
    );

    if(document.body){
      document.body.dataset
        .pdpInquiryEdit=
        'true';
    }

    document
      .querySelector(
        '[data-home-language-select]'
      )
      ?.addEventListener(
        'change',
        ()=>
          syncBack(
            state,
            backLabel
          )
      );

    saveButton.addEventListener(
      'click',
      ()=>{
        const existing=
          inquiry.findItem(
            itemId
          );

        if(
          !existing||
          existing.type!==
            'product'
        ){
          root.location.assign(
            '/inquiry/'
          );
          return;
        }

        const next=
          buildItem(
            state,
            detail.buildViewModel(),
            itemId
          );

        inquiry.replaceItem(
          itemId,
          next
        );

        inquiry
          .mergeDuplicateProducts();

        inquiry.persist();

        root.location.assign(
          '/inquiry/'
        );
      }
    );

    mounted=true;

    return true;
  }

  root.DreamlandPdpInquiryEdit=
    Object.freeze({
      version:VERSION,
      buildItem,
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
        mount,
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
