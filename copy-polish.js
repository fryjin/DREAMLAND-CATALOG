(function(){
  'use strict';

  if(window.DreamlandCopyPolish)return;

  const HIDDEN_COPY='__DREAMLAND_HIDE_COPY__';
  const INTERNAL_SYNC='__DREAMLAND_INTERNAL_SYNC__';

  const UI_PATCH={
    zh:{
      docTitle:'DREAMLAND 手工雕刻蜡烛｜批发与定制',
      detailTitle:'选择规格',
      currentUnitPrice:'参考单价',
      currentSizeMoq:'起订量',
      submitMoqCheck:HIDDEN_COPY,
      scentSeriesHint:'选择后查看香型和价格',
      viewTierPrice:'查看数量价格',
      tierPriceTable:'数量价格',
      tierPriceDesc:'按数量查看参考单价',
      tierPrice:'数量价格',
      tierRule:'同一系列的数量合并计算',
      bestTierReached:'已是当前最低单价',
      tierUnavailable:'暂无数量价格',
      moqNotMet:'数量还未达到起订量',
      scentNotes:'查看香型详情',
      scentDetailUnavailable:'暂无香型详情',
      packHintAdvanced:'默认包装 / 礼品包装',
      packHintMasterpiece:'默认包装 / 礼品包装',
      packHintOther:'默认包装 / 礼品包装',

      customTitle:'定制需求',
      customSub:'填写数量、预算和其他要求',
      customUseLabel:'使用场景 *',
      customUseError:'请选择使用场景。',
      chooseCustomUse:'请选择使用场景',
      customDateLabel:'希望何时交付',
      phDate:'例如：30 个工作日内，或填写具体日期',
      customColorLabel:'颜色偏好',
      phColor:'例如：粉色、绿色或品牌色',
      customPackLabel:'包装方式',
      customBrandingLabel:'Logo、贺卡或贴纸',
      uploadLabel:'参考图片',
      uploadClick:'选择图片',
      uploadHint:'选填，支持 JPG、PNG、WEBP，最大 5MB',
      customNoteLabel:'其他要求',
      phCustomNote:'可补充颜色、包装、使用场景等要求',
      customInquiry:'定制需求',
      addedCustom:'定制需求已加入',
      customRequired:'请填写标记出的内容',

      inquirySub:'查看已选内容和参考金额',
      emptyTitle:'还没有添加内容',
      emptyText:'先选商品，或直接填写定制需求。',
      makeCustom:'填写定制需求',
      inquiryContent:'已选内容',
      productEstimate:'商品参考金额',
      summaryNote:'页面金额仅供参考，实际价格以双方确认结果为准。',
      consultantQuote:'确认需求后报价',
      consultantConfirm:'确认需求后报价',
      clearConfirmTitle:'清空意向单？',
      clearConfirmText:'已选商品和定制需求都会移除。',
      cancel:'先不清空',

      contactTitle:'联系信息',
      contactSub:'方便我们联系您确认需求和报价',
      nameLabel:'联系人 *',
      messageLabel:'其他说明',
      phMessage:'可填写方便联系的时间，或其他需要说明的内容',
      contactNext:'确认意向单',

      previewTitle:'确认意向单',
      previewSub:'确认无误后提交',
      confirmSubmit:'提交意向单',
      personalInfo:'联系信息',
      productInquiry:'已选商品',
      amountEstimate:'参考金额',
      customPart:'定制费用',
      syncStatus:INTERNAL_SYNC,
      syncReady:'',
      syncPending:'',

      successTitle:'意向单已提交',
      successSub1:'我们已收到您的意向单。',
      successSub2:'我们会联系您确认需求和报价。',
      statusPending:'待联系',
      estimatedAmount:'参考金额',

      updatedInquiry:'商品信息已更新',
      removedInquiry:'已从意向单移除',
      emptyInquiry:'请先添加商品或定制需求',
      needInquiryFirst:'请先添加商品或定制需求',
      contactRequired:'请填写联系信息中的必填项',
      requiredFieldsInvalid:'请检查标记出的内容',
      submissionDuplicate:'正在提交，请稍等。',
      submissionCooldown:'操作有些频繁，请稍后再试。',
      submitFailed:'暂时无法提交，请稍后再试。',
      quantityTooLarge:'数量较大，请联系我们确认。',
      invalidFile:'参考图片支持 JPG、PNG 和 WEBP 格式。',
      fileTooLarge:'参考图片不能超过 5MB。',
      web3KeyMissing:'提交功能暂不可用，请稍后再试。',
      formNotConfigured:'提交功能暂不可用，请通过邮箱联系我们。',
      submissionArchived:'意向单已提交，当前内容已清空。',
      archiveStatus:'已提交',
      captchaLabel:'安全验证',
      captchaRequired:'请先完成安全验证',
      captchaLoading:'正在加载验证…',
      consent:'提交即表示您同意我们按照',
      consentTail:'使用以上信息，用于回复意向、确认需求和评估运输方式。',

      processTitle:'提交说明',
      processNote:'提交意向单不代表正式下单，我们会尽快与您联系，确认需求并推进签约。'
    },
    en:{
      docTitle:'DREAMLAND | Hand-carved Candles for Wholesale & Custom',
      catalogTitle:'Product Catalog',
      catalogSub:'Choose products, then confirm the quote',
      detailTitle:'Choose Options',
      currentUnitPrice:'Estimated Unit Price',
      currentSizeMoq:'MOQ',
      submitMoqCheck:HIDDEN_COPY,
      scentSeriesHint:'Choose a series to view scents and pricing',
      viewTierPrice:'View Volume Pricing',
      tierPriceTable:'Volume Pricing',
      tierPriceDesc:'View estimated unit prices by quantity',
      tierPrice:'Volume Pricing',
      tierRule:'Quantities within the same series are combined',
      bestTierReached:'This is the lowest available unit price',
      tierUnavailable:'Volume pricing is not available',
      moqNotMet:'The quantity is still below the MOQ',
      scentNotes:'View Scent Details',
      scentDetailUnavailable:'No scent details available',
      packHintAdvanced:'Standard / Gift Packaging',
      packHintMasterpiece:'Standard / Gift Packaging',
      packHintOther:'Standard / Gift Packaging',

      customTitle:'Custom Request',
      customSub:'Add quantities, budget, and any other requirements',
      customUseLabel:'Use Case *',
      customUseError:'Please select a use case.',
      chooseCustomUse:'Select a use case',
      customDateLabel:'Preferred Delivery Time',
      phDate:'e.g. within 30 business days or a specific date',
      customColorLabel:'Color Preference',
      phColor:'e.g. pink, green, or brand colors',
      customPackLabel:'Packaging',
      customBrandingLabel:'Logo, Card, or Sticker',
      uploadLabel:'Reference Image',
      uploadClick:'Choose Image',
      uploadHint:'Optional. JPG, PNG, or WEBP, up to 5MB',
      customNoteLabel:'Other Requirements',
      phCustomNote:'Add any color, packaging, or use-case requirements',
      customInquiry:'Custom Request',
      addedCustom:'Custom request added',
      customRequired:'Please complete the highlighted fields',

      inquiryTitle:'Inquiry List',
      inquirySub:'Review your selections and estimated total',
      emptyTitle:'Nothing has been added yet',
      emptyText:'Choose products or add a custom request.',
      makeCustom:'Add Custom Request',
      inquiryContent:'Selected Items',
      productEstimate:'Estimated Product Total',
      summaryNote:'Prices shown are estimates. Final pricing will be confirmed by both sides.',
      consultantQuote:'Quoted after requirements are confirmed',
      consultantConfirm:'Quoted after requirements are confirmed',
      clearConfirmTitle:'Clear the inquiry list?',
      clearConfirmText:'Selected products and custom requests will be removed.',
      cancel:'Keep Items',

      contactTitle:'Contact Details',
      contactSub:'So we can contact you to confirm the details and quote',
      nameLabel:'Contact *',
      messageLabel:'Other Notes',
      phMessage:'Add a preferred contact time or anything else we should know',
      contactNext:'Review Inquiry',

      previewTitle:'Review Inquiry',
      previewSub:'Check the details before submitting',
      confirmSubmit:'Submit Inquiry',
      personalInfo:'Contact Details',
      productInquiry:'Selected Products',
      amountEstimate:'Estimated Total',
      customPart:'Customization',
      syncStatus:INTERNAL_SYNC,
      syncReady:'',
      syncPending:'',

      successTitle:'Inquiry Submitted',
      successSub1:'We’ve received your inquiry.',
      successSub2:'We’ll contact you to confirm the details and quote.',
      statusPending:'Awaiting Contact',
      estimatedAmount:'Estimated Total',

      updatedInquiry:'Product details updated',
      removedInquiry:'Removed from the inquiry list',
      emptyInquiry:'Add a product or custom request first',
      needInquiryFirst:'Add a product or custom request first',
      contactRequired:'Please complete the required contact details',
      requiredFieldsInvalid:'Please check the highlighted fields',
      submissionDuplicate:'Submitting now. Please wait.',
      submissionCooldown:'Please wait a moment before trying again.',
      submitFailed:'We can’t submit this right now. Please try again later.',
      quantityTooLarge:'For this quantity, please contact us directly.',
      invalidFile:'Reference images can be JPG, PNG, or WEBP.',
      fileTooLarge:'Reference images cannot exceed 5MB.',
      web3KeyMissing:'Online submission is temporarily unavailable. Please try again later.',
      formNotConfigured:'Online submission is unavailable. Please contact us by email.',
      submissionArchived:'Your inquiry was submitted and the current list was cleared.',
      archiveStatus:'Submitted',
      captchaLabel:'Security Check',
      captchaRequired:'Please complete the security check',
      captchaLoading:'Loading verification…',

      processTitle:'Before You Submit',
      processNote:'Submitting an inquiry does not place an order. We’ll contact you shortly to confirm the details and proceed with the agreement.'
    },
    ko:{
      docTitle:'DREAMLAND | 핸드카빙 캔들 도매 · 커스텀',
      catalogTitle:'제품 카탈로그',
      catalogSub:'상품을 고른 뒤 견적을 확인해요',
      detailTitle:'옵션 선택',
      currentUnitPrice:'예상 단가',
      currentSizeMoq:'최소 주문 수량',
      submitMoqCheck:HIDDEN_COPY,
      scentSeriesHint:'시리즈를 선택하면 향과 가격을 볼 수 있어요',
      viewTierPrice:'수량별 가격 보기',
      tierPriceTable:'수량별 가격',
      tierPriceDesc:'수량에 따른 예상 단가를 확인해요',
      tierPrice:'수량별 가격',
      tierRule:'같은 시리즈의 수량을 합산해요',
      bestTierReached:'현재 적용 가능한 가장 낮은 단가예요',
      tierUnavailable:'수량별 가격이 아직 없어요',
      moqNotMet:'수량이 최소 주문 수량보다 적어요',
      scentNotes:'향 상세 보기',
      scentDetailUnavailable:'향 상세 정보가 아직 없어요',
      packHintAdvanced:'기본 포장 / 선물 포장',
      packHintMasterpiece:'기본 포장 / 선물 포장',
      packHintOther:'기본 포장 / 선물 포장',

      customTitle:'맞춤 제작 요청',
      customSub:'수량, 예산, 기타 요청 사항을 입력해 주세요',
      customUseLabel:'사용 목적 *',
      customUseError:'사용 목적을 선택해 주세요.',
      chooseCustomUse:'사용 목적을 선택해 주세요',
      customDateLabel:'희망 납기',
      phDate:'예: 영업일 30일 이내 또는 구체적인 날짜',
      customColorLabel:'색상 선호',
      phColor:'예: 핑크, 그린 또는 브랜드 컬러',
      customPackLabel:'포장 방식',
      customBrandingLabel:'로고, 카드 또는 스티커',
      uploadLabel:'참고 이미지',
      uploadClick:'이미지 선택',
      uploadHint:'선택 사항. JPG, PNG, WEBP, 최대 5MB',
      customNoteLabel:'기타 요청 사항',
      phCustomNote:'색상, 포장, 사용 목적 등을 입력해 주세요',
      customInquiry:'맞춤 제작 요청',
      addedCustom:'맞춤 제작 요청을 추가했어요',
      customRequired:'표시된 항목을 입력해 주세요',

      inquiryTitle:'문의 목록',
      inquirySub:'선택한 내용과 예상 금액을 확인해요',
      emptyTitle:'아직 추가한 내용이 없어요',
      emptyText:'상품을 고르거나 맞춤 제작 요청을 작성해 주세요.',
      makeCustom:'맞춤 제작 요청 작성',
      inquiryContent:'선택한 내용',
      productEstimate:'상품 예상 금액',
      summaryNote:'표시 금액은 참고용이에요. 실제 가격은 양측이 확인한 내용을 기준으로 정해요.',
      consultantQuote:'요청 사항을 확인한 뒤 견적을 안내해요',
      consultantConfirm:'요청 사항을 확인한 뒤 견적을 안내해요',
      clearConfirmTitle:'문의 목록을 비울까요?',
      clearConfirmText:'선택한 상품과 맞춤 제작 요청이 모두 삭제돼요.',
      cancel:'그대로 두기',

      contactTitle:'연락처',
      contactSub:'요청 사항과 견적을 확인할 수 있도록 연락드려요',
      nameLabel:'담당자 *',
      messageLabel:'기타 안내',
      phMessage:'연락하기 편한 시간이나 기타 내용을 입력해 주세요',
      contactNext:'문의 내용 확인',

      previewTitle:'문의 내용 확인',
      previewSub:'내용을 확인한 뒤 제출해 주세요',
      confirmSubmit:'문의 제출하기',
      personalInfo:'연락처',
      productInquiry:'선택한 상품',
      amountEstimate:'예상 금액',
      customPart:'맞춤 제작 비용',
      syncStatus:INTERNAL_SYNC,
      syncReady:'',
      syncPending:'',

      successTitle:'문의를 접수했어요',
      successSub1:'문의 내용을 확인했어요.',
      successSub2:'요청 사항과 견적을 확인하기 위해 연락드릴게요.',
      statusPending:'연락 예정',
      estimatedAmount:'예상 금액',

      updatedInquiry:'상품 정보를 수정했어요',
      removedInquiry:'문의 목록에서 삭제했어요',
      emptyInquiry:'상품이나 맞춤 제작 요청을 먼저 추가해 주세요',
      needInquiryFirst:'상품이나 맞춤 제작 요청을 먼저 추가해 주세요',
      contactRequired:'필수 연락처를 입력해 주세요',
      requiredFieldsInvalid:'표시된 항목을 확인해 주세요',
      submissionDuplicate:'제출 중이에요. 잠시 기다려 주세요.',
      submissionCooldown:'잠시 후 다시 시도해 주세요.',
      submitFailed:'지금은 제출할 수 없어요. 잠시 후 다시 시도해 주세요.',
      quantityTooLarge:'수량이 많아요. 직접 문의해 주세요.',
      invalidFile:'참고 이미지는 JPG, PNG, WEBP 형식을 지원해요.',
      fileTooLarge:'참고 이미지는 5MB를 넘을 수 없어요.',
      web3KeyMissing:'온라인 제출을 잠시 사용할 수 없어요. 나중에 다시 시도해 주세요.',
      formNotConfigured:'온라인 제출을 사용할 수 없어요. 이메일로 문의해 주세요.',
      submissionArchived:'문의를 제출했고 현재 목록을 비웠어요.',
      archiveStatus:'제출 완료',
      captchaLabel:'보안 확인',
      captchaRequired:'보안 확인을 먼저 완료해 주세요',
      captchaLoading:'보안 확인을 불러오는 중…',

      processTitle:'제출 전 안내',
      processNote:'문의서를 제출해도 주문이 확정되지는 않아요. 빠르게 연락드려 요청 사항을 확인하고 계약을 진행할게요.'
    }
  };

  const CHOICE_PATCH={
    en:{
      '待确认':'Not sure yet',
      '待推荐':'Please recommend',
      '暂不需要':'Not needed',
      '待沟通确认':'Discuss with us',
      '个人客户':'Individual buyer'
    },
    ko:{
      '待确认':'아직 정하지 않았어요',
      '待推荐':'추천해 주세요',
      '暂不需要':'필요 없어요',
      '待沟通确认':'상담 후 정할게요',
      '需要完整礼盒方案':'선물 박스 전체 구성이 필요해요',
      '个人客户':'개인 구매자'
    }
  };

  const PWA_PATCH={
    zh:{
      offline:'网络连接已断开，已浏览的内容仍可查看。',
      online:'网络已恢复',
      offlineSubmit:'当前没有网络，意向单已保存在本机，联网后可继续提交。',
      updateTitle:'有新内容可用',
      updateCopy:'更新后即可查看最新内容。',
      updateNow:'更新',
      updating:'正在更新…',
      installTitle:'添加到主屏幕',
      installCopy:'添加后，下次打开更方便。',
      installNow:'添加',
      installGuide:'查看方法',
      installed:'已添加',
      iosCopy:'请通过浏览器的分享菜单添加到主屏幕。',
      wechatTitle:'请先用系统浏览器打开',
      wechatCopy:'微信中无法直接添加，请先用 Safari 或 Chrome 打开。',
      manualInstallTitle:'添加到主屏幕',
      manualInstallCopy:'请从浏览器菜单选择“添加到主屏幕”。',
      manualInstallAction:'查看方法'
    },
    en:{
      offline:'You’re offline. Previously opened content is still available.',
      online:'You’re back online',
      offlineSubmit:'You’re offline. Your inquiry is saved on this device and can be submitted after reconnecting.',
      updateTitle:'New content is available',
      updateCopy:'Update to view the latest content.',
      updateNow:'Update',
      updating:'Updating…',
      installTitle:'Add to Home Screen',
      installCopy:'Add it for easier access next time.',
      installNow:'Add',
      installGuide:'View Steps',
      installed:'Added',
      iosCopy:'Use the browser Share menu to add it to your home screen.',
      wechatTitle:'Open in Safari or Chrome',
      wechatCopy:'You can’t add it from WeChat. Open it in Safari or Chrome first.',
      manualInstallTitle:'Add to Home Screen',
      manualInstallCopy:'Choose “Add to Home Screen” from the browser menu.',
      manualInstallAction:'View Steps'
    },
    ko:{
      offline:'네트워크 연결이 끊어졌어요. 이전에 연 내용은 계속 볼 수 있어요.',
      online:'네트워크가 다시 연결됐어요',
      offlineSubmit:'현재 오프라인이에요. 문의 내용은 기기에 저장되어 있고, 연결 후 제출할 수 있어요.',
      updateTitle:'새로운 내용이 있어요',
      updateCopy:'업데이트하면 최신 내용을 볼 수 있어요.',
      updateNow:'업데이트',
      updating:'업데이트 중…',
      installTitle:'홈 화면에 추가',
      installCopy:'추가하면 다음에 더 편하게 열 수 있어요.',
      installNow:'추가',
      installGuide:'방법 보기',
      installed:'추가했어요',
      iosCopy:'브라우저 공유 메뉴에서 홈 화면에 추가해 주세요.',
      wechatTitle:'Safari 또는 Chrome에서 열어 주세요',
      wechatCopy:'WeChat에서는 바로 추가할 수 없어요. Safari 또는 Chrome에서 먼저 열어 주세요.',
      manualInstallTitle:'홈 화면에 추가',
      manualInstallCopy:'브라우저 메뉴에서 “홈 화면에 추가”를 선택해 주세요.',
      manualInstallAction:'방법 보기'
    }
  };

  const RISK_PATCH={
    zh:{
      checking:'正在检查提交信息…',
      safe:'安全检查已完成，可提交。',
      captcha:'请同意隐私说明并完成安全验证。',
      captchaVerifying:'正在验证…',
      captchaRetry:'验证没有完成，请重试。',
      captchaVerified:'安全验证已完成，可提交。',
      unavailable:'暂时无法验证，请检查网络后重试。',
      captchaLoading:'正在加载验证…',
      captchaSlow:'加载较慢，请稍等或重试。',
      captchaFailed:'验证加载失败，请检查网络后重试。',
      retry:'重新加载',
      captchaRequired:'请先完成安全验证。',
      configError:'验证暂时不可用，请稍后再试。'
    },
    en:{
      checking:'Checking your submission…',
      safe:'Security check complete. You may submit.',
      captcha:'Please accept the Privacy Notice and complete the security check.',
      captchaVerifying:'Checking…',
      captchaRetry:'The check was not completed. Please try again.',
      captchaVerified:'Security verification complete. You may submit.',
      unavailable:'We can’t complete the check right now. Check your connection and try again.',
      captchaLoading:'Loading verification…',
      captchaSlow:'This is taking longer than usual. Please wait or try again.',
      captchaFailed:'Verification failed to load. Check your connection and try again.',
      retry:'Reload',
      captchaRequired:'Please complete the security check first.',
      configError:'Verification is temporarily unavailable. Please try again later.'
    },
    ko:{
      checking:'제출 내용을 확인하고 있어요…',
      safe:'보안 확인이 완료됐어요. 제출할 수 있어요.',
      captcha:'개인정보 안내에 동의하고 보안 확인을 완료해 주세요.',
      captchaVerifying:'확인 중…',
      captchaRetry:'확인을 완료하지 못했어요. 다시 시도해 주세요.',
      captchaVerified:'보안 확인이 완료됐어요. 제출할 수 있어요.',
      unavailable:'지금은 확인할 수 없어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      captchaLoading:'보안 확인을 불러오는 중…',
      captchaSlow:'불러오는 데 시간이 걸려요. 잠시 기다리거나 다시 시도해 주세요.',
      captchaFailed:'보안 확인을 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      retry:'다시 불러오기',
      captchaRequired:'보안 확인을 먼저 완료해 주세요.',
      configError:'보안 확인을 잠시 사용할 수 없어요. 나중에 다시 시도해 주세요.'
    }
  };

  const META_COPY={
    zh:'浏览 DREAMLAND 手工雕刻蜡烛系列，了解工艺、产品与定制能力，完成产品配置并提交批发或定制项目询价。',
    en:'Discover hand-carved candles for wholesale, retail, gifting and custom projects. Explore collections, configure product options and request a quotation from DREAMLAND.',
    ko:'DREAMLAND 핸드카빙 캔들 컬렉션과 제작 방식을 살펴보고 제품 옵션을 구성한 뒤 도매 및 커스텀 프로젝트 견적을 문의하세요.'
  };

  const META_IMAGE_ALT={
    zh:'DREAMLAND 手工雕刻蜡烛品牌与产品系列',
    en:'DREAMLAND hand-carved candle brand and collections',
    ko:'DREAMLAND 핸드카빙 캔들 브랜드와 컬렉션'
  };

  let installed=false;

  function language(){
    return (
      typeof currentLang!=='undefined'&&
      ['zh','en','ko'].includes(currentLang)
    )?currentLang:'zh';
  }

  function patchDictionary(target,patch){
    Object.entries(patch).forEach(([lang,values])=>{
      if(!target?.[lang])return;
      Object.assign(target[lang],values);
    });
  }

  function updateMetaContent(
    selector,
    value
  ){
    const node=
      document.querySelector(
        selector
      );

    if(
      node&&
      value
    ){
      node.content=value;
    }
  }

  function updateMeta(){
    const lang=language();

    const title=
      UI_PATCH[lang]?.docTitle||
      UI_PATCH.zh?.docTitle||
      document.title;

    const description=
      META_COPY[lang]||
      META_COPY.zh;

    document.title=title;

    updateMetaContent(
      'meta[name="description"]',
      description
    );

    updateMetaContent(
      'meta[property="og:title"]',
      title
    );

    updateMetaContent(
      'meta[property="og:description"]',
      description
    );

    updateMetaContent(
      'meta[name="twitter:title"]',
      title
    );

    updateMetaContent(
      'meta[name="twitter:description"]',
      description
    );

    updateMetaContent(
      'meta[property="og:image:alt"]',
      META_IMAGE_ALT[lang]||
      META_IMAGE_ALT.zh
    );
  }

  function installStyles(){
    if(document.getElementById('dreamlandCopyPolishStyles'))return;
    const style=document.createElement('style');
    style.id='dreamlandCopyPolishStyles';
    style.textContent=`
      .dreamland-process-note p{
        margin:0;
        color:#777a82;
        font-size:12px;
        line-height:1.65;
      }
      [data-dreamland-hidden-copy="1"]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function removeTechnicalPreviewRows(){
    document.querySelectorAll('#previewContent .kv').forEach(row=>{
      const text=row.textContent||'';
      if(
        text.includes(INTERNAL_SYNC)||
        /Web3Forms|Access Key|전송 상태|Sync Status|同步说明/i.test(text)
      ){
        row.remove();
      }
    });
  }

  function hideInternalHelpers(){
    document.querySelectorAll('[data-screen="detail"] *').forEach(element=>{
      if(element.children.length)return;
      if((element.textContent||'').trim()===HIDDEN_COPY){
        element.dataset.dreamlandHiddenCopy='1';
      }
    });
  }

  function insertProcessNote(){
    const preview=document.getElementById('previewContent');
    if(!preview)return;

    preview.querySelector('.dreamland-process-note')?.remove();
    const verification=preview.querySelector('.verification-card');
    if(!verification)return;

    const lang=language();
    const copy=UI_PATCH[lang]||UI_PATCH.zh;
    const card=document.createElement('div');
    card.className='preview-card dreamland-process-note';
    card.innerHTML=`<h3>${copy.processTitle}</h3><p>${copy.processNote}</p>`;
    verification.before(card);
  }

  function decoratePreview(){
    removeTechnicalPreviewRows();
    insertProcessNote();
  }

  function apply(){
    if(
      typeof uiDict==='undefined'||
      !uiDict?.zh||
      !uiDict?.en||
      !uiDict?.ko
    ){
      return false;
    }

    patchDictionary(uiDict,UI_PATCH);

    if(typeof choiceMaps!=='undefined'){
      patchDictionary(choiceMaps,CHOICE_PATCH);
    }

    if(typeof PWA_COPY!=='undefined'){
      patchDictionary(PWA_COPY,PWA_PATCH);
    }

    if(typeof RISK_COPY!=='undefined'){
      patchDictionary(RISK_COPY,RISK_PATCH);
    }

    installStyles();
    updateMeta();

    if(typeof applyI18n==='function')applyI18n();
    if(typeof refreshPwaUi==='function')refreshPwaUi();
    window.DreamlandCustomScent?.render?.();

    if(typeof activeScreen!=='undefined'){
      if(activeScreen==='inquiry'&&typeof renderInquiry==='function')renderInquiry();
      if(activeScreen==='preview'&&typeof renderPreview==='function')renderPreview();
    }

    hideInternalHelpers();
    decoratePreview();
    installed=true;
    return true;
  }

  function schedule(){
    let attempts=0;
    const check=()=>{
      attempts+=1;
      if(apply()||attempts>=80)return;
      setTimeout(check,100);
    };
    check();
  }

  window.DreamlandCopyPolish={
    apply,
    updateMeta,
    decoratePreview,
    get installed(){return installed;}
  };

  schedule();
})();
