import {METRO_PLACES,metroGround,CITY_AVENUES,CITY_STREETS} from './world-metropolis';
// Shared scenery footprints keep movement and building consistent across clients.
export const PLACES=[
 ...METRO_PLACES,
 {id:'home',name:'Our meadow',icon:'🏡',x:9,z:10,detail:'Your original building space'},
 {id:'garden',name:'Blossom garden',icon:'🌸',x:29,z:9,detail:'Flower beds & a rose arch'},
 {id:'plaza',name:'Wish fountain',icon:'⛲',x:23,z:23,detail:'Meet along the lantern walk'},
 {id:'beach',name:'Love beach',icon:'🏖️',x:9,z:31,detail:'Sand, parasols & ocean views'},
 {id:'cafe',name:'Together café',icon:'☕',x:30,z:30,detail:'A terrace for a quiet chat'},
 {id:'picnic',name:'Picnic park',icon:'🧺',x:46,z:9,detail:'Checkered blankets & shady trees'},
 {id:'music',name:'Melody square',icon:'🎵',x:46,z:27,detail:'A music stage & space to dance'},
 {id:'stars',name:'Stargazer point',icon:'🔭',x:47,z:47,detail:'Telescopes & a quiet lookout'},
 {id:'camp',name:'Cozy campsite',icon:'🏕️',x:28,z:47,detail:'Tents, log seats & a campfire'},
 {id:'pond',name:'Lily pond',icon:'🪷',x:9,z:46,detail:'Water lilies & a waterside pavilion'},
 {id:'city',name:'Heartline boulevard',icon:'🏙️',x:39,z:64,detail:'Free city district · wide streets and skyline'},
 {id:'market',name:'Night market',icon:'🛍️',x:14,z:64,detail:'Colorful stalls and a place to meet'},
 {id:'court',name:'Basketball court',icon:'🏀',x:63,z:65,detail:'An open court to hang out together'},
 {id:'harbor',name:'Harbor promenade',icon:'🌊',x:39,z:76,detail:'Waterfront benches and ocean views'},
 {id:'avenue',name:'Sunset avenue',icon:'🌇',x:70,z:32,detail:'A tree-lined route from the island to the city'},
] as const;
export type SceneryBox={x:number;y:number;z:number;w:number;h:number;d:number;color:string;solid?:boolean};
export const SCENERY:SceneryBox[]=[];
const add=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,solid=false)=>SCENERY.push({x,y,z,w,h,d,color,solid});
const tree=(x:number,z:number,pink=true)=>{add(x,1.25,z,.48,2.5,.48,'#916648',true);add(x,3,z,2.6,1.6,2.5,pink?'#df9cc4':'#5e986e');add(x-.55,3.75,z+.15,1.8,.7,1.7,pink?'#f4c3df':'#82b47b');};
const bench=(x:number,z:number)=>{add(x,.6,z,1.8,.22,.7,'#a77855',true);add(x-.65,.25,z,.18,.5,.5,'#6f5847');add(x+.65,.25,z,.18,.5,.5,'#6f5847');add(x,1.05,z-.32,1.8,.7,.13,'#c3946c');};
// Leave the original 20 × 20 tiles intact, including all saved builds.
for(const [x,z] of [[23,3],[34,3],[24,15],[35,15],[3,23],[17,24],[36,23],[36,35]])tree(x,z,z<20);
for(const [x,z] of [[25,6],[33,6],[25,12],[33,12]]){add(x,.16,z,2.6,.3,1.5,'#b48b6b',true);for(let i=0;i<4;i++){add(x-.9+i*.6,.45,z,.1,.45,.1,'#5b8a52');add(x-.9+i*.6,.75,z,.33,.3,.33,i%2?'#f19abd':'#b995e1');}}
for(const x of [27,31])add(x,1.5,16,.28,3,.28,'#f5e7d6',true);add(29,3,16,4.3,.28,.4,'#f5e7d6');for(let i=0;i<7;i++)add(27.2+i*.6,3.25,16,.42,.4,.5,i%2?'#b482bf':'#e8a9c7');
bench(29,3);bench(34,19);bench(20,28);
// Fountain: a shallow square basin with a stepped, bright blue cascade.
add(23,.2,19,4,.4,4,'#bcb2ca',true);add(23,.45,19,3.3,.18,3.3,'#68bfce');add(23,.9,19,1.3,.9,1.3,'#e8dfeb');add(23,1.45,19,2,.2,2,'#b0dfe6');add(23,1.85,19,.65,.7,.65,'#f1eaf1');add(23,2.25,19,.9,.17,.9,'#82d0df');
// Cafe counter, striped awning, and open-air tables.
add(31,1,36,7,2,1,'#b77c63',true);add(31,2.1,36,7.3,.22,1.3,'#f2ded0');for(const x of [27,35])add(x,1.8,36,.18,3.6,.18,'#77625a',true);for(let i=0;i<8;i++)add(27.5+i,3.7,35,1,.2,3.2,i%2?'#f6ded7':'#d88592');
for(const [x,z] of [[27,28],[34,28],[33,32]]){add(x,.65,z,.2,1.3,.2,'#8e6851',true);add(x,1.3,z,1.5,.17,1.5,'#e1b994',true);add(x,1.52,z,.2,.3,.2,'#ffffff');for(const dx of [-1.25,1.25])add(x+dx,.45,z,.6,.8,.65,'#ab7a68',true);}
// Beach umbrellas, loungers and a boardwalk.
for(const [x,z] of [[4,30],[15,33]]){add(x,1.3,z,.15,2.6,.15,'#a07958',true);add(x,2.65,z,3,.18,3,'#f0bca1');add(x,2.9,z,2,.35,2,'#f9dbc0');add(x+1,.3,z+2,.85,.45,1.8,'#f8e9d4',true);add(x-1,.3,z+2,.85,.45,1.8,'#dd9eae',true);}
for(let z=24;z<39;z+=3){add(19,1.1,z,.14,2.2,.14,'#766e79',true);add(19,2.3,z,.45,.5,.45,'#ffe6a3');}
for(const [x,z] of [[38,7],[38,16],[2,37],[24,37]]){add(x,.25,z,1.4,.5,1.1,'#abb5ae',true);add(x+.5,.22,z+.6,.6,.4,.7,'#c4ccc0');}
// New places live outside the previous island, preserving all saved constructions.
for(const [x,z] of [[42,3],[52,4],[42,15],[53,15],[42,23],[53,33],[3,42],[17,53],[22,42],[35,53],[42,52],[53,43]])tree(x,z,false);
// Picnic blankets, baskets, and paired seats.
for(const [x,z] of [[44,6],[50,12]]){for(let a=0;a<3;a++)for(let b=0;b<3;b++)add(x+a,.1,z+b,.98,.12,.98,(a+b)%2?'#f9ded6':'#ce7d96');add(x+.4,.4,z+.4,.65,.6,.5,'#bd9160',true);add(x+2,.3,z+2,.45,.3,.45,'#e7b664');}
bench(50,6);bench(43,12);
// A flat dance floor; instruments and speakers frame the walkable stage.
for(let x=43;x<=50;x++)for(let z=25;z<=30;z++)add(x,.09,z,.97,.09,.97,(x+z)%2?'#ad95bd':'#d9bbce');
for(const x of [42,51]){add(x,1.1,25,.8,2.2,.8,'#494754',true);add(x,1.5,25.42,.4,.4,.04,'#9f8cba');add(x,.65,25.42,.5,.5,.04,'#9f8cba');add(x,3,25,.18,1.8,.18,'#8c7f94');add(x,4,25,.7,.3,.6,'#f0c9e0');}
add(47,1,24,2,.35,.7,'#414454',true);for(let i=0;i<8;i++)add(46.2+i*.22,1.2,24.1,.16,.06,.4,i%3?'#fff6ec':'#555163');add(46.2,.5,24,.15,1,.15,'#77727e');add(47.8,.5,24,.15,1,.15,'#77727e');bench(44,33);bench(49,33);
// A lookout with two block telescopes and low railings.
for(const x of [44,50]){add(x,.85,50,.18,1.7,.18,'#7b728d',true);add(x,1.75,50,1.5,.45,.45,'#70648c');add(x+.8,1.75,50,.12,.55,.55,'#bdd7e7');add(x-.3,.25,50,.9,.15,.8,'#8e829e');}
for(let x=42;x<=53;x+=2){add(x,.55,54,.13,1.1,.13,'#a3a1bc',true);}add(47.5,1.1,54,11,.14,.14,'#c0bfd2',true);bench(43,46);bench(51,46);
// Tents and a campfire, with an open meeting space just to the north.
for(const x of [23,34]){add(x,.55,47,3,1.1,3,'#b97965',true);add(x,1.35,47,2,.5,3,'#cb967b');add(x,1.85,47,1,.5,3,'#ddab8a');add(x,.55,48.52,.9,.9,.04,'#655354');}
add(28,.15,51,2.4,.3,2.4,'#9b9895',true);add(28,.4,51,1.5,.3,.5,'#7a5c47');add(28,.55,51,.5,.3,1.5,'#8d694b');add(28,.9,51,.7,.8,.7,'#ed9b4d');add(28,1.3,51,.35,.55,.35,'#f4c77c');bench(25,52);bench(31,52);
// A lily pond with a sheltered promenade; water cannot be built over or walked through.
add(9,.1,51,8,.2,5,'#77bdc5',true);for(const [x,z] of [[6,50],[10,52],[12,50]]){add(x,.23,z,.7,.07,.7,'#73986c');add(x,.38,z,.3,.25,.3,'#ecc0d4');}
for(const x of [4,14])for(const z of [43,46])add(x,1.5,z,.2,3,.2,'#d5b58e',true);add(9,3.2,44.5,10.6,.3,4,'#a692b8');add(9,3.55,44.5,8.5,.4,3,'#b8a6c9');bench(3,49);bench(15,49);
// Free city expansion outside the original saved island. Streets remain walkable.
for(const [x,z,h,c] of [[25,58,8,'#73899d'],[36,58,12,'#63768f'],[48,58,9,'#ad887f'],[25,70,7,'#7d8d9d'],[48,70,10,'#8581a3']] as const){
 add(x,h/2,z,7,h,5,c,true);add(x,h+.15,z,7.4,.3,5.4,'#414d60');
 for(let floor=1;floor<h;floor+=2)for(let col=-2;col<=2;col+=2){add(x+col,floor,z+2.53,.8,1,.06,'#ffe0a3');add(x+col,floor,z-2.53,.8,1,.06,'#a8d7e5');}
 add(x,.95,z+2.55,1.2,1.9,.08,'#394b61');
}
for(const x of [6,12,18]){add(x,.6,59,3,1.2,1.2,'#b48262',true);for(const dx of [-1.5,1.5])add(x+dx,1.5,59,.12,3,.12,'#5a5568',true);add(x,3,59,3.5,.25,2.5,x===12?'#db779f':'#66aeb3');}
// Court markings are flat: avatars can walk through the entire playing surface.
add(63,.08,65,13,.08,12,'#568f90');
for(const x of [57,69])add(x,.14,65,.09,.03,11,'#f8e5cc');
for(const z of [59.5,65,70.5])add(63,.14,z,12,.03,.09,'#f8e5cc');
for(const z of [58,72]){add(63,1.8,z,.16,3.6,.16,'#526078',true);add(63,3.3,z,1.8,1.1,.15,'#f3e5d2');add(63,2.85,z+(z===58?.7:-.7),.9,.1,.9,'#d98a5a');}
for(let x=4;x<79;x+=7){bench(x,78);add(x,1.6,74,.13,3.2,.13,'#53617a',true);add(x,3.25,74,.55,.4,.55,'#ffe3a4');}
for(let z=22;z<56;z+=8){tree(76,z,false);bench(74,z+3);}
for(let x=3;x<79;x+=4)add(x,.13,64,1.6,.03,.12,'#f9df9e');
for(const x of [98,122])for(const z of [2,26,50,74,98,122]){
 const h=8+((x+z)%5)*3;
 add(x,h/2,z,13,h,12,(x+z)%3?'#8190a2':'#a39188',true);
 add(x,h+.25,z,13.6,.5,12.6,'#465369');
 for(let y=2;y<h-1;y+=2.8){add(x,y,z+6.03,11,.95,.05,'#b1d2dd');add(x,y,z-6.03,11,.95,.05,'#a4c4d0');add(x+6.53,y,z,.05,.95,10,'#93b7c7');}
 add(x,1.3,z+6.06,10,2.6,.12,'#33495d');add(x,2.9,z+6.5,12,.3,1.4,'#dfb578');
 for(const dx of [-4,0,4])add(x+dx,1.3,z+6.13,.12,2.6,.15,'#d1ccc2');
}
for(const x of CITY_AVENUES)for(let z=0;z<144;z+=6)add(x,.13,z,.13,.03,2.3,'#f4da91');
for(const z of CITY_STREETS)for(let x=80;x<144;x+=6)add(x,.13,z,2.3,.03,.13,'#f4da91');
for(const x of CITY_AVENUES)for(const z of CITY_STREETS){
 for(let i=-2;i<=2;i++)add(x+i,.14,z+4,.65,.03,1.6,'#eeeeea');
 add(x+4.7,2.4,z+4.7,.12,4.8,.12,'#4b5969',true);add(x+4.7,4.85,z+4.7,1.3,.18,.45,'#ffe4ae');
}
// Parked cars along the curb make the city feel inhabited even before another player drives in.
for(const [x,z,color] of [[82,20,'#d96f7e'],[90,32,'#5d83c2'],[106,44,'#e5a04f'],[114,68,'#7caa79'],[130,92,'#9c79b9'],[82,116,'#d4d4cf']] as const){add(x,.35,z,1.35,.38,2.6,color,true);add(x,.67,z,1.05,.22,1.15,'#b7dce2');add(x,.18,z-.92,.28,.24,.45,'#262c34');add(x,.18,z+.92,.28,.24,.45,'#262c34');}
for(let x=5;x<78;x+=9)for(const z of [90,122,138])tree(x,z,false);
export function cityGroundColor(x:number,z:number){const metro=metroGround(x,z);if(metro)return metro;if(z>=56){if(z>=75)return '#c1b9ac';if(z>=62&&z<=66)return '#414f63';return (x+z)%2?'#a6afb7':'#b2bac0';}if(x>=56){if(x>=68&&x<=72)return '#414f63';return (x+z)%2?'#80a879':'#8fb788';}return null;}
export function sceneryBlocked(x:number,z:number){return SCENERY.some(b=>b.solid&&Math.abs(x-b.x)<b.w/2+.24&&Math.abs(z-b.z)<b.d/2+.24);}
export function sceneryTile(x:number,z:number){return SCENERY.some(b=>b.solid&&Math.abs(x-b.x)<b.w/2+.5&&Math.abs(z-b.z)<b.d/2+.5);}
export function reservedTile(x:number,z:number){return sceneryTile(x,z)||PLACES.some(p=>Math.abs(x-p.x)<=1&&Math.abs(z-p.z)<=1);}
export function groundColor(x:number,z:number){const city=cityGroundColor(x,z);if(city)return city;if(x>=40||z>=40){if(x===46||x===47||z===46||z===47||z===9||z===30||x===9||x===29)return '#e7d9be';if(x>=40&&z>=40)return (x+z)%2?'#969cb5':'#a6acc3';if(z>=40&&x<19)return (x+z)%2?'#8cb6a1':'#9ac2ad';return (x+z)%2?'#80a879':'#8fb788';}if(x<19&&z>=25)return (x+z)%2?'#e8cea0':'#efdab3';if(x>=25&&z>=25)return (x+z)%2?'#dbbfa8':'#e5cbb6';if(x===9||x===10||z===9||z===10||x===22||x===23||z===22||z===23||x===29||z===30)return '#e7d9be';return (x+z)%2?'#96bd81':'#a4c78d';}
export function placeAt(x:number,z:number){return [...PLACES].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];}
