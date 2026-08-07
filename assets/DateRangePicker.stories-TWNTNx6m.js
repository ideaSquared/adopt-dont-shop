import{i as e,s as t}from"./preload-helper-xPQekRTU.js";import{t as n}from"./iframe-Cy8CAO6i.js";import{i as r,n as i,r as a,t as o}from"./jsx-runtime-D0ezwkS-.js";import{n as s,t as c}from"./DateInput-BTpkq8Et.js";var l=e((()=>{})),u,d,f,p,m,h,g=e((()=>{i(),l(),u=`_6tofpg0`,d=`_6tofpg1`,f=`_6tofpg2`,p=`_6tofpg3`,m=`_6tofpg4`,h=`_6tofpg5`})),_,v,y,b,x=e((()=>{_=t(n(),1),r(),c(),g(),v=o(),y=(e,t)=>!!(e&&t&&t<e),b=({value:e,onChange:t,fromLabel:n=`From`,toLabel:r=`To`,min:i,max:o,disabled:c=!1,error:l,required:g=!1,presets:b,className:x,"data-testid":S})=>{let C=(0,_.useId)(),w=(0,_.useId)(),T=l??(y(e.from,e.to)?`The end date must be on or after the start date.`:void 0);return(0,v.jsxs)(`div`,{className:a(u,x),"data-testid":S,children:[b&&b.length>0?(0,v.jsx)(`div`,{className:d,role:`group`,"aria-label":`Quick date ranges`,children:b.map(e=>(0,v.jsx)(`button`,{type:`button`,className:f,onClick:()=>t(e.getRange()),disabled:c,children:e.label},e.label))}):null,(0,v.jsxs)(`div`,{className:p,children:[(0,v.jsxs)(`label`,{htmlFor:C,className:m,children:[n,g?(0,v.jsx)(`span`,{"aria-hidden":`true`,children:` *`}):null]}),(0,v.jsx)(s,{id:C,value:e.from??``,onChange:n=>t({from:n.target.value||null,to:e.to}),disabled:c,min:i,max:e.to??o})]}),(0,v.jsxs)(`div`,{className:p,children:[(0,v.jsxs)(`label`,{htmlFor:w,className:m,children:[r,g?(0,v.jsx)(`span`,{"aria-hidden":`true`,children:` *`}):null]}),(0,v.jsx)(s,{id:w,value:e.to??``,onChange:n=>t({from:e.from,to:n.target.value||null}),disabled:c,min:e.from??i,max:o})]}),T?(0,v.jsx)(`p`,{role:`alert`,className:h,children:T}):null]})},b.__docgenInfo={description:"DateRangePicker — a shared from/to date range control composed from the\nexisting `DateInput` (native `<input type=\"date\">`, so it renders in the\nuser's locale — dd/mm/yyyy for en-GB). Values are ISO `yyyy-mm-dd` strings\n(or `null`). Selecting a range where `to` precedes `from` surfaces an\naccessible error, and each field constrains the other's min/max.\n\nPass `presets` to render quick-select shortcuts above the fields — each sets\nthe from/to value on click. Omit it and the component renders exactly as a\nplain from/to range control.",methods:[],displayName:`DateRangePicker`,props:{value:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  from: string | null;
  to: string | null;
}`,signature:{properties:[{key:`from`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`to`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]}},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(value: DateRangeValue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  from: string | null;
  to: string | null;
}`,signature:{properties:[{key:`from`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`to`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]}},name:`value`}],return:{name:`void`}}},description:``},fromLabel:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'From'`,computed:!1}},toLabel:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'To'`,computed:!1}},min:{required:!1,tsType:{name:`string`},description:``},max:{required:!1,tsType:{name:`string`},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},error:{required:!1,tsType:{name:`string`},description:``},required:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},presets:{required:!1,tsType:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{
  label: string;
  getRange: () => DateRangeValue;
}`,signature:{properties:[{key:`label`,value:{name:`string`,required:!0}},{key:`getRange`,value:{name:`signature`,type:`function`,raw:`() => DateRangeValue`,signature:{arguments:[],return:{name:`signature`,type:`object`,raw:`{
  from: string | null;
  to: string | null;
}`,signature:{properties:[{key:`from`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`to`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]}}},required:!0}}]}}],raw:`DateRangePreset[]`},description:``},className:{required:!1,tsType:{name:`string`},description:``},"data-testid":{required:!1,tsType:{name:`string`},description:``}}}})),S,C,w,T,E,D,O=e((()=>{S=e=>String(e).padStart(2,`0`),C=e=>`${e.getFullYear()}-${S(e.getMonth()+1)}-${S(e.getDate())}`,w=(e,t)=>{let n=new Date(e);return n.setDate(n.getDate()-t),n},T=(e,t)=>()=>{let n=e();return{from:C(w(n,t)),to:C(n)}},E=(e,t)=>()=>{let n=e(),r=new Date(n.getFullYear(),n.getMonth()+t,1),i=new Date(n.getFullYear(),n.getMonth()+t+1,0);return{from:C(r),to:C(i)}},D=(e=()=>new Date)=>[{label:`Last 7 days`,getRange:T(e,7)},{label:`Last 30 days`,getRange:T(e,30)},{label:`Last 90 days`,getRange:T(e,90)},{label:`This month`,getRange:E(e,0)},{label:`Last month`,getRange:E(e,-1)}]})),k,A,j,M,N,P;e((()=>{x(),O(),k={title:`Components/DateRangePicker`,component:b,tags:[`autodocs`]},A={args:{value:{from:null,to:null},onChange:()=>{}}},j={args:{value:{from:`2026-08-01`,to:`2026-08-31`},onChange:()=>{}}},M={args:{value:{from:`2026-08-31`,to:`2026-08-01`},onChange:()=>{}}},N={args:{value:{from:null,to:null},onChange:()=>{},presets:D()}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    value: {
      from: null,
      to: null
    },
    onChange: () => {}
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    value: {
      from: '2026-08-01',
      to: '2026-08-31'
    },
    onChange: () => {}
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    value: {
      from: '2026-08-31',
      to: '2026-08-01'
    },
    onChange: () => {}
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    value: {
      from: null,
      to: null
    },
    onChange: () => {},
    presets: createDefaultDateRangePresets()
  }
}`,...N.parameters?.docs?.source}}},P=[`Default`,`Prefilled`,`InvalidRange`,`WithPresets`]}))();export{A as Default,M as InvalidRange,j as Prefilled,N as WithPresets,P as __namedExportsOrder,k as default};