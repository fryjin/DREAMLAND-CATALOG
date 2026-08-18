(function(root){
  'use strict';

  if(root.DreamlandContact){
    return;
  }

  const VERSION='B5-06';

  const DEFAULT_FIELDS=[
    'name',
    'company',
    'country',
    'city',
    'email',
    'phone',
    'buyerType',
    'message'
  ];

  let config={
    storage:null,
    storageKey:
      'dreamlandContactDraftV1',
    ttlMs:
      24*60*60*1000,
    fieldIds:[
      ...DEFAULT_FIELDS
    ],
    now:
      ()=>Date.now()
  };

  let contact=
    emptyContact();

  let draftTimer=null;

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function emptyContact(){
    return Object.fromEntries(
      (
        config?.fieldIds||
        DEFAULT_FIELDS
      ).map(
        id=>[
          id,
          ''
        ]
      )
    );
  }

  function normalize(
    value
  ){
    const source=
      value&&
      typeof value==='object'&&
      !Array.isArray(value)
        ? value
        : {};

    return Object.fromEntries(
      config.fieldIds.map(
        id=>[
          id,
          text(
            source[id]
          )
        ]
      )
    );
  }

  function clone(
    value
  ){
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function now(){
    return Number(
      config.now()
    )||
    Date.now();
  }

  function storageRef(){
    return config.storage;
  }

  function configure(
    {
      storage=null,
      storageKey=
        'dreamlandContactDraftV1',
      ttlMs=
        24*60*60*1000,
      fieldIds=
        DEFAULT_FIELDS,
      now:nowImpl=null
    }={}
  ){
    cancelScheduledDraft();

    config={
      storage:
        storage&&
        typeof storage.getItem===
          'function'&&
        typeof storage.setItem===
          'function'&&
        typeof storage.removeItem===
          'function'
          ? storage
          : null,

      storageKey:
        text(
          storageKey
        )||
        'dreamlandContactDraftV1',

      ttlMs:
        Math.max(
          0,
          Number(ttlMs)||
          0
        ),

      fieldIds:
        Array.from(
          new Set(
            (
              Array.isArray(fieldIds)
                ? fieldIds
                : DEFAULT_FIELDS
            )
              .map(text)
              .filter(Boolean)
          )
        ),

      now:
        typeof nowImpl==='function'
          ? nowImpl
          : ()=>Date.now()
    };

    if(
      !config.fieldIds.length
    ){
      config.fieldIds=[
        ...DEFAULT_FIELDS
      ];
    }

    contact=
      normalize({});

    return snapshot();
  }

  function snapshot(){
    return Object.freeze(
      clone(
        contact
      )
    );
  }

  function get(){
    return contact;
  }

  function replace(
    value
  ){
    const next=
      normalize(
        value
      );

    Object.keys(contact)
      .forEach(
        key=>
          delete contact[key]
      );

    Object.assign(
      contact,
      next
    );

    return contact;
  }

  function patch(
    partial
  ){
    return replace({
      ...contact,
      ...(
        partial&&
        typeof partial==='object'&&
        !Array.isArray(partial)
          ? partial
          : {}
      )
    });
  }

  function clear(){
    cancelScheduledDraft();

    replace({});

    return contact;
  }

  function draftEnvelope(){
    return {
      savedAt:
        now(),
      contact:
        snapshot()
    };
  }

  function persistDraft(
    value
  ){
    if(
      value!==undefined
    ){
      replace(
        value
      );
    }

    const storage=
      storageRef();

    if(storage){
      storage.setItem(
        config.storageKey,
        JSON.stringify(
          draftEnvelope()
        )
      );
    }

    return snapshot();
  }

  function loadDraft(){
    cancelScheduledDraft();

    const storage=
      storageRef();

    if(!storage){
      clear();

      return snapshot();
    }

    try{
      const draft=
        JSON.parse(
          storage.getItem(
            config.storageKey
          )||
          'null'
        );

      const savedAt=
        Number(
          draft?.savedAt
        )||
        0;

      const expired=
        !savedAt||
        (
          config.ttlMs>0&&
          now()-savedAt>
            config.ttlMs
        );

      if(
        !draft?.contact||
        typeof draft.contact!==
          'object'||
        Array.isArray(
          draft.contact
        )||
        expired
      ){
        storage.removeItem(
          config.storageKey
        );

        clear();

        return snapshot();
      }

      replace(
        draft.contact
      );

      return snapshot();
    }catch(_){
      storage.removeItem(
        config.storageKey
      );

      clear();

      return snapshot();
    }
  }

  function cancelScheduledDraft(){
    if(
      draftTimer!==null
    ){
      clearTimeout(
        draftTimer
      );

      draftTimer=null;
    }
  }

  function scheduleDraft(
    value,
    delayMs=250
  ){
    if(
      value!==undefined
    ){
      replace(
        value
      );
    }

    cancelScheduledDraft();

    draftTimer=
      setTimeout(
        ()=>{
          draftTimer=null;
          persistDraft();
        },
        Math.max(
          0,
          Number(delayMs)||
          0
        )
      );

    return snapshot();
  }

  function flushDraft(
    value
  ){
    cancelScheduledDraft();

    return persistDraft(
      value
    );
  }

  function clearDraft(){
    cancelScheduledDraft();

    storageRef()
      ?.removeItem(
        config.storageKey
      );

    return true;
  }

  function clearAll(){
    clearDraft();
    clear();

    return snapshot();
  }

  function fallbackEmailValid(
    email
  ){
    return (
      /^[^\s@]+@[^\s@]+$/
        .test(
          text(email)
        )
    );
  }

  function validate(
    value=contact,
    {
      emailValid
    }={}
  ){
    const normalized=
      normalize(
        value
      );

    const errors=[];

    if(
      normalized.name.length<2
    ){
      errors.push(
        Object.freeze({
          field:'name',
          code:'invalidName'
        })
      );
    }

    if(
      !normalized.country
    ){
      errors.push(
        Object.freeze({
          field:'country',
          code:'countryRequired'
        })
      );
    }

    const validEmail=
      typeof emailValid==='boolean'
        ? emailValid
        : fallbackEmailValid(
            normalized.email
          );

    if(
      !normalized.email||
      !validEmail
    ){
      errors.push(
        Object.freeze({
          field:'email',
          code:'invalidEmail'
        })
      );
    }

    if(
      normalized.phone.length<5
    ){
      errors.push(
        Object.freeze({
          field:'phone',
          code:'invalidPhone'
        })
      );
    }

    return Object.freeze({
      valid:
        errors.length===0,
      contact:
        Object.freeze(
          normalized
        ),
      errors:
        Object.freeze(
          errors
        )
    });
  }

  root.DreamlandContact=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      get,
      replace,
      patch,
      clear,
      loadDraft,
      persistDraft,
      scheduleDraft,
      flushDraft,
      clearDraft,
      clearAll,
      validate
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
