import{i as e}from"./preload-helper-xPQekRTU.js";import{n as t,t as n}from"./ErrorState-DKHclGi7.js";var r,i,a,o,s;e((()=>{t(),r={title:`Components/ErrorState`,component:n,tags:[`autodocs`],argTypes:{size:{control:{type:`select`},options:[`sm`,`md`,`lg`]}}},i={args:{title:`Something went wrong`,message:`We could not load this content.`}},a={args:{title:`Failed to load pets`,message:`Please check your connection and try again.`,onRetry:()=>{}}},o={args:{message:`This report is temporarily unavailable.`}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Something went wrong',
    message: 'We could not load this content.'
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Failed to load pets',
    message: 'Please check your connection and try again.',
    onRetry: () => {}
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    message: 'This report is temporarily unavailable.'
  }
}`,...o.parameters?.docs?.source}}},s=[`Default`,`WithRetry`,`MessageOnly`]}))();export{i as Default,o as MessageOnly,a as WithRetry,s as __namedExportsOrder,r as default};