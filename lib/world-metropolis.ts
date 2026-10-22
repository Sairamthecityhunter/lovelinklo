// A connected city street grid beyond the preserved couple island.
export const CITY_START=80;
export const CITY_END=144;
export const CITY_AVENUES=[86,110,134];
export const CITY_STREETS=[14,38,62,86,110,134];
export function metroRoad(x:number,z:number){return x>=80&&(CITY_AVENUES.some(a=>Math.abs(x-a)<=3)||CITY_STREETS.some(a=>Math.abs(z-a)<=3));}
export function metroGround(x:number,z:number):string|null{
 if(x<80&&z<80)return null;
 if(x<80)return z>=104&&z<=110?'#354253':(x+z)%2?'#6c9874':'#729e79';
 if(metroRoad(x,z))return '#303b49';
 if(CITY_AVENUES.some(a=>Math.abs(x-a)<=5)||CITY_STREETS.some(a=>Math.abs(z-a)<=5))return '#b8b9b7';
 return '#8a9d8a';
}
export const METRO_PLACES=[
 {id:'downtown',name:'Downtown',icon:'🏙️',x:110,z:86,detail:'City meeting point · cars and broad avenues'},
 {id:'shops',name:'Shopping avenue',icon:'🛍️',x:110,z:38,detail:'Storefronts and a pedestrian square'},
 {id:'residential',name:'Residential quarter',icon:'🏘️',x:86,z:110,detail:'Apartments and tree-lined streets'},
 {id:'marina',name:'Marina drive',icon:'🚗',x:134,z:134,detail:'Take a drive along the city edge'},
 {id:'civic',name:'Central square',icon:'⛲',x:110,z:62,detail:'An open junction to meet other players'},
 {id:'stadium',name:'City park',icon:'🌳',x:62,z:110,detail:'Open lawns beyond the old island'},
] as const;
