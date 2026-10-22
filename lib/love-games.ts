export type QuizQuestion={prompt:string;options:string[];followUp:string};
export const quizDecks:{id:string;title:string;emoji:string;description:string;questions:QuizQuestion[]}[]=[
 {id:'favorites',title:'The little favorites',emoji:'☕',description:'Guess their comforts, cravings, and perfect day.',questions:[
  {prompt:'What would {name} pick for a slow Sunday?',options:['Breakfast in bed','An outdoor adventure','A movie marathon','Exploring somewhere new'],followUp:'What would make that Sunday even better together?'},
  {prompt:'Which little surprise would make {name} smile most?',options:['A handwritten note','Their favorite snack','An unexpected call','A thoughtfully planned date'],followUp:'Tell each other about a little surprise you still remember.'},
  {prompt:'What is {name} most likely to order for a treat?',options:['Something chocolatey','Something fruity','Something salty','Something spicy'],followUp:'What is the exact treat? Add it to your mental gift list.'},
  {prompt:'How does {name} like to unwind?',options:['Music or a podcast','A quiet walk','A game or a show','Talking about the day'],followUp:'How can you help each other switch off after a busy day?'},
  {prompt:'What is {name}’s ideal date setting?',options:['Cozy at home','By the water','Somewhere with live music','A new café or restaurant'],followUp:'Pick a place you could actually visit together.'},
  {prompt:'Which season would {name} choose for a getaway?',options:['Spring flowers','Summer sunshine','Autumn colors','Winter coziness'],followUp:'Where would you go in that season?'}]},
 {id:'together',title:'Our kind of together',emoji:'💌',description:'Discover what makes everyday love feel special.',questions:[
  {prompt:'What helps {name} feel close when you’re apart?',options:['A thoughtful text','A long video call','Sharing little photos','Planning the next visit'],followUp:'Choose one small way to stay close this week.'},
  {prompt:'What does {name} appreciate most after a hard day?',options:['Someone listening','Practical help','Quiet time together','A little distraction'],followUp:'What is a helpful thing to say or do on those days?'},
  {prompt:'Which shared ritual would {name} enjoy most?',options:['Morning check-ins','Cooking together','An evening walk','A weekly game night'],followUp:'Could you make room for that ritual this week?'},
  {prompt:'What would {name} most like to keep from a lovely day?',options:['A favorite photo','A little souvenir','A written memory','A song from that day'],followUp:'Share one favorite memory, in as much detail as you can.'},
  {prompt:'How would {name} celebrate a small win?',options:['A favorite meal','A happy phone call','A little gift','A fun evening out'],followUp:'What small win can you celebrate for each other today?'},
  {prompt:'What makes a message meaningful to {name}?',options:['A specific compliment','A funny shared memory','A sincere thank-you','Something to look forward to'],followUp:'Try sending that kind of message after the game.'}]},
 {id:'dreams',title:'Our next adventure',emoji:'✈️',description:'Trade guesses about the things you’d love to try.',questions:[
  {prompt:'Which trip would {name} plan first?',options:['A beach escape','A city weekend','A mountain retreat','A relaxed road trip'],followUp:'Name a destination and one thing you would do there.'},
  {prompt:'What would {name} most like to learn together?',options:['Cooking a new cuisine','A dance','A new language','A creative hobby'],followUp:'What is a small first step you could try?'},
  {prompt:'Which shared project sounds best to {name}?',options:['Growing a little garden','Making a photo book','Decorating a cozy corner','Trying a fitness challenge'],followUp:'What would each of you contribute to the project?'},
  {prompt:'How would {name} spend an unexpected free afternoon?',options:['A spontaneous outing','A long catch-up','A cozy nap and movie','Trying something new'],followUp:'Describe your perfect version of that afternoon.'},
  {prompt:'What kind of adventure would {name} try?',options:['A scenic hike','A food tour','A live performance','A mystery day planned by you'],followUp:'What would help make it comfortable and fun for both of you?'},
  {prompt:'Which future tradition would {name} choose?',options:['An annual getaway','A monthly surprise date','A weekly screen-free evening','A yearly letter to each other'],followUp:'What would you like your first one to look like?'}]}
];
export const ratherQuestions:QuizQuestion[]=[
 {prompt:'Your next date: which would you rather?',options:['🌅 Watch a sunrise','🌇 Watch a sunset'],followUp:'Where would you go, and what would you bring?'},
 {prompt:'A weekend just for you two…',options:['🏖️ Escape to the beach','🏔️ Hide away in the mountains'],followUp:'What is the first thing you would do when you arrive?'},
 {prompt:'Tonight’s plan?',options:['🍝 Cook something new together','🍽️ Try a new restaurant'],followUp:'Which dish would you choose?'},
 {prompt:'A small gift to keep…',options:['💌 A handwritten letter','📷 A book of your photos'],followUp:'What would you put on its first page?'},
 {prompt:'For a long-distance evening…',options:['🎮 Play a game together','🎬 Watch a movie together'],followUp:'What should you play or watch next?'},
 {prompt:'An adventure for two…',options:['🗺️ Follow a carefully made plan','🎒 See where the day takes you'],followUp:'When do you prefer a plan, and when is spontaneity fun?'},
 {prompt:'Your soundtrack for the day…',options:['🎤 Sing along on a road trip','🎵 Share headphones on a walk'],followUp:'Choose one song that belongs on your couple playlist.'},
 {prompt:'One skill to learn together…',options:['💃 Learn a dance','🎨 Learn to paint'],followUp:'Would you sign up for a class or try at home?'},
 {prompt:'A cozy night in…',options:['🧩 Finish a puzzle together','🍪 Bake something sweet'],followUp:'What is your ideal cozy-night snack?'},
 {prompt:'A thoughtful surprise…',options:['🌹 A just-because bouquet','🧺 A picnic planned for you'],followUp:'What makes a surprise feel personal to you?'},
 {prompt:'An extra hour together…',options:['☕ A slow morning chat','🌙 A late-night conversation'],followUp:'What is one question you have been meaning to ask?'},
 {prompt:'A memory you could revisit…',options:['✨ Your first wonderful day together','🧭 Your favorite shared adventure'],followUp:'Tell the story from your point of view.'}
];

export function shuffled<T>(items:readonly T[]):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export type Mark=0|1|null;
export function boardResult(board:Mark[]):{winner:0|1|null;line:number[];draw:boolean}{
 for(const line of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]){const [a,b,c]=line;if(board[a]!==null&&board[a]===board[b]&&board[a]===board[c])return {winner:board[a],line,draw:false};}
 return {winner:null,line:[],draw:board.every(v=>v!==null)};
}
export type TicState={board:Mark[];turn:0|1;starter:0|1;scores:[number,number];draws:number};
export const newTicState=():TicState=>({board:Array(9).fill(null),turn:0,starter:0,scores:[0,0],draws:0});
export function ticReducer(state:TicState,action:{type:'place';index:number}|{type:'round'}|{type:'reset'}):TicState{
 if(action.type==='reset')return newTicState();
 if(action.type==='round'){const starter=state.starter===0?1:0;return {...state,board:Array(9).fill(null),turn:starter,starter};}
 const result=boardResult(state.board);
 if(action.index<0||action.index>8||!Number.isInteger(action.index)||state.board[action.index]!==null||result.winner!==null||result.draw)return state;
 const board=[...state.board];board[action.index]=state.turn;const next=boardResult(board);const scores:[number,number]=[...state.scores];if(next.winner!==null)scores[next.winner]++;
 return {...state,board,turn:state.turn===0?1:0,scores,draws:state.draws+(next.draw?1:0)};
}
