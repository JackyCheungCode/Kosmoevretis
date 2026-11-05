import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";

type Option = { value:string; label:string; disabled?:boolean };
type Props = { id?:string; value:string; onChange:(value:string)=>void; children?:React.ReactNode; placeholder?:string; className?:string; ariaLabel?:string };

function OptionLabel({label}:{label:string}) {
  const match=label.match(/^(\p{Regional_Indicator}{2})\s+(.*)$/u);
  return match?<span className="carbon-select-flag-label"><span className="carbon-select-flag-circle">{match[1]}</span><span>{match[2]}</span></span>:<>{label}</>;
}

export default function CarbonSelect({id,value,onChange,children,placeholder="请选择",className="" ,ariaLabel}:Props) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const root=useRef<HTMLDivElement>(null);
  const optionRefs=useRef<Array<HTMLButtonElement|null>>([]);
  const listboxId=id?`${id}-listbox`:undefined;
  const options=useMemo<Option[]>(()=>Children.toArray(children).flatMap(child=>{
    if(!isValidElement(child)||child.type!=="option")return [];
    const props=child.props as {value?:string;children?:React.ReactNode;disabled?:boolean};
    return [{value:props.value??String(props.children??""),label:String(props.children??""),disabled:props.disabled}];
  }),[children]);
  const selected=options.find(option=>option.value===value);
  const filtered=options.filter(option=>option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  useEffect(()=>{
    if(!open)return;
    const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);root.current?.querySelector<HTMLButtonElement>(".carbon-select-trigger")?.focus();}};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",key);
    const focusTarget=options.length>8?root.current?.querySelector<HTMLInputElement>(".carbon-select-search"):optionRefs.current.find(Boolean);
    focusTarget?.focus();
    return ()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key);};
  },[open,options.length]);
  const handleOptionKeyDown=(event:React.KeyboardEvent<HTMLButtonElement>,index:number)=>{
    let next:number|undefined;
    if(event.key==="ArrowDown")next=(index+1)%filtered.length;
    else if(event.key==="ArrowUp")next=(index-1+filtered.length)%filtered.length;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=filtered.length-1;
    else if(event.key==="Escape"){setOpen(false);root.current?.querySelector<HTMLButtonElement>(".carbon-select-trigger")?.focus();}
    if(next!==undefined){event.preventDefault();const option=filtered[next];const actualIndex=options.findIndex(item=>item.value===option.value);optionRefs.current[actualIndex]?.focus();}
  };
  return <div className={`carbon-select ${className}`} ref={root}>
    <button id={id} type="button" className="carbon-select-trigger" aria-haspopup="listbox" aria-controls={listboxId} aria-expanded={open} aria-label={ariaLabel||selected?.label||placeholder} onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);}}} onClick={()=>setOpen(x=>!x)}>
      <span className={selected?"":"carbon-select-placeholder"}>{selected?<OptionLabel label={selected.label}/>:placeholder}</span><span className="carbon-select-chevron" aria-hidden="true">⌄</span>
    </button>
    {open&&<div className="carbon-select-menu" role="listbox">
      {options.length>8&&<input className="carbon-select-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索选项…" autoFocus/>}
      <div className="carbon-select-options">{filtered.map(option=><button type="button" role="option" aria-selected={value===option.value} disabled={option.disabled} key={option.value} className={value===option.value?"carbon-select-option selected":"carbon-select-option"} onClick={()=>{onChange(option.value);setOpen(false);setQuery("");}}><OptionLabel label={option.label}/>{value===option.value&&<span aria-hidden="true">✓</span>}</button>)}{!filtered.length&&<div className="carbon-select-empty">没有匹配的选项</div>}</div>
    </div>}
  </div>;
}
