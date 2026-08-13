(function(root){
  'use strict';

  if(root.DreamlandRuntimeHooks){
    return;
  }

  const slots=new Map();
  const events=new Map();

  function normalizedName(name){
    const value=String(name||'').trim();

    if(!value){
      throw new Error(
        'DreamlandRuntimeHooks requires a non-empty hook name.'
      );
    }

    return value;
  }

  function normalizedOwner(owner){
    return String(owner||'anonymous').trim()||'anonymous';
  }

  function register(
    name,
    handler,
    {
      owner='anonymous'
    }={}
  ){
    const hookName=
      normalizedName(name);

    if(typeof handler!=='function'){
      throw new TypeError(
        `Runtime hook "${hookName}" must be a function.`
      );
    }

    const existing=
      slots.get(hookName);

    if(existing){
      throw new Error(
        `Runtime hook "${hookName}" is already owned by "${existing.owner}".`
      );
    }

    const record=Object.freeze({
      owner:normalizedOwner(owner),
      handler
    });

    slots.set(
      hookName,
      record
    );

    return ()=>{
      if(
        slots.get(hookName)===
        record
      ){
        slots.delete(
          hookName
        );
      }
    };
  }

  function get(name){
    const hookName=
      normalizedName(name);

    return (
      slots.get(hookName)
        ?.handler||
      null
    );
  }

  function ownerOf(name){
    const hookName=
      normalizedName(name);

    return (
      slots.get(hookName)
        ?.owner||
      ''
    );
  }

  function subscribe(
    name,
    handler,
    {
      owner='anonymous'
    }={}
  ){
    const eventName=
      normalizedName(name);

    if(typeof handler!=='function'){
      throw new TypeError(
        `Runtime event "${eventName}" listener must be a function.`
      );
    }

    const record=Object.freeze({
      owner:normalizedOwner(owner),
      handler
    });

    let listeners=
      events.get(eventName);

    if(!listeners){
      listeners=new Set();
      events.set(
        eventName,
        listeners
      );
    }

    listeners.add(
      record
    );

    return ()=>{
      const current=
        events.get(eventName);

      current?.delete(
        record
      );

      if(
        current&&
        !current.size
      ){
        events.delete(
          eventName
        );
      }
    };
  }

  function emit(
    name,
    payload
  ){
    const eventName=
      normalizedName(name);

    const listeners=[
      ...(
        events.get(eventName)||
        []
      )
    ];

    for(
      const record of
      listeners
    ){
      try{
        record.handler(
          payload
        );
      }catch(error){
        console.error(
          `[runtime-hooks] ${eventName} listener "${record.owner}" failed:`,
          error
        );
      }
    }

    return listeners.length;
  }

  function snapshot(){
    return Object.freeze({
      slots:Object.freeze(
        [...slots.entries()]
          .map(
            ([name,record])=>
              Object.freeze({
                name,
                owner:record.owner
              })
          )
      ),
      events:Object.freeze(
        [...events.entries()]
          .map(
            ([name,listeners])=>
              Object.freeze({
                name,
                owners:Object.freeze(
                  [...listeners]
                    .map(
                      record=>
                        record.owner
                    )
                )
              })
          )
      )
    });
  }

  root.DreamlandRuntimeHooks=Object.freeze({
    version:'B3-01',
    register,
    get,
    ownerOf,
    subscribe,
    emit,
    snapshot
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
