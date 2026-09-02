(function(root){
  'use strict';

  if(root.DreamlandSubmissionPayload){
    return;
  }

  const VERSION='R4.2B';

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function emailValid(value){
    const email=
      text(value);

    const at=
      email.indexOf('@');

    const dot=
      email.lastIndexOf('.');

    return (
      at>0&&
      dot>at+1&&
      dot<email.length-1
    );
  }

  function validate(payload){
    const value=
      payload&&
      typeof payload==='object'&&
      !Array.isArray(payload)
        ? payload
        : {};

    const inquiryId=
      text(
        value.inquiry_id
      );

    if(
      !/^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/
        .test(inquiryId)
    ){
      return {
        ok:false,
        code:'INVALID_INQUIRY_ID'
      };
    }

    if(
      text(
        value.contact_name
      ).length<2
    ){
      return {
        ok:false,
        code:'INVALID_CONTACT_NAME'
      };
    }

    if(
      !text(
        value.country_or_region
      )
    ){
      return {
        ok:false,
        code:'INVALID_COUNTRY'
      };
    }

    if(
      !emailValid(
        value.email_address
      )
    ){
      return {
        ok:false,
        code:'INVALID_EMAIL'
      };
    }

    if(
      text(
        value.phone_or_wechat
      ).length<5
    ){
      return {
        ok:false,
        code:'INVALID_CONTACT_METHOD'
      };
    }

    if(
      Number(
        value.product_count||
        0
      )+
      Number(
        value.custom_count||
        0
      )<
      1
    ){
      return {
        ok:false,
        code:'EMPTY_INQUIRY'
      };
    }

    if(
      text(
        value.items_summary
      ).length<5
    ){
      return {
        ok:false,
        code:'EMPTY_SUMMARY'
      };
    }

    return {
      ok:true,
      code:'OK'
    };
  }

  function build(projection){
    if(
      !projection||
      typeof projection!=='object'||
      Array.isArray(projection)
    ){
      throw new TypeError(
        'Submission projection must be an object.'
      );
    }

    const c=
      projection.contact||
      {};

    const subject=
      '['+
      projection.inquiryId+
      '] DREAMLAND 批发与定制询价 - '+
      (
        c.name||
        '未填写联系人'
      );

    return {
      subject,
      from_name:
        c.name||
        'DREAMLAND 官网访客',
      email:
        c.email||
        '',
      inquiry_id:
        projection.inquiryId,
      submitted_at:
        projection.submittedAt,
      privacy_version:
        projection.privacyVersion,
      privacy_accepted:
        'yes',
      contact_name:
        c.name||
        '',
      company:
        c.company||
        '',
      country_or_region:
        c.country||
        '',
      city:
        c.city||
        '',
      email_address:
        c.email||
        '',
      phone_or_wechat:
        c.phone||
        '',
      buyer_type:
        c.buyerType||
        '',
      message:
        c.message||
        '',

      personal_info:
        JSON.stringify(
          c,
          null,
          2
        ),

      language:
        projection.language,

      estimated_amount:
        projection
          .estimatedTotalDisplay,

      estimated_amount_base_usd:
        projection
          .estimatedTotal
          .toFixed(2),

      product_count:
        projection
          .productCount,

      custom_count:
        projection
          .customCount,

      items_summary:
        projection
          .itemsSummary,

      product_items:
        JSON.stringify(
          projection
            .rawProductItems,
          null,
          2
        ),

      custom_items:
        JSON.stringify(
          projection
            .rawCustomItems,
          null,
          2
        )
    };
  }

  root.DreamlandSubmissionPayload=
    Object.freeze({
      version:VERSION,
      emailValid,
      validate,
      build
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
