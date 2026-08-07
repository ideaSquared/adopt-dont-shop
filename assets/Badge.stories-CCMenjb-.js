import{i as e}from"./preload-helper-xPQekRTU.js";import{t}from"./iframe-Cy8CAO6i.js";import{i as n,n as r,r as i,t as a}from"./jsx-runtime-D0ezwkS-.js";import{n as o,t as s}from"./vanilla-extract-recipes-createRuntimeFn.esm-G9188wGl.js";var c=e((()=>{})),l,u,d,f=e((()=>{r(),c(),s(),l=o({defaultClassName:`fbwoep0`,variantClassNames:{size:{xs:`fbwoep1`,sm:`fbwoep2`,md:`fbwoep3`,lg:`fbwoep4`},variant:{primary:`fbwoep5`,secondary:`fbwoep6`,success:`fbwoep7`,error:`fbwoep8`,warning:`fbwoep9`,info:`fbwoepa`,neutral:`fbwoepb`,outline:`fbwoepc`,count:`fbwoepd`},rounded:{true:`fbwoepe`,false:`fbwoepf`},disabled:{true:`fbwoepg`,false:`fbwoeph`},dot:{true:`fbwoepi`,false:`fbwoepj`}},defaultVariants:{size:`md`,variant:`neutral`,rounded:!1,disabled:!1,dot:!1},compoundVariants:[]}),u={xs:`fbwoepk`,sm:`fbwoepl`,md:`fbwoepm`,lg:`fbwoepn`},d=o({defaultClassName:`fbwoeps`,variantClassNames:{size:{xs:`fbwoept fbwoepo`,sm:`fbwoepu fbwoepp`,md:`fbwoepv fbwoepq`,lg:`fbwoepw fbwoepr`}},defaultVariants:{size:`md`},compoundVariants:[]})})),p,m,h,g,_=e((()=>{n(),t(),f(),p=a(),m=()=>(0,p.jsx)(`svg`,{viewBox:`0 0 20 20`,fill:`currentColor`,children:(0,p.jsx)(`path`,{d:`M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z`})}),h=(e,t)=>{if(t===void 0)return e;let n=typeof e==`number`?e:typeof e==`string`&&/^-?\d+$/.test(e.trim())?Number(e):null;return n===null?e:n>t?`${t}+`:String(n)},g=({children:e,variant:t=`neutral`,size:n=`md`,removable:r=!1,onRemove:a,disabled:o=!1,className:s,"data-testid":c,icon:f,rounded:g=!1,dot:_=!1,max:v})=>{let y=e=>{e.stopPropagation(),a&&!o&&a()},b=h(e,v);return(0,p.jsxs)(`span`,{className:i(l({size:n,variant:t,rounded:g,disabled:o,dot:_}),s),"data-testid":c,role:`status`,"aria-label":typeof b==`string`?b:void 0,children:[f&&(0,p.jsx)(`span`,{className:u[n],children:f}),b!=null&&b!==``&&(0,p.jsx)(`span`,{children:b}),r&&(0,p.jsx)(`button`,{className:d({size:n}),onClick:y,disabled:o,"aria-label":`Remove badge`,type:`button`,children:(0,p.jsx)(m,{})})]})},g.displayName=`Badge`,g.__docgenInfo={description:``,methods:[],displayName:`Badge`,props:{children:{required:!0,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},variant:{required:!1,tsType:{name:`union`,raw:`| 'primary'
| 'secondary'
| 'success'
| 'error'
| 'warning'
| 'info'
| 'neutral'
| 'outline'
| 'count'`,elements:[{name:`literal`,value:`'primary'`},{name:`literal`,value:`'secondary'`},{name:`literal`,value:`'success'`},{name:`literal`,value:`'error'`},{name:`literal`,value:`'warning'`},{name:`literal`,value:`'info'`},{name:`literal`,value:`'neutral'`},{name:`literal`,value:`'outline'`},{name:`literal`,value:`'count'`}]},description:``,defaultValue:{value:`'neutral'`,computed:!1}},size:{required:!1,tsType:{name:`union`,raw:`'xs' | 'sm' | 'md' | 'lg'`,elements:[{name:`literal`,value:`'xs'`},{name:`literal`,value:`'sm'`},{name:`literal`,value:`'md'`},{name:`literal`,value:`'lg'`}]},description:``,defaultValue:{value:`'md'`,computed:!1}},removable:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},onRemove:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``},"data-testid":{required:!1,tsType:{name:`string`},description:``},icon:{required:!1,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},rounded:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},dot:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},max:{required:!1,tsType:{name:`number`},description:``}}}})),v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I;e((()=>{_(),v={title:`Components/Badge`,component:g,tags:[`autodocs`],argTypes:{variant:{control:{type:`select`},options:[`primary`,`secondary`,`success`,`error`,`warning`,`info`,`neutral`,`outline`,`count`]},size:{control:{type:`select`},options:[`xs`,`sm`,`md`,`lg`]},removable:{control:{type:`boolean`}},disabled:{control:{type:`boolean`}},rounded:{control:{type:`boolean`}},dot:{control:{type:`boolean`}}}},y={args:{children:`Primary Badge`,variant:`primary`,size:`md`}},b={args:{children:`Secondary Badge`,variant:`secondary`,size:`md`}},x={args:{children:`Success Badge`,variant:`success`,size:`md`}},S={args:{children:`Error Badge`,variant:`error`,size:`md`}},C={args:{children:`Warning Badge`,variant:`warning`,size:`md`}},w={args:{children:`Info Badge`,variant:`info`,size:`md`}},T={args:{children:`Neutral Badge`,variant:`neutral`,size:`md`}},E={args:{children:`Outline Badge`,variant:`outline`,size:`md`}},D={args:{children:`5`,variant:`count`,size:`md`}},O={args:{children:`XS`,variant:`primary`,size:`xs`}},k={args:{children:`Small`,variant:`primary`,size:`sm`}},A={args:{children:`Large Badge`,variant:`primary`,size:`lg`}},j={args:{children:`Rounded Badge`,variant:`primary`,size:`md`,rounded:!0}},M={args:{children:`With Dot`,variant:`primary`,size:`md`,dot:!0}},N={args:{children:`Removable Badge`,variant:`primary`,size:`md`,removable:!0}},P={args:{children:`Disabled Badge`,variant:`primary`,size:`md`,disabled:!0}},F={args:{children:99,variant:`count`,size:`md`,max:50}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Primary Badge',
    variant: 'primary',
    size: 'md'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Secondary Badge',
    variant: 'secondary',
    size: 'md'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Success Badge',
    variant: 'success',
    size: 'md'
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Error Badge',
    variant: 'error',
    size: 'md'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Warning Badge',
    variant: 'warning',
    size: 'md'
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Info Badge',
    variant: 'info',
    size: 'md'
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Neutral Badge',
    variant: 'neutral',
    size: 'md'
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Outline Badge',
    variant: 'outline',
    size: 'md'
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    children: '5',
    variant: 'count',
    size: 'md'
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'XS',
    variant: 'primary',
    size: 'xs'
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Small',
    variant: 'primary',
    size: 'sm'
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Large Badge',
    variant: 'primary',
    size: 'lg'
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Rounded Badge',
    variant: 'primary',
    size: 'md',
    rounded: true
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'With Dot',
    variant: 'primary',
    size: 'md',
    dot: true
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Removable Badge',
    variant: 'primary',
    size: 'md',
    removable: true
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Disabled Badge',
    variant: 'primary',
    size: 'md',
    disabled: true
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    children: 99,
    variant: 'count',
    size: 'md',
    max: 50
  }
}`,...F.parameters?.docs?.source}}},I=[`Primary`,`Secondary`,`Success`,`Error`,`Warning`,`Info`,`Neutral`,`Outline`,`CountVariant`,`ExtraSmall`,`Small`,`Large`,`Rounded`,`WithDot`,`Removable`,`Disabled`,`CountWithMax`]}))();export{D as CountVariant,F as CountWithMax,P as Disabled,S as Error,O as ExtraSmall,w as Info,A as Large,T as Neutral,E as Outline,y as Primary,N as Removable,j as Rounded,b as Secondary,k as Small,x as Success,C as Warning,M as WithDot,I as __namedExportsOrder,v as default};