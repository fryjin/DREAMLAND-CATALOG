(function(root){
  'use strict';

  if(root.DreamlandDetail){
    return;
  }

  const VERSION='B6-03';

  let configured=false;

  let source={
    products:[],
    sizes:['S','M','L','XL'],
    qtyMin:1,
    qtyStep:1
  };

  let adapters={
    defaultProductSize:product=>product?.defaultSize||'S',
    initialScentSeries:()=>'',
    patternsForSize:()=>[],
    scentSeriesOptions:()=>[],
    availableScents:()=>[],
    scentById:()=>null,
    scentDisplayText:value=>{
      if(value&&typeof value==='object'){
        return value.en||value.zh||'';
      }
      return String(value??'');
    },
    defaultPack:()=>'批发包装',
    packOptions:()=>['批发包装'],
    normalizeQuantity:(value,min=1)=>{
      let quantity=Number(value);
      if(!Number.isFinite(quantity))quantity=min;
      return Math.max(min,Math.trunc(quantity));
    },
    maximumQuantity:()=>1000000,
    moqForSeriesSize:()=>1,
    pricingSeriesFor:item=>item?.series||'',
    tierUnitCny:()=>0,
    packSurchargeCny:()=>0,
    convertCnyToBase:value=>Number(value)||0
  };

  let state={
    productId:'',
    config:emptyConfig()
  };

  function text(value){
    return String(value??'').trim();
  }

  function finitePositive(value,fallback){
    const parsed=Number(value);
    return Number.isFinite(parsed)&&parsed>0
      ? parsed
      : fallback;
  }

  function clone(value){
    if(value===undefined)return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value)){
      return value;
    }

    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function frozenClone(value){
    return deepFreeze(clone(value));
  }

  function emptyConfig(){
    return {
      size:'',
      scentSeries:'',
      scentId:'',
      scent:'',
      pattern:'',
      pack:'',
      qty:1
    };
  }

  function productById(productId){
    const id=text(productId);

    return source.products.find(
      product=>String(product?.id??'')===id
    )||null;
  }

  function activeProduct(){
    return productById(state.productId);
  }

  function patternsForSize(size){
    const patterns=adapters.patternsForSize(size);

    return Array.isArray(patterns)
      ? patterns.filter(Boolean)
      : [];
  }

  function scentSeriesOptions(product){
    const options=adapters.scentSeriesOptions(product);

    return Array.isArray(options)
      ? options.filter(Boolean)
      : [];
  }

  function availableScents(product,seriesOverride=''){
    const options=adapters.availableScents(
      product,
      seriesOverride
    );

    return Array.isArray(options)
      ? options.filter(Boolean)
      : [];
  }

  function packOptions(series){
    const options=adapters.packOptions(series);

    return Array.isArray(options)&&options.length
      ? options.filter(Boolean)
      : [
          adapters.defaultPack(series)||
          '批发包装'
        ];
  }

  function normalizeQuantity(value){
    return adapters.normalizeQuantity(
      value,
      source.qtyMin
    );
  }

  function ensureCurrentScent(){
    const product=activeProduct();

    if(!product){
      state.config.scentId='';
      state.config.scent='';
      return null;
    }

    const override=
      product.series==='holiday'
        ? state.config.scentSeries
        : '';

    const options=availableScents(
      product,
      override
    );

    let selected=options.find(
      scent=>scent?.id===state.config.scentId
    );

    if(!selected&&state.config.scent){
      selected=options.find(
        scent=>Object.values(
          scent?.name||{}
        ).includes(
          state.config.scent
        )
      );
    }

    if(!selected){
      selected=options[0]||null;
    }

    state.config.scentId=selected?.id||'';
    state.config.scent=
      selected
        ? adapters.scentDisplayText(selected.name)
        : '';

    if(
      selected&&
      product.series==='holiday'&&
      !state.config.scentSeries
    ){
      state.config.scentSeries=
        selected.series||'';
    }

    return selected;
  }

  function configure(options={}){
    source={
      products:Array.isArray(options.products)
        ? options.products
        : [],
      sizes:Array.isArray(options.sizes)&&options.sizes.length
        ? [...options.sizes]
        : ['S','M','L','XL'],
      qtyMin:finitePositive(options.qtyMin,1),
      qtyStep:finitePositive(options.qtyStep,1)
    };

    for(const key of [
      'defaultProductSize',
      'initialScentSeries',
      'patternsForSize',
      'scentSeriesOptions',
      'availableScents',
      'scentById',
      'scentDisplayText',
      'defaultPack',
      'packOptions',
      'normalizeQuantity',
      'maximumQuantity',
      'moqForSeriesSize',
      'pricingSeriesFor',
      'tierUnitCny',
      'packSurchargeCny',
      'convertCnyToBase'
    ]){
      if(typeof options[key]==='function'){
        adapters[key]=options[key];
      }
    }

    state={
      productId:'',
      config:{
        ...emptyConfig(),
        qty:source.qtyMin
      }
    };

    configured=true;
    return snapshot();
  }

  function ready(){
    return configured;
  }

  function clear(){
    state={
      productId:'',
      config:{
        ...emptyConfig(),
        qty:source.qtyMin
      }
    };

    return snapshot();
  }

  function openProduct(productId){
    const product=
      productById(productId)||
      source.products[0]||
      null;

    if(!product){
      clear();
      return buildViewModel();
    }

    const size=
      adapters.defaultProductSize(product)||
      source.sizes[0]||
      'S';

    const scentSeries=
      adapters.initialScentSeries(product)||
      '';

    state={
      productId:String(product.id),
      config:{
        size,
        scentSeries,
        scentId:'',
        scent:'',
        pattern:patternsForSize(size)[0]||'',
        pack:
          adapters.defaultPack(product.series)||
          packOptions(product.series)[0]||
          '批发包装',
        qty:normalizeQuantity(source.qtyMin)
      }
    };

    ensureCurrentScent();
    return buildViewModel();
  }

  function openItem(item){
    const product=productById(item?.productId);

    if(!product){
      return null;
    }

    const fallbackSize=
      adapters.defaultProductSize(product)||
      source.sizes[0]||
      'S';

    const size=item?.size||fallbackSize;

    state={
      productId:String(product.id),
      config:{
        size,
        scentId:item?.scentId||'',
        scentSeries:
          item?.scentSeries||
          adapters.initialScentSeries(product)||
          '',
        scent:item?.scent||'',
        pattern:
          item?.pattern||
          patternsForSize(size)[0]||
          '',
        pack:
          item?.pack||
          adapters.defaultPack(product.series)||
          '',
        qty:normalizeQuantity(item?.qty)
      }
    };

    ensureCurrentScent();
    return buildViewModel();
  }

  function setOption(key,value){
    const product=activeProduct();

    if(!product){
      return null;
    }

    if(
      !['size','scentSeries','pattern','pack']
        .includes(key)
    ){
      return buildViewModel();
    }

    const next=text(value);
    state.config[key]=next;

    if(key==='scentSeries'){
      state.config.scentId='';
      state.config.scent='';
    }

    if(key==='size'){
      state.config.pattern=
        patternsForSize(next)[0]||'';

      state.config.qty=
        normalizeQuantity(state.config.qty);
    }

    if(
      key==='pack'&&
      !packOptions(product.series)
        .includes(state.config.pack)
    ){
      state.config.pack=
        adapters.defaultPack(product.series)||
        packOptions(product.series)[0]||
        '';
    }

    ensureCurrentScent();
    return buildViewModel();
  }

  function setScent(scentId){
    const product=activeProduct();

    if(!product){
      return null;
    }

    const scent=adapters.scentById(scentId);

    if(!scent){
      return null;
    }

    state.config.scentId=scent.id||'';
    state.config.scent=
      adapters.scentDisplayText(scent.name);

    if(product.series==='holiday'){
      state.config.scentSeries=
        scent.series||
        state.config.scentSeries;
    }

    return buildViewModel();
  }

  function setQuantity(value){
    const raw=Number(value);
    const max=finitePositive(
      adapters.maximumQuantity(),
      1000000
    );

    const result={
      invalid:!Number.isFinite(raw),
      belowMin:
        Number.isFinite(raw)&&
        raw<source.qtyMin,
      aboveMax:
        Number.isFinite(raw)&&
        raw>max
    };

    state.config.qty=normalizeQuantity(value);

    return Object.freeze({
      ...result,
      quantity:state.config.qty,
      min:source.qtyMin,
      max
    });
  }

  function adjustQuantity(delta){
    state.config.qty=
      normalizeQuantity(
        Number(state.config.qty)+
        Number(delta||0)
      );

    return state.config.qty;
  }

  function pricingSnapshot(product){
    if(!product){
      return {
        pricingSeries:'',
        moq:1,
        quantity:source.qtyMin,
        basePriceCny:0,
        packSurchargeCny:0,
        unitPrice:0
      };
    }

    const quantity=
      normalizeQuantity(state.config.qty);

    state.config.qty=quantity;

    const pricingSeries=
      adapters.pricingSeriesFor({
        series:product.series||'',
        scentSeries:state.config.scentSeries||''
      })||
      product.series||
      '';

    const moq=
      adapters.moqForSeriesSize(
        product.series,
        state.config.size||
        product.size
      );

    const basePriceCny=
      Number(
        adapters.tierUnitCny(
          pricingSeries,
          state.config.size,
          quantity
        )
      )||0;

    const packageCny=
      Number(
        adapters.packSurchargeCny(
          product.series,
          state.config.pack
        )
      )||0;

    return {
      pricingSeries,
      moq:finitePositive(moq,1),
      quantity,
      basePriceCny,
      packSurchargeCny:packageCny,
      unitPrice:
        Number(
          adapters.convertCnyToBase(
            basePriceCny+
            packageCny
          )
        )||0
    };
  }

  function buildViewModel(){
    const product=activeProduct();

    if(!product){
      return deepFreeze({
        empty:true,
        product:null,
        config:{
          ...emptyConfig(),
          qty:source.qtyMin
        },
        options:{
          sizes:[...source.sizes],
          scentSeries:[],
          scents:[],
          patterns:[],
          packs:[]
        },
        pricing:pricingSnapshot(null),
        limits:{
          qtyMin:source.qtyMin,
          qtyStep:source.qtyStep,
          qtyMax:finitePositive(
            adapters.maximumQuantity(),
            1000000
          )
        }
      });
    }

    ensureCurrentScent();

    const override=
      product.series==='holiday'
        ? state.config.scentSeries
        : '';

    const view={
      empty:false,
      product:clone(product),
      config:clone(state.config),
      options:{
        sizes:[...source.sizes],
        scentSeries:scentSeriesOptions(product),
        scents:clone(
          availableScents(
            product,
            override
          )
        ),
        patterns:patternsForSize(
          state.config.size
        ),
        packs:packOptions(product.series)
      },
      pricing:pricingSnapshot(product),
      limits:{
        qtyMin:source.qtyMin,
        qtyStep:source.qtyStep,
        qtyMax:finitePositive(
          adapters.maximumQuantity(),
          1000000
        )
      }
    };

    view.config=clone(state.config);

    return deepFreeze(view);
  }

  function product(){
    const current=activeProduct();

    return current
      ? frozenClone(current)
      : null;
  }

  function getConfig(){
    ensureCurrentScent();
    return frozenClone(state.config);
  }

  function snapshot(){
    return deepFreeze({
      version:VERSION,
      configured,
      productId:state.productId,
      hasProduct:Boolean(activeProduct()),
      config:clone(state.config)
    });
  }

  root.DreamlandDetail=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      clear,
      openProduct,
      openItem,
      product,
      getConfig,
      setOption,
      setScent,
      setQuantity,
      adjustQuantity,
      buildViewModel
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
