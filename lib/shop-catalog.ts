import {DATE_PACKS} from './date-concierge';
export const SHOP_ITEMS=[
 {id:'premium',name:'LoveLink Together',kind:'subscription',price:499,emoji:'💎',description:'Weekly date plans and monthly digital memory books for your connected couple, plus date packs, world themes, avatar colors, and bonus quizzes. Physical and one-time digital gifts sold separately.'},
 {id:'wedding',name:'Wedding garden',kind:'world',price:499,emoji:'💒',description:'Ivory paths, blush blossoms, and a garden ceremony landmark.'},
 {id:'winter',name:'Winter cabin',kind:'world',price:599,emoji:'🏡',description:'A snowy island palette and a cozy cabin landmark.'},
 {id:'romantic',name:'Romantic island',kind:'world',price:799,emoji:'🌅',description:'A rose-colored sunset world with a heart-garden landmark.'},
 {id:'flowers',name:'A little bouquet',kind:'gift',price:199,emoji:'💐',description:'Send your connected partner a blooming animated bouquet and your own message.'},
 {id:'hearts',name:'A shower of hearts',kind:'gift',price:99,emoji:'💖',description:'Send a floating-heart animation with a personal note.'},
 {id:'fireworks',name:'Our celebration',kind:'gift',price:299,emoji:'🎆',description:'An animated celebration for a birthday, anniversary, or just because.'},
 {id:'book',name:'Our love story',kind:'book',price:499,emoji:'📖',description:'A personalized five-page keepsake from your words. Download as a printable document and use your browser to save a PDF.'},
 ...DATE_PACKS.map(p=>({id:p.id,name:p.name,kind:'datepack' as const,price:p.price,emoji:p.emoji,description:p.description})),
] as const;
export type ShopSku=typeof SHOP_ITEMS[number]['id'];
export const PREMIUM_SHIRTS=['#be185d','#4338ca','#b45309','#115e59','#334155','#9333ea'] as const;
export const WORLD_THEMES=['classic','wedding','winter','romantic'] as const;
export type WorldTheme=typeof WORLD_THEMES[number];
export type BookDetails={yourName:string;partnerName:string;occasion:string;memory:string;admire:string;promise:string};
export const sampleBook:BookDetails={yourName:'Alex',partnerName:'Maya',occasion:'Our anniversary',memory:'That first long walk, when a short hello became a whole evening.',admire:'Your kindness, your laugh, and the way you notice the little things.',promise:'More adventures, more honest conversations, and time for us.'};
export const bookPages=(b:BookDetails)=>[{title:b.occasion,body:`${b.yourName} & ${b.partnerName}\nA little book of us.`},{title:'The memory I keep',body:b.memory},{title:'What I love about you',body:b.admire},{title:'The chapters ahead',body:b.promise},{title:'Always a little more us',body:`For ${b.partnerName},\nThank you for sharing this story with me.\nWith love, ${b.yourName}`}];
export const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
