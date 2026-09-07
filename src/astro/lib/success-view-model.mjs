function text(value){
  return String(
    value??
    ''
  ).trim();
}

function frozenStrings(value){
  return Object.freeze(
    (
      Array.isArray(value)
        ? value
        : []
    ).map(
      item=>
        text(
          item
        )
    )
      .filter(
        Boolean
      )
  );
}

export function buildSuccessStaticView({
  language='en',
  siteContent={},
  localizationPolicy,
  pageGuards
}={}){
  if(
    !localizationPolicy||
    !pageGuards
  ){
    throw new Error(
      'Success Static View requires canonical Localization and PageGuards owners.'
    );
  }

  const localized=
    localizationPolicy
      .localizedContent(
        language,
        siteContent
      );

  const sourceCopy=
    localized.inquiryFlow||
    {};

  const guard=
    pageGuards.evaluate(
      'success',
      {
        lastSubmission:null
      }
    );

  if(
    guard.allowed!==false||
    guard.code!==
      'SUBMISSION_REQUIRED'||
    guard.target!==
      '/inquiry/'
  ){
    throw new Error(
      'R4.10A build-time Success guard must honestly reject the missing lastSubmission and point back to /inquiry/.'
    );
  }

  const copy=Object.freeze({
    successKicker:
      text(
        sourceCopy.successKicker
      ),
    successTitle:
      text(
        sourceCopy.successTitle
      ),
    successBody:
      text(
        sourceCopy.successBody
      ),
    inquiryNumber:
      text(
        sourceCopy.inquiryNumber
      ),
    submitted:
      text(
        sourceCopy.submitted
      ),
    productEstimate:
      text(
        sourceCopy.productEstimate
      ),
    status:
      text(
        sourceCopy.status
      ),
    awaitingReview:
      text(
        sourceCopy.awaitingReview
      ),
    whatNextKicker:
      text(
        sourceCopy.whatNextKicker
      ),
    whatNextTitle:
      text(
        sourceCopy.whatNextTitle
      ),
    whatNextSteps:
      frozenStrings(
        sourceCopy.whatNextSteps
      ),
    continueExploring:
      text(
        sourceCopy.continueExploring
      ),
    startAnotherProject:
      text(
        sourceCopy.startAnotherProject
      )
  });

  return Object.freeze({
    version:
      'R4.10A',
    language,
    content:
      localized,
    copy,
    submission:Object.freeze({
      inquiryId:'',
      submittedAt:'',
      amountDisplay:''
    }),
    guard:Object.freeze({
      name:
        'hasLastSubmission',
      allowed:
        false,
      code:
        guard.code,
      target:
        guard.target
    }),
    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      catalog:
        '/products/',
      custom:
        '/custom/'
    })
  });
}
