(() => {
 const round = n => Math.round(n*100)/100;
 const rooms = [...document.querySelectorAll('[role=checkbox][id^=room-]')].map(checkbox=>{
 const card=checkbox.closest('[data-slot=card]');
 const rect=e=>e && Object.fromEntries(['x','y','width','height','right','bottom'].map(k=>[k,round(e.getBoundingClientRect()[k])]));
 const name=card.querySelector('label[for^=room-]');
 const price=[...card.querySelectorAll('p,span')].find(el=>el.textContent.startsWith('RM '));
 const warning=[...card.querySelectorAll('p')].find(el=>/^(Entered price|Unavailable)/.test(el.textContent.trim()));
 const pax=card.querySelector('input[type=number]');
 const paxLabel=card.querySelector('[data-slot=field-label]');
 const total=[...card.querySelectorAll('p')].find(el=>el.textContent.startsWith('Room total'));
 const error=card.querySelector('[role=alert]');
 const bounds=rect(card);
 const left=el=>el && round(rect(el).x-bounds.x);
 const css=pax && getComputedStyle(pax);
 return {room:name.textContent.trim(),checked:checkbox.getAttribute('aria-checked'),card:bounds,centerOffset:round(rect(checkbox).y+rect(checkbox).height/2-rect(name).y-12),
 insets:[price,warning,paxLabel,pax,total].map(left),labelOffset:paxLabel && round(rect(paxLabel).y-bounds.y),inputOffset:pax && round(rect(pax).y-bounds.y),totalOffset:total && round(rect(total).y-bounds.y),
 price:price?.textContent.trim(),warning:warning?.textContent.trim().replace(/\s+/g,' '),warningLines:warning && round(rect(warning).height/parseFloat(getComputedStyle(warning).lineHeight)),
 qty:pax?.value,total:total?.textContent.trim(),error:error?.textContent.trim(),invalid:pax?.getAttribute('aria-invalid'),
 focused:pax && document.activeElement===pax,focusShadow:css?.boxShadow,focusClearance:pax && round(bounds.right-rect(pax).right),
 fits:[name,price,warning,paxLabel,pax,total,error,card.querySelector('button:not([role=checkbox])')].filter(Boolean).every(el=>rect(el).right<=bounds.right && rect(el).bottom<=bounds.bottom)};
 });return {url:location.href,width:innerWidth,theme:document.documentElement.classList.contains('dark')?'dark':'light',rooms};
})()
