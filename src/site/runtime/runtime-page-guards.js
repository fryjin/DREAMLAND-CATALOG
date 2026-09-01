(function(root){
  'use strict';

  if(root.DreamlandPageGuards){
    return;
  }

  const VERSION='B7-00B.4J-R3';

  function text(value){
    return String(value??'').trim();
  }

  function inquiryItems(inquiry){
    try{
      const items=inquiry?.items?.();
      return Array.isArray(items)?items:[];
    }catch(_){
      return [];
    }
  }

  function contactValid(contact){
    if(!contact||typeof contact.validate!=='function'){
      return false;
    }

    try{
      const current=
        typeof contact.snapshot==='function'
          ? contact.snapshot()
          : {};

      return contact.validate(current)?.valid===true;
    }catch(_){
      return false;
    }
  }

  function hasLastSubmission(lastSubmission){
    try{
      const value=
        typeof lastSubmission==='function'
          ? lastSubmission()
          : lastSubmission;

      return Boolean(
        text(value?.inquiryId)||
        text(value?.clientInquiryId)
      );
    }catch(_){
      return false;
    }
  }

  function routeHref(route,name){
    const method=route?.[name];

    if(typeof method==='function'){
      try{
        return text(method.call(route));
      }catch(_){}
    }

    const fallback={
      inquiry:'/inquiry/',
      contact:'/inquiry/contact/'
    };

    return fallback[name]||'/';
  }

  function evaluate(
    page,
    {
      inquiry=null,
      contact=null,
      lastSubmission=null,
      route=root.DreamlandRoute||null
    }={}
  ){
    const name=text(page);
    const hasInquiry=
      inquiryItems(inquiry).length>0;

    if(name==='contact'&&!hasInquiry){
      return Object.freeze({
        allowed:false,
        code:'INQUIRY_REQUIRED',
        target:routeHref(route,'inquiry')
      });
    }

    if(name==='review'){
      if(!hasInquiry){
        return Object.freeze({
          allowed:false,
          code:'INQUIRY_REQUIRED',
          target:routeHref(route,'inquiry')
        });
      }

      if(!contactValid(contact)){
        return Object.freeze({
          allowed:false,
          code:'CONTACT_REQUIRED',
          target:routeHref(route,'contact')
        });
      }
    }

    if(
      name==='success'&&
      !hasLastSubmission(lastSubmission)
    ){
      return Object.freeze({
        allowed:false,
        code:'SUBMISSION_REQUIRED',
        target:routeHref(route,'inquiry')
      });
    }

    return Object.freeze({
      allowed:true,
      code:'',
      target:''
    });
  }

  root.DreamlandPageGuards=Object.freeze({
    version:VERSION,
    evaluate
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
