(function(root){
  'use strict';

  if(root.DreamlandHomeRuntime){
    return;
  }

  const VERSION='R4.3B';
  const RUNTIME_ID='DREAMLAND_R4_HOME_RUNTIME_R4_3B';

  let state=null;
  let currentLanguage='en';
  let mounted=false;

  function text(value){
    return String(
      value??
      ''
    );
  }

  function safeJson(value){
    try{
      return JSON.parse(
        String(
          value||
          ''
        )
      );
    }catch(_){
      return null;
    }
  }

  function storage(){
    try{
      return root.localStorage||null;
    }catch(_){
      return null;
    }
  }

  function readStorage(key){
    const target=storage();

    if(!target){
      return '';
    }

    try{
      return target.getItem(key)||'';
    }catch(_){
      return '';
    }
  }

  function writeStorage(
    key,
    value
  ){
    const target=storage();

    if(!target){
      return false;
    }

    try{
      target.setItem(
        key,
        String(value)
      );

      return true;
    }catch(_){
      return false;
    }
  }

  function normalizeLanguage(
    value,
    fallback='en',
    supported=[
      'en',
      'zh',
      'ko'
    ]
  ){
    const next=
      String(
        value||
        ''
      )
        .trim()
        .toLowerCase();

    return supported.includes(next)
      ? next
      : fallback;
  }

  function inquiryCount(value){
    const data=
      typeof value==='string'
        ? safeJson(value)
        : value;

    if(
      !data||
      typeof data!=='object'||
      Array.isArray(data)||
      !Array.isArray(data.items)
    ){
      return 0;
    }

    return data.items.reduce(
      (
        total,
        item
      )=>{
        if(
          item?.type===
          'product'
        ){
          return (
            total+
            (
              Number(
                item?.qty
              )||
              0
            )
          );
        }

        return total+1;
      },
      0
    );
  }

  function pathValue(
    source,
    path
  ){
    return String(
      path||
      ''
    )
      .split('.')
      .filter(Boolean)
      .reduce(
        (
          value,
          key
        )=>
          value==
          null
            ? undefined
            : value[key],
        source
      );
  }

  function setNodeText(
    node,
    value
  ){
    if(!node){
      return;
    }

    node.textContent=
      text(value);
  }

  function contentFor(
    language
  ){
    return (
      state?.languages?.[language]||
      state?.languages
        ?.[state?.defaultLanguage]||
      state?.languages?.en||
      null
    );
  }

  function applyGenericBindings(
    view
  ){
    document
      .querySelectorAll(
        '[data-home-bind]'
      )
      .forEach(node=>{
        const value=
          pathValue(
            view?.content,
            node.dataset.homeBind
          );

        if(value===undefined){
          return;
        }

        setNodeText(
          node,
          text(value)+
          text(
            node.dataset
              .homeSuffix
          )
        );
      });
  }

  function applyCollections(
    view
  ){
    const source=
      Array.isArray(
        view?.collections
      )
        ? view.collections
        : [];

    const collectionCopy=
      view?.content
        ?.collections||
      {};

    document
      .querySelectorAll(
        '[data-home-collection]'
      )
      .forEach(card=>{
        const id=
          String(
            card.dataset
              .homeCollection||
            ''
          );

        const item=
          source.find(
            row=>
              row?.id===id
          );

        if(!item){
          return;
        }

        setNodeText(
          card.querySelector(
            '[data-home-collection-label]'
          ),
          item.label
        );

        const designLabel=
          Number(item.count)===1
            ? (
                collectionCopy
                  .designSingular||
                collectionCopy
                  .designPlural||
                ''
              )
            : (
                collectionCopy
                  .designPlural||
                collectionCopy
                  .designSingular||
                ''
              );

        setNodeText(
          card.querySelector(
            '[data-home-collection-count]'
          ),
          item.count+
          ' '+
          designLabel
        );
      });
  }

  function applyFeatured(
    view
  ){
    const products=
      Array.isArray(
        view?.featuredProducts
      )
        ? view.featuredProducts
        : [];

    const featured=
      view?.content
        ?.featured||
      {};

    document
      .querySelectorAll(
        '[data-home-featured-product]'
      )
      .forEach(card=>{
        const id=
          String(
            card.dataset
              .homeFeaturedProduct||
            ''
          );

        const product=
          products.find(
            row=>
              row?.id===id
          );

        if(!product){
          return;
        }

        setNodeText(
          card.querySelector(
            '[data-home-product-name]'
          ),
          product.name
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-series]'
          ),
          product.seriesLabel
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-price]'
          ),
          product.price
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-moq]'
          ),
          (
            featured.moq||
            'MOQ'
          )+
          ' '+
          product.moq
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-details]'
          ),
          (
            featured.viewDetails||
            'View details'
          )+
          ' →'
        );

        const image=
          card.querySelector('img');

        if(image){
          image.alt=
            text(product.name);
        }
      });
  }

  function applyIndexedText(
    selector,
    values,
    field
  ){
    const rows=
      Array.isArray(values)
        ? values
        : [];

    document
      .querySelectorAll(
        selector
      )
      .forEach(node=>{
        const index=
          Number(
            node.dataset
              .homeArrayIndex
          );

        const item=
          rows[index];

        if(
          !Number.isInteger(index)||
          item==null
        ){
          return;
        }

        setNodeText(
          node,
          field
            ? item?.[field]
            : item
        );
      });
  }

  function applyLanguage(
    language,
    {
      persist=true
    }={}
  ){
    if(!state){
      return false;
    }

    const supported=
      Object.keys(
        state.languages||
        {}
      );

    const next=
      normalizeLanguage(
        language,
        state.defaultLanguage||
          'en',
        supported
      );

    const view=
      contentFor(next);

    if(!view){
      return false;
    }

    currentLanguage=next;

    document
      .documentElement
      .setAttribute(
        'lang',
        next==='zh'
          ? 'zh-CN'
          : next==='ko'
            ? 'ko-KR'
            : 'en'
      );

    if(document.body){
      document.body.dataset
        .homeLanguage=
        next;
    }

    const select=
      document.querySelector(
        '[data-home-language-select]'
      );

    if(select){
      select.value=next;
      select.setAttribute(
        'aria-label',
        text(
          view?.content
            ?.navigation
            ?.language||
          'Language'
        )
      );
    }

    applyGenericBindings(view);
    applyCollections(view);
    applyFeatured(view);

    applyIndexedText(
      '[data-home-custom-feature]',
      view?.content?.custom
        ?.features
    );

    applyIndexedText(
      '[data-home-wholesale-title]',
      view?.content?.wholesale
        ?.facts,
      'title'
    );

    applyIndexedText(
      '[data-home-wholesale-body]',
      view?.content?.wholesale
        ?.facts,
      'body'
    );

    if(persist){
      writeStorage(
        state.storage
          .languageKey,
        next
      );
    }

    updateInquiryBadge();

    try{
      root.dispatchEvent(
        new CustomEvent(
          'dreamland:home-language',
          {
            detail:{
              language:next
            }
          }
        )
      );
    }catch(_){}

    return true;
  }

  function updateInquiryBadge(){
    if(!state){
      return 0;
    }

    const count=
      inquiryCount(
        readStorage(
          state.storage
            .inquiryKey
        )
      );

    const node=
      document.querySelector(
        '[data-home-inquiry-count]'
      );

    if(node){
      node.textContent=
        String(count);

      const inquiryLabel=
        contentFor(
          currentLanguage
        )
          ?.content
          ?.navigation
          ?.inquiry||
        'Inquiry';

      node.setAttribute(
        'aria-label',
        count+
        ' '+
        inquiryLabel
      );
    }

    return count;
  }

  function parseRuntimeState(){
    const node=
      document.getElementById(
        'homeRuntimeState'
      );

    if(!node){
      return null;
    }

    const parsed=
      safeJson(
        node.textContent
      );

    if(
      !parsed||
      parsed.version!==
        VERSION||
      !parsed.languages||
      !parsed.storage
    ){
      return null;
    }

    return parsed;
  }

  function mount(){
    if(mounted){
      updateInquiryBadge();
      return true;
    }

    state=
      parseRuntimeState();

    if(!state){
      return false;
    }

    const supported=
      Object.keys(
        state.languages
      );

    const stored=
      readStorage(
        state.storage
          .languageKey
      );

    const initial=
      normalizeLanguage(
        stored,
        state.defaultLanguage||
          'en',
        supported
      );

    const select=
      document.querySelector(
        '[data-home-language-select]'
      );

    select?.addEventListener(
      'change',
      event=>{
        applyLanguage(
          event.currentTarget
            ?.value
        );
      }
    );

    root.addEventListener(
      'storage',
      event=>{
        if(
          event.key===
          state.storage
            .languageKey
        ){
          applyLanguage(
            event.newValue,
            {
              persist:false
            }
          );

          return;
        }

        if(
          event.key===
          state.storage
            .inquiryKey
        ){
          updateInquiryBadge();
        }
      }
    );

    root.addEventListener(
      'pageshow',
      ()=>{
        updateInquiryBadge();
      }
    );

    document.addEventListener(
      'visibilitychange',
      ()=>{
        if(
          document.visibilityState===
          'visible'
        ){
          updateInquiryBadge();
        }
      }
    );

    mounted=true;

    applyLanguage(
      initial,
      {
        persist:true
      }
    );

    return true;
  }

  root.DreamlandHomeRuntime=
    Object.freeze({
      version:VERSION,
      id:RUNTIME_ID,
      normalizeLanguage,
      inquiryCount,
      mount,
      applyLanguage,
      updateInquiryBadge
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
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
