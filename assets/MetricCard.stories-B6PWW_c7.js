import{i as e}from"./preload-helper-xPQekRTU.js";import{t}from"./iframe-Cy8CAO6i.js";import{t as n}from"./jsx-runtime-D0ezwkS-.js";import{n as r,t as i}from"./Skeleton-B8GgNEBm.js";var a=e((()=>{})),o,s,c,l,u,d,f=e((()=>{a(),o=`cb30kf0`,s=`cb30kf1`,c=`cb30kf2`,l=`cb30kf3`,u=`cb30kf4`,d=`cb30kf5`})),p,m,h,g,_=e((()=>{t(),i(),f(),p=n(),m=(e,t)=>{if(typeof e!=`number`)return String(e);if(t===`percent`)return`${(e*100).toFixed(1)}%`;if(t===`currency`)return new Intl.NumberFormat(`en-GB`,{style:`currency`,currency:`GBP`,maximumFractionDigits:0}).format(e);if(t===`duration`){let t=Math.round(e),n=Math.floor(t/3600),r=Math.floor(t%3600/60),i=t%60;return n>0?`${n}h ${r}m`:r>0?`${r}m ${i}s`:`${i}s`}return new Intl.NumberFormat(void 0).format(e)},h=(e,t)=>{let n=!t;return e===0?`var(--color-text-muted, #6b7280)`:e>0&&n||e<0&&!n?`var(--color-success, #16a34a)`:`var(--color-danger, #dc2626)`},g=({label:e,value:t,delta:n,deltaInverted:i,format:a,helperText:f,icon:g,iconColor:_,loading:v})=>(0,p.jsxs)(`div`,{className:o,"data-testid":`metric-card`,children:[g?(0,p.jsx)(`div`,{className:s,"data-testid":`metric-card-icon`,style:_?{background:`${_}20`,color:_}:void 0,children:g}):null,(0,p.jsx)(`h4`,{className:c,children:e}),v?(0,p.jsx)(`div`,{className:l,"data-testid":`metric-card-skeleton`,children:(0,p.jsx)(r,{width:`70%`,height:`1.6rem`})}):(0,p.jsx)(`div`,{className:l,children:m(t,a)}),!v&&typeof n==`number`?(0,p.jsxs)(`div`,{className:u,style:{color:h(n,!!i)},children:[n>0?`+`:``,(n*100).toFixed(1),`%`]}):null,!v&&f?(0,p.jsx)(`div`,{className:d,children:f}):null]}),g.__docgenInfo={description:``,methods:[],displayName:`MetricCard`,props:{label:{required:!0,tsType:{name:`string`},description:``},value:{required:!0,tsType:{name:`union`,raw:`number | string`,elements:[{name:`number`},{name:`string`}]},description:``},delta:{required:!1,tsType:{name:`number`},description:``},deltaInverted:{required:!1,tsType:{name:`boolean`},description:`When true, a positive delta is displayed in red (e.g. error rate going up).`},format:{required:!1,tsType:{name:`union`,raw:`'number' | 'percent' | 'currency' | 'duration'`,elements:[{name:`literal`,value:`'number'`},{name:`literal`,value:`'percent'`},{name:`literal`,value:`'currency'`},{name:`literal`,value:`'duration'`}]},description:``},helperText:{required:!1,tsType:{name:`string`},description:``},icon:{required:!1,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:`Optional icon rendered above the label.`},iconColor:{required:!1,tsType:{name:`string`},description:`Tints the icon (e.g. '#667eea'); the background uses the same colour at low opacity.`},loading:{required:!1,tsType:{name:`boolean`},description:`When true, the value is replaced with a skeleton (delta/helper are hidden).`}}}})),v,y,b,x,S,C,w,T;e((()=>{_(),v={title:`Charts/MetricCard`,component:g,tags:[`autodocs`],argTypes:{format:{control:{type:`select`},options:[`number`,`percent`,`currency`,`duration`]},deltaInverted:{control:{type:`boolean`}}}},y={args:{label:`Total users`,value:12543}},b={args:{label:`Adoption rate`,value:.163,format:`percent`,delta:.052}},x={args:{label:`Error rate`,value:.021,format:`percent`,delta:.004,deltaInverted:!0}},S={args:{label:`Donations`,value:48200,format:`currency`}},C={args:{label:`Active rescues`,value:74,helperText:`90 total`}},w={args:{label:`Total users`,value:12543,icon:`👥`,iconColor:`#667eea`}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Total users',
    value: 12543
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Adoption rate',
    value: 0.163,
    format: 'percent',
    delta: 0.052
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Error rate',
    value: 0.021,
    format: 'percent',
    delta: 0.004,
    deltaInverted: true
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Donations',
    value: 48200,
    format: 'currency'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Active rescues',
    value: 74,
    helperText: '90 total'
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Total users',
    value: 12543,
    icon: '👥',
    iconColor: '#667eea'
  }
}`,...w.parameters?.docs?.source}}},T=[`Basic`,`WithDelta`,`InvertedDelta`,`Currency`,`WithHelperText`,`WithIcon`]}))();export{y as Basic,S as Currency,x as InvertedDelta,b as WithDelta,C as WithHelperText,w as WithIcon,T as __namedExportsOrder,v as default};