(function(root){
  'use strict';

  if(root.DreamlandDesktopInquiry){
    return;
  }

  const VERSION='B7-00B.3D';
  const PRESENTATION_VERSION='B7-00B.4F-R1';
  const SELECTION_VERSION='B7-00B.4F-R1.1';

  let config=null;
  let inquiryRoot=null;
  let mounted=false;
  let dialog=null;
  let selectedIds=new Set();

  function text(value){
    return String(value??'').trim();
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function copy(){
    return config?.content?.()?.inquiryFlow||{};
  }

  function view(){
    return config?.viewModel?.()||{
      empty:true,
      items:[],
      summary:{
        itemCount:0,
        productCount:0,
        customCount:0,
        productQuantity:0,
        estimatedTotal:0
      }
    };
  }

  function money(value){
    return text(config?.money?.(Number(value)||0)||value);
  }

  function qtyUnit(){
    return text(config?.qtyUnit?.()||'pcs');
  }

  function choice(value){
    return text(config?.choiceLabel?.(value)||value);
  }

  function series(value){
    return text(config?.seriesLabel?.(value)||value);
  }

  function productName(item){
    return text(
      config?.productName?.(item)||
      item?.name||
      item?.productId||
      item?.id
    );
  }

  function itemScent(item){
    return text(config?.itemScentLabel?.(item)||item?.scent||'');
  }

  function itemMoq(item){
    return Math.max(
      1,
      Number(config?.itemMoq?.(item)||item?.moq||1)||1
    );
  }


  function inquiryItems(data=view()){
    return Array.isArray(data?.items)?data.items:[];
  }

  function allInquiryIds(data=view()){
    return inquiryItems(data)
      .map(item=>text(item?.id))
      .filter(Boolean);
  }

  function selectedCount(data=view()){
    const valid=new Set(allInquiryIds(data));
    let count=0;

    for(const id of selectedIds){
      if(valid.has(id)){
        count+=1;
      }
    }

    return count;
  }

  function pruneSelection(data=view()){
    const valid=new Set(allInquiryIds(data));

    selectedIds=new Set(
      [...selectedIds].filter(id=>valid.has(id))
    );

    return selectedIds;
  }

  function itemSelected(id){
    return selectedIds.has(text(id));
  }

  function groupSelectionState(group){
    const ids=(group?.items||[])
      .map(item=>text(item?.id))
      .filter(Boolean);

    const selected=ids.filter(id=>selectedIds.has(id)).length;

    return {
      ids,
      selected,
      checked:ids.length>0&&selected===ids.length,
      mixed:selected>0&&selected<ids.length
    };
  }

  function selectionCountLabel(data=view()){
    const c=copy();
    const selected=selectedCount(data);
    const total=allInquiryIds(data).length;

    return text(c.selectedCount||'{selected} / {total} selected')
      .replace('{selected}',String(selected))
      .replace('{total}',String(total));
  }

  function syncSelectionControls(data=view()){
    pruneSelection(data);

    const ids=allInquiryIds(data);
    const selected=selectedCount(data);
    const all=inquiryRoot?.querySelector('[data-desktop-inquiry-select-all]');

    if(all){
      all.checked=ids.length>0&&selected===ids.length;
      all.indeterminate=selected>0&&selected<ids.length;
    }

    const groups=deriveMoqGroups(data);

    for(const input of inquiryRoot?.querySelectorAll?.('[data-desktop-inquiry-select-group]')||[]){
      const key=text(input.dataset.desktopInquirySelectGroup);
      const group=groups.find(row=>row.key===key);
      const state=groupSelectionState(group);
      input.checked=state.checked;
      input.indeterminate=state.mixed;
    }

    const removeSelected=inquiryRoot?.querySelector('[data-desktop-inquiry-action="remove-selected"]');

    if(removeSelected){
      removeSelected.disabled=selected===0;
    }

    return true;
  }

  function progress(){
    const c=copy();
    const labels=[
      c.stepSelection||'Inquiry',
      c.stepContact||'Contact',
      c.stepReview||'Review'
    ];

    return `
      <div
        class="desktop-flow-progress desktop-inquiry-flow"
        aria-label="${escapeHtml(c.progressLabel||'Inquiry progress')}"
      >
        ${labels.map((label,index)=>`
          <span class="${index===0?'is-active':''}">
            <b>${String(index+1).padStart(2,'0')}</b>
            <strong>${escapeHtml(label)}</strong>
          </span>
        `).join('')}
      </div>
    `;
  }

  function productConfigLine(item){
    return [
      text(item.size),
      itemScent(item),
      choice(item.pattern),
      choice(item.pack)
    ]
      .filter(Boolean)
      .join(' · ');
  }

  function deriveMoqGroups(data=view()){
    const groups=new Map();

    for(const item of data.items||[]){
      if(item?.type!=='product'){
        continue;
      }

      const seriesKey=text(item.series)||'unknown';
      const sizeKey=text(item.size)||'—';
      const key=`${seriesKey}|${sizeKey}`;

      if(!groups.has(key)){
        groups.set(key,{
          key,
          seriesKey,
          seriesLabel:series(seriesKey),
          size:sizeKey,
          quantity:0,
          moq:1,
          items:[]
        });
      }

      const group=groups.get(key);
      group.quantity+=Number(item.normalizedQty||item.qty||0)||0;
      group.moq=Math.max(group.moq,itemMoq(item));
      group.items.push(item);
    }

    return [...groups.values()].map(group=>{
      const ready=group.quantity>=group.moq;
      return Object.freeze({
        ...group,
        ready,
        remaining:Math.max(0,group.moq-group.quantity),
        ratio:Math.min(1,group.quantity/group.moq)
      });
    });
  }

  function moqProgressText(group){
    const c=copy();

    if(group.ready){
      return text(c.moqReady||'MOQ met');
    }

    return text(c.moqRemaining||'{count} pcs remaining')
      .replace('{count}',String(group.remaining));
  }


  function moqGroupHeader(group,index){
    const c=copy();
    const percent=Math.max(0,Math.min(100,group.ratio*100));
    const selection=groupSelectionState(group);

    return `
      <header
        class="desktop-inquiry-moq-group__head ${group.ready?'is-ready':'is-pending'}"
      >
        <div class="desktop-inquiry-moq-group__identity">
          <label class="desktop-inquiry-select" aria-label="${escapeHtml(c.selectGroup||'Select group')}">
            <input
              type="checkbox"
              data-desktop-inquiry-select-group="${escapeHtml(group.key)}"
              ${selection.checked?'checked':''}
            >
          </label>

          <span>${String(index+1).padStart(2,'0')}</span>

          <div>
            <div class="desktop-eyebrow">
              ${escapeHtml(c.moqGroup||'MOQ GROUP')}
            </div>
            <h2>
              ${escapeHtml(group.seriesLabel)}
              <i aria-hidden="true">·</i>
              ${escapeHtml(group.size)}
            </h2>
          </div>
        </div>

        <div class="desktop-inquiry-moq-group__status">
          <div>
            <strong>
              ${escapeHtml(group.quantity)}
              <span>/ ${escapeHtml(group.moq)} ${escapeHtml(qtyUnit())}</span>
            </strong>
            <em>${group.ready?'✓ ':''}${escapeHtml(moqProgressText(group))}</em>
          </div>

          <div
            class="desktop-inquiry-moq-meter"
            aria-label="${escapeHtml(`${group.quantity} / ${group.moq}`)}"
          >
            <span style="width:${percent.toFixed(2)}%"></span>
          </div>

          <p>${escapeHtml(c.moqRule||'Quantities within the same series and size count together toward MOQ.')}</p>
        </div>

        <button
          class="desktop-inquiry-group-remove"
          type="button"
          data-desktop-inquiry-action="remove-group"
          data-group="${escapeHtml(group.key)}"
        >${escapeHtml(c.removeGroup||'Remove group')}</button>
      </header>
    `;
  }


  function productRow(item){
    const c=copy();
    const quantity=Number(item.normalizedQty||item.qty||0)||0;

    return `
      <article
        class="desktop-inquiry-product"
        data-inquiry-id="${escapeHtml(item.id)}"
      >
        <label class="desktop-inquiry-select" aria-label="${escapeHtml(c.selectItem||'Select item')}">
          <input
            type="checkbox"
            data-desktop-inquiry-select-item="${escapeHtml(item.id)}"
            ${itemSelected(item.id)?'checked':''}
          >
        </label>

        <div class="desktop-inquiry-product__media">
          ${
            item.cover
              ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(productName(item))}" loading="lazy" decoding="async">`
              : `<span aria-hidden="true"></span>`
          }
        </div>

        <div class="desktop-inquiry-product__body">
          <header class="desktop-inquiry-product__head">
            <div>
              <div class="desktop-eyebrow">${escapeHtml(series(item.series))}</div>
              <h3>${escapeHtml(productName(item))}</h3>
              <small>${escapeHtml(item.productId||'')}</small>
            </div>

            <button
              class="desktop-inquiry-edit"
              type="button"
              data-desktop-inquiry-action="edit"
              data-id="${escapeHtml(item.id)}"
            >
              ${escapeHtml(c.editConfiguration)}
              <span aria-hidden="true">→</span>
            </button>
          </header>

          <p class="desktop-inquiry-product__config">
            ${escapeHtml(productConfigLine(item))}
          </p>

          <div class="desktop-inquiry-product__commercial">
            <div>
              <span class="desktop-inquiry-commercial-label">
                ${escapeHtml(c.currentItemQuantity||c.quantity||'Current item quantity')}
              </span>

              <div class="desktop-inquiry-quantity">
                <button
                  type="button"
                  data-desktop-inquiry-action="delta"
                  data-id="${escapeHtml(item.id)}"
                  data-delta="-1"
                  aria-label="-"
                >−</button>

                <input
                  type="number"
                  value="${escapeHtml(quantity)}"
                  min="1"
                  step="1"
                  data-desktop-inquiry-qty="${escapeHtml(item.id)}"
                  aria-label="${escapeHtml(c.quantity||'Quantity')}"
                >

                <button
                  type="button"
                  data-desktop-inquiry-action="delta"
                  data-id="${escapeHtml(item.id)}"
                  data-delta="1"
                  aria-label="+"
                >+</button>
              </div>
            </div>

            <div class="desktop-inquiry-price">
              <span>${escapeHtml(money(item.unitPrice))} / ${escapeHtml(qtyUnit())}</span>
              <strong>${escapeHtml(money(item.subtotal))}</strong>
            </div>

            <button
              class="desktop-inquiry-remove"
              type="button"
              data-desktop-inquiry-action="remove"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(c.remove)}</button>
          </div>
        </div>
      </article>
    `;
  }

  function productGroupsHtml(data){
    const c=copy();
    const groups=deriveMoqGroups(data);

    if(!groups.length){
      return '';
    }

    return `
      <section
        class="desktop-inquiry-product-selection"
        data-desktop-inquiry-product-selection
      >
        <div class="desktop-inquiry-workspace__section-head">
          <div>
            <div class="desktop-eyebrow">
              ${escapeHtml(c.workspaceKicker||c.kicker||'INQUIRY REVIEW')}
            </div>
            <h2>${escapeHtml(c.productSelection||c.selectedProducts||'Product selection')}</h2>
          </div>

          <strong>
            ${escapeHtml(data.summary?.productCount||0)}
            <span>${escapeHtml(c.productConfigurations||'configurations')}</span>
          </strong>
        </div>

        <div class="desktop-inquiry-moq-groups">
          ${groups.map((group,index)=>`
            <section
              class="desktop-inquiry-moq-group"
              data-desktop-inquiry-moq-group="${escapeHtml(group.key)}"
            >
              ${moqGroupHeader(group,index)}
              <div class="desktop-inquiry-moq-group__items">
                ${group.items.map(productRow).join('')}
              </div>
            </section>
          `).join('')}
        </div>
      </section>
    `;
  }

  function customConfig(item){
    const c=copy();
    const scents=Array.isArray(item.scents)
      ? item.scents.join(' / ')
      : text(item.scent);

    return [
      choice(item.use),
      item.qty ? `${item.qty} ${qtyUnit()}` : '',
      choice(item.sizePref),
      series(item.scentSeries),
      scents,
      choice(item.pack),
      choice(item.branding)
    ].filter(Boolean);
  }


  function customRow(item,index){
    const c=copy();
    const values=customConfig(item);

    return `
      <article
        class="desktop-inquiry-custom-project"
        data-inquiry-id="${escapeHtml(item.id)}"
      >
        <label class="desktop-inquiry-select" aria-label="${escapeHtml(c.selectItem||'Select item')}">
          <input
            type="checkbox"
            data-desktop-inquiry-select-item="${escapeHtml(item.id)}"
            ${itemSelected(item.id)?'checked':''}
          >
        </label>

        <div class="desktop-inquiry-custom-project__index">
          CUSTOM / ${String(index+1).padStart(2,'0')}
        </div>

        <div class="desktop-inquiry-custom-project__body">
          <header>
            <div>
              <div class="desktop-eyebrow">${escapeHtml(c.customProject)}</div>
              <h3>${escapeHtml(choice(item.use)||c.customProject)}</h3>
            </div>

            <button
              class="desktop-inquiry-remove"
              type="button"
              data-desktop-inquiry-action="remove"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(c.remove)}</button>
          </header>

          <p>${values.map(escapeHtml).join(' · ')}</p>

          <div class="desktop-inquiry-custom-project__quote">
            <span>${escapeHtml(c.pricing||'Pricing')}</span>
            <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
          </div>
        </div>
      </article>
    `;
  }

  function customProjectsHtml(data){
    const c=copy();
    const items=(data.items||[]).filter(item=>item?.type==='custom');

    if(!items.length){
      return '';
    }

    return `
      <section
        class="desktop-inquiry-custom-projects"
        data-desktop-inquiry-custom-projects
      >
        <div class="desktop-inquiry-workspace__section-head">
          <div>
            <div class="desktop-eyebrow">${escapeHtml(c.customProject)}</div>
            <h2>${escapeHtml(c.customProjects||c.customProject)}</h2>
          </div>

          <strong>${items.length}</strong>
        </div>

        <div>
          ${items.map(customRow).join('')}
        </div>
      </section>
    `;
  }


  function workspaceBody(data){
    const c=copy();
    const total=allInquiryIds(data).length;
    const selected=selectedCount(data);

    return `
      <div class="desktop-inquiry-workspace__head">
        <div class="desktop-inquiry-selection-tools">
          <label class="desktop-inquiry-select">
            <input
              type="checkbox"
              data-desktop-inquiry-select-all
              ${total>0&&selected===total?'checked':''}
            >
            <span>${escapeHtml(c.selectAll||'Select all')}</span>
          </label>

          <span class="desktop-inquiry-selection-count">
            ${escapeHtml(selectionCountLabel(data))}
          </span>
        </div>

        <div class="desktop-inquiry-selection-actions">
          <button
            type="button"
            data-desktop-inquiry-action="remove-selected"
            ${selected===0?'disabled':''}
          >${escapeHtml(c.removeSelected||'Remove selected')}</button>

          <button
            type="button"
            data-desktop-inquiry-action="clear"
          >${escapeHtml(c.clearInquiry||c.clearAll)}</button>
        </div>
      </div>

      ${productGroupsHtml(data)}
      ${customProjectsHtml(data)}
    `;
  }

  function moqSummary(data){
    const groups=deriveMoqGroups(data);
    const ready=groups.filter(group=>group.ready).length;
    const pending=groups.length-ready;

    return {
      total:groups.length,
      ready,
      pending
    };
  }

  function overviewHtml(data){
    const c=copy();
    const summary=data.summary||{};
    const moq=moqSummary(data);

    const readyText=text(c.moqGroupsReady||'{count} groups ready')
      .replace('{count}',String(moq.ready));

    const pendingText=text(c.moqGroupsPending||'{count} groups still below MOQ')
      .replace('{count}',String(moq.pending));

    return `
      <div class="desktop-inquiry-overview__head">
        <div class="desktop-eyebrow">${escapeHtml(c.summaryKicker)}</div>
        <h2>${escapeHtml(c.inquiryOverview||c.summaryTitle)}</h2>
      </div>

      <div class="desktop-inquiry-overview__metrics">
        <div>
          <strong>${escapeHtml(summary.productCount||0)}</strong>
          <span>${escapeHtml(c.productConfigurations||'Product configurations')}</span>
        </div>

        <div>
          <strong>${escapeHtml(summary.productQuantity||0)}</strong>
          <span>${escapeHtml(c.totalQuantity)}</span>
        </div>

        ${
          Number(summary.customCount||0)>0
            ? `<div>
                <strong>${escapeHtml(summary.customCount)}</strong>
                <span>${escapeHtml(c.customProjects||c.customProject)}</span>
              </div>`
            : ''
        }
      </div>

      ${
        moq.total
          ? `
            <section class="desktop-inquiry-overview__moq">
              <span>${escapeHtml(c.moqReview||'MOQ REVIEW')}</span>
              <strong>${escapeHtml(readyText)}</strong>
              ${
                moq.pending
                  ? `<p>${escapeHtml(pendingText)}</p>`
                  : `<p>✓ ${escapeHtml(c.moqReady||'MOQ met')}</p>`
              }
            </section>
          `
          : ''
      }

      <section class="desktop-inquiry-overview__estimate">
        <span>${escapeHtml(c.productEstimate)}</span>
        <strong>${escapeHtml(money(summary.estimatedTotal||0))}</strong>

        ${
          Number(summary.customCount||0)>0
            ? `<p>
                ${escapeHtml(c.customProject)}
                ·
                ${escapeHtml(c.customQuotedSeparately)}
              </p>`
            : ''
        }
      </section>

      <p class="desktop-inquiry-overview__note">
        ${escapeHtml(c.finalPricingNote)}
      </p>

      <button
        class="desktop-flow-primary"
        type="button"
        data-desktop-inquiry-action="continue"
      >
        ${escapeHtml(c.continueContact)}
        <span aria-hidden="true">→</span>
      </button>

      <button
        class="desktop-flow-secondary"
        type="button"
        data-desktop-inquiry-action="explore"
      >${escapeHtml(c.continueExploring)}</button>
    `;
  }


  function dialogHtml(){
    if(!dialog){
      return '';
    }

    const c=copy();
    const type=text(dialog.type);
    const clear=type==='clear';
    const group=type==='remove-group';
    const batch=type==='remove-selected';
    const count=Array.isArray(dialog.ids)?dialog.ids.length:0;

    const title=
      clear
        ? c.clearTitle
        : group
          ? c.removeGroupTitle
          : batch
            ? c.removeSelectedTitle
            : c.removeTitle;

    const bodyTemplate=text(
      clear
        ? c.clearBody
        : group
          ? c.removeGroupBody
          : batch
            ? c.removeSelectedBody
            : c.removeBody
    );

    const body=bodyTemplate.replace('{count}',String(count));

    return `
      <div class="desktop-flow-dialog-layer" data-desktop-inquiry-dialog>
        <div class="desktop-flow-dialog" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(body)}</p>
          <div>
            <button
              class="desktop-flow-secondary"
              type="button"
              data-desktop-inquiry-action="dialog-cancel"
            >${escapeHtml(c.cancel)}</button>

            <button
              class="desktop-flow-danger"
              type="button"
              data-desktop-inquiry-action="dialog-confirm"
            >${escapeHtml(clear?c.clearAll:c.remove)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function emptyHtml(){
    const c=copy();

    return `
      <div
        class="desktop-flow-page desktop-inquiry-page"
        data-desktop-inquiry-presentation="${PRESENTATION_VERSION}"
        data-desktop-inquiry-selection="${SELECTION_VERSION}"
      >
        <div class="desktop-container--wide desktop-inquiry-shell">
          <div class="desktop-flow-empty desktop-inquiry-empty">
            <div class="desktop-eyebrow">${escapeHtml(c.kicker)}</div>
            <h1>${escapeHtml(c.emptyTitle)}</h1>
            <p>${escapeHtml(c.emptyBody)}</p>

            <div>
              <button
                class="desktop-flow-primary"
                type="button"
                data-desktop-inquiry-action="explore"
              >${escapeHtml(c.exploreCollection)} <span aria-hidden="true">→</span></button>

              <button
                class="desktop-flow-secondary"
                type="button"
                data-desktop-inquiry-action="custom"
              >${escapeHtml(c.startCustom)}</button>
            </div>
          </div>
        </div>

        <div data-desktop-inquiry-dialog-host></div>
      </div>
    `;
  }

  function pageHtml(){
    const c=copy();
    const data=view();

    if(data.empty){
      return emptyHtml();
    }

    return `
      <div
        class="desktop-flow-page desktop-inquiry-page"
        data-desktop-inquiry-presentation="${PRESENTATION_VERSION}"
        data-desktop-inquiry-selection="${SELECTION_VERSION}"
      >
        <div class="desktop-container--wide desktop-inquiry-shell">
          <header class="desktop-flow-hero desktop-inquiry-hero">
            <div>
              <div class="desktop-eyebrow">${escapeHtml(c.kicker)} / 01</div>
              <h1>${escapeHtml(c.workspaceTitle||c.title)}</h1>
            </div>

            <p>${escapeHtml(c.workspaceBody||c.body)}</p>

            ${progress()}
          </header>

          <div class="desktop-inquiry-layout">
            <main
              class="desktop-inquiry-workspace"
              data-desktop-inquiry-workspace
            >
              ${workspaceBody(data)}
            </main>

            <aside
              class="desktop-inquiry-summary desktop-inquiry-overview"
              data-desktop-inquiry-overview
            >
              ${overviewHtml(data)}
            </aside>
          </div>
        </div>

        <div data-desktop-inquiry-dialog-host>
          ${dialogHtml()}
        </div>
      </div>
    `;
  }


  function render(){
    if(!inquiryRoot){
      return false;
    }

    inquiryRoot.innerHTML=pageHtml();
    const data=view();
    pruneSelection(data);
    syncSelectionControls(data);
    return true;
  }

  function syncOverview(data=view()){
    const node=inquiryRoot?.querySelector('[data-desktop-inquiry-overview]');
    if(!node){
      return false;
    }

    node.innerHTML=overviewHtml(data);
    return true;
  }


  function syncWorkspace(data=view()){
    if(data.empty){
      selectedIds.clear();
      return render();
    }

    pruneSelection(data);

    const node=inquiryRoot?.querySelector('[data-desktop-inquiry-workspace]');

    if(!node){
      return render();
    }

    node.innerHTML=workspaceBody(data);
    syncOverview(data);
    syncSelectionControls(data);
    return true;
  }

  function renderDialog(){
    const host=inquiryRoot?.querySelector('[data-desktop-inquiry-dialog-host]');
    if(!host){
      return false;
    }

    host.innerHTML=dialogHtml();
    return true;
  }


  function syncAfterMutation(){
    dialog=null;
    config?.actions?.syncInquiry?.();
    const data=view();

    if(data.empty){
      selectedIds.clear();
      return render();
    }

    pruneSelection(data);
    renderDialog();
    return syncWorkspace(data);
  }


  function onClick(event){
    const target=event.target.closest?.('[data-desktop-inquiry-action]');

    if(!target||!inquiryRoot?.contains(target)){
      return;
    }

    const action=target.dataset.desktopInquiryAction;
    const id=text(target.dataset.id);

    if(action==='delta'){
      config?.actions?.adjustQuantity?.(
        id,
        Number(target.dataset.delta)||0
      );
      syncAfterMutation();
      return;
    }

    if(action==='edit'){
      config?.actions?.edit?.(id);
      return;
    }

    if(action==='remove'){
      dialog={
        type:'remove',
        ids:id?[id]:[]
      };
      renderDialog();
      return;
    }

    if(action==='remove-group'){
      const key=text(target.dataset.group);
      const group=deriveMoqGroups(view()).find(row=>row.key===key);

      dialog={
        type:'remove-group',
        ids:(group?.items||[]).map(item=>text(item.id)).filter(Boolean)
      };
      renderDialog();
      return;
    }

    if(action==='remove-selected'){
      const ids=[...selectedIds];

      if(!ids.length){
        return;
      }

      dialog={
        type:'remove-selected',
        ids
      };
      renderDialog();
      return;
    }

    if(action==='clear'){
      dialog={type:'clear'};
      renderDialog();
      return;
    }

    if(action==='dialog-cancel'){
      dialog=null;
      renderDialog();
      return;
    }

    if(action==='dialog-confirm'){
      if(dialog?.type==='clear'){
        config?.actions?.clear?.();
        selectedIds.clear();
      }else{
        for(const removeId of dialog?.ids||[]){
          config?.actions?.remove?.(removeId);
          selectedIds.delete(removeId);
        }
      }

      syncAfterMutation();
      return;
    }

    if(action==='continue'){
      const result=config?.actions?.continue?.();

      if(result?.ok===false){
        config?.actions?.feedback?.(
          result.message||
          copy().cannotContinue
        );
      }
      return;
    }

    if(action==='explore'){
      config?.actions?.explore?.();
      return;
    }

    if(action==='custom'){
      config?.actions?.custom?.();
    }
  }


  function onChange(event){
    const itemSelect=event.target.closest?.('[data-desktop-inquiry-select-item]');

    if(itemSelect&&inquiryRoot?.contains(itemSelect)){
      const id=text(itemSelect.dataset.desktopInquirySelectItem);

      if(itemSelect.checked){
        selectedIds.add(id);
      }else{
        selectedIds.delete(id);
      }

      syncWorkspace(view());
      return;
    }

    const groupSelect=event.target.closest?.('[data-desktop-inquiry-select-group]');

    if(groupSelect&&inquiryRoot?.contains(groupSelect)){
      const key=text(groupSelect.dataset.desktopInquirySelectGroup);
      const group=deriveMoqGroups(view()).find(row=>row.key===key);

      for(const item of group?.items||[]){
        const id=text(item?.id);

        if(!id){
          continue;
        }

        if(groupSelect.checked){
          selectedIds.add(id);
        }else{
          selectedIds.delete(id);
        }
      }

      syncWorkspace(view());
      return;
    }

    const allSelect=event.target.closest?.('[data-desktop-inquiry-select-all]');

    if(allSelect&&inquiryRoot?.contains(allSelect)){
      selectedIds=
        allSelect.checked
          ? new Set(allInquiryIds(view()))
          : new Set();

      syncWorkspace(view());
      return;
    }

    const input=event.target.closest?.('[data-desktop-inquiry-qty]');

    if(!input||!inquiryRoot?.contains(input)){
      return;
    }

    config?.actions?.setQuantity?.(
      input.dataset.desktopInquiryQty,
      input.value
    );

    syncAfterMutation();
  }

  function onKeyDown(event){
    const input=event.target.closest?.('[data-desktop-inquiry-qty]');

    if(event.key==='Enter'&&input&&inquiryRoot?.contains(input)){
      event.preventDefault();
      input.blur();
      return;
    }

    if(event.key==='Escape'&&dialog){
      dialog=null;
      renderDialog();
    }
  }

  function configure(options={}){
    config={
      content:typeof options.content==='function'?options.content:()=>({}),
      viewModel:typeof options.viewModel==='function'?options.viewModel:()=>({empty:true}),
      productName:options.productName,
      seriesLabel:options.seriesLabel,
      choiceLabel:options.choiceLabel,
      itemScentLabel:options.itemScentLabel,
      itemMoq:options.itemMoq,
      money:options.money,
      qtyUnit:options.qtyUnit,
      actions:options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    inquiryRoot=rootElement||inquiryRoot;

    if(!inquiryRoot){
      return false;
    }

    if(!mounted){
      inquiryRoot.addEventListener('click',onClick);
      inquiryRoot.addEventListener('change',onChange);
      inquiryRoot.addEventListener('keydown',onKeyDown);
      mounted=true;
    }

    render();
    return true;
  }

  function refresh(){
    return render();
  }

  function syncInquiry(){
    return render();
  }

  function snapshot(){
    const data=view();

    return Object.freeze({
      version:VERSION,
      presentation:PRESENTATION_VERSION,
      selection:SELECTION_VERSION,
      configured:Boolean(config),
      mounted,
      itemCount:Number(data.summary?.itemCount||0),
      moqGroups:deriveMoqGroups(data).length
    });
  }

  root.DreamlandDesktopInquiry=Object.freeze({
    version:VERSION,
    configure,
    mount,
    refresh,
    syncInquiry,
    snapshot
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);
